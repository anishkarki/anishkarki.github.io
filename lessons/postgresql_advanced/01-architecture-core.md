# PostgreSQL Architecture & Core Internals

Understanding PostgreSQL's process hierarchy, memory management, and on-disk file layout is essential for performance tuning, crash troubleshooting, and enterprise database administration. This chapter covers the deep inner workings of the database engine from memory to disk.

---

## 1. Process Architecture & Process Hierarchy

PostgreSQL operates using a **multi-process architecture** (historically forked, with process-per-connection isolation) rather than a multi-threaded architecture.

```text
                               +-----------------------------+
                               |     postmaster (PID 1)      |
                               +--------------+--------------+
                                              |
       +--------------------+-----------------+--------------------+--------------------+
       |                    |                 |                    |                    |
       v                    v                 v                    v                    v
+--------------+     +--------------+  +--------------+     +--------------+     +--------------+
|   Backend    |     | Checkpointer |  |  BGWriter    |     |  WALWriter   |     |  Autovacuum  |
|  Workers     |     | (Checkpoints)|  | (Dirty Clean)|     | (WAL Flush)  |     |   Launcher   |
+--------------+     +--------------+  +--------------+     +--------------+     +--------------+
```

1. **Postmaster (Daemon Process)**: The master supervisor process that listens on TCP port 5432 and Unix domain sockets. When a client connects, Postmaster authenticates the connection and `fork()`s a dedicated **Backend Worker Process**.
2. **Backend Worker Processes**: Dedicated processes serving client sessions. Each backend executes query parsing, planning, execution, and local transaction state.
3. **Checkpointer**: Periodically issues database checkpoints, ensuring dirty shared buffers are written and synced (`fsync`) to disk, and updates the cluster state in `pg_control`.
4. **Background Writer (BGWriter)**: Proactively writes small batches of dirty shared buffers to storage in the background so that backend workers almost always find clean buffer pages immediately without waiting for disk I/O.
5. **WAL Writer**: Periodically flushes WAL records from the shared WAL ring buffers to the on-disk Write-Ahead Log (`pg_wal/`).
6. **Autovacuum Launcher & Workers**: Spawns worker processes to remove dead row versions (MVCC cleanup), update Free Space Maps (`_fsm`) and Visibility Maps (`_vm`), and prevent Transaction ID (XID) wraparound.
7. **Archiver & Stats Collector**: Ships WAL segments for continuous archiving/PITR and aggregates runtime query metrics.

---

## 2. Memory Architecture: Shared vs. Local Memory

PostgreSQL divides its memory footprint into two distinct categories: **Shared Memory** (shared among all database processes via IPC / POSIX shared memory) and **Local Memory** (allocated independently inside each backend process).

```text
+-----------------------------------------------------------------------------------------------+
|                                  POSTGRESQL MEMORY HIERARCHY                                  |
+---------------------------------------------------------------+-------------------------------+
|                 SHARED MEMORY (GLOBAL IPC)                   |    LOCAL MEMORY (PER BACKEND)  |
+---------------------------------------------------------------+-------------------------------+
| * Shared Buffers: Caches 8 KB table/index pages.              | * work_mem: Sorts, hashes,    |
| * WAL Buffers: Holds unwritten WAL log records.               |   materialization per node.   |
| * Lock Manager: Heavyweight locks and lightweight latches.    | * maintenance_work_mem:       |
| * CLOG / pg_xact: Active and historical transaction states.   |   VACUUM, CREATE INDEX, FKs.  |
| * ProcArray: Array of active backends and snapshots for MVCC. | * temp_buffers: Session temp  |
| * Dynamic Shared Memory (DSM): Parallel query workers.        |   tables and temporary state. |
+---------------------------------------------------------------+-------------------------------+
```

### Shared Memory Allocations
- **`shared_buffers`**: The primary cache for 8 KB data pages. Typically sized to 25% to 40% of total system RAM on dedicated database servers.
- **`wal_buffers`**: Dedicated ring buffer for staging WAL records before writing to disk (defaults to 1/32 of `shared_buffers`, capped at 16MB).
- **`CLOG` (`pg_xact`)**: An in-memory cache of transaction statuses (COMMITTED, ABORTED, IN_PROGRESS, SUB_COMMITTED) using 2 bits per transaction ID.
- **Lock Manager**: Manages table-level locks, row-level lock pointers, and buffer pin arrays.

### Local Memory Allocations (Per Backend Session)
- **`work_mem`**: Allocated per sort/hash operation within a query plan (a complex query with 4 sorts and 2 hashes may allocate `6 * work_mem`).
- **`maintenance_work_mem`**: Used by maintenance tasks such as `VACUUM`, `CREATE INDEX`, and `ALTER TABLE ADD FOREIGN KEY`.
- **`temp_buffers`**: Memory dedicated exclusively to session-local temporary tables.

---

## 3. PostgreSQL Data Directory Structure

The cluster data directory (`/var/lib/postgresql/data` or `$PGDATA`) contains the entire database storage structure:

| File / Directory | Purpose & Significance |
| :--- | :--- |
| **`pg_control`** | Cluster-wide metadata, latest checkpoint LSN, system identifier, database state, and timeline ID. **Critical for crash recovery**. |
| **`base/`** | The core storage directory containing subdirectories for each database OID, holding table and index binary data files. |
| **`pg_wal/`** | Write-Ahead Log segments (typically 16MB each). Vital for durability, crash recovery, replication streaming, and point-in-time recovery (PITR). |
| **`pg_xact/`** | Transaction commit status pages (CLOG). Tracks which transaction IDs have committed or aborted. |
| **`pg_tblspc/`** | Symbolic links pointing to custom tablespace storage locations outside the default `$PGDATA`. |
| **`<filenode>`** | Table/Index physical data file stored in 8 KB pages. Segmented into 1 GB chunks (`<filenode>.1`, `<filenode>.2`). |
| **`<filenode>_fsm`** | **Free Space Map**: Tracks available free space across each 8 KB page to accelerate INSERT and UPDATE operations. |
| **`<filenode>_vm`** | **Visibility Map**: Tracks which 8 KB pages contain only tuples visible to all transactions (enables **Index-Only Scans** and speeds up VACUUM). |
| **`pg_stat/`** | Persistent statistics subsystem data across clean restarts. |
| **`pg_stat_tmp/`** | Ephemeral runtime statistics files. |
| **`pg_logical/`** | Logical replication slot metadata, replication origins, and decoding states. |
| **`pg_replslot/`** | Physical and logical replication slot states preventing WAL cleanup before replicas consume them. |

---

## 4. 8KB Page Internals & MVCC Storage Layout

PostgreSQL manages both heap tables and indexes in standard **8192-byte (8 KB)** pages on disk and in `shared_buffers`.

```text
+-----------------------------------------------------------------------------------+
| 8 KB (8192 Bytes) Page Layout                                                    |
+-----------------------------------------------------------------------------------+
| PageHeaderData (24 Bytes): pd_lsn, pd_checksum, pd_flags, pd_lower, pd_upper      |
+-----------------------------------------------------------------------------------+
| Line Pointer 1 (ItemIdData - 4B) -> Offset to Tuple 1                             |
| Line Pointer 2 (ItemIdData - 4B) -> Offset to Tuple 2                             |
| Line Pointer 3 (ItemIdData - 4B) -> [Grows Downwards --> pd_lower]                |
+-----------------------------------------------------------------------------------+
|                             FREE SPACE HOLE                                       |
|               (Space available for new line pointers & tuples)                    |
+-----------------------------------------------------------------------------------+
| Tuple 3 (HeapTupleHeaderData + Payload) <-- [Grows Upwards from pd_upper]         |
| Tuple 2 (HeapTupleHeaderData + Payload)                                           |
| Tuple 1 (HeapTupleHeaderData + Payload)                                           |
+-----------------------------------------------------------------------------------+
| Special Space (Index specific, 0 bytes for heap tables)                           |
+-----------------------------------------------------------------------------------+
```

### Page Header (24 Bytes)
- `pd_lsn`: 64-bit Log Sequence Number of the last WAL record that modified this page. Used during crash recovery to verify whether WAL needs to be reapplied.
- `pd_checksum`: 16-bit CRC checksum verifying page integrity if data checksums are enabled.
- `pd_flags`: Flags such as page full or all-visible.
- `pd_lower`: Byte offset pointing to the end of line pointers (grows forward).
- `pd_upper`: Byte offset pointing to the start of the latest tuple (grows backward).
- `pd_special`: Byte offset pointing to special index data at the end of the block.

### Tuple Header (`HeapTupleHeaderData`)
- `t_xmin`: The Transaction ID (XID) that inserted this row version.
- `t_xmax`: The Transaction ID that deleted or updated this row version (0 if active).
- `t_cid`: Command identifier within the transaction.
- `t_ctid`: Physical tuple locator `(block_number, offset_index)` pointing to this tuple or the newer row version if updated (**HOT chain**).

#### Inspecting 8KB Pages with `pageinspect`

```sql
-- Enable the native page inspection extension
CREATE EXTENSION IF NOT EXISTS pageinspect;

-- Create and populate a test table
CREATE TABLE demo_page (id int, name text);
INSERT INTO demo_page VALUES (1, 'Alice'), (2, 'Bob');

-- 1. Inspect the 24-byte Page Header of Block 0
SELECT * FROM page_header(get_raw_page('demo_page', 0));

-- 2. Inspect individual tuples, transaction IDs (xmin/xmax), and line pointers
SELECT lp, lp_off, lp_len, t_xmin, t_xmax, t_ctid, t_data 
FROM heap_page_items(get_raw_page('demo_page', 0));
```

---

## 5. Deep-Dive Internals: CLOG (`pg_xact`), WAL/LSN & Storage Substages

### 5.1 When is `pg_xact` (CLOG) Used? (Write, Read, Flush & Freeze)

PostgreSQL tracks transaction commit statuses using **2 bits per transaction ID (XID)** inside the **CLOG buffer** in Shared Memory (persisted under `$PGDATA/pg_xact/`):

| 2-Bit State | Macro Constant | Engine Meaning |
| :---: | :--- | :--- |
| **`00`** | `TRANSACTION_STATUS_IN_PROGRESS` | Transaction is running. Tuples are only visible within its session. |
| **`01`** | `TRANSACTION_STATUS_COMMITTED` | Transaction committed. Tuples are globally visible to MVCC snapshots. |
| **`10`** | `TRANSACTION_STATUS_ABORTED` | Transaction rolled back/crashed. Tuples are permanently dead. |
| **`11`** | `TRANSACTION_STATUS_SUB_COMMITTED` | Subtransaction (Savepoint) committed within parent transaction. |

`pg_xact` is accessed across 4 critical lifecycle phases:
1. **At Commit Time (`COMMIT`)**: The backend flushes the commit WAL record to disk with `fsync()`, then atomically flips the XID status in the `pg_xact` buffer from `00` (`IN_PROGRESS`) to **`01` (`COMMITTED`)**.
2. **At Read Time (`SELECT` / MVCC Visibility)**: When a query reads a tuple with `t_xmin = 1003`, it first checks the tuple's header flags (`t_infomask`). If the `HEAP_XMIN_COMMITTED` **Hint Bit** is not yet set, the engine consults `pg_xact` in RAM. Once verified as committed, the backend stamps the `HEAP_XMIN_COMMITTED` hint bit directly onto the 8 KB page in RAM so future queries never have to consult `pg_xact` again!
3. **At Flush Time (Checkpoints & Page Age-Out)**: In-memory `pg_xact` buffers are flushed to disk files (`pg_xact/0000`) during checkpoints and when the 32-page CLOG buffer ring cycles.
4. **At Vacuum Freeze Time**: `VACUUM` reads `pg_xact` to determine which ancient committed tuples can be replaced with `FrozenTransactionId (2)` to prevent 32-bit transaction ID wraparound.

---

