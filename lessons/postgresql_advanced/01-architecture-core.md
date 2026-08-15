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

### Inspecting 8KB Pages with `pageinspect`

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

## 5. Interactive PostgreSQL Architecture & Core Internals Simulator

Interact with the real-time simulation below to see how client connections, worker backends, local memory, shared memory structures (`shared_buffers`, `wal_buffers`, `CLOG`), background processes (`Checkpointer`, `BGWriter`, `WALWriter`, `Autovacuum`), and on-disk files interact during query execution, write transactions, checkpoints, and vacuuming.

<div class="pg-arch-dashboard">
<div class="controls-panel">
<button id="btn-arch-query" class="dash-btn btn-query"><i class="fas fa-search"></i> Execute Query (SELECT)</button>
<button id="btn-arch-write" class="dash-btn btn-write"><i class="fas fa-edit"></i> Execute Write (UPDATE)</button>
<button id="btn-arch-checkpoint" class="dash-btn btn-checkpoint"><i class="fas fa-save"></i> Trigger Checkpoint</button>
<button id="btn-arch-vacuum" class="dash-btn btn-vacuum"><i class="fas fa-broom"></i> Run Autovacuum</button>
<button id="btn-arch-inspect" class="dash-btn btn-inspect"><i class="fas fa-microchip"></i> Inspect 8KB Page</button>
<button id="btn-arch-reset" class="dash-btn btn-reset"><i class="fas fa-sync-alt"></i> Reset Architecture</button>
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

<div class="visuals-wrapper">
<svg id="pg-arch-svg" viewBox="0 0 960 520" class="dashboard-svg">
<defs>
<filter id="glow-p" x="-30%" y="-30%" width="160%" height="160%">
<feGaussianBlur stdDeviation="4" result="blur" />
<feComposite in="SourceGraphic" in2="blur" operator="over" />
</filter>
<linearGradient id="client-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#0f172a"/>
<stop offset="100%" stop-color="#1e293b"/>
</linearGradient>
<linearGradient id="process-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#0f172a"/>
<stop offset="100%" stop-color="#1e1b4b"/>
</linearGradient>
<linearGradient id="shmem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#09182b"/>
<stop offset="100%" stop-color="#062e24"/>
</linearGradient>
<linearGradient id="disk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#1c1124"/>
<stop offset="100%" stop-color="#2d1537"/>
</linearGradient>
</defs>

<!-- Connections -->
<path id="conn-client-backend" class="conn-line" d="M 120 250 L 190 250" />
<path id="conn-backend-localmem" class="conn-line" d="M 260 210 L 260 150" />
<path id="conn-backend-shmem" class="conn-line" d="M 330 250 L 400 250" />
<path id="conn-shmem-walwriter" class="conn-line" d="M 680 190 L 760 140" />
<path id="conn-walwriter-disk" class="conn-line" d="M 850 160 L 850 370" />
<path id="conn-shmem-bgwriter" class="conn-line" d="M 680 130 L 760 80" />
<path id="conn-shmem-checkpointer" class="conn-line" d="M 680 250 L 760 210" />
<path id="conn-checkpointer-disk" class="conn-line" d="M 850 240 L 850 370" />
<path id="conn-vacuum-shmem" class="conn-line" d="M 760 270 L 680 320" />
<path id="conn-vacuum-disk" class="conn-line" d="M 850 290 L 850 370" />
<path id="conn-backend-disk" class="conn-line" d="M 260 290 Q 260 480 750 430" />

<!-- 1. CLIENT TIER -->
<g transform="translate(20, 205)">
<rect class="node-card stroke-default" width="100" height="90" rx="8" fill="url(#client-grad)" />
<text x="50" y="30" class="node-text-title" text-anchor="middle">Client App</text>
<text x="50" y="50" class="node-text-sub" text-anchor="middle">libpq / TCP 5432</text>
<text id="txt-client-state" x="50" y="75" class="node-text-status" fill="#38d39f" text-anchor="middle">IDLE / READY</text>
</g>

