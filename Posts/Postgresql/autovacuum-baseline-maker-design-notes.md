---
title: "Autovacuum Baseline Maker: Design Notes"
date: "2026-07-12"
category: "Postgresql"
tags: ["postgresql", "autovacuum", "python", "rich", "devops"]
excerpt: "Design notes for building a Python-based CLI and Live Rich Dashboard tool to collect, trend, and analyze Postgres autovacuum baselines."
---

# Autovacuum Baseline Maker: Design Notes

================================================================================
AUTOVACUUM BASELINE MAKER - DESIGN NOTES
================================================================================
Goal: A Python CLI tool that connects to Postgres (single or multi-DB/cluster),
collects a full autovacuum baseline (settings, activity, bloat, wraparound risk,
log-derived events), and renders it as a live/refreshable dashboard using Rich.
Output should also be persistable (JSON/CSV/SQLite) so baselines can be diffed
over time (trend analysis), which is the whole point of a "baseline".

--------------------------------------------------------------------------------
1. ARCHITECTURE
--------------------------------------------------------------------------------
avbaseline/
  __init__.py
  cli.py                 -> argparse/typer entrypoint, orchestrates everything
  config.py               -> connection info (dsn per cluster/db), thresholds, yaml config
  db.py                    -> psycopg2/psycopg3 connection pooling, per-db iteration
  collectors/
    settings.py            -> global GUCs + per-table reloptions + effective merge
    activity.py             -> pg_stat_user_tables / pg_stat_all_tables snapshots
    freeze.py                -> relfrozenxid/datfrozenxid age, multixact age, wraparound risk %
    bloat_stat.py             -> pg_stats-based statistical bloat estimate query
    bloat_actual.py            -> pgstattuple/pgstattuple_approx actual bloat (size-gated)
    index_bloat.py               -> separate index bloat estimate (btree)
    activity_blockers.py          -> long-running txns, idle-in-transaction, replication slots
    workers.py                     -> autovacuum_max_workers vs current running workers/contention
    hot_updates.py                  -> HOT update ratio per table
  logs/
    parser.py                -> tails/reads postgres log, regex-parses autovacuum + wraparound entries
    models.py                 -> dataclasses for parsed log events
  storage/
    sqlite_store.py            -> persist each run as a snapshot row set for trending
    export.py                   -> JSON/CSV export
  render/
    dashboard.py               -> Rich Live dashboard, tables/panels/progress bars
    report.py                   -> static Rich console report (non-live, for CI/cron output)
  scheduler.py               -> optional: run on interval, write snapshots, no dashboard (cron mode)

--------------------------------------------------------------------------------
2. DATA TO COLLECT (full checklist)
--------------------------------------------------------------------------------
A) SETTINGS LAYER
   - Global GUCs (SHOW / pg_settings):
     autovacuum, autovacuum_max_workers, autovacuum_naptime,
     autovacuum_vacuum_threshold, autovacuum_vacuum_scale_factor,
     autovacuum_vacuum_insert_threshold, autovacuum_vacuum_insert_scale_factor,
     autovacuum_analyze_threshold, autovacuum_analyze_scale_factor,
     autovacuum_freeze_max_age, autovacuum_multixact_freeze_max_age,
     autovacuum_vacuum_cost_delay, autovacuum_vacuum_cost_limit,
     vacuum_cost_limit, maintenance_work_mem
   - Per-table reloptions (pg_class.reloptions / pg_options_to_table) - overrides
   - Effective settings per table = merge(global, per-table override)
   - Per-table storage params relevant to bloat: fillfactor

B) ACTIVITY / STATS LAYER (pg_stat_user_tables, pg_stat_all_tables)
   - n_live_tup, n_dead_tup, n_mod_since_analyze
   - last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
   - vacuum_count, autovacuum_count, analyze_count, autoanalyze_count
   - dead tuple ratio = n_dead_tup / nullif(n_live_tup + n_dead_tup, 0)
   - n_tup_ins, n_tup_upd, n_tup_del, n_tup_hot_upd
   - pg_stat_progress_vacuum (live in-flight vacuum: phase, heap_blks scanned/total)
   - TOAST tables tracked SEPARATELY (join pg_class.reltoastrelid -> own stat row)

