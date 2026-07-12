---
title: "Autovacuum Baseline Maker: Design Notes"
date: "2026-07-12"
category: "PostgreSQL Administration"
tags: ["PostgreSQL", "Autovacuum", "Python", "CLI", "Rich", "SQLite", "Monitoring"]
excerpt: "Architectural blueprint and design specification for building a Python-based CLI tool and Live Rich Dashboard to collect, analyze, and trend PostgreSQL autovacuum baselines."
author: "Anish Karki"
featured: true
---

# Autovacuum Baseline Maker: Design Notes

## Goal
A Python CLI tool that connects to Postgres (single or multi-DB/cluster), collects a full autovacuum baseline (settings, activity, bloat, wraparound risk, log-derived events), and renders it as a live/refreshable dashboard using **Rich**.

Output should also be persistable (JSON/CSV/SQLite) so baselines can be diffed over time (trend analysis), which is the whole point of a "baseline".

---

## 1. Architecture

```text
avbaseline/
  __init__.py
  cli.py                 -> argparse/typer entrypoint, orchestrates everything
  config.py              -> connection info (dsn per cluster/db), thresholds, yaml config
  db.py                  -> psycopg2/psycopg3 connection pooling, per-db iteration
  collectors/
    settings.py          -> global GUCs + per-table reloptions + effective merge
    activity.py          -> pg_stat_user_tables / pg_stat_all_tables snapshots
    freeze.py            -> relfrozenxid/datfrozenxid age, multixact age, wraparound risk %
    bloat_stat.py        -> pg_stats-based statistical bloat estimate query
    bloat_actual.py      -> pgstattuple/pgstattuple_approx actual bloat (size-gated)
    index_bloat.py       -> separate index bloat estimate (btree)
    activity_blockers.py -> long-running txns, idle-in-transaction, replication slots
    workers.py           -> autovacuum_max_workers vs current running workers/contention
    hot_updates.py       -> HOT update ratio per table
  logs/
    parser.py            -> tails/reads postgres log, regex-parses autovacuum + wraparound entries
    models.py            -> dataclasses for parsed log events
  storage/
    sqlite_store.py      -> persist each run as a snapshot row set for trending
    export.py            -> JSON/CSV export
  render/
    dashboard.py         -> Rich Live dashboard, tables/panels/progress bars
    report.py            -> static Rich console report (non-live, for CI/cron output)
  scheduler.py           -> optional: run on interval, write snapshots, no dashboard (cron mode)
```

---

## 2. Data to Collect (Full Checklist)

### A) Settings Layer
* **Global GUCs** (`SHOW` / `pg_settings`):
  * `autovacuum`, `autovacuum_max_workers`, `autovacuum_naptime`
  * `autovacuum_vacuum_threshold`, `autovacuum_vacuum_scale_factor`
  * `autovacuum_vacuum_insert_threshold`, `autovacuum_vacuum_insert_scale_factor`
  * `autovacuum_analyze_threshold`, `autovacuum_analyze_scale_factor`
  * `autovacuum_freeze_max_age`, `autovacuum_multixact_freeze_max_age`
  * `autovacuum_vacuum_cost_delay`, `autovacuum_vacuum_cost_limit`
  * `vacuum_cost_limit`, `maintenance_work_mem`
* **Per-Table Reloptions** (`pg_class.reloptions` / `pg_options_to_table` overrides)
* **Effective Settings Per Table**: Merged result of `global` and `per-table override` GUCs.
* **Storage Parameters**: `fillfactor` and other parameters relevant to bloat.

### B) Activity / Stats Layer (`pg_stat_user_tables`, `pg_stat_all_tables`)
* `n_live_tup`, `n_dead_tup`, `n_mod_since_analyze`
* `last_vacuum`, `last_autovacuum`, `last_analyze`, `last_autoanalyze`
* `vacuum_count`, `autovacuum_count`, `analyze_count`, `autoanalyze_count`
* **Dead Tuple Ratio**: `n_dead_tup / nullif(n_live_tup + n_dead_tup, 0)`
* `n_tup_ins`, `n_tup_upd`, `n_tup_del`, `n_tup_hot_upd`
* `pg_stat_progress_vacuum` (live in-flight vacuum: phase, heap_blks scanned/total)
* **TOAST Tables**: Tracked separately by joining `pg_class.reltoastrelid` to its own stat row.