### 5.2 Checkpoint Internals: WAL Sync, REDO LSN & WAL Recycling

Checkpoints guarantee crash durability by synchronizing memory with disk. A checkpoint executes in 6 precise substages:

```text
+----------------------------------------------------------------------------------------------------+
|                                 CHECKPOINT EXECUTION PIPELINE                                      |
+----------------------------------------------------------------------------------------------------+
| 1. Establish REDO Point : Checkpointer marks current WAL position as the REDO LSN (e.g. 0/16A3000)|
| 2. Sync WAL to Disk     : WAL is flushed to pg_wal/ up to at least the REDO LSN (XLogFlush).      |
| 3. Flush Dirty Buffers  : Checkpointer scans shared_buffers and writes all BM_DIRTY pages to base/.|
| 4. Issue Kernel fsync() : Calls fsync() across all modified table/index files and WAL segments.    |
| 5. Update pg_control    : Checkpointer writes the new REDO LSN into pg_control and calls fsync().  |
| 6. Recycle Old WAL      : Any WAL segment files older than the REDO LSN in pg_wal/ are safely     |
|                           recycled for future writes or deleted.                                   |
+----------------------------------------------------------------------------------------------------+
```

---

### 5.3 Divided Storage Substages ($PGDATA)

On-disk storage is organized into 4 independent functional subsystems:
- **Substage A: Heap & Index Tables (`base/`)**: Physical 8 KB block storage for tables and indexes, alongside Free Space Maps (`_fsm`) and Visibility Maps (`_vm`).
- **Substage B: Write-Ahead Log Stream (`pg_wal/`)**: 16MB sequential WAL segment files recording every change byte-for-byte.
- **Substage C: Transaction Status Bitmasks (`pg_xact/`)**: Persistent CLOG files storing 2-bit commit state bitmasks.
- **Substage D: Cluster Control & REDO Barrier (`pg_control`)**: Contains database cluster state, timeline ID, and latest synchronized Checkpoint REDO LSN.

---

## 6. Interactive PostgreSQL Architecture & Core Internals Simulator

Explore every stage of PostgreSQL's engine lifecycle below in a clean, vertical multi-tier layout. Step through slowly one action at a time using **[Next Step]**, or click **[Auto-Play]** for gentle automated pacing.

<div class="pg-arch-dashboard">
<div class="scenario-picker-header"><i class="fas fa-microchip"></i> Select Database Engine Lifecycle Scenario:</div>
<div class="controls-panel">
<button id="btn-arch-connect" class="dash-btn btn-connect"><i class="fas fa-network-wired"></i> 1. TCP Connect &amp; Fork</button>
<button id="btn-arch-hit" class="dash-btn btn-hit"><i class="fas fa-bolt"></i> 2. Cache Hit Read</button>
<button id="btn-arch-miss" class="dash-btn btn-miss"><i class="fas fa-hdd"></i> 3. Cache Miss Read</button>
<button id="btn-arch-write" class="dash-btn btn-write"><i class="fas fa-pen-nib"></i> 4. Write &amp; WAL LSN</button>
<button id="btn-arch-bgwriter" class="dash-btn btn-bgwriter"><i class="fas fa-running"></i> 5. Autonomous BGWriter</button>
<button id="btn-arch-checkpoint" class="dash-btn btn-checkpoint"><i class="fas fa-save"></i> 6. Trigger Checkpoint</button>
<button id="btn-arch-vacuum" class="dash-btn btn-vacuum"><i class="fas fa-broom"></i> 7. Run Autovacuum</button>
<button id="btn-arch-inspect" class="dash-btn btn-inspect"><i class="fas fa-layer-group"></i> Inspect 8KB Page</button>
<button id="btn-arch-reset" class="dash-btn btn-reset"><i class="fas fa-sync-alt"></i> Reset</button>
</div>

<div id="inspector-panel" class="pg-page-inspector-box" style="display: none;">
<h4>
<span><i class="fas fa-microchip text-info"></i> 8 KB Page Layout (Block 0: Heap Table <code>base/16384/24576</code>)</span>
<span id="page-lsn-badge" class="badge bg-primary">LSN: 0/16A2F40</span>
</h4>
<div class="pg-page-layout-bar">
<div class="bar-seg seg-header" title="PageHeaderData: 24 Bytes">Header (24B)</div>
<div class="bar-seg seg-pointers" id="bar-seg-lp" title="Line Pointers ItemIdData">Line Pointers (16B)</div>
<div class="bar-seg seg-free" id="bar-seg-free" title="Free Space Hole">Free Space (7840B)</div>
<div class="bar-seg seg-tuples" id="bar-seg-tuples" title="Heap Tuple Data">Tuples (312B)</div>
<div class="bar-seg seg-special" title="Special Space: 0B (Heap)">Special (0B)</div>
</div>
<div class="pg-page-grid-details">
<div class="pg-detail-card">
<div class="card-title"><i class="fas fa-heading"></i> PageHeader (24B)</div>
<div class="prop-row"><span>pd_lsn:</span><span id="prop-lsn" class="prop-val">0/16A2F40</span></div>
<div class="prop-row"><span>pd_checksum:</span><span class="prop-val">0x8FA4 (Valid)</span></div>
<div class="prop-row"><span>pd_lower / upper:</span><span id="prop-offsets" class="prop-val">40 / 7880</span></div>
<div class="prop-row"><span>pd_special:</span><span class="prop-val">8192</span></div>
</div>
<div class="pg-detail-card">
<div class="card-title"><i class="fas fa-list-ol"></i> Line Pointers (ItemId)</div>
<div class="prop-row"><span>lp[1]:</span><span id="prop-lp1" class="prop-val">Off=8128, Len=64 (LIVE)</span></div>
<div class="prop-row"><span>lp[2]:</span><span id="prop-lp2" class="prop-val">Off=8064, Len=64 (LIVE)</span></div>
<div class="prop-row"><span>lp[3]:</span><span id="prop-lp3" class="prop-val warn">Unused</span></div>
</div>
<div class="pg-detail-card">
<div class="card-title"><i class="fas fa-database"></i> Tuple MVCC Info</div>
<div class="prop-row"><span>Tuple 1:</span><span id="prop-t1-info" class="prop-val">xmin=1001 xmax=0 (Alice)</span></div>
<div class="prop-row"><span>Tuple 2:</span><span id="prop-t2-info" class="prop-val">xmin=1002 xmax=0 (Bob)</span></div>
<div class="prop-row"><span>Dead Tuples:</span><span id="prop-dead-count" class="prop-val">0 bytes</span></div>
</div>
<div class="pg-detail-card">
<div class="card-title"><i class="fas fa-map"></i> Helper Maps</div>
<div class="prop-row"><span>FSM (Free Space):</span><span id="prop-fsm" class="prop-val">7840 Bytes (95%)</span></div>
<div class="prop-row"><span>VM (Visibility):</span><span id="prop-vm" class="prop-val">All-Visible: TRUE</span></div>
<div class="prop-row"><span>Status:</span><span id="prop-page-status" class="prop-val">IN SHARED BUFFERS</span></div>
</div>
</div>
</div>

<div id="arch-explainer" class="arch-explainer-card">
<div class="explainer-top-bar">
<span id="explainer-badge" class="explainer-badge"><i class="fas fa-info-circle"></i> ARCHITECTURE READY</span>
<div class="explainer-controls">
<button id="btn-step-prev" class="ctrl-btn" disabled><i class="fas fa-backward"></i> Prev Step</button>
<button id="btn-step-next" class="ctrl-btn" disabled><i class="fas fa-forward"></i> Next Step</button>
<button id="btn-step-autoplay" class="ctrl-btn"><i class="fas fa-play"></i> Auto-Play</button>
<button id="btn-step-speed" class="ctrl-btn"><i class="fas fa-tachometer-alt"></i> Speed: Normal (1x)</button>
<span id="explainer-step-num" style="font-size: 0.85rem; font-weight: 700; color: #94a3b8; margin-left: 6px;">Ready</span>
</div>
</div>
<div id="explainer-title" class="explainer-title">Interactive PostgreSQL Architecture &amp; Core Internals Explorer</div>
<div id="explainer-body" class="explainer-body">Select any scenario above. Use <strong>[Next Step]</strong> to step through slowly one action at a time, or click <strong>[Auto-Play]</strong> to watch the lifecycle unfold with gentle, clear pacing.</div>
<div id="explainer-meta" class="explainer-meta-bar">
<div class="meta-pill wire"><i class="fas fa-ethernet"></i> <span id="meta-wire">Protocol: Idle</span></div>
<div class="meta-pill kernel"><i class="fas fa-terminal"></i> <span id="meta-kernel">Kernel: epoll_wait()</span></div>
<div class="meta-pill ipc"><i class="fas fa-memory"></i> <span id="meta-ipc">IPC: Attached (shmget)</span></div>
<div class="meta-pill storage"><i class="fas fa-database"></i> <span id="meta-storage">Storage: base/ synced</span></div>
</div>
</div>

<div class="visuals-wrapper">
<svg id="pg-arch-svg" viewBox="0 0 1060 1280" class="dashboard-svg">
<defs>
<filter id="glow-p" x="-40%" y="-40%" width="180%" height="180%">
<feGaussianBlur stdDeviation="5" result="blur" />
<feComposite in="SourceGraphic" in2="blur" operator="over" />
</filter>
<linearGradient id="client-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#0b172a"/>
<stop offset="100%" stop-color="#172554"/>
</linearGradient>
<linearGradient id="process-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#0c1328"/>
<stop offset="100%" stop-color="#1e1b4b"/>
</linearGradient>
<linearGradient id="shmem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#061c1e"/>
<stop offset="100%" stop-color="#052e22"/>
</linearGradient>
<linearGradient id="aux-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#181124"/>
<stop offset="100%" stop-color="#2a1638"/>
</linearGradient>
<linearGradient id="disk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#1a0f26"/>
<stop offset="100%" stop-color="#2a1236"/>
</linearGradient>

<marker id="arrow-read" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
</marker>
<marker id="arrow-write" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#22c55e" />
</marker>
<marker id="arrow-wal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
</marker>
<marker id="arrow-bgwriter" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
</marker>
<marker id="arrow-checkpoint" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
</marker>
<marker id="arrow-vacuum" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#a855f7" />
</marker>
<marker id="arrow-disk" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#ec4899" />
</marker>
</defs>

<!-- ================= 5 VERTICAL ARCHITECTURAL TIERS ================= -->

<!-- TIER 1: CLIENT & CONNECTION LAYER (y: 20 -> 165) -->
<g transform="translate(20, 20)">
<rect class="zone-bg" width="1020" height="145" rx="12" />
<text x="30" y="24" class="zone-header-text">TIER 1: CLIENT &amp; NETWORK CONNECTION LAYER</text>

<!-- Client Application Box -->
<g id="node-client" transform="translate(30, 35)">
<rect id="rect-client" class="node-box" width="450" height="95" rx="8" fill="url(#client-grad)" stroke="#38bdf8" />
<text x="20" y="26" class="node-main-title" fill="#e0f2fe">Client Application (libpq C Library)</text>
<text x="20" y="44" class="node-sub-title" fill="#93c5fd">TCP Socket • Port 5432 • Frontend Protocol v3.0</text>
<g transform="translate(20, 56)">
<rect width="240" height="26" rx="4" fill="#030712" stroke="#3b82f6" stroke-width="0.8" />
<text id="txt-client-sql" x="120" y="17" font-size="9" font-weight="700" fill="#38bdf8" text-anchor="middle">StartupMessage (v3.0)</text>
</g>
<g transform="translate(270, 56)">
<rect width="160" height="26" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8" />
<text id="txt-port-status" x="80" y="17" font-size="8.5" font-weight="700" fill="#38d39f" text-anchor="middle">PORT 5432: LISTEN</text>
</g>
</g>