<!-- 2. LOCAL BACKEND & MEMORY TIER -->
<g transform="translate(190, 45)">
<rect class="node-card" width="140" height="105" rx="8" fill="url(#process-grad)" stroke="#818cf8" />
<text x="70" y="24" class="node-text-title" fill="#c7d2fe" text-anchor="middle">Local Memory</text>
<text x="70" y="44" class="node-text-sub" text-anchor="middle">work_mem (4MB)</text>
<text x="70" y="64" class="node-text-sub" text-anchor="middle">maint_work_mem (64MB)</text>
<text x="70" y="84" class="node-text-sub" text-anchor="middle">temp_buffers (8MB)</text>
</g>

<g id="node-backend" transform="translate(190, 205)">
<rect id="rect-backend" class="node-card stroke-default" width="140" height="90" rx="8" fill="url(#process-grad)" />
<text x="70" y="30" class="node-text-title" fill="#c7d2fe" text-anchor="middle">Backend Worker</text>
<text x="70" y="50" class="node-text-sub" text-anchor="middle">PID: 4128 (Forked)</text>
<text id="txt-backend-status" x="70" y="75" class="node-text-status" fill="#818cf8" text-anchor="middle">WAITING QUERY</text>
</g>

<!-- 3. SHARED MEMORY SEGMENT (GLOBAL IPC) -->
<g transform="translate(400, 30)">
<rect class="node-card stroke-default" width="280" height="460" rx="12" fill="url(#shmem-grad)" stroke="#38d39f" stroke-width="1.5" />
<text x="140" y="26" class="node-text-title" fill="#6ee7b7" text-anchor="middle">Shared Memory (Global IPC)</text>
<text x="140" y="42" class="node-text-sub" fill="#94a3b8" text-anchor="middle">shared_buffers = 4GB | wal_buffers = 16MB</text>

<!-- Shared Buffers Sub-Card -->
<g transform="translate(15, 60)">
<rect width="250" height="175" rx="8" fill="#041b16" stroke="#34d399" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">Shared Buffers (8 KB Pool)</text>

<!-- Buffer Page Slots -->
<g id="buf-slot-0" transform="translate(15, 35)">
<rect id="rect-slot-0" width="105" height="55" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 0 (Heap)</text>
<text id="txt-slot-0" x="52" y="40" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CLEAN</text>
</g>

<g id="buf-slot-1" transform="translate(130, 35)">
<rect id="rect-slot-1" width="105" height="55" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 1 (Heap)</text>
<text id="txt-slot-1" x="52" y="40" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CLEAN</text>
</g>

<g id="buf-slot-2" transform="translate(15, 105)">
<rect id="rect-slot-2" width="105" height="55" rx="4" fill="#0b1728" stroke="#64748b" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#cbd5e1" text-anchor="middle">Page 2 (Heap)</text>
<text id="txt-slot-2" x="52" y="40" font-size="8" font-weight="600" fill="#64748b" text-anchor="middle">EMPTY</text>
</g>

<g id="buf-slot-3" transform="translate(130, 105)">
<rect id="rect-slot-3" width="105" height="55" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 3 (Index)</text>
<text id="txt-slot-3" x="52" y="40" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CACHED</text>
</g>
</g>

<!-- WAL Buffers Sub-Card -->
<g transform="translate(15, 250)">
<rect width="250" height="60" rx="8" fill="#1f1807" stroke="#fbbf24" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle">WAL Buffers (Ring Buffer)</text>
<text id="txt-walbuf-status" x="125" y="42" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">LSN: 0/16A2F40 • 0 Pending Records</text>
</g>

<!-- Lock Manager & ProcArray -->
<g transform="translate(15, 325)">
<rect width="250" height="55" rx="8" fill="#0c1d38" stroke="#60a5fa" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">Lock Manager &amp; ProcArray</text>
<text x="125" y="40" font-size="8" fill="#cbd5e1" text-anchor="middle">Active Snapshots &amp; Table Locks</text>
</g>

<!-- CLOG / pg_xact Buffer -->
<g transform="translate(15, 395)">
<rect width="250" height="50" rx="8" fill="#18132b" stroke="#c084fc" stroke-width="1" />
<text x="125" y="20" font-size="10" font-weight="700" fill="#d8b4fe" text-anchor="middle">CLOG Buffer (pg_xact Cache)</text>
<text id="txt-clog-status" x="125" y="38" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">XID: 1002 • COMMITTED</text>
</g>
</g>