C) FREEZE / WRAPAROUND LAYER
   - age(relfrozenxid) per table, age(datfrozenxid) per database
   - mxid_age(relminmxid) per table
   - % distance to autovacuum_freeze_max_age (early warning ranking)
   - % distance to autovacuum_multixact_freeze_max_age
   - Flag: is next vacuum forced-aggressive (age > freeze_max_age)?

D) BLOAT LAYER
   - Statistical bloat estimate (pg_stats avg_width/null_frac formula) - cheap, safe, all tables
   - Actual bloat via pgstattuple/pgstattuple_approx - accurate but scans table;
     gate by table size (e.g. skip or warn above N GB unless --force)
   - Index bloat estimate (separate from heap) - btree bloat query
   - Report both estimated_bloat_pct and (if available) actual_bloat_pct side by side

E) LOG-DERIVED LAYER (requires log_autovacuum_min_duration set, ideally 0 or low ms)
   - Parse standard autovacuum log lines per table:
     pages removed/remain, tuples removed/remain, buffer usage (hit/miss/dirtied),
     WAL records/bytes, I/O timing (read/write), duration (ms)
   - Detect "aggressive"/anti-wraparound forced vacuum log signature vs normal
   - Track frequency: how often each table gets autovacuumed (interval between runs)
   - Track duration trend (is vacuum taking longer over time -> falling behind?)
   - Skipped autovacuums due to lock conflicts: detect/count cases where a
     regular (non-wraparound) autovacuum could not run because another
     connection held a conflicting lock. Doesn't apply to anti-wraparound
     vacuums, but a rising skip count is a leading indicator that more tables
     will eventually hit forced aggressive/anti-wraparound cleanup later -
     surface this as its own flag/metric per table, not just a log line count.
   - Multi-index-phase detection: parse whether a given VACUUM needed multiple
     index scan passes (visible in the log's "index scans: N" field, N>1).
     This signals autovacuum_work_mem/maintenance_work_mem is too low for the
     number of dead tuples found in one pass, or that too many dead rows
     accumulated before vacuum ran. Track per-table so chronically
     multi-pass tables can be flagged for either more frequent vacuuming or
     a maintenance_work_mem bump.
   (Both of the above are direct parity items with pganalyze's VACUUM Advisor
   Performance page - "Skipped Autovacuums" KPI and per-table multi-index-phase
   breakdown - confirmed via pganalyze docs, July 2026.)

F) BLOCKERS / CONTENTION LAYER
   - Long-running transactions (pg_stat_activity: xact_start, state, query)
   - Idle-in-transaction sessions (these hold back xmin horizon)
   - backend_xmin oldest snapshot holder
   - Replication slots holding xmin/catalog_xmin back (pg_replication_slots)
   - Prepared transactions (pg_prepared_xacts) - also hold back xmin
   - autovacuum_max_workers vs currently running autovacuum workers
     (pg_stat_activity where query like 'autovacuum:%') -> contention/queueing signal