<!-- Postmaster Daemon Box -->
<g id="node-postmaster" transform="translate(540, 35)">
<rect id="rect-postmaster" class="node-box" width="450" height="95" rx="8" fill="url(#process-grad)" stroke="#6366f1" />
<text x="20" y="26" class="node-main-title" fill="#c7d2fe">Postmaster Daemon (PID 1)</text>
<text x="20" y="44" class="node-sub-title" fill="#94a3b8">Master Supervisor • Authenticator (pg_hba.conf) • Worker Forker</text>
<g transform="translate(20, 56)">
<rect width="410" height="26" rx="4" fill="#090d1f" />
<text id="txt-postmaster-status" x="205" y="17" font-size="9" font-weight="700" fill="#818cf8" text-anchor="middle">epoll_wait(port=5432) -> Listening for Connections</text>
</g>
</g>
</g>

<!-- TIER 2: PROCESS & PRIVATE MEMORY (y: 185 -> 350) -->
<g transform="translate(20, 185)">
<rect class="zone-bg" width="1020" height="155" rx="12" />
<text x="30" y="24" class="zone-header-text">TIER 2: DEDICATED BACKEND WORKER &amp; PRIVATE PROCESS RAM</text>

<!-- Backend Worker Process -->
<g id="node-backend" transform="translate(30, 35)">
<rect id="rect-backend" class="node-box" width="450" height="105" rx="8" fill="url(#process-grad)" stroke="#818cf8" stroke-width="2" />
<text x="20" y="26" class="node-main-title" fill="#ffffff">Backend Worker Process</text>
<text id="txt-backend-pid" x="20" y="44" class="node-sub-title" fill="#a5b4fc">PID: 4128 (Forked by Postmaster)</text>
<g transform="translate(20, 56)">
<rect width="410" height="24" rx="4" fill="#030712" stroke="#6366f1" stroke-width="0.8" />
<text x="205" y="16" font-size="9" font-weight="700" fill="#a5b4fc" text-anchor="middle">Lexer/Parser -> Analyzer/Rewriter -> Cost Optimizer/Planner -> Executor</text>
</g>
<text id="txt-backend-status" x="225" y="96" class="node-tag-pill" fill="#38d39f" text-anchor="middle">IDLE • AWAITING QUERY</text>
</g>

<!-- Private Local Memory -->
<g id="node-localmem" transform="translate(540, 35)">
<rect id="rect-localmem" class="node-box" width="450" height="105" rx="8" fill="url(#process-grad)" stroke="#818cf8" />
<text x="20" y="24" class="node-main-title" fill="#c7d2fe">Private Backend Memory (TopMemoryContext)</text>
<g transform="translate(20, 38)">
<rect width="410" height="20" rx="4" fill="#090d1f" />
<text x="10" y="14" font-size="8.5" font-weight="600" fill="#c7d2fe">work_mem:</text>
<text x="400" y="14" font-size="8.5" font-weight="700" fill="#818cf8" text-anchor="end">4 MB (Sorts, Hashes per operator node)</text>
</g>
<g transform="translate(20, 60)">
<rect width="410" height="20" rx="4" fill="#090d1f" />
<text x="10" y="14" font-size="8.5" font-weight="600" fill="#c7d2fe">maintenance_work_mem:</text>
<text x="400" y="14" font-size="8.5" font-weight="700" fill="#818cf8" text-anchor="end">64 MB (VACUUM, CREATE INDEX)</text>
</g>
<g transform="translate(20, 82)">
<rect width="410" height="18" rx="4" fill="#090d1f" />
<text x="10" y="13" font-size="8.5" font-weight="600" fill="#c7d2fe">temp_buffers:</text>
<text x="400" y="13" font-size="8.5" font-weight="700" fill="#818cf8" text-anchor="end">8 MB (Session temporary tables)</text>
</g>
</g>
</g>

<!-- TIER 3: SHARED MEMORY (GLOBAL IPC) (y: 360 -> 610) -->
<g transform="translate(20, 360)">
<rect class="zone-bg" width="1020" height="235" rx="12" />
<text x="30" y="24" class="zone-header-text">TIER 3: SHARED MEMORY (GLOBAL IPC SEGMENT)</text>

<!-- 1. Shared Buffers (8KB Block Pool) -->
<g id="node-shared-buffers" transform="translate(30, 35)">
<rect id="rect-shared-buffers" width="450" height="185" rx="8" fill="#021c16" stroke="#34d399" stroke-width="1.5" />
<text x="225" y="22" font-size="11.5" font-weight="800" fill="#34d399" text-anchor="middle">shared_buffers (8 KB Page Cache Pool)</text>

<g id="buf-slot-0" transform="translate(15, 34)">
<rect id="rect-slot-0" width="200" height="64" rx="6" fill="#092922" stroke="#38d39f" stroke-width="1.5" />
<text x="100" y="20" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">Block 0 (Heap)</text>
<text x="100" y="36" font-size="8" fill="#a7f3d0" text-anchor="middle">pd_lsn: 0/16A2F40</text>
<text id="txt-slot-0" x="100" y="52" font-size="8.5" font-weight="800" fill="#38d39f" text-anchor="middle">STATUS: CLEAN</text>
</g>

<g id="buf-slot-1" transform="translate(235, 34)">
<rect id="rect-slot-1" width="200" height="64" rx="6" fill="#092922" stroke="#38d39f" stroke-width="1.5" />
<text x="100" y="20" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">Block 1 (Heap)</text>
<text id="txt-slot-1-lsn" x="100" y="36" font-size="8" fill="#a7f3d0" text-anchor="middle">pd_lsn: 0/16A2F40</text>
<text id="txt-slot-1" x="100" y="52" font-size="8.5" font-weight="800" fill="#38d39f" text-anchor="middle">STATUS: CLEAN</text>
</g>

<g id="buf-slot-2" transform="translate(15, 108)">
<rect id="rect-slot-2" width="200" height="64" rx="6" fill="#0b1728" stroke="#64748b" stroke-width="1.5" />
<text x="100" y="20" font-size="9.5" font-weight="700" fill="#cbd5e1" text-anchor="middle">Block 2 (Heap)</text>
<text x="100" y="36" font-size="8" fill="#94a3b8" text-anchor="middle">Relation: [Free Slot]</text>
<text id="txt-slot-2" x="100" y="52" font-size="8.5" font-weight="800" fill="#64748b" text-anchor="middle">STATUS: EMPTY</text>
</g>

<g id="buf-slot-3" transform="translate(235, 108)">
<rect id="rect-slot-3" width="200" height="64" rx="6" fill="#092922" stroke="#38d39f" stroke-width="1.5" />
<text x="100" y="20" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">Block 3 (Index)</text>
<text x="100" y="36" font-size="8" fill="#a7f3d0" text-anchor="middle">Index: demo_pkey</text>
<text id="txt-slot-3" x="100" y="52" font-size="8.5" font-weight="800" fill="#38d39f" text-anchor="middle">STATUS: CACHED</text>
</g>
</g>

<!-- 2. WAL Buffers (Middle) -->
<g id="node-wal-buffers" transform="translate(510, 35)">
<rect id="rect-wal-buffers" width="230" height="185" rx="8" fill="#1c1605" stroke="#f59e0b" stroke-width="1.5" />
<text x="115" y="22" font-size="11" font-weight="800" fill="#fbbf24" text-anchor="middle">wal_buffers (Log Ring)</text>
<g transform="translate(10, 35)">
<rect width="210" height="50" rx="4" fill="#090702" stroke="#f59e0b" stroke-width="0.8" />
<text x="105" y="18" font-size="8.5" font-weight="700" fill="#fde68a" text-anchor="middle">Stream LSN Position:</text>
<text id="txt-walbuf-status" x="105" y="36" font-size="9.5" font-weight="800" fill="#fbbf24" text-anchor="middle">0/16A2F40</text>
</g>
<text x="115" y="110" font-size="8" fill="#cbd5e1" text-anchor="middle">XLogInsert() stages binary</text>
<text x="115" y="125" font-size="8" fill="#cbd5e1" text-anchor="middle">change records in memory</text>
<text x="115" y="145" font-size="7.5" font-weight="700" fill="#fde68a" text-anchor="middle">WAL RULE: Flush WAL before data!</text>
</g>

<!-- 3. CLOG (pg_xact) & Lock Manager (Right) -->
<g id="node-clog-buf" transform="translate(760, 35)">
<rect id="rect-clog-buf" width="230" height="185" rx="8" fill="#180f2b" stroke="#a855f7" stroke-width="1.5" />
<text x="115" y="22" font-size="11" font-weight="800" fill="#d8b4fe" text-anchor="middle">CLOG Buffer (pg_xact)</text>
<g transform="translate(10, 35)">
<rect width="210" height="50" rx="4" fill="#0c0714" stroke="#a855f7" stroke-width="0.8" />
<text x="105" y="18" font-size="8.5" font-weight="700" fill="#e9d5ff" text-anchor="middle">2-Bit Commit State Bitmask:</text>
<text id="txt-clog-status" x="105" y="36" font-size="9" font-weight="800" fill="#c084fc" text-anchor="middle">XID 1002: [01: COMMITTED]</text>
</g>
<text x="115" y="105" font-size="8" fill="#cbd5e1" text-anchor="middle">00: In_Prog | 01: Committed</text>
<text x="115" y="120" font-size="8" fill="#cbd5e1" text-anchor="middle">10: Aborted | 11: Sub_Committed</text>
<g transform="translate(10, 135)">
<rect width="210" height="38" rx="4" fill="#080c1e" stroke="#60a5fa" stroke-width="0.8" />
<text x="105" y="15" font-size="8" font-weight="700" fill="#93c5fd" text-anchor="middle">ProcArray &amp; Lock Manager</text>
<text x="105" y="29" font-size="7.5" fill="#cbd5e1" text-anchor="middle">Active MVCC Snapshots &amp; Locks</text>
</g>
</g>
</g>

<!-- TIER 4: BACKGROUND AUXILIARY PROCESSES (y: 615 -> 770) -->
<g transform="translate(20, 615)">
<rect class="zone-bg" width="1020" height="135" rx="12" />
<text x="30" y="24" class="zone-header-text">TIER 4: BACKGROUND AUXILIARY ENGINES</text>

<!-- 1. Background Writer -->
<g id="node-bgwriter" transform="translate(30, 35)">
<rect id="rect-bgwriter" class="node-box" width="225" height="85" rx="8" fill="#061c24" stroke="#06b6d4" />
<text x="112" y="22" class="node-main-title" fill="#67e8f9" font-size="11.5" text-anchor="middle">Background Writer (bgwriter)</text>
<text x="112" y="38" font-size="8" fill="#a5f3fc" text-anchor="middle">Autonomous loop (200ms)</text>
<text x="112" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">Cleans dirty pages ahead of time</text>
<text id="txt-bgwriter-status" x="112" y="72" font-size="8.5" font-weight="800" fill="#06b6d4" text-anchor="middle">SLEEPING (200ms)</text>
</g>

<!-- 2. WAL Writer -->
<g id="node-walwriter" transform="translate(280, 35)">
<rect id="rect-walwriter" class="node-box" width="225" height="85" rx="8" fill="#1c1607" stroke="#f59e0b" />
<text x="112" y="22" class="node-main-title" fill="#fde047" font-size="11.5" text-anchor="middle">WAL Writer Process</text>
<text x="112" y="38" font-size="8" fill="#fcd34d" text-anchor="middle">Flushes WAL buffers to disk</text>
<text x="112" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">Executes OS fsync() for ACID</text>
<text id="txt-walwriter-status" x="112" y="72" font-size="8.5" font-weight="800" fill="#f59e0b" text-anchor="middle">IDLE • AWAITING FLUSH</text>
</g>

