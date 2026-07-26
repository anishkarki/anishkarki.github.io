# 🐘 Principal PostgreSQL Architecture & DBA Master Cheatsheet

High-density, zero-fluff reference for Staff/Principal Engineers and DBAs. Covers storage engine internals, memory model, GUC tuning, MV concurrency, TSM extensions, autovacuum & XID wraparound, lock matrices, system catalog internals, TAM storage engines, declarative partitioning, FDW/Citus sharding, and index type optimization.

---

## 🟢 Quick Navigation

| Section | Focus |
|:---|:---|
| [1. Memory & Process Model](#1-memory--process-model) | `shared_buffers`, `work_mem`, `huge_pages`, background daemons |
| [2. Storage Engine Anatomy & Page Layout](#2-storage-engine-anatomy--page-layout) | 8KB page headers, line pointers, TOAST, FSM, Visibility Map |
| [3. GUCs & Dynamic Hot Altering](#3-gucs--dynamic-hot-altering) | GUC contexts (`postmaster` vs `sighup`), `ALTER SYSTEM`, config paths |
| [4. Logging Engine Tuning](#4-logging-engine-tuning) | `logging_collector`, slow queries, autovacuum & lock logging |
| [5. Autovacuum, Bloat & XID Wraparound](#5-autovacuum-bloat--xid-wraparound) | Vacuum formulas, cost delays, `age(datfrozenxid)`, bloat queries |
| [6. Materialized Views (MVs) & Staleness](#6-materialized-views-mvs--staleness) | `REFRESH CONCURRENTLY`, unique index rules, staleness tracking |
| [7. Table Sampling Methods (TSM)](#7-table-sampling-methods-tsm) | `BERNOULLI`, `SYSTEM`, `SYSTEM_ROWS`, `SYSTEM_TIME` extensions |
| [8. Extensions & Execution Profiling](#8-extensions--execution-profiling) | `pg_stat_statements`, `pgstattuple`, `pg_buffercache`, `EXPLAIN (BUFFERS)` |
| [9. Lock Matrix & Concurrency](#9-lock-matrix--concurrency) | 8 Lock modes conflict matrix, blocking PIDs, `pg_locks` |
| [10. Zero-Downtime DBA Operations](#10-zero-downtime-dba-operations) | `REINDEX CONCURRENTLY`, pgBouncer modes, replication streams |
| [11. System Catalog Tables & Tricky Internals](#11-system-catalog-tables--tricky-internals) | `pg_class`, `pg_depend`, `pg_index`, `pg_stats`, dependency graphs |
| [12. Storage Engines & Table Access Methods (TAM)](#12-storage-engines--table-access-methods-tam) | `USING heap`, `USING columnar`, TOAST strategy overrides |
| [13. Partitioning, FDW Sharding & Citus Tuning](#13-partitioning-fdw-sharding--citus-tuning) | Declarative Range/List/Hash, zero-downtime attach/detach, `postgres_fdw`, Citus |
| [14. Index Types & Situational Optimization](#14-index-types--situational-optimization) | B-Tree, BRIN, GIN, GiST, SP-GiST, Hash, Covering (`INCLUDE`), HNSW Vector |

---

## 1. Memory & Process Model

### Process Hierarchy
* **`postmaster` (PID 1)**: Master daemon. Listens on TCP/Unix domain socket, forks backends per connection.
* **`checkpointer`**: Flushes dirty buffers from `shared_buffers` to disk at scheduled intervals or WAL thresholds.
* **`bgwriter`**: Background writer. Continuously flushes small batches of dirty buffers to smooth out I/O spikes.
* **`walwriter`**: Flushes WAL buffer records from memory to disk (`pg_wal`).
* **`autovacuum launcher`**: Spawns `autovacuum worker` processes based on table update/delete churn thresholds.
* **`archiver`**: Copies completed WAL segment files to long-term storage/S3 (`archive_command`).
* **`wal sender / receiver`**: Manages streaming physical/logical replication to standby nodes.

### Memory Pools & Kernel Rules
```text
Total System RAM
├── Shared Memory (shared_buffers ~25% RAM | wal_buffers ~16MB | pg_buffercache)
├── Kernel OS Page Cache (~50% RAM - PostgreSQL relies heavily on OS filesystem cache)
└── Work Memory (Local per-process)
    ├── work_mem (per sort/hash join node per query) -> Max: (work_mem * active_connections * join_nodes)
    ├── maintenance_work_mem (VACUUM, CREATE INDEX, ALTER TABLE) -> (1GB - 4GB)
    └── autovacuum_work_mem (per autovacuum worker thread) -> defaults to maintenance_work_mem
```

### Critical OS Kernel Parameters (`/etc/sysctl.conf`)
```ini
vm.overcommit_memory = 2          # Strict memory allocation (prevents OOM killer panics)
vm.overcommit_ratio = 80          # Percent of RAM allocated for overcommit
vm.dirty_background_ratio = 5     # Flush dirty pages to disk early
vm.dirty_ratio = 10               # Max percentage before blocking write processes
vm.swappiness = 10                # Avoid aggressive swapping
```

---

## 2. Storage Engine Anatomy & Page Layout

### 8KB Page (Block) Binary Structure
PostgreSQL stores tables and indexes in fixed 8KB pages (`src/include/storage/bufpage.h`):

```text
+-------------------------------------------------------------------+
| PageHeaderData (24 bytes: pd_lsn, pd_checksum, pd_lower, pd_upper)|
+-------------------------------------------------------------------+
| ItemIdData Array (Line Pointers: 4 bytes each [offset, length])  | -> Grows Down
+-------------------------------------------------------------------+
|                        < Free Space >                             |
+-------------------------------------------------------------------+
| HeapTupleData (Actual tuple data & system columns)                | <- Grows Up
| Header: t_xmin | t_xmax | t_cid | t_ctid | t_infomask             |
+-------------------------------------------------------------------+
| Special Space (Index-specific data e.g. B-Tree opaque data)       |
+-------------------------------------------------------------------+
```

### Auxiliary Page Files
* **Visibility Map (`_vm`)**: Tracks 2 bits per 8KB page: `all-visible` (bypasses MVCC index-only scans) and `all-frozen` (bypasses `VACUUM` freezing scans).
* **Free Space Map (`_fsm`)**: Binary tree tracking available free byte space per page for fast insertion target lookup.
* **TOAST (The Oversized-Attribute Storage Technique)**: Triggers when tuple size exceeds `2KB` (`TOAST_TUPLE_THRESHOLD`). Splits large columns out into `pg_toast_<oid>` storage table.

| TOAST Strategy | Allowed Compression | Allowed Out-of-Line | Typical Types |
|:---|:---:|:---:|:---|
| `PLAIN` | ❌ | ❌ | Fixed-size types (`int`, `date`, `uuid`) |
| `EXTENDED` | ✅ | ✅ | Text, JSONB, Bytea (default for variable size) |
| `EXTERNAL` | ❌ | ✅ | Large text (uncompressed fast slice read) |
| `MAIN` | ✅ | ❌ | Prefer inline compression before out-of-line |

---

## 3. GUCs & Dynamic Hot Altering

### Inspect Core Paths & Configuration Parameters
```sql
SELECT name, setting, unit, context, source, sourcefile, sourceline 
FROM pg_settings 
WHERE name IN ('data_directory', 'config_file', 'hba_file', 'ident_file', 'log_directory', 'shared_buffers', 'work_mem');
```

### Hot Altering Parameters (`ALTER SYSTEM`)
```sql
-- Set parameter globally (persisted in postgresql.auto.conf)
ALTER SYSTEM SET work_mem = '128MB';
ALTER SYSTEM SET log_min_duration_statement = 250; -- ms

-- Apply SIGHUP context parameters live without downtime
SELECT pg_reload_conf();

-- Verify parameters requiring restart vs active
SELECT name, setting, pending_restart 
FROM pg_settings 
WHERE pending_restart = true;
```

---

## 4. Logging Engine Tuning

### Production Logging Setup (Zero-Downtime Hot Reload)
```sql
ALTER SYSTEM SET logging_collector = 'on';
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET log_directory = 'log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_min_duration_statement = 250; -- Log queries taking > 250ms
ALTER SYSTEM SET log_autovacuum_min_duration = 0;   -- Log ALL autovacuum activity
ALTER SYSTEM SET log_checkpoints = 'on';
ALTER SYSTEM SET log_lock_waits = 'on';
ALTER SYSTEM SET deadlock_timeout = '1s';
ALTER SYSTEM SET log_temp_files = 0;               -- Log disk spill temp files > 0 bytes
ALTER SYSTEM SET log_line_prefix = '%m [%p] %q%u@%d app=%a rx=%r ';
SELECT pg_reload_conf();
```

---

## 5. Autovacuum, Bloat & XID Wraparound

### Autovacuum Trigger Formulas
An autovacuum daemon is triggered on a relation when:
$$\text{Dead Tuples Threshold} = \text{autovacuum\_vacuum\_threshold} + (\text{autovacuum\_vacuum\_scale\_factor} \times \text{reltuples})$$

* Default: `autovacuum_vacuum_threshold = 50`, `autovacuum_vacuum_scale_factor = 0.2` (20% churn).
* High-write table tuning: Set scale factor to `0.02` (2%) or `0.005` (0.5%) per table:
  ```sql
  ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_cost_limit = 2000);
  ```

### Dead Tuples & Table Bloat Query
```sql
SELECT 
    schemaname || '.' || relname AS relation,
    n_live_tup,
    n_dead_tup,
    ROUND((n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;
```

### Transaction ID (XID) Wraparound Safety Check
PostgreSQL XID is a 32-bit counter ($2^{32} \approx 4.29 \text{ billion}$ transactions). At 2 Billion transactions, database shuts down to prevent data corruption unless frozen!

```sql
SELECT 
    datname,
    age(datfrozenxid) AS xid_age,
    2147483648 - age(datfrozenxid) AS tx_until_wraparound_shutdown,
    ROUND((age(datfrozenxid)::numeric / 2000000000::numeric) * 100, 2) AS wraparound_risk_pct
FROM pg_database
ORDER BY xid_age DESC;
```

---

## 6. Materialized Views (MVs) & Staleness

### Non-Blocking Concurrent MV Refresh
`REFRESH MATERIALIZED VIEW CONCURRENTLY` creates a temporary diff without taking exclusive read locks.

```sql
-- 1. Create MV
CREATE MATERIALIZED VIEW mv_user_metrics AS
SELECT user_id, COUNT(*) AS total_tx, SUM(amount) AS total_spent
FROM transactions GROUP BY user_id WITH DATA;

-- 2. MANDATORY: Create Unique Index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_user_metrics_uid ON mv_user_metrics (user_id);

-- 3. Non-blocking Refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_metrics;
```

### MV Staleness & Definition Inspection
```sql
SELECT 
    schemaname || '.' || matviewname AS mv_name,
    ispopulated,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(matviewname))) AS size
FROM pg_matviews;
```

---

## 7. Table Sampling Methods (TSM)

```sql
-- BERNOULLI: Row-level sampling (Scans full table blocks, true random)
SELECT * FROM orders TABLESAMPLE BERNOULLI(1.0); -- 1% of rows

-- SYSTEM: Block-level sampling (Fastest, picks random 8KB pages)
SELECT * FROM orders TABLESAMPLE SYSTEM(0.5);    -- 0.5% of blocks

-- Custom TSM Extensions
CREATE EXTENSION IF NOT EXISTS tsm_system_rows;
CREATE EXTENSION IF NOT EXISTS tsm_system_time;

-- Sample exact 500 rows
SELECT * FROM orders TABLESAMPLE SYSTEM_ROWS(500);

-- Sample for max execution duration (e.g. 25 milliseconds)
SELECT * FROM orders TABLESAMPLE SYSTEM_TIME(25);
```

---

## 8. Extensions & Execution Profiling

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgstattuple;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Top Slow Queries (`pg_stat_statements`)
```sql
SELECT 
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) AS hit_pct,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 10;
```

### Deep Buffer Pool Cache Breakdown per Relation (`pg_buffercache`)
```sql
SELECT 
    c.relname,
    pg_size_pretty(count(*) * 8192) AS cached_size,
    ROUND(100.0 * count(*) / (SELECT setting FROM pg_settings WHERE name='shared_buffers')::integer, 2) AS buffer_pct
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode = pg_relation_filenode(c.oid)
JOIN pg_database d ON (b.reldatabase = d.oid AND d.datname = current_database())
GROUP BY c.relname ORDER BY count(*) DESC LIMIT 10;
```

### Execution Plan Deep Inspection
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, WAL, SETTINGS)
SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## 9. Lock Matrix & Concurrency

### PostgreSQL Lock Conflict Matrix (8 Lock Levels)

| Requested Lock Mode | ACCESS SHARE | ROW SHARE | ROW EXCL | SHARE UPDATE EXCL | SHARE | SHARE ROW EXCL | EXCLUSIVE | ACCESS EXCLUSIVE |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ACCESS SHARE** (`SELECT`) | | | | | | | | ❌ |
| **ROW SHARE** (`SELECT FOR UPDATE`) | | | | | | | ❌ | ❌ |
| **ROW EXCLUSIVE** (`INSERT/UPDATE/DELETE`) | | | | | | ❌ | ❌ | ❌ |
| **SHARE UPDATE EXCLUSIVE** (`VACUUM`, `ANALYZE`) | | | | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SHARE** (`CREATE INDEX`) | | | | ❌ | | ❌ | ❌ | ❌ |
| **SHARE ROW EXCLUSIVE** | | | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **EXCLUSIVE** | | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ACCESS EXCLUSIVE** (`ALTER TABLE`, `DROP`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Blocking Locks & Lock Waiter Diagnosis
```sql
SELECT 
    blocked_locks.pid     AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid    AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 10. Zero-Downtime DBA Operations

### Non-Blocking Index Operations
```sql
-- Build index concurrently without taking AccessExclusiveLock
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Rebuild bloated index concurrently without blocking writes
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Rebuild all indexes on a relation concurrently
REINDEX TABLE CONCURRENTLY users;
```

### Terminate Connections & Cancel Backend PIDs
```sql
-- Cancel currently executing query on PID (Soft signal)
SELECT pg_cancel_backend(835);

-- Force disconnect backend process immediately (Hard signal)
SELECT pg_terminate_backend(835);

-- Disconnect all idle connections older than 15 minutes
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '15 minutes';
```

### Physical Streaming Replication Monitoring
```sql
-- Run on Primary: Check standby lag bytes & state
SELECT 
    client_addr,
    usename,
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sent_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- Run on Standby: Check replication receiver status
SELECT 
    status,
    receive_start_lsn,
    written_lsn,
    flushed_lsn,
    last_msg_send_time,
    last_msg_receipt_time
FROM pg_stat_wal_receiver;
```

---

## 11. System Catalog Tables & Tricky Internals

The core `pg_catalog` system tables store metadata for every relation, index, column, dependency, and statistic in the engine.

### Essential System Catalog Reference

| System Table | Purpose & Key Columns | Tricky DBA Target |
|:---|:---|:---|
| **`pg_class`** | Master catalog for relations (`r`=table, `i`=index, `m`=MV, `t`=TOAST). Cols: `relname`, `relkind`, `reltuples`, `relpages`, `relfrozenxid`, `reloptions`. | Inspect per-table autovacuum overrides & frozen XID age |
| **`pg_attribute`** | Defines all columns. Cols: `attrelid`, `attname`, `atttypid`, `attnum` (System cols: `-1` `xmin`, `-3` `xmax`, `-5` `ctid`). | Inspect hidden system columns & dropped column remnants (`attisdropped`) |
| **`pg_index`** | Index definitions & build state. Cols: `indrelid`, `indexrelid`, `indisunique`, `indisvalid`, `indisready`, `indkey`. | **Find broken/invalid indexes** (`indisvalid = false`) that waste disk space |
| **`pg_constraint`** | Table constraints (`p`=PK, `f`=FK, `u`=Unique, `c`=Check, `x`=Exclusion). Cols: `conname`, `contype`, `condeferrable`, `condeferred`. | Find deferred or unvalidated foreign key constraints |
| **`pg_depend`** | **Object Dependency Graph**. Cols: `classid`, `objid`, `refclassid`, `refobjid`, `deptype` (`n`=normal, `a`=auto, `i`=internal, `e`=ext, `p`=pin). | **Find what object blocks dropping a table/type/column** |
| **`pg_shdepend`** | Shared global cluster dependencies across databases (Roles, Tablespaces). | Find roles or tablespaces blocking `DROP ROLE` |
| **`pg_statistic` / `pg_stats`** | Query planner statistics (`most_common_vals`, `histogram_bounds`, `correlation`). | **Physical disk order vs logical order correlation** (low correlation = high random disk I/O) |
| **`pg_statistic_ext`** | Multivariate extended statistics (`dependencies`, `ndistinct`, `mcv`). | Detect cross-column correlation query optimizer misestimates |
| **`pg_db_role_setting`** | Persistent GUC overrides per role or database (`ALTER ROLE/DATABASE SET`). | **Find hidden GUC parameters** overriding global `postgresql.conf` |
| **`pg_replication_slots`** | Replication slot state. Cols: `slot_name`, `plugin`, `active`, `wal_status`, `restart_lsn`, `confirmed_flush_lsn`. | **Find inactive replication slots** causing `pg_wal` disk bloat |
| **`pg_am` / `pg_amop`** | Index Access Methods (btree, hash, gist, gin, brin) and operator families. | Audit custom indexing operator classes |

### 1. Find Invalid/Corrupted Indexes (`indisvalid = false`)
```sql
SELECT 
    i.indexrelid::regclass AS invalid_index_name,
    c.relname AS parent_table,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS wasted_size
FROM pg_index i
JOIN pg_class c ON c.oid = i.indrelid
WHERE NOT i.indisvalid;
```

### 2. Dependency Graph Tracer (`pg_depend`) - Find What Blocks a DROP
```sql
SELECT 
    deptype,
    classid::regclass AS dependent_object_type,
    objid::regclass   AS dependent_object_name,
    refclassid::regclass AS target_object_type,
    refobjid::regclass   AS target_object_name
FROM pg_depend
WHERE refobjid = 'orders'::regclass;
```

### 3. Detect Disk Correlation Misalignment (Low Correlation = Random I/O Penalty)
```sql
SELECT tablename, attname, correlation, n_distinct
FROM pg_stats
WHERE schemaname = 'public' AND ABS(correlation) < 0.2 AND correlation IS NOT NULL
ORDER BY ABS(correlation) ASC;
```

### 4. Find Hidden Per-Role / Per-Database Parameter Overrides (`pg_db_role_setting`)
```sql
SELECT d.datname AS database, r.rolname AS role, s.setconfig AS custom_guc_overrides
FROM pg_db_role_setting s
LEFT JOIN pg_database d ON d.oid = s.setdatabase
LEFT JOIN pg_roles r ON r.oid = s.setrole;
```

---

## 12. Storage Engines & Table Access Methods (TAM)

PostgreSQL abstracts its table storage via the **Table Access Method (TAM)** API (`USING <method>`). Default is `heap`.

### Inspect Registered Table Access Methods
```sql
SELECT oid, amname, amhandler, amtype 
FROM pg_am 
WHERE amtype = 't';
```

### Changing Storage Engines & Access Methods
```sql
-- 1. Create table with default HEAP storage engine (MVCC 8KB pages)
CREATE TABLE transactional_orders (
    id uuid PRIMARY KEY,
    amount numeric
) USING heap;

-- 2. Create table with COLUMNAR storage engine (Citus / Hydra columnar extension for OLAP)
CREATE TABLE analytics_logs (
    event_time timestamptz,
    user_id bigint,
    payload jsonb
) USING columnar;

-- 3. Convert existing table storage engine
ALTER TABLE analytics_logs SET ACCESS METHOD heap;
```

### Column TOAST Strategy Overrides (`SET STORAGE`)
```sql
-- Force column to never compress or move out-of-line
ALTER TABLE users ALTER COLUMN metadata SET STORAGE PLAIN;

-- Allow column to move out-of-line WITHOUT inline compression (Faster slice reads)
ALTER TABLE logs ALTER COLUMN raw_payload SET STORAGE EXTERNAL;
```

---

## 13. Partitioning, FDW Sharding & Citus Tuning

### Declarative Partitioning Types (Range, List, Hash)

```sql
-- 1. RANGE PARTITIONING (Time-Series / Date Brackets)
CREATE TABLE metrics_parent (
    metric_id uuid NOT NULL,
    created_at timestamptz NOT NULL,
    val numeric
) PARTITION BY RANGE (created_at);

CREATE TABLE metrics_y2026m01 PARTITION OF metrics_parent
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

-- 2. LIST PARTITIONING (Region / Multi-Tenant Isolation)
CREATE TABLE users_parent (
    user_id uuid NOT NULL,
    region text NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE users_us PARTITION OF users_parent FOR VALUES IN ('US-EAST', 'US-WEST');
CREATE TABLE users_eu PARTITION OF users_parent FOR VALUES IN ('EU-CENTRAL', 'EU-WEST');

-- 3. HASH PARTITIONING (Parallel Horizontal Scale)
CREATE TABLE events_parent (
    device_id uuid NOT NULL,
    payload jsonb
) PARTITION BY HASH (device_id);

CREATE TABLE events_h0 PARTITION OF events_parent FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_h1 PARTITION OF events_parent FOR VALUES WITH (MODULUS 4, REMAINDER 1);
```

### Zero-Downtime Partition Attach & Detach (`CONCURRENTLY`)
```sql
-- 1. Detach old partition concurrently without blocking queries on parent
ALTER TABLE metrics_parent DETACH PARTITION metrics_y2025m12 CONCURRENTLY;

-- 2. Attach new partition ZERO-LOCKING (Pre-validate CHECK constraint first!)
ALTER TABLE metrics_y2026m02 ADD CONSTRAINT chk_date_range 
    CHECK (created_at >= '2026-02-01 00:00:00+00' AND created_at < '2026-03-01 00:00:00+00');

-- Fast attach (bypasses full table validation lock because constraint matches!)
ALTER TABLE metrics_parent ATTACH PARTITION metrics_y2026m02 
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
```

### Partitioning Performance Tuning GUCs
```sql
ALTER SYSTEM SET enable_partition_pruning = 'on';           -- Bypasses unneeded partitions
ALTER SYSTEM SET enable_partitionwise_join = 'on';          -- Joins matching partitions directly
ALTER SYSTEM SET enable_partitionwise_aggregate = 'on';     -- Pushes GROUP BY down to partitions
SELECT pg_reload_conf();
```

---

### Native Foreign Data Wrapper Sharding (`postgres_fdw`)

```sql
-- 1. Install FDW on Coordinator Node
CREATE EXTENSION postgres_fdw;

-- 2. Register Remote Shard Server Node
CREATE SERVER shard_node_2 FOREIGN DATA WRAPPER postgres_fdw 
    OPTIONS (host '10.0.0.2', port '5432', dbname 'prod_shard2');

-- 3. Map Local Auth to Remote Node
CREATE USER MAPPING FOR postgres SERVER shard_node_2 
    OPTIONS (user 'shard_user', password 'secure_password');

-- 4. Attach Foreign Table as a Partition of Local Parent Table
CREATE FOREIGN TABLE events_shard2 PARTITION OF events_parent 
    FOR VALUES WITH (MODULUS 4, REMAINDER 2) 
    SERVER shard_node_2 OPTIONS (table_name 'remote_events_h2');
```

---

### Distributed Cluster Sharding with Citus Extension

```sql
-- 1. Initialize Citus Extension on Coordinator Node
CREATE EXTENSION citus;

-- 2. Add Worker Nodes to Cluster
SELECT citus_add_node('worker-1.internal', 5432);
SELECT citus_add_node('worker-2.internal', 5432);

-- 3. Shard & Distribute Table by Hash Key across all worker nodes
SELECT create_distributed_table('user_events', 'user_id');

-- 4. Create Replicated Reference Table (Synced across every worker for fast zero-network joins)
SELECT create_reference_table('event_types');

-- 5. Inspect Shard Distribution across Worker Cluster
SELECT * FROM citus_shards;
```

---

## 14. Index Types & Situational Optimization

### Index Types & Operator Class Matrix

| Index Access Method | Ideal Data Types & Scenarios | Supported Operators | Disk Footprint & Write Overhead |
|:---|:---|:---|:---|
| **B-Tree** (`USING btree`) | Unique IDs, Primary Keys, Dates, Strings. Equality & Range scans (`WHERE x = 1`, `WHERE x > 100`, `ORDER BY`). | `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL` | **Baseline** (Medium size, low write penalty). Self-balancing tree. |
| **BRIN** (`USING brin`) | Ultra-large append-only tables (Logs, Time-Series metrics naturally sorted on disk). | `=`, `<`, `<=`, `>`, `>=` | **~1000x Smaller** than B-Tree (10MB for 50GB table). Min/max per 128 blocks. |
| **GIN** (`USING gin`) | Multi-value composite columns: JSONB (`jsonb_path_ops`), Full-Text (`tsvector`), Arrays (`anyarray`). | `@>`, `<@`, `?`, `?|`, `?&`, `@@`, `&&` | Larger than B-Tree, heavy write cost (buffered via `fastupdate = on`). |
| **GiST** (`USING gist`) | Geometric/Spatial (`geometry`), Date/Numeric Ranges (`daterange`), Exclusion constraints (`EXCLUDE USING gist`). | `&&` (overlap), `@>` (contains), `<@` (within), `<<` (left of) | Medium-large. Balanced lossy/lossless tree structure. |
| **SP-GiST** (`USING spgist`) | Space-partitioned non-balanced data (IP addresses `inet`, Phone numbers, Radix trees, Quad-trees). | `=`, `<<`, `<<=`, `>>`, `>>=` | Compact size, fast for skewed hierarchical distribution. |
| **Hash** (`USING hash`) | Exact equality lookups (`=`) on extremely long strings/hashes. | `=` only | Smaller than B-Tree for huge text, crash-safe (PG 10+), **no range/sorting**. |

---

### Advanced Indexing Strategies & Syntax

#### 1. Covering Index (`INCLUDE` Clause - Zero Heap-Scan Lookups)
Store non-indexed payload columns directly in leaf nodes of a B-Tree index to allow **Index-Only Scans**:

```sql
-- Query: SELECT status, total_amount FROM orders WHERE user_id = 42;
CREATE INDEX idx_orders_user_covering 
ON orders (user_id) 
INCLUDE (status, total_amount);
```

#### 2. Partial Indexing (95%+ Storage Reduction for Skewed States)
Only index rows that match a specific predicate (e.g. pending background jobs or active subscriptions):

```sql
-- Query: SELECT * FROM jobs WHERE status = 'PENDING';
CREATE INDEX idx_jobs_pending 
ON jobs (created_at) 
WHERE status = 'PENDING';
```

#### 3. Expression & Functional Indexing
Index the result of a deterministic function to avoid full table scans on transformed columns:

```sql
-- Query: SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
CREATE INDEX idx_users_lower_email 
ON users (LOWER(email));

-- Query: SELECT * FROM events WHERE (payload->>'user_id')::bigint = 1001;
CREATE INDEX idx_events_json_user_id 
ON events (((payload->>'user_id')::bigint));
```

#### 4. Trigram Fuzzy Search Index (`pg_trgm` + GIN / GiST)
Accelerate `LIKE '%substring%'` or regex queries that usually force full table scans:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast LIKE '%johnson%' wildcard searches
CREATE INDEX idx_users_name_trgm ON users USING gin (full_name gin_trgm_ops);
```

#### 5. AI Vector Embedding Index (`pgvector` - HNSW vs IVFFlat)
For AI vector similarity search ($L_2$ distance `<->`, Inner product `<#>`, Cosine distance `<=>`):

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW Index (Hierarchical Navigable Small World - High Recall, Fast Search)
CREATE INDEX idx_items_embedding_hnsw 
ON items USING hnsw (embedding vector_l2_ops) 
WITH (m = 16, ef_construction = 64);
```