G) DERIVED / COMPUTED METRICS (the "so what" layer)
   - Risk score per table combining: freeze age %, dead tuple ratio, bloat %,
     time since last autovacuum, table size, skipped-vacuum count, and
     multi-index-phase frequency -> single sortable priority score
   - Tables never vacuumed / never analyzed since creation
   - Tables where reloption overrides are stale/forgotten (set >1yr ago, no longer sensible)
   - Growth rate correlation: churn rate vs bloat trajectory over multiple snapshots
   - STRETCH GOAL (post-v1, parity with pganalyze's VACUUM Simulator): given
     historical n_live_tup/n_dead_tup snapshots, simulate how autovacuum
     timing would shift under different scale_factor/threshold values, so
     tuning changes can be sanity-checked before applying them in prod.

--------------------------------------------------------------------------------
3. SQL SOURCES REFERENCE (catalogs/views to query)
--------------------------------------------------------------------------------
   pg_settings, pg_class, pg_namespace, pg_stat_user_tables, pg_stat_all_tables,
   pg_stat_progress_vacuum, pg_stat_activity, pg_replication_slots,
   pg_prepared_xacts, pg_stats, pgstattuple(), pgstattuple_approx(),
   pg_database (datfrozenxid), pg_class (relfrozenxid, relminmxid, reloptions),
   pg_indexes / pg_index (for index bloat join)

   Extensions needed: pgstattuple (CREATE EXTENSION IF NOT EXISTS pgstattuple;)
   Requires: log_autovacuum_min_duration set low enough on target servers,
   and read access to the Postgres log file (or a log shipping/aggregation
   target like a syslog file, CSV log, or pgBadger-style location).

--------------------------------------------------------------------------------
4. RICH VISUALISATION PLAN
--------------------------------------------------------------------------------
   Use rich.live.Live for a refreshing dashboard, rich.layout.Layout to split
   screen into regions, refreshed on an interval (e.g. every 30s) or single-shot
   for cron/report mode.

   Layout regions:
   - Header: cluster name, timestamp, PG version, connection info
   - Top summary panel: counts (databases, tables scanned, tables in danger zone,
     autovacuum workers busy/idle, oldest freeze age found)
   - Main table (rich.table.Table), sortable by risk score, columns:
       Database | Schema.Table | Size | Live/Dead Tuples | Dead % | Last Autovacuum |
       Freeze Age % | Bloat % (stat) | Bloat % (actual) | Risk Score | Flags
     Flags column uses colored badges: [red]WRAPAROUND[/], [yellow]STALE[/],
     [orange]BLOATED[/], [cyan]NEVER-VACUUMED[/]
   - Progress bars (rich.progress) for:
       - freeze age % to autovacuum_freeze_max_age per top-N risky tables
       - in-flight pg_stat_progress_vacuum completion %
   - Side panel: blockers (long tx, idle-in-tx, replication slots) as a
     rich.table with red highlighting if xmin age is large
   - Bottom panel: recent parsed autovacuum log events (last N), scrolling list
   - Use rich.console.Console().print() fallback for non-live single report mode
   - Color thresholds configurable via config.py (e.g. dead_pct > 20 = yellow,
     > 40 = red; freeze_pct > 80 = red)

--------------------------------------------------------------------------------
5. BASELINE / TRENDING (persistence)
--------------------------------------------------------------------------------
   - Every run = one "snapshot" with a run_id + timestamp
   - Store to local SQLite (or optionally back to a dedicated Postgres monitoring
     schema) so baselines can be diffed: "what changed since last week"
   - Export JSON/CSV per run for external tooling / Grafana ingestion later
     (given existing Grafana/OpenSearch stack experience, could later push
     metrics via sql_exporter or a custom exporter instead of/alongside this)
   - CLI flag --diff <run_id_a> <run_id_b> to show delta table (bloat growth,
     freeze age growth, new never-vacuumed tables, etc.)

--------------------------------------------------------------------------------
6. CLI DESIGN (proposed)
--------------------------------------------------------------------------------
   avbaseline scan --dsn postgresql://... [--all-databases] [--live] [--interval 30]
   avbaseline scan --config clusters.yaml --live
   avbaseline report --dsn ... --out baseline_2026-07-12.json
   avbaseline diff --run-a 12 --run-b 15
   avbaseline logs --logfile /var/log/postgresql/postgresql.log --tail
   Flags: --skip-actual-bloat (skip pgstattuple pass), --max-table-size-gb 10
   (actual bloat scan size gate), --min-risk-score (filter table list)

--------------------------------------------------------------------------------
7. DEPENDENCIES
--------------------------------------------------------------------------------
   psycopg[binary] (or psycopg2-binary)
   rich
   typer (or argparse if keeping it dependency-light)
   pyyaml (config file support)
   python-dateutil (log timestamp parsing)
   sqlite3 (stdlib, for local snapshot storage)

--------------------------------------------------------------------------------
8. DECISIONS (CONFIRMED)
--------------------------------------------------------------------------------
   1. Patroni-awareness: NOT needed for v1. Tool targets a single instance
      (the DSN it's given, presumably always pointed at the current leader
      by whoever calls it - e.g. an Ansible playbook or a wrapper script
      that resolves the leader via the Patroni REST API beforehand).
   2. Log source: ANSIBLE-DRIVEN. Ansible is responsible for fetching/staging
      the autovacuum log lines (e.g. `ansible.builtin.fetch` pulling
      postgresql-*.log from each node, or a play that greps
      log_autovacuum_min_duration lines into a local staging file) onto the
      control/collector host BEFORE this script runs. This script's
      logs/parser.py therefore just reads local file(s) from a configured
      directory (e.g. ./staged_logs/<host>.log) - no SSH/remote-fetch logic
      needed inside the Python tool itself. Keeps the tool decoupled from
      transport; Ansible owns "how logs get here", Python owns "what they mean".
   3. Actual bloat (pgstattuple) - default to pgstattuple_approx (cheap,
      sampling) everywhere; full pgstattuple only behind --deep-scan.
   4. Multi-database iteration: loop over databases discovered from
      pg_database (excluding templates), reconnecting per database, since
      Postgres has no cross-database queries.
   5. Rich Live dashboard refresh interval kept configurable (default 30s)
      to avoid hammering pg_stat_activity / pg_stat_progress_vacuum.

--------------------------------------------------------------------------------
9. REVISED LOG FLOW (given Ansible staging)
--------------------------------------------------------------------------------
   Ansible play (outside this repo, or a companion playbook):
     1. Runs on each DB host (or Patroni node).
     2. Locates the active Postgres log file(s) (respects log_directory /
        log_filename from `SHOW` or postgresql.conf).
     3. Optionally greps only lines matching 'automatic vacuum' /
        'automatic analyze' to keep the pulled file small.
     4. Uses `fetch` (or `synchronize`) to land each host's log as
        ./staged_logs/<inventory_hostname>_postgresql.log on the control
        node / wherever avbaseline runs.

   Python side (logs/parser.py):
     - Takes --log-dir ./staged_logs (glob *.log)
     - Parses each file, tags events with source host from filename
     - No knowledge of SSH, Ansible, or inventory - pure text-in, events-out
     - Safe to re-run repeatedly (idempotent parse; dedupe by
       host+timestamp+relation when loading into SQLite snapshot store)

   This also means log parsing can run fully offline/detached from the live
   DB connection - useful since the DB collectors (settings/activity/bloat)
   and the log collector can be run on totally different schedules if wanted
   (e.g. DB stats every 30s in --live mode, logs refreshed whenever Ansible
   last ran, maybe hourly via cron).

--------------------------------------------------------------------------------
NEXT STEP
--------------------------------------------------------------------------------
Build the Python package:
  1. db.py - connection + per-database discovery/iteration
  2. collectors: settings.py, activity.py, freeze.py, bloat_stat.py (safe/cheap first)
  3. logs/parser.py - reads staged_logs/*.log (Ansible-populated), regex parse
  4. render/report.py - static Rich report combining DB collectors + log events
  5. storage/sqlite_store.py - snapshot persistence for --diff trending
  6. bloat_actual.py (pgstattuple_approx), blockers.py, workers.py, hot_updates.py
  7. render/dashboard.py - Rich Live mode last, once static report is solid
An accompanying sample Ansible playbook (fetch_autovacuum_logs.yml) should be
written alongside step 3 to define the exact staging contract (file naming,
grep pre-filter, destination dir) the parser expects.
================================================================================