<!-- 3. Checkpointer -->
<g id="node-checkpointer" transform="translate(530, 35)">
<rect id="rect-checkpointer" class="node-box" width="225" height="85" rx="8" fill="#241407" stroke="#f97316" />
<text x="112" y="22" class="node-main-title" fill="#fdba74" font-size="11.5" text-anchor="middle">Checkpointer Process</text>
<text x="112" y="38" font-size="8" fill="#f97316" text-anchor="middle">Synchronized REDO barrier</text>
<text x="112" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">Syncs ALL buffers &amp; pg_control</text>
<text id="txt-checkpoint-status" x="112" y="72" font-size="8.5" font-weight="800" fill="#f97316" text-anchor="middle">IDLE • RECOVERY READY</text>
</g>

<!-- 4. Autovacuum -->
<g id="node-vacuum" transform="translate(780, 35)">
<rect id="rect-vacuum" class="node-box" width="225" height="85" rx="8" fill="#1f102e" stroke="#a855f7" />
<text x="112" y="22" class="node-main-title" fill="#d8b4fe" font-size="11.5" text-anchor="middle">Autovacuum Worker</text>
<text x="112" y="38" font-size="8" fill="#c084fc" text-anchor="middle">MVCC Dead Tuple Pruner</text>
<text x="112" y="52" font-size="8" fill="#cbd5e1" text-anchor="middle">Updates _fsm and _vm maps</text>
<text id="txt-vacuum-status" x="112" y="72" font-size="8.5" font-weight="800" fill="#a855f7" text-anchor="middle">IDLE • SCALE FACTOR 0.2</text>
</g>
</g>

<!-- TIER 5: ON-DISK STORAGE SUBSYSTEMS ($PGDATA) (y: 770 -> 1260) -->
<g transform="translate(20, 770)">
<rect class="zone-bg" width="1020" height="490" rx="12" />
<text x="30" y="26" class="zone-header-text">TIER 5: ON-DISK STORAGE SUBSYSTEMS ($PGDATA)</text>

<!-- Substage A: Heap & Index Tables (base/) -->
<g id="disk-row-base" transform="translate(30, 42)">
<rect id="disk-base" width="960" height="95" rx="8" fill="#0c1328" stroke="#ec4899" stroke-width="1.5" />
<text x="25" y="28" font-size="13" font-weight="800" fill="#f472b6">SUBSTAGE A: Heap &amp; Index Storage (base/16384/24576)</text>
<text x="25" y="48" font-size="9" fill="#cbd5e1">Stores raw 8 KB blocks for table demo_page on filesystem. Read with pread() and written by BGWriter/Checkpointer.</text>
<g transform="translate(25, 58)">
<rect width="280" height="24" rx="4" fill="#050814" stroke="#ec4899" stroke-width="0.8" />
<text x="140" y="16" font-size="8.5" font-weight="700" fill="#fbcfe8" text-anchor="middle">Table Heap: 24576 (8 KB Blocks)</text>
</g>
<g transform="translate(320, 58)">
<rect width="280" height="24" rx="4" fill="#050814" stroke="#ec4899" stroke-width="0.8" />
<text id="txt-disk-fsm" x="140" y="16" font-size="8.5" font-weight="700" fill="#fbcfe8" text-anchor="middle">24576_fsm: Free Space Map</text>
</g>
<g transform="translate(615, 58)">
<rect width="320" height="24" rx="4" fill="#050814" stroke="#ec4899" stroke-width="0.8" />
<text id="txt-disk-vm" x="160" y="16" font-size="8.5" font-weight="700" fill="#fbcfe8" text-anchor="middle">24576_vm: Visibility Map (All-Visible)</text>
</g>
</g>

<!-- Substage B: Write-Ahead Log Stream (pg_wal/) -->
<g id="disk-row-wal" transform="translate(30, 152)">
<rect id="disk-wal" width="960" height="95" rx="8" fill="#141005" stroke="#f59e0b" stroke-width="1.5" />
<text x="25" y="28" font-size="13" font-weight="800" fill="#fbbf24">SUBSTAGE B: Write-Ahead Log Stream (pg_wal/000000010000000000000001)</text>
<text x="25" y="48" font-size="9" fill="#fde68a">16MB WAL segment files. Every modification is flushed here with fsync() before commit to guarantee crash durability.</text>
<g transform="translate(25, 58)">
<rect width="440" height="24" rx="4" fill="#080602" stroke="#f59e0b" stroke-width="0.8" />
<text id="txt-wal-file-lsn" x="220" y="16" font-size="8.5" font-weight="800" fill="#fbbf24" text-anchor="middle">Current WAL File: pg_wal/000000010000000000000001 [SYNCED]</text>
</g>
<g transform="translate(480, 58)">
<rect width="455" height="24" rx="4" fill="#080602" stroke="#f59e0b" stroke-width="0.8" />
<text x="227" y="16" font-size="8.5" font-weight="700" fill="#fde68a" text-anchor="middle">Recycled Segments: Older than Checkpoint REDO LSN</text>
</g>
</g>

<!-- Substage C: Transaction Status Bitmasks (pg_xact/ - CLOG) -->
<g id="disk-row-xact" transform="translate(30, 262)">
<rect id="disk-xact" width="960" height="95" rx="8" fill="#150a24" stroke="#a855f7" stroke-width="1.5" />
<text x="25" y="28" font-size="13" font-weight="800" fill="#c084fc">SUBSTAGE C: Transaction Status Bitmask File (pg_xact/0000 - CLOG)</text>
<text x="25" y="48" font-size="9" fill="#d8b4fe">Persistent 2-bit commit state bitmasks. Consulted during MVCC reads if tuple hint bits (HEAP_XMIN_COMMITTED) are not yet set.</text>
<g transform="translate(25, 58)">
<rect width="440" height="24" rx="4" fill="#090410" stroke="#a855f7" stroke-width="0.8" />
<text id="txt-xact-file-status" x="220" y="16" font-size="8.5" font-weight="800" fill="#d8b4fe" text-anchor="middle">pg_xact/0000: Flushed During Checkpoints &amp; Buffer Age-Out</text>
</g>
<g transform="translate(480, 58)">
<rect width="455" height="24" rx="4" fill="#090410" stroke="#a855f7" stroke-width="0.8" />
<text x="227" y="16" font-size="8.5" font-weight="700" fill="#e9d5ff" text-anchor="middle">Hint Bits Cache: Future reads bypass pg_xact completely</text>
</g>
</g>

<!-- Substage D: Cluster Control & REDO Barrier (pg_control) -->
<g id="disk-row-control" transform="translate(30, 372)">
<rect id="disk-control" width="960" height="95" rx="8" fill="#1c0f05" stroke="#f97316" stroke-width="1.5" />
<text x="25" y="28" font-size="13" font-weight="800" fill="#fb923c">SUBSTAGE D: Cluster Control File (pg_control - Checkpoint REDO Barrier)</text>
<text x="25" y="48" font-size="9" fill="#fdba74">Holds system identifier, cluster state (IN_PRODUCTION), timeline ID, and the latest synchronized Checkpoint REDO LSN.</text>
<g transform="translate(25, 58)">
<rect width="440" height="24" rx="4" fill="#0b0602" stroke="#f97316" stroke-width="0.8" />
<text id="txt-control-lsn" x="220" y="16" font-size="9" font-weight="900" fill="#fb923c" text-anchor="middle">pg_control [REDO: 0/16A2F40]</text>
</g>
<g transform="translate(480, 58)">
<rect width="455" height="24" rx="4" fill="#0b0602" stroke="#f97316" stroke-width="0.8" />
<text x="227" y="16" font-size="8.5" font-weight="700" fill="#fed7aa" text-anchor="middle">Crash Recovery Boundary: Never replay WAL before this point!</text>
</g>
</g>
</g>


<!-- ================= VERTICAL CLEAR CONNECTION PATHS ================= -->
<!-- Line 0: Client -> Postmaster (Handshake) -->
<path id="conn-client-postmaster" class="conn-line" d="M 500 100 L 560 100" marker-end="url(#arrow-read)" />

<!-- Line 0B: Postmaster -> Backend (Fork) -->
<path id="conn-postmaster-backend" class="conn-line" d="M 765 150 L 765 180 L 275 180 L 275 220" marker-end="url(#arrow-read)" />

<!-- Line 1: Client <-> Backend (Active Session) -->
<path id="conn-client-backend" class="conn-line" d="M 275 150 L 275 220" marker-end="url(#arrow-read)" />

<!-- Line 2: Backend <-> Local Memory -->
<path id="conn-backend-localmem" class="conn-line" d="M 500 270 L 560 270" marker-end="url(#arrow-read)" />

<!-- Line 3: Backend <-> Shared Buffers -->
<path id="conn-backend-shmem" class="conn-line" d="M 275 325 L 275 395" marker-end="url(#arrow-read)" />

<!-- Line 3B: Backend <-> WAL Buffers -->
<path id="conn-backend-walbuf" class="conn-line" d="M 380 325 L 625 395" marker-end="url(#arrow-wal)" />

<!-- Line 3C: Backend <-> CLOG Buffer -->
<path id="conn-backend-clog" class="conn-line" d="M 450 325 L 875 395" marker-end="url(#arrow-vacuum)" />

<!-- Line 4: Backend <-> Disk (Cache Miss Direct Fetch) -->
<path id="conn-backend-disk" class="conn-line" d="M 80 325 L 80 810" marker-end="url(#arrow-disk)" />

<!-- Line 5: Shared Buffers <-> BGWriter -->
<path id="conn-shmem-bgwriter" class="conn-line" d="M 160 595 L 160 650" marker-end="url(#arrow-bgwriter)" />

<!-- Line 5B: BGWriter <-> Disk (Proactive Clean) -->
<path id="conn-bgwriter-disk" class="conn-line" d="M 160 735 L 160 810" marker-end="url(#arrow-bgwriter)" />

<!-- Line 6: WAL Buffers <-> WALWriter -->
<path id="conn-shmem-walwriter" class="conn-line" d="M 410 595 L 410 650" marker-end="url(#arrow-wal)" />

<!-- Line 7: WALWriter <-> pg_wal Disk File -->
<path id="conn-walwriter-disk" class="conn-line" d="M 410 735 L 410 920" marker-end="url(#arrow-wal)" />

<!-- Line 8: Shared Buffers <-> Checkpointer -->
<path id="conn-shmem-checkpointer" class="conn-line" d="M 660 595 L 660 650" marker-end="url(#arrow-checkpoint)" />

<!-- Line 9: Checkpointer <-> Disk (base/) -->
<path id="conn-checkpointer-disk" class="conn-line" d="M 660 735 L 660 810" marker-end="url(#arrow-checkpoint)" />

<!-- Line 9B: Checkpointer <-> pg_control -->
<path id="conn-checkpointer-control" class="conn-line" d="M 660 735 L 660 1140" marker-end="url(#arrow-checkpoint)" />

<!-- Line 10: Autovacuum <-> Shared Buffers -->
<path id="conn-vacuum-shmem" class="conn-line" d="M 910 650 L 910 595" marker-end="url(#arrow-vacuum)" />

<!-- Line 11: Autovacuum <-> Disk Files (FSM/VM) -->
<path id="conn-vacuum-disk" class="conn-line" d="M 910 735 L 910 810" marker-end="url(#arrow-vacuum)" />

</svg>
</div>

<div class="log-panel">
<div class="log-title"><i class="fas fa-terminal"></i> Database Engine Architecture Event Log</div>
<div id="arch-log-content" class="log-content">
<div class="log-line system"><span class="log-time">00:00:00</span> [POSTMASTER] PostgreSQL cluster initialized. Postmaster listening on port 5432. Shared memory IPC segment attached.</div>
</div>
</div>
</div>