<!-- 4. BACKGROUND PROCESSES TIER -->
<g transform="translate(750, 30)">
<rect id="rect-bgwriter" class="node-card stroke-default" width="180" height="48" rx="6" fill="#0b1728" />
<text x="90" y="20" class="node-text-title" fill="#93c5fd" text-anchor="middle">Background Writer</text>
<text x="90" y="36" class="node-text-status" fill="#64748b" text-anchor="middle">Proactive page scrubber</text>
</g>

<g transform="translate(750, 95)">
<rect id="rect-walwriter" class="node-card stroke-default" width="180" height="48" rx="6" fill="#1c1607" />
<text x="90" y="20" class="node-text-title" fill="#fde047" text-anchor="middle">WAL Writer</text>
<text x="90" y="36" class="node-text-status" fill="#eab308" text-anchor="middle">WAL fsync engine</text>
</g>

<g transform="translate(750, 160)">
<rect id="rect-checkpointer" class="node-card stroke-default" width="180" height="48" rx="6" fill="#241407" />
<text x="90" y="20" class="node-text-title" fill="#fb923c" text-anchor="middle">Checkpointer</text>
<text id="txt-checkpoint-status" x="90" y="36" class="node-text-status" fill="#f97316" text-anchor="middle">Syncs dirty pages to disk</text>
</g>

<g transform="translate(750, 225)">
<rect id="rect-vacuum" class="node-card stroke-default" width="180" height="48" rx="6" fill="#1f102e" />
<text x="90" y="20" class="node-text-title" fill="#c084fc" text-anchor="middle">Autovacuum Worker</text>
<text id="txt-vacuum-status" x="90" y="36" class="node-text-status" fill="#a855f7" text-anchor="middle">FSM/VM &amp; Dead tuple pruner</text>
</g>

<!-- 5. ON-DISK STORAGE TIER ($PGDATA) -->
<g transform="translate(750, 310)">
<rect class="node-card stroke-default" width="180" height="180" rx="10" fill="url(#disk-grad)" stroke="#f472b6" stroke-width="1.5" />
<text x="90" y="24" class="node-text-title" fill="#f472b6" text-anchor="middle">Storage Tier ($PGDATA)</text>

<g transform="translate(10, 38)">
<rect id="disk-base" width="160" height="30" rx="4" fill="#0f172a" stroke="#cbd5e1" stroke-width="0.8" />
<text x="80" y="19" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">base/16384/24576 (Table)</text>
</g>

<g transform="translate(10, 74)">
<rect id="disk-wal" width="160" height="30" rx="4" fill="#0f172a" stroke="#fbbf24" stroke-width="0.8" />
<text x="80" y="19" font-size="8" font-weight="600" fill="#fde047" text-anchor="middle">pg_wal/000000010000... (WAL)</text>
</g>

<g transform="translate(10, 110)">
<rect id="disk-xact" width="160" height="30" rx="4" fill="#0f172a" stroke="#c084fc" stroke-width="0.8" />
<text x="80" y="19" font-size="8" font-weight="600" fill="#d8b4fe" text-anchor="middle">pg_xact/0000 (Commit Logs)</text>
</g>