### C) Freeze / Wraparound Layer
* `age(relfrozenxid)` per table, `age(datfrozenxid)` per database
* `mxid_age(relminmxid)` per table
* **Freeze Max Age Distance**: `%` distance to `autovacuum_freeze_max_age` (early warning ranking)
* **Multixact Freeze Max Age Distance**: `%` distance to `autovacuum_multixact_freeze_max_age`
* **Aggressive Vacuum Flag**: Checks if the next vacuum will be forced-aggressive (`age > freeze_max_age`).

### D) Bloat Layer
* **Statistical Bloat Estimate**: Built using the `pg_stats` `avg_width`/`null_frac` formula (cheap, safe, runs on all tables).
* **Actual Bloat**: Computed using `pgstattuple` / `pgstattuple_approx` (accurate but scans table; gated by table size, e.g., skip or warn above $N$ GB unless --force).
* **Index Bloat Estimate**: Separate B-tree index bloat query.
* **Side-by-Side Comparison**: Reports both `estimated_bloat_pct` and `actual_bloat_pct` side by side.

### E) Log-Derived Layer
*Requires `log_autovacuum_min_duration` set to `0` or a low millisecond threshold.*
* **Standard Log Parser**: Extracts pages removed/remain, tuples removed/remain, buffer usage (hit/miss/dirtied), WAL records/bytes, I/O timing (read/write), and duration (ms).
* **Forced Vacuum Diagnostics**: Detects "aggressive" / anti-wraparound forced vacuum log signatures vs normal runs.
* **Frequency Tracker**: Calculates the interval between autovacuum runs on each table.
* **Duration Trend**: Monitors whether vacuum runs are taking longer over time (indicating falling behind).
* **Skipped Autovacuums**: Identifies lock conflicts where a regular autovacuum could not run because a conflicting lock was held. (Rising skip counts are a leading indicator of future anti-wraparound forced vacuums; this is tracked as a standalone metric per table).
* **Multi-Index-Phase Detection**: Parses whether a VACUUM required multiple index scan passes (`index scans: N` where $N > 1$). This signals that `maintenance_work_mem` / `autovacuum_work_mem` is too low, or that too many dead rows accumulated.
* *Note: The Skipped Autovacuums KPI and multi-index-phase breakdown align directly with features on the pganalyze VACUUM Advisor Performance page.*

### F) Blockers / Contention Layer
* **Long-Running Transactions**: Scans `pg_stat_activity` for `xact_start`, `state`, and active `query`.
* **Idle-in-Transaction Sessions**: Sessions holding back the `xmin` horizon.
* **Catalog/Oldest xmin Holders**: Oldest active snapshot holder (`backend_xmin`).
* **Replication Slots**: Checks for slots holding back `xmin` or `catalog_xmin` (`pg_replication_slots`).
* **Prepared Transactions** (`pg_prepared_xacts`): Transactions holding back the `xmin` boundary.
* **Autovacuum Worker Contention**: Compares `autovacuum_max_workers` to running worker processes.

### G) Derived / Computed Metrics
* **Table Risk Score**: A single priority score combining freeze age %, dead tuple ratio, bloat %, time since last run, table size, skipped-vacuum count, and multi-index-phase frequency.
* **Never-Vacuumed Tables**: Detects tables never vacuumed or analyzed since creation.
* **Stale reloptions**: Flag tables where reloption overrides are stale or forgotten (e.g., set >1 year ago).
* **Growth Correlation**: Correlates data churn rate with bloat trajectory over multiple snapshots.
* **Vacuum Simulator (Stretch Goal)**: Uses historical stats to simulate autovacuum timing under different configurations (thresholds/scale factors).

---

## 3. SQL Sources Reference
* **System Catalogs & Views**:
  `pg_settings`, `pg_class`, `pg_namespace`, `pg_stat_user_tables`, `pg_stat_all_tables`, `pg_stat_progress_vacuum`, `pg_stat_activity`, `pg_replication_slots`, `pg_prepared_xacts`, `pg_stats`, `pg_database` (datfrozenxid), `pg_class` (relfrozenxid, relminmxid, reloptions), `pg_indexes`, and `pg_index`.