<script>
(function() {
  const btnConnect = document.getElementById('btn-arch-connect');
  const btnHit = document.getElementById('btn-arch-hit');
  const btnMiss = document.getElementById('btn-arch-miss');
  const btnWrite = document.getElementById('btn-arch-write');
  const btnBgwriter = document.getElementById('btn-arch-bgwriter');
  const btnCheckpoint = document.getElementById('btn-arch-checkpoint');
  const btnVacuum = document.getElementById('btn-arch-vacuum');
  const btnInspect = document.getElementById('btn-arch-inspect');
  const btnReset = document.getElementById('btn-arch-reset');

  const btnPrev = document.getElementById('btn-step-prev');
  const btnNext = document.getElementById('btn-step-next');
  const btnAutoplay = document.getElementById('btn-step-autoplay');
  const btnSpeed = document.getElementById('btn-step-speed');

  const logContent = document.getElementById('arch-log-content');
  const svg = document.getElementById('pg-arch-svg');
  const inspectorPanel = document.getElementById('inspector-panel');

  const explainerCard = document.getElementById('arch-explainer');
  const explainerBadge = document.getElementById('explainer-badge');
  const explainerTitle = document.getElementById('explainer-title');
  const explainerBody = document.getElementById('explainer-body');
  const explainerStepNum = document.getElementById('explainer-step-num');

  const metaWire = document.getElementById('meta-wire');
  const metaKernel = document.getElementById('meta-kernel');
  const metaIpc = document.getElementById('meta-ipc');
  const metaStorage = document.getElementById('meta-storage');

  if (!btnConnect || !svg || !logContent) return;

  let audioCtx = null;
  function playBeep(freq, type, duration) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
  }

  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  let state = {
    busy: false,
    lsnNum: 0x16A2F40,
    xid: 1002,
    slot1State: 'CLEAN',
    slot2State: 'EMPTY',
    deadTuples: 0,
    freeSpace: 7840,
    speedMultiplier: 1.0,
    autoplay: false,
    autoplayTimer: null,
    currentScenarioKey: null,
    currentStepIdx: -1
  };

  function log(message, type) {
    type = type || 'system';
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-line ' + type;
    line.innerHTML = '<span class="log-time">[' + timestamp + ']</span> ' + message;
    logContent.appendChild(line);
    logContent.scrollTop = logContent.scrollHeight;
  }

  function highlightNode(nodeId, glowClass, duration) {
    const el = document.getElementById(nodeId);
    if (!el) return;
    el.classList.add('node-highlight', glowClass);
    setTimeout(function() {
      el.classList.remove('node-highlight', glowClass);
    }, duration || 2000);
  }

  function activatePath(pathId, styleClass) {
    const path = document.getElementById(pathId);
    if (path) path.classList.add(styleClass);
  }

  function deactivatePath(pathId, styleClass) {
    const path = document.getElementById(pathId);
    if (path) path.classList.remove(styleClass);
  }

  function animatePacket(pathId, color, baseDuration, reverse) {
    reverse = !!reverse;
    const duration = baseDuration * (state.speedMultiplier === 0.5 ? 1.7 : 1.0);
    return new Promise(function(resolve) {
      const pathElement = document.getElementById(pathId);
      if (!pathElement) {
        resolve();
        return;
      }
      const pathLength = pathElement.getTotalLength();
      const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      packet.setAttribute("r", "8.5");
      packet.setAttribute("fill", color);
      packet.setAttribute("filter", "url(#glow-p)");
      svg.appendChild(packet);

      const startTime = performance.now();
      function update(time) {
        const elapsed = time - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;
        const currentLength = reverse ? pathLength * (1 - progress) : pathLength * progress;
        const point = pathElement.getPointAtLength(currentLength);
        packet.setAttribute("cx", point.x);
        packet.setAttribute("cy", point.y);
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          packet.remove();
          resolve();
        }
      }
      requestAnimationFrame(update);
    });
  }

  function updateSlotUI(slotId, status) {
    const rect = document.getElementById('rect-slot-' + slotId);
    const txt = document.getElementById('txt-slot-' + slotId);
    if (!rect || !txt) return;

    if (status === 'CLEAN') {
      rect.setAttribute('fill', '#092922');
      rect.setAttribute('stroke', '#38d39f');
      txt.textContent = 'STATUS: CLEAN';
      txt.setAttribute('fill', '#38d39f');
    } else if (status === 'DIRTY') {
      rect.setAttribute('fill', '#2d1414');
      rect.setAttribute('stroke', '#ef4444');
      txt.textContent = 'STATUS: DIRTY (Needs Sync)';
      txt.setAttribute('fill', '#ef4444');
    } else if (status === 'PINNED') {
      rect.setAttribute('fill', '#1d3354');
      rect.setAttribute('stroke', '#38bdf8');
      txt.textContent = 'STATUS: PINNED (In Use)';
      txt.setAttribute('fill', '#38bdf8');
    } else if (status === 'EMPTY') {
      rect.setAttribute('fill', '#0b1728');
      rect.setAttribute('stroke', '#64748b');
      txt.textContent = 'STATUS: EMPTY';
      txt.setAttribute('fill', '#64748b');
    }
  }

  // ================= SCENARIOS & GRANULAR STEPS =================
  const SCENARIOS = {
    connect: {
      name: "1. TCP Connect & Fork",
      steps: [
        {
          title: "Step 1: libpq Builds StartupMessage & Initiates TCP Handshake",
          body: "The client application uses <code>libpq</code> to construct a binary <code>StartupMessage</code> with <code>user=postgres</code>, <code>database=production</code>, and protocol version 3.0. The OS begins the TCP 3-way handshake targeting PostgreSQL on port 5432.",
          meta: { wire: "StartupMessage (v3.0)", kernel: "connect() -> TCP Handshake", ipc: "Idle", storage: "Idle" },
          exec: async function() {
            playBeep(480, 'sine', 0.2);
            highlightNode('rect-client', 'glow-blue', 2200);
            document.getElementById('txt-client-sql').textContent = 'StartupMessage (v3.0)';
            document.getElementById('txt-port-status').textContent = 'TCP SYN -> PORT 5432';
            log("[libpq] Packaging StartupMessage (Protocol 3.0). Sending TCP SYN to localhost:5432...", "client");
            activatePath('conn-client-postmaster', 'active-read');
            await animatePacket('conn-client-postmaster', '#38bdf8', 1600);
            deactivatePath('conn-client-postmaster', 'active-read');
          }
        },
        {
          title: "Step 2: Postmaster (PID 1) Wakes Up & Calls fork()",
          body: "The master <strong>Postmaster daemon (PID 1)</strong> sleeping in <code>epoll_wait()</code> receives the socket descriptor. It validates client IP against <code>pg_hba.conf</code>, authenticates credentials (SCRAM-SHA-256), and invokes the Linux <code>fork()</code> system call to create dedicated Backend Worker Process (PID 4128).",
          meta: { wire: "AuthRequest / AuthOk ('R')", kernel: "epoll_wait() -> fork() syscall", ipc: "Attaching IPC", storage: "Idle" },
          exec: async function() {
            playBeep(560, 'sine', 0.2);
            highlightNode('rect-postmaster', 'glow-blue', 2200);
            document.getElementById('txt-postmaster-status').textContent = 'fork() -> Backend (PID 4128)';
            log("[POSTMASTER] Socket connection accepted. Invoking fork() to spawn dedicated Backend Worker (PID 4128)...", "system");
            activatePath('conn-postmaster-backend', 'active-read');
            await animatePacket('conn-postmaster-backend', '#818cf8', 1400);
            deactivatePath('conn-postmaster-backend', 'active-read');
          }
        },
        {
          title: "Step 3: Worker Attaches IPC Shared Memory & Allocates work_mem",
          body: "The newly forked Backend Worker inherits the socket descriptor, attaches to the global PostgreSQL Shared Memory IPC segment (<code>shared_buffers</code>, <code>wal_buffers</code>, <code>ProcArray</code>), and allocates its private TopMemoryContext and <code>work_mem</code> (4MB).",
          meta: { wire: "BackendKeyData ('K')", kernel: "shmat(shmid) IPC attach", ipc: "ProcArray Registered (PID 4128)", storage: "Idle" },
          exec: async function() {
            playBeep(640, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-blue', 2200);
            highlightNode('rect-localmem', 'glow-blue', 2200);
            highlightNode('rect-shared-buffers', 'glow-green', 2200);
            document.getElementById('txt-backend-status').textContent = 'IPC ATTACHED • WORK_MEM READY';
            log("[BACKEND (PID 4128)] Worker attached to Shared Memory IPC segment. Registered in ProcArray. Initialized work_mem (4MB).", "backend");
            await sleep(600);
          }
        },
        {
          title: "Step 4: ReadyForQuery ('Z') Sent to Client",
          body: "The Backend Worker transmits <code>AuthenticationOk ('R')</code>, <code>BackendKeyData ('K')</code> (cancellation key), and finally the <code>ReadyForQuery ('Z')</code> message. Client connection is now active and ready for SQL queries.",
          meta: { wire: "ReadyForQuery ('Z', idle)", kernel: "write(sock, ReadyForQuery)", ipc: "Snapshot Active", storage: "Idle" },
          exec: async function() {
            playBeep(720, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-green', 2000);
            highlightNode('rect-client', 'glow-green', 2000);
            document.getElementById('txt-backend-status').textContent = 'IDLE • AWAITING QUERY';
            document.getElementById('txt-port-status').textContent = 'PORT 5432 : CONNECTED';
            activatePath('conn-client-backend', 'active-read');
            await animatePacket('conn-client-backend', '#38d39f', 1500, true);
            deactivatePath('conn-client-backend', 'active-read');
            log("Client connection established: PostgreSQL session active on socket descriptor 8.", "client");
          }
        }
      ]
    },
    hit: {
      name: "2. Cache Hit Read",
      steps: [
        {
          title: "Step 1: libpq Sends Query Message ('Q')",
          body: "Client serializes <code>SELECT * FROM demo_page WHERE id = 1</code> into a protocol <code>Query ('Q')</code> packet and sends it over the TCP socket to Backend Worker PID 4128.",
          meta: { wire: "Query ('Q'): SELECT id=1", kernel: "read(socket, buf)", ipc: "Idle", storage: "Idle" },
          exec: async function() {
            playBeep(520, 'sine', 0.2);
            highlightNode('rect-client', 'glow-blue', 2200);
            highlightNode('rect-backend', 'glow-blue', 2200);
            document.getElementById('txt-client-sql').textContent = 'SELECT * FROM demo (id=1)';
            document.getElementById('txt-backend-status').textContent = 'PARSING QUERY...';
            log("Client sends query: SELECT * FROM demo_page WHERE id = 1;", "client");
            activatePath('conn-client-backend', 'active-read');
            await animatePacket('conn-client-backend', '#38bdf8', 1500);
            deactivatePath('conn-client-backend', 'active-read');
          }
        },
        {
          title: "Step 2: Parse, Analyze, Plan & Allocate work_mem",
          body: "Backend parses SQL into an AST, generates a cost-based execution plan (Seq Scan on demo_page), and checks private <code>work_mem</code> for sort/hash allocations.",
          meta: { wire: "In-Flight", kernel: "CPU Parse/Plan", ipc: "LockManager Checked", storage: "Idle" },
          exec: async function() {
            playBeep(640, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-blue', 2200);
            highlightNode('rect-localmem', 'glow-blue', 2200);
            log("[BACKEND (PID 4128)] Query planned: Seq Scan on demo_page. Checking work_mem (4MB)...", "backend");
            activatePath('conn-backend-localmem', 'active-read');
            await animatePacket('conn-backend-localmem', '#818cf8', 1300);
            deactivatePath('conn-backend-localmem', 'active-read');
          }
        },
        {
          title: "Step 3: Shared Buffers Lookup -> CACHE HIT in Slot 0!",
          body: "Backend computes 64-bit BufferTag <code>(db=16384, rel=24576, fork=MAIN, blkno=0)</code> and calls <code>BufTableLookup()</code>. Match found in <strong>Slot 0</strong>! Acquires <code>LW_SHARED</code> lock and increments usage count. <strong>Zero disk I/O!</strong>",
          meta: { wire: "In-Flight", kernel: "0 System Calls", ipc: "BufTableLookup() -> Slot 0 [HIT]", storage: "RAM Hit (0 Disk I/O)" },
          exec: async function() {
            playBeep(740, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-green', 2200);
            highlightNode('rect-shared-buffers', 'glow-green', 2200);
            updateSlotUI(0, 'PINNED');
            log("[SHARED_BUFFERS] BufferTag match! CACHE HIT in Slot 0 (Block 0). Pin acquired. usage_count incremented.", "memory");
            activatePath('conn-backend-shmem', 'active-read');
            await animatePacket('conn-backend-shmem', '#34d399', 1400);
            deactivatePath('conn-backend-shmem', 'active-read');
            await sleep(400);
            updateSlotUI(0, 'CLEAN');
          }
        },
        {
          title: "Step 4: MVCC Visibility Check & Hint Bits / CLOG Lookup",
          body: "Backend inspects tuple header. Tuple 1 has <code>t_xmin=1001</code>. It verifies commit status (either from the <code>HEAP_XMIN_COMMITTED</code> hint bit on the page or the in-memory CLOG buffer). Streams <code>DataRow ('D')</code> back to client.",
          meta: { wire: "DataRow ('D') -> ReadyForQuery ('Z')", kernel: "write(socket, data)", ipc: "Unpin Buffer Slot 0", storage: "0 Disk I/O" },
          exec: async function() {
            playBeep(920, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-green', 2000);
            highlightNode('rect-client', 'glow-green', 2000);
            document.getElementById('txt-backend-status').textContent = 'IDLE • AWAITING QUERY';
            activatePath('conn-client-backend', 'active-read');
            await animatePacket('conn-client-backend', '#38d39f', 1500, true);
            deactivatePath('conn-client-backend', 'active-read');
            log("Client received tuple: (id=1, name='Alice') in 0.28 ms [Cache Hit in RAM].", "client");
          }
        }
      ]
    },
    miss: {
      name: "3. Cache Miss Read",
      steps: [
        {
          title: "Step 1: libpq Requests Block 2",
          body: "Client dispatches <code>SELECT * FROM demo_page WHERE id = 2</code> requesting data located in Block 2.",
          meta: { wire: "Query ('Q'): SELECT id=2", kernel: "read(socket, buf)", ipc: "Idle", storage: "Idle" },
          exec: async function() {
            playBeep(480, 'sine', 0.2);
            highlightNode('rect-client', 'glow-blue', 2200);
            highlightNode('rect-backend', 'glow-blue', 2200);
            document.getElementById('txt-client-sql').textContent = 'SELECT * FROM demo (id=2)';
            document.getElementById('txt-backend-status').textContent = 'LOOKING UP BLOCK 2...';
            log("Client requests tuple in Block 2: SELECT * FROM demo_page WHERE id = 2;", "client");
            activatePath('conn-client-backend', 'active-read');
            await animatePacket('conn-client-backend', '#38bdf8', 1500);
            deactivatePath('conn-client-backend', 'active-read');
          }
        },
        {
          title: "Step 2: Buffer Hash Table Lookup -> CACHE MISS!",
          body: "Backend searches <code>shared_buffers</code> hash table for Block 2. <strong>Result: NULL (Cache Miss)</strong>. Page is not in RAM. Runs Clock Sweep to allocate free buffer slot (Slot 2).",
          meta: { wire: "In-Flight", kernel: "StrategyGetBuffer() ClockSweep", ipc: "BufTableLookup() -> NULL [MISS]", storage: "Pending Disk Read" },
          exec: async function() {
            playBeep(420, 'sawtooth', 0.2);
            highlightNode('rect-backend', 'glow-yellow', 2200);
            highlightNode('rect-shared-buffers', 'glow-yellow', 2200);
            log("[SHARED_BUFFERS] BufferTag not in hash table. CACHE MISS on Block 2! Clock Sweep allocates Slot 2...", "memory");
            activatePath('conn-backend-shmem', 'active-wal');
            await animatePacket('conn-backend-shmem', '#f59e0b', 1300);
            deactivatePath('conn-backend-shmem', 'active-wal');
          }
        },
        {
          title: "Step 3: Kernel pread() Loads 8192 Bytes from Substage A (base/ File)",
          body: "Backend executes Linux <code>pread()</code> system call on physical table file <code>base/16384/24576</code> in <strong>Substage A</strong>. OS kernel reads 8192 bytes into Shared Buffers Slot 2 and registers mapping in Buffer Hash Table.",
          meta: { wire: "In-Flight", kernel: "pread(fd, buf, 8192, offset)", ipc: "Slot 2 -> PINNED", storage: "Substage A: base/16384/24576 [READ]" },
          exec: async function() {
            playBeep(380, 'triangle', 0.25);
            highlightNode('disk-base', 'glow-pink', 2200);
            state.slot2State = 'PINNED';
            updateSlotUI(2, 'PINNED');
            log("[STORAGE (Substage A)] Kernel pread() loaded 8192 bytes from base/16384/24576 into Shared Buffers Slot 2.", "disk");
            activatePath('conn-backend-disk', 'active-disk');
            await animatePacket('conn-backend-disk', '#ec4899', 1800);
            deactivatePath('conn-backend-disk', 'active-disk');
            state.slot2State = 'CLEAN';
            updateSlotUI(2, 'CLEAN');
          }
        },
        {
          title: "Step 4: Return Tuple to Client (Cached for Future Reads)",
          body: "Backend reads tuple from newly cached Slot 2 and streams data to client. Future reads for Block 2 will now hit RAM instantly!",
          meta: { wire: "DataRow ('D') -> ReadyForQuery ('Z')", kernel: "write(socket, data)", ipc: "Slot 2 Cached [CLEAN]", storage: "Synced" },
          exec: async function() {
            playBeep(880, 'sine', 0.2);
            highlightNode('rect-backend', 'glow-green', 2000);
            highlightNode('rect-client', 'glow-green', 2000);
            document.getElementById('txt-backend-status').textContent = 'IDLE • AWAITING QUERY';
            activatePath('conn-client-backend', 'active-read');
            await animatePacket('conn-client-backend', '#38d39f', 1500, true);
            deactivatePath('conn-client-backend', 'active-read');
            log("Client received result tuple: (id=2, name='Bob') in 1.45 ms [Cache Miss Disk Load].", "client");
          }
        }
      ]
    },
    write: {
      name: "4. Write & WAL LSN Advance",
      steps: [
        {
          title: "Step 1: Write Statement & RowExclusiveLock (CLOG: 00 IN_PROGRESS)",
          body: "Client dispatches <code>UPDATE demo_page SET name = 'Alice Updated' WHERE id = 1</code>. Backend assigns <strong>XID " + (state.xid + 1) + "</strong>, marks state <code>00: IN_PROGRESS</code> in the CLOG buffer, and acquires <code>RowExclusiveLock</code>.",
          meta: { wire: "Execute ('E'): UPDATE demo_page", kernel: "CPU Lock Manager", ipc: "RowExclusiveLock (XID " + (state.xid + 1) + ")", storage: "Idle" },
          exec: async function() {
            state.xid++;
            playBeep(440, 'sine', 0.2);
            highlightNode('rect-client', 'glow-green', 2200);
            highlightNode('rect-backend', 'glow-green', 2200);
            document.getElementById('txt-client-sql').textContent = 'UPDATE demo_page (id=1)';
            document.getElementById('txt-backend-status').textContent = 'PROCESSING WRITE (XID ' + state.xid + ')';
            document.getElementById('txt-clog-status').textContent = 'XID ' + state.xid + ': [00: IN_PROGRESS]';
            log("Client initiates write: UPDATE demo_page SET name = 'Alice Updated' WHERE id = 1; Assigned XID " + state.xid, "client");
            activatePath('conn-client-backend', 'active-write');
            await animatePacket('conn-client-backend', '#22c55e', 1500);
            deactivatePath('conn-client-backend', 'active-write');
          }
        },
        {
          title: "Step 2: Modify Block 1 in RAM & Stamp pd_lsn",
          body: "Backend modifies Block 1 in <code>shared_buffers</code> (marks old tuple <code>t_xmax=" + state.xid + "</code>, writes new tuple). Stamps <strong>pd_lsn = 0/" + (state.lsnNum + 0x1000).toString(16).toUpperCase() + "</strong> and sets buffer status to <strong>DIRTY (BM_DIRTY = true)</strong>. Not written to disk yet!",
          meta: { wire: "In-Flight", kernel: "Memory Write (No Disk I/O)", ipc: "Block 1 [BM_DIRTY = true]", storage: "Disk Remains Old Version" },
          exec: async function() {
            state.lsnNum += 0x1000;
            const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
            playBeep(330, 'sawtooth', 0.2);
            highlightNode('rect-backend', 'glow-yellow', 2200);
            highlightNode('rect-shared-buffers', 'glow-yellow', 2200);
            state.slot1State = 'DIRTY';
            updateSlotUI(1, 'DIRTY');
            document.getElementById('txt-slot-1-lsn').textContent = 'pd_lsn: ' + lsnHex;
            log("[SHARED_BUFFERS] Block 1 modified in RAM. Stamped pd_lsn=" + lsnHex + ". Set buffer status to DIRTY.", "memory");
            activatePath('conn-backend-shmem', 'active-write');
            await animatePacket('conn-backend-shmem', '#22c55e', 1400);
            deactivatePath('conn-backend-shmem', 'active-write');
          }
        },
        {
          title: "Step 3: WAL LSN Byte Offset Advanced in wal_buffers",
          body: "<code>XLogInsert()</code> advances the global Log Sequence Number to <strong>0/" + state.lsnNum.toString(16).toUpperCase() + "</strong> and stages the binary delta change record into the in-memory <code>wal_buffers</code> ring.",
          meta: { wire: "In-Flight", kernel: "XLogInsert() in RAM", ipc: "wal_buffers LSN Advanced", storage: "Staged in RAM" },
          exec: async function() {
            const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
            playBeep(520, 'triangle', 0.2);
            highlightNode('rect-wal-buffers', 'glow-yellow', 2200);
            document.getElementById('txt-walbuf-status').textContent = lsnHex;
            log("[WAL_BUFFERS] LSN advanced to " + lsnHex + ". WAL change record staged in ring buffer.", "wal");
            activatePath('conn-backend-walbuf', 'active-wal');
            await animatePacket('conn-backend-walbuf', '#f59e0b', 1300);
            deactivatePath('conn-backend-walbuf', 'active-wal');
          }
        },
        {
          title: "Step 4: WAL Flush to Substage B (pg_wal/ with fsync)",
          body: "The <strong>WALWriter process</strong> flushes the staged log record from memory to physical disk in <strong>Substage B</strong> (<code>pg_wal/000000010000000000000001</code>) and executes <code>fsync()</code>. The Write-Ahead Logging Invariant is satisfied!",
          meta: { wire: "In-Flight", kernel: "write() + fsync(pg_wal)", ipc: "wal_buffers Flushed", storage: "Substage B: pg_wal/ SYNCED" },
          exec: async function() {
            playBeep(580, 'sine', 0.2);
            highlightNode('rect-walwriter', 'glow-yellow', 2200);
            highlightNode('disk-wal', 'glow-yellow', 2200);
            log("[WAL_WRITER] Flushed WAL buffer to Substage B (pg_wal/000000010000000000000001) with fsync().", "wal");
            activatePath('conn-shmem-walwriter', 'active-wal');
            await animatePacket('conn-shmem-walwriter', '#f59e0b', 1200);
            deactivatePath('conn-shmem-walwriter', 'active-wal');
            activatePath('conn-walwriter-disk', 'active-wal');
            await animatePacket('conn-walwriter-disk', '#f59e0b', 1400);
            deactivatePath('conn-walwriter-disk', 'active-wal');
          }
        },
        {
          title: "Step 5: CLOG (pg_xact) 2-Bit State Flip -> 01: COMMITTED",
          body: "Backend atomically flips the 2-bit state for XID " + state.xid + " in the <code>CLOG buffer</code> from <code>00: IN_PROGRESS</code> to <strong>01: COMMITTED</strong> and sends commit acknowledgment (<code>ReadyForQuery</code>) to client.",
          meta: { wire: "CommandComplete ('C') -> ReadyForQuery ('Z')", kernel: "write(socket, ack)", ipc: "CLOG XID " + state.xid + " [01: COMMITTED]", storage: "WAL Safe" },
          exec: async function() {
            const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
            playBeep(680, 'sine', 0.2);
            highlightNode('rect-clog-buf', 'glow-purple', 2200);
            highlightNode('rect-client', 'glow-green', 2200);
            document.getElementById('txt-clog-status').textContent = 'XID ' + state.xid + ': [01: COMMITTED]';
            document.getElementById('txt-backend-status').textContent = 'IDLE • AWAITING QUERY';
            log("[CLOG (pg_xact)] Atomically set XID " + state.xid + " 2-bit flag to 01 (COMMITTED).", "memory");
            activatePath('conn-backend-clog', 'active-vacuum');
            await animatePacket('conn-backend-clog', '#c084fc', 1200);
            deactivatePath('conn-backend-clog', 'active-vacuum');

            activatePath('conn-client-backend', 'active-write');
            await animatePacket('conn-client-backend', '#22c55e', 1500, true);
            deactivatePath('conn-client-backend', 'active-write');

            document.getElementById('prop-lsn').textContent = lsnHex;
            document.getElementById('page-lsn-badge').textContent = 'LSN: ' + lsnHex;
          }
        }
      ]
    },
    bgwriter: {
      name: "5. Autonomous BGWriter",
      steps: [
        {
          title: "Step 1: Autonomous bgwriter Loop Wakes Up (200ms Delay)",
          body: "The autonomous <strong>Background Writer (bgwriter)</strong> wakes up from its <code>bgwriter_delay</code> sleep (200ms). Unlike Checkpointer, BGWriter runs continually without waiting for checkpoint intervals.",
          meta: { wire: "Idle", kernel: "bgwriter_main() Loop", ipc: "Scanning Shared Buffers LRU", storage: "Idle" },
          exec: async function() {
            playBeep(420, 'sine', 0.2);
            highlightNode('rect-bgwriter', 'glow-blue', 2200);
            document.getElementById('txt-bgwriter-status').textContent = 'WOKEN UP • SCANNING LRU';
            log("[BGWRITER] Autonomous 200ms cycle triggered. Scanning shared_buffers ahead of the clock hand...", "system");
            await sleep(600);
          }
        },
        {
          title: "Step 2: Locating Unpinned Dirty Pages in Shared Buffers",
          body: "BGWriter advances its private clock pointer and locates Block 1 marked as <strong>DIRTY</strong>. It grabs the buffer lock without blocking client queries.",
          meta: { wire: "Idle", kernel: "BgBufferSync()", ipc: "Identified Block 1 [BM_DIRTY]", storage: "Scheduling proactive write" },
          exec: async function() {
            playBeep(520, 'sine', 0.2);
            highlightNode('rect-shared-buffers', 'glow-blue', 2200);
            highlightNode('rect-bgwriter', 'glow-blue', 2200);
            log("[BGWRITER] Found dirty Block 1. Writing page to storage ahead of time to keep free list clean.", "memory");
            activatePath('conn-shmem-bgwriter', 'active-read');
            await animatePacket('conn-shmem-bgwriter', '#06b6d4', 1400);
            deactivatePath('conn-shmem-bgwriter', 'active-read');
          }
        },
        {
          title: "Step 3: Proactive Disk Write to Substage A (base/)",
          body: "BGWriter flushes Block 1 to disk in <strong>Substage A</strong> (<code>base/16384/24576</code>). Block 1 is cleared to <strong>CLEAN</strong> in RAM. Backend workers needing a free slot now get one immediately without disk latency, and Checkpointer's future workload is drastically reduced!",
          meta: { wire: "Idle", kernel: "write(base/24576)", ipc: "Block 1 [BM_DIRTY = false]", storage: "Substage A: base/16384/24576 [CLEAN]" },
          exec: async function() {
            playBeep(640, 'sine', 0.2);
            highlightNode('disk-base', 'glow-blue', 2200);
            log("[BGWRITER] Proactively wrote Block 1 to disk. Cleared BM_DIRTY flag. Free list buffer ready.", "disk");
            activatePath('conn-bgwriter-disk', 'active-read');
            await animatePacket('conn-bgwriter-disk', '#06b6d4', 1500);
            deactivatePath('conn-bgwriter-disk', 'active-read');
            state.slot1State = 'CLEAN';
            updateSlotUI(1, 'CLEAN');
            document.getElementById('txt-bgwriter-status').textContent = 'SLEEPING (200ms delay)';
          }
        }
      ]
    },
    checkpoint: {
      name: "6. Trigger Checkpoint",
      steps: [
        {
          title: "Step 1: Checkpointer Establishes REDO LSN Barrier",
          body: "Checkpointer awakens and records the current WAL position as the <strong>Checkpoint REDO Point</strong> (<strong>0/" + state.lsnNum.toString(16).toUpperCase() + "</strong>).",
          meta: { wire: "Idle", kernel: "CreateCheckPoint()", ipc: "Checkpoint Lock Acquired", storage: "REDO Barrier Established" },
          exec: async function() {
            playBeep(260, 'triangle', 0.25);
            highlightNode('rect-checkpointer', 'glow-orange', 2200);
            log("[CHECKPOINTER] Checkpoint started. Establishing recovery REDO point at LSN 0/" + state.lsnNum.toString(16).toUpperCase(), "checkpoint");
            await sleep(600);
          }
        },
        {
          title: "Step 2: Flush WAL Stream to Substage B (pg_wal/)",
          body: "Checkpointer forces all WAL records up to the REDO LSN to disk in <strong>Substage B</strong> (<code>pg_wal/</code>). This ensures the log is completely durable before data pages are written.",
          meta: { wire: "Idle", kernel: "XLogFlush(redo_lsn)", ipc: "WAL Stream Synced", storage: "Substage B: pg_wal/ Synced" },
          exec: async function() {
            playBeep(380, 'sine', 0.2);
            highlightNode('disk-wal', 'glow-yellow', 2200);
            highlightNode('rect-checkpointer', 'glow-orange', 2200);
            log("[CHECKPOINTER] Flushed WAL stream to Substage B (pg_wal/) up to REDO point.", "checkpoint");
            activatePath('conn-walwriter-disk', 'active-wal');
            await animatePacket('conn-walwriter-disk', '#f59e0b', 1400);
            deactivatePath('conn-walwriter-disk', 'active-wal');
          }
        },
        {
          title: "Step 3: Flush Remaining Dirty Buffers to Substage A (base/) & fsync()",
          body: "Checkpointer scans <code>shared_buffers</code>, writes any remaining dirty pages to <strong>Substage A</strong> (<code>base/16384/24576</code>), and issues an OS <code>fsync()</code> on all modified data files.",
          meta: { wire: "Idle", kernel: "CheckPointBuffers() + fsync()", ipc: "All Buffers [CLEAN]", storage: "Substage A: base/ Synced" },
          exec: async function() {
            playBeep(480, 'sine', 0.2);
            highlightNode('disk-base', 'glow-orange', 2200);
            highlightNode('rect-shared-buffers', 'glow-orange', 2200);
            log("[CHECKPOINTER] Flushed all dirty buffers to Substage A (base/) and executed fsync().", "disk");
            activatePath('conn-shmem-checkpointer', 'active-checkpoint');
            await animatePacket('conn-shmem-checkpointer', '#f97316', 1300);
            deactivatePath('conn-shmem-checkpointer', 'active-checkpoint');
            activatePath('conn-checkpointer-disk', 'active-checkpoint');
            await animatePacket('conn-checkpointer-disk', '#f97316', 1500);
            deactivatePath('conn-checkpointer-disk', 'active-checkpoint');
            state.slot1State = 'CLEAN';
            updateSlotUI(1, 'CLEAN');
          }
        },
        {
          title: "Step 4: Synchronize pg_control (Substage D) & Recycle Old WAL",
          body: "Checkpointer writes the latest synchronized REDO LSN (<strong>0/" + state.lsnNum.toString(16).toUpperCase() + "</strong>) into <strong>Substage D (`pg_control`)</strong> and executes <code>fsync(pg_control)</code>. Any WAL files older than this REDO point in `pg_wal/` are now safely recycled!",
          meta: { wire: "Idle", kernel: "UpdateControlFile() + fsync()", ipc: "pg_control Synced", storage: "Substage D: pg_control [REDO Updated]" },
          exec: async function() {
            const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
            playBeep(560, 'triangle', 0.2);
            highlightNode('disk-control', 'glow-orange', 2200);
            document.getElementById('txt-control-lsn').textContent = 'pg_control [REDO: ' + lsnHex + ']';
            document.getElementById('txt-walbuf-status').textContent = lsnHex;
            log("[CHECKPOINTER] Checkpoint complete. Updated Substage D (pg_control) with REDO point: " + lsnHex + ". Old WAL recycled.", "checkpoint");
            activatePath('conn-checkpointer-control', 'active-checkpoint');
            await animatePacket('conn-checkpointer-control', '#f97316', 1600);
            deactivatePath('conn-checkpointer-control', 'active-checkpoint');
          }
        }
      ]
    },
    vacuum: {
      name: "7. Run Autovacuum",
      steps: [
        {
          title: "Step 1: Autovacuum Worker Process Spawned",
          body: "Autovacuum launcher process spawns a dedicated worker process for table <code>demo_page</code> (filenode 24576) based on vacuum scale factor thresholds.",
          meta: { wire: "Idle", kernel: "fork() -> Autovacuum Worker", ipc: "Shared Buffer Scan", storage: "Scanning table files" },
          exec: async function() {
            playBeep(350, 'sine', 0.2);
            highlightNode('rect-vacuum', 'glow-purple', 2200);
            log("[AUTOVACUUM] Worker process spawned for relation 'demo_page' (filenode 24576).", "vacuum");
            await sleep(600);
          }
        },
        {
          title: "Step 2: Heap Block Scan & Dead Tuple Detection",
          body: "The worker scans table blocks in Shared Buffers and identifies outdated, dead row versions left behind by previous UPDATE operations (<code>t_xmax < OldestXmin</code>).",
          meta: { wire: "Idle", kernel: "CPU Heap Tuple Scan", ipc: "Dead Tuples Located", storage: "Idle" },
          exec: async function() {
            playBeep(450, 'sine', 0.2);
            highlightNode('rect-shared-buffers', 'glow-purple', 2200);
            highlightNode('rect-vacuum', 'glow-purple', 2200);
            log("[AUTOVACUUM] Scanning heap blocks for dead row versions created by UPDATEs...", "vacuum");
            activatePath('conn-vacuum-shmem', 'active-vacuum');
            await animatePacket('conn-vacuum-shmem', '#a855f7', 1400);
            deactivatePath('conn-vacuum-shmem', 'active-vacuum');
          }
        },
        {
          title: "Step 3: Dead Tuple Removal & Page Defragmentation",
          body: "The worker prunes dead row pointers (<code>ItemIdData</code>), defragments the 8 KB page, shifts <code>pd_lower</code> and <code>pd_upper</code>, and makes space reusable for future INSERTs without locking the table.",
          meta: { wire: "Idle", kernel: "In-Memory Page Compaction", ipc: "Free Space Reclaimed", storage: "Idle" },
          exec: async function() {
            playBeep(580, 'sine', 0.2);
            if (state.deadTuples > 0) {
              log("[AUTOVACUUM] Pruned " + state.deadTuples + " bytes of dead tuples. Space reclaimed.", "vacuum");
              state.freeSpace += state.deadTuples;
              state.deadTuples = 0;
            } else {
              log("[AUTOVACUUM] Zero dead tuples found. Free space already optimal.", "vacuum");
            }
            await sleep(600);
          }
        },
        {
          title: "Step 4: Update Substage A Maps (_fsm & _vm on Disk)",
          body: "The worker writes updated block statistics to <code>24576_fsm</code> (Free Space Map) and marks the block as All-Visible in <code>24576_vm</code> (enabling ultra-fast Index-Only Scans) in <strong>Substage A</strong>.",
          meta: { wire: "Idle", kernel: "write(_fsm) + write(_vm)", ipc: "Maps Updated", storage: "Substage A: 24576_fsm & 24576_vm" },
          exec: async function() {
            playBeep(680, 'sine', 0.2);
            highlightNode('disk-base', 'glow-purple', 2200);
            log("[AUTOVACUUM] Updated Free Space Map (_fsm) and Visibility Map (_vm) in Substage A.", "vacuum");
            activatePath('conn-vacuum-disk', 'active-vacuum');
            await animatePacket('conn-vacuum-disk', '#a855f7', 1400);
            deactivatePath('conn-vacuum-disk', 'active-vacuum');
            document.getElementById('prop-dead-count').textContent = '0 bytes (Clean)';
            document.getElementById('prop-fsm').textContent = state.freeSpace + ' Bytes (Optimal)';
            document.getElementById('prop-vm').textContent = 'All-Visible: TRUE';
          }
        }
      ]
    }
  };

  // ================= STEP-BY-STEP CONTROLLER ENGINE =================
  function updateNavUI() {
    if (!state.currentScenarioKey) {
      btnPrev.disabled = true;
      btnNext.disabled = true;
      explainerStepNum.textContent = 'Ready';
      return;
    }

    const sc = SCENARIOS[state.currentScenarioKey];
    const total = sc.steps.length;
    btnPrev.disabled = state.busy || state.currentStepIdx <= 0;
    btnNext.disabled = state.busy || state.currentStepIdx >= total - 1;
    explainerStepNum.textContent = 'Step ' + (state.currentStepIdx + 1) + '/' + total;
  }

  async function runStep(stepIdx) {
    if (!state.currentScenarioKey || state.busy) return;
    const sc = SCENARIOS[state.currentScenarioKey];
    if (stepIdx < 0 || stepIdx >= sc.steps.length) return;

    state.busy = true;
    state.currentStepIdx = stepIdx;
    updateNavUI();

    const step = sc.steps[stepIdx];
    explainerCard.classList.add('active-flow');
    explainerBadge.innerHTML = '<i class="fas fa-play-circle text-info"></i> ' + sc.name + ' • STEP ' + (stepIdx + 1) + '/' + sc.steps.length;
    explainerTitle.innerHTML = step.title;
    explainerBody.innerHTML = step.body;

    if (step.meta) {
      if (step.meta.wire && metaWire) metaWire.textContent = 'Wire: ' + step.meta.wire;
      if (step.meta.kernel && metaKernel) metaKernel.textContent = 'Kernel: ' + step.meta.kernel;
      if (step.meta.ipc && metaIpc) metaIpc.textContent = 'IPC: ' + step.meta.ipc;
      if (step.meta.storage && metaStorage) metaStorage.textContent = 'Storage: ' + step.meta.storage;
    }

    await step.exec();

    state.busy = false;
    updateNavUI();

    if (stepIdx === sc.steps.length - 1) {
      explainerBadge.innerHTML = '<i class="fas fa-check-circle text-success"></i> ' + sc.name + ' COMPLETED';
      if (state.autoplay) {
        toggleAutoplay(false);
      }
    } else if (state.autoplay) {
      const waitTime = state.speedMultiplier === 0.5 ? 3500 : 2500;
      state.autoplayTimer = setTimeout(function() {
        if (state.autoplay) runStep(stepIdx + 1);
      }, waitTime);
    }
  }

  function startScenario(key) {
    if (state.autoplayTimer) clearTimeout(state.autoplayTimer);
    state.currentScenarioKey = key;
    runStep(0);
  }

  function toggleAutoplay(forceState) {
    state.autoplay = typeof forceState === 'boolean' ? forceState : !state.autoplay;
    if (state.autoplay) {
      btnAutoplay.innerHTML = '<i class="fas fa-pause"></i> Pause';
      btnAutoplay.classList.add('btn-checkpoint');
      if (state.currentScenarioKey) {
        if (state.currentStepIdx >= SCENARIOS[state.currentScenarioKey].steps.length - 1) {
          runStep(0);
        } else {
          runStep(state.currentStepIdx + 1);
        }
      } else {
        startScenario('connect');
      }
    } else {
      btnAutoplay.innerHTML = '<i class="fas fa-play"></i> Auto-Play';
      btnAutoplay.classList.remove('btn-checkpoint');
      if (state.autoplayTimer) clearTimeout(state.autoplayTimer);
    }
  }

  function toggleSpeed() {
    if (state.speedMultiplier === 1.0) {
      state.speedMultiplier = 0.5;
      btnSpeed.innerHTML = '<i class="fas fa-tachometer-alt"></i> Speed: Slow (0.5x)';
      btnSpeed.style.borderColor = '#38bdf8';
    } else {
      state.speedMultiplier = 1.0;
      btnSpeed.innerHTML = '<i class="fas fa-tachometer-alt"></i> Speed: Normal (1x)';
      btnSpeed.style.borderColor = '#475569';
    }
  }

  // ================= EVENT LISTENERS =================
  btnConnect.addEventListener('click', function() { startScenario('connect'); });
  btnHit.addEventListener('click', function() { startScenario('hit'); });
  btnMiss.addEventListener('click', function() { startScenario('miss'); });
  btnWrite.addEventListener('click', function() { startScenario('write'); });
  btnBgwriter.addEventListener('click', function() { startScenario('bgwriter'); });
  btnCheckpoint.addEventListener('click', function() { startScenario('checkpoint'); });
  btnVacuum.addEventListener('click', function() { startScenario('vacuum'); });

  btnPrev.addEventListener('click', function() {
    if (!state.busy && state.currentStepIdx > 0) {
      if (state.autoplayTimer) clearTimeout(state.autoplayTimer);
      runStep(state.currentStepIdx - 1);
    }
  });

  btnNext.addEventListener('click', function() {
    if (!state.busy && state.currentScenarioKey && state.currentStepIdx < SCENARIOS[state.currentScenarioKey].steps.length - 1) {
      if (state.autoplayTimer) clearTimeout(state.autoplayTimer);
      runStep(state.currentStepIdx + 1);
    }
  });

  btnAutoplay.addEventListener('click', function() { toggleAutoplay(); });
  btnSpeed.addEventListener('click', toggleSpeed);

  // INSPECT 8KB PAGE
  btnInspect.addEventListener('click', function() {
    playBeep(600, 'sine', 0.08);
    if (inspectorPanel.style.display === 'none' || inspectorPanel.style.display === '') {
      inspectorPanel.style.display = 'block';
      btnInspect.classList.remove('btn-inspect');
      btnInspect.classList.add('btn-checkpoint');
      btnInspect.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Page Inspector';
    } else {
      inspectorPanel.style.display = 'none';
      btnInspect.classList.remove('btn-checkpoint');
      btnInspect.classList.add('btn-inspect');
      btnInspect.innerHTML = '<i class="fas fa-layer-group"></i> Inspect 8KB Page';
    }
  });

  // RESET
  btnReset.addEventListener('click', function() {
    if (state.autoplayTimer) clearTimeout(state.autoplayTimer);
    toggleAutoplay(false);
    playBeep(440, 'sine', 0.1);

    state = {
      busy: false,
      lsnNum: 0x16A2F40,
      xid: 1002,
      slot1State: 'CLEAN',
      slot2State: 'EMPTY',
      deadTuples: 0,
      freeSpace: 7840,
      speedMultiplier: state.speedMultiplier,
      autoplay: false,
      autoplayTimer: null,
      currentScenarioKey: null,
      currentStepIdx: -1
    };

    updateSlotUI(0, 'CLEAN');
    updateSlotUI(1, 'CLEAN');
    updateSlotUI(2, 'EMPTY');
    updateSlotUI(3, 'CACHED');

    document.getElementById('txt-control-lsn').textContent = 'pg_control [REDO: 0/16A2F40]';
    document.getElementById('txt-walbuf-status').textContent = '0/16A2F40';
    document.getElementById('txt-clog-status').textContent = 'XID 1002: [01: COMMITTED]';
    document.getElementById('txt-client-sql').textContent = 'StartupMessage (v3.0)';
    document.getElementById('txt-port-status').textContent = 'PORT 5432 : LISTEN';
    document.getElementById('txt-client-status').textContent = 'STATUS: READY';
    document.getElementById('txt-backend-status').textContent = 'IDLE • AWAITING QUERY';
    document.getElementById('txt-postmaster-status').textContent = 'epoll_wait(port=5432)';
    document.getElementById('txt-slot-1-lsn').textContent = 'pd_lsn: 0/16A2F40';

    document.getElementById('prop-lsn').textContent = '0/16A2F40';
    document.getElementById('page-lsn-badge').textContent = 'LSN: 0/16A2F40';
    document.getElementById('prop-dead-count').textContent = '0 bytes';
    document.getElementById('prop-fsm').textContent = '7840 Bytes (95%)';

    explainerCard.classList.remove('active-flow');
    explainerBadge.innerHTML = '<i class="fas fa-info-circle text-primary"></i> ARCHITECTURE READY';
    explainerTitle.innerHTML = 'Interactive PostgreSQL Architecture &amp; Core Internals Explorer';
    explainerBody.innerHTML = 'Select any scenario above. Use <strong>[Next Step]</strong> to step through slowly one action at a time, or click <strong>[Auto-Play]</strong> to watch the lifecycle unfold with gentle, clear pacing.';
    updateNavUI();

    if (metaWire) metaWire.textContent = 'Wire: Idle';
    if (metaKernel) metaKernel.textContent = 'Kernel: epoll_wait(port=5432)';
    if (metaIpc) metaIpc.textContent = 'IPC: Attached (shmget)';
    if (metaStorage) metaStorage.textContent = 'Storage: base/ synced';

    log("[POSTMASTER] Cluster state and shared buffer pool reset to initial baseline.", "system");
  });
})();
</script>

---

## 7. Key Performance Tuning & Architecture Best Practices

1. **Size `shared_buffers` appropriately**:
   - Start with **25% of total system RAM** on Linux / Unix systems (up to 40% for read-heavy workloads).
   - Avoid exceeding 40% of RAM because PostgreSQL relies heavily on the operating system kernel's page cache (double caching).
2. **Calculate `work_mem` carefully**:
   - Remember that `work_mem` is allocated **per sort/hash operation**, not per connection.
   - Recommended formula: `work_mem = ((Total RAM - shared_buffers) * 0.8) / (max_connections * average_active_work_operators)`.
3. **Optimize Checkpoint Spacing (`max_wal_size` & `checkpoint_completion_target`)**:
   - Increase `max_wal_size` (e.g., 16GB - 64GB on modern NVMe drives) to prevent frequent I/O spikes caused by WAL-volume triggered checkpoints.
   - Set `checkpoint_completion_target = 0.9` to smooth I/O evenly across 90% of the checkpoint interval.
4. **Tune Autovacuum for High-Write Workloads**:
   - Decrease `autovacuum_vacuum_scale_factor` (e.g., from default 0.2 to 0.05 on large tables) so VACUUM kicks in before millions of dead tuples accumulate.
   - Increase `autovacuum_max_workers` and `maintenance_work_mem` to prevent transaction ID wraparound on large databases.