<g transform="translate(10, 144)">
<rect id="disk-control" width="160" height="26" rx="4" fill="#0f172a" stroke="#fb923c" stroke-width="0.8" />
<text id="txt-control-lsn" x="80" y="17" font-size="8" font-weight="700" fill="#fb923c" text-anchor="middle">pg_control [LSN: 0/16A2F40]</text>
</g>
</g>
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
  const btnQuery = document.getElementById('btn-arch-query');
  const btnWrite = document.getElementById('btn-arch-write');
  const btnCheckpoint = document.getElementById('btn-arch-checkpoint');
  const btnVacuum = document.getElementById('btn-arch-vacuum');
  const btnInspect = document.getElementById('btn-arch-inspect');
  const btnReset = document.getElementById('btn-arch-reset');
  const logContent = document.getElementById('arch-log-content');
  const svg = document.getElementById('pg-arch-svg');
  const inspectorPanel = document.getElementById('inspector-panel');

  if (!btnQuery || !svg || !logContent) return;

  let audioCtx = null;
  function playBeep(freq, type, duration) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
  }

  let state = {
    busy: false,
    lsnNum: 0x16A2F40,
    xid: 1002,
    slot1State: 'CLEAN',
    slot2State: 'EMPTY',
    deadTuples: 0,
    freeSpace: 7840
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

  function activatePath(pathId, styleClass) {
    const path = document.getElementById(pathId);
    if (path) path.classList.add(styleClass);
  }

  function deactivatePath(pathId, styleClass) {
    const path = document.getElementById(pathId);
    if (path) path.classList.remove(styleClass);
  }

  function animatePacket(pathId, color, duration, reverse) {
    reverse = !!reverse;
    return new Promise(function(resolve) {
      const pathElement = document.getElementById(pathId);
      if (!pathElement) {
        resolve();
        return;
      }
      const pathLength = pathElement.getTotalLength();
      const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      packet.setAttribute("r", "6");
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
      rect.setAttribute('fill', '#0f2922');
      rect.setAttribute('stroke', '#38d39f');
      txt.textContent = 'CLEAN';
      txt.setAttribute('fill', '#38d39f');
    } else if (status === 'DIRTY') {
      rect.setAttribute('fill', '#2d1414');
      rect.setAttribute('stroke', '#ef4444');
      txt.textContent = 'DIRTY (Modified)';
      txt.setAttribute('fill', '#ef4444');
    } else if (status === 'PINNED') {
      rect.setAttribute('fill', '#1d3354');
      rect.setAttribute('stroke', '#38bdf8');
      txt.textContent = 'PINNED (Read)';
      txt.setAttribute('fill', '#38bdf8');
    } else if (status === 'EMPTY') {
      rect.setAttribute('fill', '#0b1728');
      rect.setAttribute('stroke', '#64748b');
      txt.textContent = 'EMPTY';
      txt.setAttribute('fill', '#64748b');
    }
  }

  // 1. SELECT QUERY ACTION
  async function handleQuery() {
    if (state.busy) return;
    state.busy = true;
    playBeep(520, 'sine', 0.1);

    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    log("Client sends query: SELECT * FROM demo_page WHERE id = 1;", "client");
    activatePath('conn-client-backend', 'active-read');
    await animatePacket('conn-client-backend', '#38bdf8', 400);
    deactivatePath('conn-client-backend', 'active-read');

    log("[BACKEND (PID 4128)] Query parsed, rewritten & planned. Checking local work_mem...", "backend");
    activatePath('conn-backend-localmem', 'active-read');
    await animatePacket('conn-backend-localmem', '#818cf8', 350);
    deactivatePath('conn-backend-localmem', 'active-read');

    log("[BACKEND] Checking Shared Buffers hash table for Block 0 (Heap relation 24576)...", "memory");
    activatePath('conn-backend-shmem', 'active-read');
    await animatePacket('conn-backend-shmem', '#34d399', 400);
    deactivatePath('conn-backend-shmem', 'active-read');

    if (state.slot2State === 'EMPTY') {
      log("[SHARED_BUFFERS] Buffer Cache Miss! Pinning slot 2 and requesting Block 2 from disk...", "memory");
      activatePath('conn-backend-disk', 'active-storage');
      await animatePacket('conn-backend-disk', '#f472b6', 700);
      deactivatePath('conn-backend-disk', 'active-storage');

      log("[STORAGE (base/)] Read 8192 bytes from disk filenode 24576 into Shared Buffers Slot 2.", "disk");
      state.slot2State = 'PINNED';
      updateSlotUI(2, 'PINNED');
      playBeep(700, 'triangle', 0.1);

      await new Promise(function(resolve) { setTimeout(resolve, 500); });
      state.slot2State = 'CLEAN';
      updateSlotUI(2, 'CLEAN');
    } else {
      log("[SHARED_BUFFERS] Cache Hit! Page 0 found in buffer pool. Incrementing buffer usage count.", "memory");
      updateSlotUI(0, 'PINNED');
      playBeep(880, 'sine', 0.08);
      await new Promise(function(resolve) { setTimeout(resolve, 400); });
      updateSlotUI(0, 'CLEAN');
    }

    log("[BACKEND] Row versions verified with active MVCC snapshot. Returning result rows to client.", "backend");
    activatePath('conn-client-backend', 'active-read');
    await animatePacket('conn-client-backend', '#38d39f', 400, true);
    deactivatePath('conn-client-backend', 'active-read');

    log("Client received 1 row in 0.42 ms.", "client");
    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 2. WRITE / UPDATE ACTION
  async function handleWrite() {
    if (state.busy) return;
    state.busy = true;
    playBeep(440, 'sine', 0.1);

    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;
    state.xid++;
    state.lsnNum += 0x1000;
    const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();

    log("Client initiates transaction: UPDATE demo_page SET name = 'Alice Updated' WHERE id = 1;", "client");
    activatePath('conn-client-backend', 'active-write');
    await animatePacket('conn-client-backend', '#38d39f', 400);
    deactivatePath('conn-client-backend', 'active-write');

    log("[BACKEND] Acquired RowExclusiveLock in Lock Manager. Assigned Transaction ID: " + state.xid, "backend");
    log("[SHARED_BUFFERS] Modified Page 1 in memory. Marked Page 1 as DIRTY (Requires disk sync).", "memory");
    state.slot1State = 'DIRTY';
    state.deadTuples += 64;
    state.freeSpace = Math.max(7000, state.freeSpace - 64);
    updateSlotUI(1, 'DIRTY');
    playBeep(320, 'sawtooth', 0.15);

    log("[WAL] Generated WAL record with LSN " + lsnHex + " staged in WAL Buffers ring.", "wal");
    document.getElementById('txt-walbuf-status').textContent = 'LSN: ' + lsnHex + ' • 1 Pending Record';

    log("[WAL_WRITER] WAL Writer flushed log record from memory to pg_wal/000000010000000000000001.", "wal");
    activatePath('conn-shmem-walwriter', 'active-storage');
    activatePath('conn-walwriter-disk', 'active-storage');
    await animatePacket('conn-shmem-walwriter', '#fbbf24', 400);
    await animatePacket('conn-walwriter-disk', '#fbbf24', 500);
    deactivatePath('conn-shmem-walwriter', 'active-storage');
    deactivatePath('conn-walwriter-disk', 'active-storage');

    log("[CLOG (pg_xact)] Setting 2-bit commit flag for XID " + state.xid + " -> COMMITTED.", "memory");
    document.getElementById('txt-clog-status').textContent = 'XID: ' + state.xid + ' • COMMITTED';

    log("[BACKEND] Transaction COMMITTED. Writing ack to client.", "backend");
    activatePath('conn-client-backend', 'active-write');
    await animatePacket('conn-client-backend', '#38d39f', 400, true);
    deactivatePath('conn-client-backend', 'active-write');

    // Update inspector values
    document.getElementById('prop-lsn').textContent = lsnHex;
    document.getElementById('page-lsn-badge').textContent = 'LSN: ' + lsnHex;
    document.getElementById('prop-dead-count').textContent = state.deadTuples + ' bytes (Dead)';
    document.getElementById('prop-fsm').textContent = state.freeSpace + ' Bytes';

    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 3. CHECKPOINT ACTION
  async function handleCheckpoint() {
    if (state.busy) return;
    state.busy = true;
    playBeep(260, 'triangle', 0.2);

    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    log("[CHECKPOINTER] Checkpoint triggered (checkpoint_timeout / explicit CHECKPOINT command).", "checkpoint");
    log("[CHECKPOINTER] Scanning Shared Buffers for dirty pages. Found Page 1 marked DIRTY.", "checkpoint");

    activatePath('conn-shmem-checkpointer', 'active-storage');
    await animatePacket('conn-shmem-checkpointer', '#fb923c', 500);
    deactivatePath('conn-shmem-checkpointer', 'active-storage');

    log("[CHECKPOINTER] Writing dirty Page 1 to disk: base/16384/24576 and issuing fsync().", "disk");
    activatePath('conn-checkpointer-disk', 'active-storage');
    await animatePacket('conn-checkpointer-disk', '#f472b6', 600);
    deactivatePath('conn-checkpointer-disk', 'active-storage');

    state.slot1State = 'CLEAN';
    updateSlotUI(1, 'CLEAN');
    playBeep(650, 'sine', 0.15);

    const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
    log("[CHECKPOINTER] Updating pg_control with new Checkpoint LSN: " + lsnHex + " (REDO Point synchronized).", "checkpoint");
    document.getElementById('txt-control-lsn').textContent = 'pg_control [LSN: ' + lsnHex + ']';
    document.getElementById('txt-walbuf-status').textContent = 'LSN: ' + lsnHex + ' • 0 Pending Records';

    log("[CHECKPOINTER] Checkpoint completed successfully. All dirty shared buffers flushed to disk.", "checkpoint");

    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 4. AUTOVACUUM ACTION
  async function handleVacuum() {
    if (state.busy) return;
    state.busy = true;
    playBeep(350, 'sine', 0.15);

    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    log("[AUTOVACUUM] Autovacuum worker started for relation 'demo_page' (filenode 24576).", "vacuum");
    log("[AUTOVACUUM] Scanning heap blocks for dead row versions generated by UPDATEs...", "vacuum");

    activatePath('conn-vacuum-shmem', 'active-pubsub');
    await animatePacket('conn-vacuum-shmem', '#c084fc', 500);
    deactivatePath('conn-vacuum-shmem', 'active-pubsub');

    if (state.deadTuples > 0) {
      log("[AUTOVACUUM] Pruned " + state.deadTuples + " bytes of dead tuples. Defragmenting 8 KB block.", "vacuum");
      state.freeSpace += state.deadTuples;
      state.deadTuples = 0;
    } else {
      log("[AUTOVACUUM] No dead tuples found. Free space already optimal.", "vacuum");
    }

    log("[AUTOVACUUM] Updating Free Space Map (24576_fsm) and Visibility Map (24576_vm).", "vacuum");
    activatePath('conn-vacuum-disk', 'active-storage');
    await animatePacket('conn-vacuum-disk', '#c084fc', 500);
    deactivatePath('conn-vacuum-disk', 'active-storage');

    playBeep(580, 'sine', 0.15);
    document.getElementById('prop-dead-count').textContent = '0 bytes (Clean)';
    document.getElementById('prop-fsm').textContent = state.freeSpace + ' Bytes (Optimal)';
    document.getElementById('prop-vm').textContent = 'All-Visible: TRUE';

    log("[AUTOVACUUM] Vacuum finished. Table visibility map set to All-Visible (Index-Only Scans enabled).", "vacuum");

    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 5. INSPECT 8KB PAGE
  function handleInspect() {
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
      btnInspect.innerHTML = '<i class="fas fa-microchip"></i> Inspect 8KB Page';
    }
  }

  // 6. RESET
  function handleReset() {
    playBeep(440, 'sine', 0.1);
    state = {
      busy: false,
      lsnNum: 0x16A2F40,
      xid: 1002,
      slot1State: 'CLEAN',
      slot2State: 'EMPTY',
      deadTuples: 0,
      freeSpace: 7840
    };

    updateSlotUI(0, 'CLEAN');
    updateSlotUI(1, 'CLEAN');
    updateSlotUI(2, 'EMPTY');
    updateSlotUI(3, 'CACHED');

    document.getElementById('txt-control-lsn').textContent = 'pg_control [LSN: 0/16A2F40]';
    document.getElementById('txt-walbuf-status').textContent = 'LSN: 0/16A2F40 • 0 Pending Records';
    document.getElementById('txt-clog-status').textContent = 'XID: 1002 • COMMITTED';

    document.getElementById('prop-lsn').textContent = '0/16A2F40';
    document.getElementById('page-lsn-badge').textContent = 'LSN: 0/16A2F40';
    document.getElementById('prop-dead-count').textContent = '0 bytes';
    document.getElementById('prop-fsm').textContent = '7840 Bytes (95%)';

    log("[POSTMASTER] Cluster state and shared buffer pool reset to initial baseline.", "system");
  }

  btnQuery.addEventListener('click', handleQuery);
  btnWrite.addEventListener('click', handleWrite);
  btnCheckpoint.addEventListener('click', handleCheckpoint);
  btnVacuum.addEventListener('click', handleVacuum);
  btnInspect.addEventListener('click', handleInspect);
  btnReset.addEventListener('click', handleReset);
})();
</script>

---

## 6. Key Performance Tuning & Architecture Best Practices

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