* **Required Extensions**: `pgstattuple` (`CREATE EXTENSION IF NOT EXISTS pgstattuple;`).
* **Prerequisites**: Low `log_autovacuum_min_duration` threshold and read access to logs (syslog, CSV log, or pgBadger output).

---

## 4. Rich Visualisation Plan
Uses `rich.live.Live` for a refreshable dashboard, and `rich.layout.Layout` to partition the screen into structural regions.

### Layout Regions
* **Header**: Cluster name, timestamp, PG version, and connection status.
* **Top Summary Panel**: Active DB count, scanned tables, danger-zone tables, autovacuum worker saturation, and oldest freeze age.
* **Main Table**: Sortable list of tables by risk score. Uses colored status badges: `[red]WRAPAROUND[/]`, `[yellow]STALE[/]`, `[orange]BLOATED[/]`, and `[cyan]NEVER-VACUUMED[/]`.
* **Progress Bars**: Visualizes freeze age % to `autovacuum_freeze_max_age` and in-flight vacuum progress.
* **Side Panel**: Oldest active transactions and transaction-blocking sessions.
* **Bottom Panel**: Tail of recent parsed autovacuum log events.

---

## 5. Baseline & Trending
* **Snapshots**: Every collector run is stored with a unique `run_id` and timestamp.
* **SQLite Persistence**: Runs are stored locally in SQLite to allow snapshot diffing over time.
* **Exports**: Support exporting runs to JSON/CSV for ingestion into external dashboards (e.g., Grafana).
* **Diff Engine**: CLI command `--diff <run_a> <run_b>` prints delta comparisons of bloat growth, freeze age progression, and new never-vacuumed tables.

---

## 6. CLI Design
```bash
# Start a live monitoring dashboard
avbaseline scan --dsn postgresql://... [--all-databases] [--live] [--interval 30]

# Load connection settings from yaml config
avbaseline scan --config clusters.yaml --live

# Create a static JSON report
avbaseline report --dsn ... --out baseline_2026-07-12.json

# Diff two historical snapshots
avbaseline diff --run-a 12 --run-b 15

# Tail active postgresql logs for autovacuum events
avbaseline logs --logfile /var/log/postgresql/postgresql.log --tail
```

*Flags: `--skip-actual-bloat` (runs only `pgstattuple_approx`), `--max-table-size-gb 10` (gates actual scans), `--min-risk-score` (filters priority table list).*

---

## 7. Dependencies
* `psycopg[binary]`
* `rich`
* `typer`
* `pyyaml`
* `python-dateutil`
* `sqlite3`

---

## 8. Decisions
1. **Patroni-awareness**: Not needed for v1. The tool targets a single specified DSN; leader detection is handled upstream (e.g., via Patroni REST API inside Ansible).
2. **Log Source (Ansible-Driven)**: Log staging is decoupled from Python. Ansible gathers active log segments from database hosts and copies them locally to `./staged_logs/<host>.log` before `avbaseline` runs.
3. **Actual Bloat (pgstattuple)**: Default to `pgstattuple_approx` everywhere; full `pgstattuple` scans require the `--deep-scan` flag.
4. **Multi-Database Iteration**: Automatically discovers databases from `pg_database` and reconnects to iterate catalog metrics.

---

## 9. Revised Log Flow (Ansible Staging)

### Ansible Task Contract
1. Find log directories on each target DB node.
2. Filter for lines containing `'automatic vacuum'` or `'automatic analyze'`.
3. Fetch/sync lines to `./staged_logs/<inventory_hostname>_postgresql.log` on the controller node.

### Python Parser Routine (`logs/parser.py`)
1. Glob files in `./staged_logs/*.log`.
2. Extract host info from filename and regex-parse standard autovacuum lines.
3. Decoupled execution allows logs to be analyzed offline without requiring active database connections.

---

## Next Step
Build the Python package:
1. `db.py` - connection pooling and multi-DB loop discovery.
2. `collectors/` - base collectors for settings, activity, freeze limits, and statistical bloat.
3. `logs/parser.py` - offline regex engine parsing Ansible-staged log files.
4. `render/report.py` - static console reporter compiling metrics and log alerts.
5. `storage/sqlite_store.py` - SQLite snapshot storage engine.
6. `render/dashboard.py` - Live Rich Terminal layout dashboard.
