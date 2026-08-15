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
<div id="arch-step-indicator" class="arch-step-indicator">
<span id="arch-step-badge" class="step-badge"><i class="fas fa-info-circle"></i> SYSTEM IDLE</span>
<span id="arch-step-text">Click any action above to trace the step-by-step data &amp; process flow</span>
</div>

<div class="visuals-wrapper">
<svg id="pg-arch-svg" viewBox="0 0 980 540" class="dashboard-svg">
<defs>
<filter id="glow-p" x="-40%" y="-40%" width="180%" height="180%">
<feGaussianBlur stdDeviation="5" result="blur" />
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

<!-- ================= CLEAR CONNECTION LINES ================= -->
<!-- 1. Client <-> Backend -->
<path id="conn-client-backend" class="conn-line" d="M 130 255 L 195 255" />
<text x="162" y="247" font-size="8" font-weight="600" fill="#94a3b8" text-anchor="middle">TCP 5432</text>

<!-- 2. Backend <-> Local Memory -->
<path id="conn-backend-localmem" class="conn-line" d="M 265 208 L 265 155" />
<text x="290" y="185" font-size="8" font-weight="600" fill="#94a3b8" text-anchor="middle">work_mem</text>

<!-- 3. Backend <-> Shared Memory -->
<path id="conn-backend-shmem" class="conn-line" d="M 335 255 L 410 255" />
<text x="372" y="247" font-size="8" font-weight="600" fill="#94a3b8" text-anchor="middle">IPC / Buffers</text>

<!-- 4. Backend <-> Disk Direct (Cache Miss) -->
<path id="conn-backend-disk" class="conn-line" d="M 265 303 Q 265 520 760 360" />
<text x="350" y="505" font-size="8" font-weight="600" fill="#f472b6" text-anchor="middle">Cache Miss Read (base/)</text>

<!-- 5. WAL Buffers <-> WALWriter -->
<path id="conn-shmem-walwriter" class="conn-line" d="M 690 305 L 760 125" />

<!-- 6. WALWriter <-> pg_wal Disk -->
<path id="conn-walwriter-disk" class="conn-line" d="M 850 148 L 850 395" />
<text x="880" y="270" font-size="8" font-weight="600" fill="#fbbf24" text-anchor="middle">WAL fsync</text>

<!-- 7. Shared Buffers <-> BGWriter -->
<path id="conn-shmem-bgwriter" class="conn-line" d="M 690 140 L 760 60" />

<!-- 8. Shared Buffers <-> Checkpointer -->
<path id="conn-shmem-checkpointer" class="conn-line" d="M 690 175 L 760 190" />

<!-- 9. Checkpointer <-> Storage (base/ & pg_control) -->
<path id="conn-checkpointer-disk" class="conn-line" d="M 850 213 L 850 460" />
<text x="895" y="235" font-size="8" font-weight="600" fill="#fb923c" text-anchor="middle">Sync &amp; Control</text>

<!-- 10. Autovacuum <-> Shared Buffers -->
<path id="conn-vacuum-shmem" class="conn-line" d="M 760 255 L 690 220" />

<!-- 11. Autovacuum <-> Disk (FSM/VM) -->
<path id="conn-vacuum-disk" class="conn-line" d="M 850 278 L 850 360" />
<text x="890" y="325" font-size="8" font-weight="600" fill="#c084fc" text-anchor="middle">Prune &amp; Map</text>


<!-- ================= COMPONENT NODES ================= -->
<!-- 1. CLIENT TIER -->
<g id="node-client" transform="translate(20, 210)">
<rect id="rect-client" class="node-card stroke-default" width="110" height="90" rx="8" fill="url(#client-grad)" />
<text x="55" y="30" class="node-text-title" text-anchor="middle">Client App</text>
<text x="55" y="50" class="node-text-sub" text-anchor="middle">libpq / TCP 5432</text>
<text id="txt-client-state" x="55" y="75" class="node-text-status" fill="#38d39f" text-anchor="middle">IDLE / READY</text>
</g>

<!-- 2. LOCAL MEMORY TIER -->
<g id="node-localmem" transform="translate(195, 45)">
<rect id="rect-localmem" class="node-card" width="140" height="110" rx="8" fill="url(#process-grad)" stroke="#818cf8" />
<text x="70" y="24" class="node-text-title" fill="#c7d2fe" text-anchor="middle">Local Memory</text>
<text x="70" y="46" class="node-text-sub" text-anchor="middle">work_mem (4MB)</text>
<text x="70" y="68" class="node-text-sub" text-anchor="middle">maint_work_mem (64MB)</text>
<text x="70" y="90" class="node-text-sub" text-anchor="middle">temp_buffers (8MB)</text>
</g>

<!-- 3. BACKEND WORKER PROCESS -->
<g id="node-backend" transform="translate(195, 210)">
<rect id="rect-backend" class="node-card stroke-default" width="140" height="90" rx="8" fill="url(#process-grad)" />
<text x="70" y="30" class="node-text-title" fill="#c7d2fe" text-anchor="middle">Backend Worker</text>
<text x="70" y="50" class="node-text-sub" text-anchor="middle">PID: 4128 (Forked)</text>
<text id="txt-backend-status" x="70" y="75" class="node-text-status" fill="#818cf8" text-anchor="middle">WAITING QUERY</text>
</g>

<!-- 4. SHARED MEMORY SEGMENT (GLOBAL IPC) -->
<g id="node-shmem" transform="translate(410, 30)">
<rect id="rect-shmem" class="node-card stroke-default" width="280" height="470" rx="12" fill="url(#shmem-grad)" stroke="#38d39f" stroke-width="1.5" />
<text x="140" y="26" class="node-text-title" fill="#6ee7b7" text-anchor="middle">Shared Memory (Global IPC)</text>
<text x="140" y="42" class="node-text-sub" fill="#94a3b8" text-anchor="middle">shared_buffers = 4GB | wal_buffers = 16MB</text>

<!-- Shared Buffers Sub-Card -->
<g id="node-shared-buffers" transform="translate(15, 60)">
<rect id="rect-shared-buffers" width="250" height="180" rx="8" fill="#041b16" stroke="#34d399" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle">Shared Buffers (8 KB Pool)</text>

<!-- Buffer Page Slots -->
<g id="buf-slot-0" transform="translate(15, 35)">
<rect id="rect-slot-0" width="105" height="58" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 0 (Heap)</text>
<text id="txt-slot-0" x="52" y="42" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CLEAN</text>
</g>

<g id="buf-slot-1" transform="translate(130, 35)">
<rect id="rect-slot-1" width="105" height="58" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 1 (Heap)</text>
<text id="txt-slot-1" x="52" y="42" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CLEAN</text>
</g>

<g id="buf-slot-2" transform="translate(15, 108)">
<rect id="rect-slot-2" width="105" height="58" rx="4" fill="#0b1728" stroke="#64748b" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#cbd5e1" text-anchor="middle">Page 2 (Heap)</text>
<text id="txt-slot-2" x="52" y="42" font-size="8" font-weight="600" fill="#64748b" text-anchor="middle">EMPTY</text>
</g>

<g id="buf-slot-3" transform="translate(130, 108)">
<rect id="rect-slot-3" width="105" height="58" rx="4" fill="#0f2922" stroke="#38d39f" />
<text x="52" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">Page 3 (Index)</text>
<text id="txt-slot-3" x="52" y="42" font-size="8" font-weight="600" fill="#38d39f" text-anchor="middle">CACHED</text>
</g>
</g>

<!-- WAL Buffers Sub-Card -->
<g id="node-wal-buffers" transform="translate(15, 255)">
<rect id="rect-wal-buffers" width="250" height="60" rx="8" fill="#1f1807" stroke="#fbbf24" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#fbbf24" text-anchor="middle">WAL Buffers (Ring Buffer)</text>
<text id="txt-walbuf-status" x="125" y="44" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">LSN: 0/16A2F40 • 0 Pending Records</text>
</g>

<!-- Lock Manager & ProcArray -->
<g id="node-lock-mgr" transform="translate(15, 330)">
<rect id="rect-lock-mgr" width="250" height="58" rx="8" fill="#0c1d38" stroke="#60a5fa" stroke-width="1" />
<text x="125" y="22" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">Lock Manager &amp; ProcArray</text>
<text x="125" y="42" font-size="8" fill="#cbd5e1" text-anchor="middle">Active Snapshots &amp; Table Locks</text>
</g>

<!-- CLOG / pg_xact Buffer -->
<g id="node-clog-buf" transform="translate(15, 403)">
<rect id="rect-clog-buf" width="250" height="52" rx="8" fill="#18132b" stroke="#c084fc" stroke-width="1" />
<text x="125" y="20" font-size="10" font-weight="700" fill="#d8b4fe" text-anchor="middle">CLOG Buffer (pg_xact Cache)</text>
<text id="txt-clog-status" x="125" y="38" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">XID: 1002 • COMMITTED</text>
</g>
</g>

<!-- 5. BACKGROUND PROCESSES TIER -->
<g id="node-bgwriter" transform="translate(760, 35)">
<rect id="rect-bgwriter" class="node-card stroke-default" width="180" height="48" rx="6" fill="#0b1728" />
<text x="90" y="20" class="node-text-title" fill="#93c5fd" text-anchor="middle">Background Writer</text>
<text x="90" y="36" class="node-text-status" fill="#64748b" text-anchor="middle">Proactive page scrubber</text>
</g>

<g id="node-walwriter" transform="translate(760, 100)">
<rect id="rect-walwriter" class="node-card stroke-default" width="180" height="48" rx="6" fill="#1c1607" />
<text x="90" y="20" class="node-text-title" fill="#fde047" text-anchor="middle">WAL Writer</text>
<text x="90" y="36" class="node-text-status" fill="#eab308" text-anchor="middle">WAL fsync engine</text>
</g>

<g id="node-checkpointer" transform="translate(760, 165)">
<rect id="rect-checkpointer" class="node-card stroke-default" width="180" height="48" rx="6" fill="#241407" />
<text x="90" y="20" class="node-text-title" fill="#fb923c" text-anchor="middle">Checkpointer</text>
<text id="txt-checkpoint-status" x="90" y="36" class="node-text-status" fill="#f97316" text-anchor="middle">Syncs dirty pages to disk</text>
</g>

<g id="node-vacuum" transform="translate(760, 230)">
<rect id="rect-vacuum" class="node-card stroke-default" width="180" height="48" rx="6" fill="#1f102e" />
<text x="90" y="20" class="node-text-title" fill="#c084fc" text-anchor="middle">Autovacuum Worker</text>
<text id="txt-vacuum-status" x="90" y="36" class="node-text-status" fill="#a855f7" text-anchor="middle">FSM/VM &amp; Dead tuple pruner</text>
</g>

<!-- 6. ON-DISK STORAGE TIER ($PGDATA) -->
<g id="node-disk-tier" transform="translate(760, 305)">
<rect id="rect-disk-tier" class="node-card stroke-default" width="180" height="195" rx="10" fill="url(#disk-grad)" stroke="#f472b6" stroke-width="1.5" />
<text x="90" y="24" class="node-text-title" fill="#f472b6" text-anchor="middle">Storage Tier ($PGDATA)</text>

<g id="disk-row-base" transform="translate(10, 36)">
<rect id="disk-base" width="160" height="32" rx="4" fill="#0f172a" stroke="#cbd5e1" stroke-width="0.8" />
<text x="80" y="20" font-size="8" font-weight="600" fill="#cbd5e1" text-anchor="middle">base/16384/24576 (Table)</text>
</g>

<g id="disk-row-wal" transform="translate(10, 74)">
<rect id="disk-wal" width="160" height="32" rx="4" fill="#0f172a" stroke="#fbbf24" stroke-width="0.8" />
<text x="80" y="20" font-size="8" font-weight="600" fill="#fde047" text-anchor="middle">pg_wal/000000010000... (WAL)</text>
</g>

<g id="disk-row-xact" transform="translate(10, 112)">
<rect id="disk-xact" width="160" height="32" rx="4" fill="#0f172a" stroke="#c084fc" stroke-width="0.8" />
<text x="80" y="20" font-size="8" font-weight="600" fill="#d8b4fe" text-anchor="middle">pg_xact/0000 (Commit Logs)</text>
</g>

<g id="disk-row-control" transform="translate(10, 150)">
<rect id="disk-control" width="160" height="30" rx="4" fill="#0f172a" stroke="#fb923c" stroke-width="0.8" />
<text id="txt-control-lsn" x="80" y="19" font-size="8" font-weight="700" fill="#fb923c" text-anchor="middle">pg_control [LSN: 0/16A2F40]</text>
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
  const stepIndicator = document.getElementById('arch-step-indicator');
  const stepBadge = document.getElementById('arch-step-badge');
  const stepText = document.getElementById('arch-step-text');

  if (!btnQuery || !svg || !logContent) return;

  let audioCtx = null;
  function playBeep(freq, type, duration) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
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
    freeSpace: 7840
  };

  function setStep(stepNum, totalSteps, title, description) {
    if (stepIndicator && stepBadge && stepText) {
      stepIndicator.classList.add('active-flow');
      stepBadge.innerHTML = '<i class="fas fa-play"></i> STEP ' + stepNum + ' OF ' + totalSteps;
      stepText.innerHTML = '<strong>' + title + ':</strong> ' + description;
    }
  }

  function clearStep(summary) {
    if (stepIndicator && stepBadge && stepText) {
      stepIndicator.classList.remove('active-flow');
      stepBadge.innerHTML = '<i class="fas fa-check-circle text-success"></i> COMPLETED';
      stepText.innerHTML = summary || 'Action finished successfully. Ready for next command.';
    }
  }

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
    }, duration || 1200);
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
      packet.setAttribute("r", "7.5");
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

  // 1. SELECT QUERY ACTION (Slow, Smooth 4-Step Flow)
  async function handleQuery() {
    if (state.busy) return;
    state.busy = true;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    // Step 1: Client to Backend
    setStep(1, 4, "Client Query Dispatch", "Client sends SQL text over TCP socket to forked Backend Worker process (PID 4128).");
    playBeep(520, 'sine', 0.15);
    highlightNode('rect-client', 'glow-blue', 1400);
    highlightNode('rect-backend', 'glow-blue', 1400);
    log("Client sends query: SELECT * FROM demo_page WHERE id = 1;", "client");
    activatePath('conn-client-backend', 'active-read');
    await animatePacket('conn-client-backend', '#38bdf8', 1200);
    deactivatePath('conn-client-backend', 'active-read');
    await sleep(700);

    // Step 2: Backend & Local Memory
    setStep(2, 4, "Parsing & work_mem Allocation", "Backend worker parses, plans query, and inspects local work_mem allocation.");
    playBeep(640, 'sine', 0.15);
    highlightNode('rect-backend', 'glow-blue', 1400);
    highlightNode('rect-localmem', 'glow-blue', 1400);
    log("[BACKEND (PID 4128)] Query parsed, rewritten & planned. Checking local work_mem...", "backend");
    activatePath('conn-backend-localmem', 'active-read');
    await animatePacket('conn-backend-localmem', '#818cf8', 1000);
    deactivatePath('conn-backend-localmem', 'active-read');
    await sleep(700);

    // Step 3: Shared Buffers Lookup / Disk Fetch
    setStep(3, 4, "Shared Buffers Hash Lookup", "Backend searches Shared Buffers hash table. If cache miss, reads 8 KB block from disk.");
    playBeep(720, 'sine', 0.15);
    highlightNode('rect-backend', 'glow-green', 1400);
    highlightNode('rect-shared-buffers', 'glow-green', 1400);
    log("[BACKEND] Checking Shared Buffers hash table for Block 0 (Heap relation 24576)...", "memory");
    activatePath('conn-backend-shmem', 'active-read');
    await animatePacket('conn-backend-shmem', '#34d399', 1100);
    deactivatePath('conn-backend-shmem', 'active-read');
    await sleep(600);

    if (state.slot2State === 'EMPTY') {
      log("[SHARED_BUFFERS] Buffer Cache Miss! Pinning slot 2 and reading block from on-disk data file base/16384/24576...", "memory");
      highlightNode('disk-base', 'glow-pink', 1500);
      activatePath('conn-backend-disk', 'active-disk');
      await animatePacket('conn-backend-disk', '#f472b6', 1400);
      deactivatePath('conn-backend-disk', 'active-disk');

      log("[STORAGE (base/)] 8192 bytes loaded into Shared Buffers Slot 2.", "disk");
      state.slot2State = 'PINNED';
      updateSlotUI(2, 'PINNED');
      playBeep(800, 'triangle', 0.15);
      await sleep(800);
      state.slot2State = 'CLEAN';
      updateSlotUI(2, 'CLEAN');
    } else {
      log("[SHARED_BUFFERS] Cache Hit! Page 0 found in RAM. Pinning page and incrementing usage count.", "memory");
      updateSlotUI(0, 'PINNED');
      playBeep(880, 'sine', 0.12);
      await sleep(800);
      updateSlotUI(0, 'CLEAN');
    }
    await sleep(600);

    // Step 4: Result Delivery
    setStep(4, 4, "MVCC Filtering & Result Delivery", "Backend verifies active transaction snapshot and returns tuple to Client.");
    playBeep(920, 'sine', 0.15);
    highlightNode('rect-backend', 'glow-green', 1300);
    highlightNode('rect-client', 'glow-green', 1300);
    log("[BACKEND] Row versions verified with active MVCC snapshot. Returning result rows to client.", "backend");
    activatePath('conn-client-backend', 'active-read');
    await animatePacket('conn-client-backend', '#38d39f', 1200, true);
    deactivatePath('conn-client-backend', 'active-read');

    log("Client received result: (id=1, name='Alice') in 0.38 ms.", "client");
    clearStep("SELECT query finished. Buffer page pinned, verified against MVCC snapshot, and returned to client.");

    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 2. WRITE / UPDATE ACTION (Slow, Smooth 5-Step Flow)
  async function handleWrite() {
    if (state.busy) return;
    state.busy = true;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;
    state.xid++;
    state.lsnNum += 0x1000;
    const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();

    // Step 1: Client to Backend
    setStep(1, 5, "Client Write Transaction", "Client initiates UPDATE statement. Backend acquires RowExclusiveLock in Lock Manager.");
    playBeep(440, 'sine', 0.15);
    highlightNode('rect-client', 'glow-green', 1400);
    highlightNode('rect-backend', 'glow-green', 1400);
    log("Client initiates write: UPDATE demo_page SET name = 'Alice Updated' WHERE id = 1;", "client");
    activatePath('conn-client-backend', 'active-write');
    await animatePacket('conn-client-backend', '#34d399', 1200);
    deactivatePath('conn-client-backend', 'active-write');
    await sleep(800);

    // Step 2: Shared Buffers Dirtying
    setStep(2, 5, "Buffer Modification (DIRTY Page)", "Backend writes new tuple version into Page 1 and sets buffer status to DIRTY.");
    playBeep(330, 'sawtooth', 0.18);
    highlightNode('rect-backend', 'glow-yellow', 1400);
    highlightNode('rect-shared-buffers', 'glow-yellow', 1400);
    log("[SHARED_BUFFERS] Page 1 modified in RAM. Set buffer status flag to DIRTY (BM_DIRTY = true).", "memory");
    state.slot1State = 'DIRTY';
    state.deadTuples += 64;
    state.freeSpace = Math.max(7000, state.freeSpace - 64);
    updateSlotUI(1, 'DIRTY');
    activatePath('conn-backend-shmem', 'active-write');
    await animatePacket('conn-backend-shmem', '#34d399', 1000);
    deactivatePath('conn-backend-shmem', 'active-write');
    await sleep(800);

    // Step 3: WAL Staging
    setStep(3, 5, "WAL Record Staged in Memory", "Backend creates WAL record with LSN " + lsnHex + " in in-memory WAL Buffers ring.");
    playBeep(520, 'triangle', 0.15);
    highlightNode('rect-wal-buffers', 'glow-yellow', 1400);
    document.getElementById('txt-walbuf-status').textContent = 'LSN: ' + lsnHex + ' • 1 Pending Record';
    log("[WAL_BUFFERS] Generated WAL change record staged in ring buffer (LSN " + lsnHex + ").", "wal");
    await sleep(800);

    // Step 4: WALWriter Disk Sync
    setStep(4, 5, "WALWriter Disk Sync (fsync)", "WALWriter flushes log record to physical disk (pg_wal/) to guarantee durability.");
    playBeep(580, 'sine', 0.15);
    highlightNode('rect-walwriter', 'glow-yellow', 1400);
    highlightNode('disk-wal', 'glow-yellow', 1400);
    log("[WAL_WRITER] Flushing WAL buffer to pg_wal/000000010000000000000001 and executing fsync().", "wal");
    activatePath('conn-shmem-walwriter', 'active-wal');
    await animatePacket('conn-shmem-walwriter', '#fbbf24', 1000);
    deactivatePath('conn-shmem-walwriter', 'active-wal');

    activatePath('conn-walwriter-disk', 'active-wal');
    await animatePacket('conn-walwriter-disk', '#fbbf24', 1100);
    deactivatePath('conn-walwriter-disk', 'active-wal');
    await sleep(800);

    // Step 5: CLOG & Commit Ack
    setStep(5, 5, "CLOG Commit & Client Confirmation", "Backend sets 2-bit commit flag in CLOG (pg_xact) and sends commit confirmation.");
    playBeep(680, 'sine', 0.15);
    highlightNode('rect-clog-buf', 'glow-purple', 1400);
    highlightNode('rect-client', 'glow-green', 1400);
    document.getElementById('txt-clog-status').textContent = 'XID: ' + state.xid + ' • COMMITTED';
    log("[CLOG (pg_xact)] Setting 2-bit commit flag for XID " + state.xid + " -> COMMITTED.", "memory");

    activatePath('conn-client-backend', 'active-write');
    await animatePacket('conn-client-backend', '#38d39f', 1200, true);
    deactivatePath('conn-client-backend', 'active-write');

    document.getElementById('prop-lsn').textContent = lsnHex;
    document.getElementById('page-lsn-badge').textContent = 'LSN: ' + lsnHex;
    document.getElementById('prop-dead-count').textContent = state.deadTuples + ' bytes (Dead)';
    document.getElementById('prop-fsm').textContent = state.freeSpace + ' Bytes';

    clearStep("Write transaction committed. WAL synced to pg_wal/, CLOG marked COMMITTED, and Shared Buffer Page 1 remains DIRTY until next checkpoint.");
    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 3. CHECKPOINT ACTION (Slow, Smooth 4-Step Flow)
  async function handleCheckpoint() {
    if (state.busy) return;
    state.busy = true;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    // Step 1: Checkpoint Initiated
    setStep(1, 4, "Checkpointer Initiates Checkpoint", "Checkpointer background process wakes up on checkpoint interval or explicit command.");
    playBeep(260, 'triangle', 0.2);
    highlightNode('rect-checkpointer', 'glow-orange', 1400);
    log("[CHECKPOINTER] Checkpoint orchestrator awakened. Creating checkpoint REDO barrier.", "checkpoint");
    await sleep(800);

    // Step 2: Scan Dirty Buffers
    setStep(2, 4, "Gathering Dirty Pages", "Checkpointer scans Shared Buffers and marks dirty Page 1 for writing.");
    playBeep(380, 'sine', 0.15);
    highlightNode('rect-shared-buffers', 'glow-orange', 1400);
    highlightNode('rect-checkpointer', 'glow-orange', 1400);
    log("[CHECKPOINTER] Scanning Shared Buffers. Identified dirty Page 1 scheduled for disk flush.", "checkpoint");
    activatePath('conn-shmem-checkpointer', 'active-checkpoint');
    await animatePacket('conn-shmem-checkpointer', '#fb923c', 1100);
    deactivatePath('conn-shmem-checkpointer', 'active-checkpoint');
    await sleep(800);

    // Step 3: Flush to Table Storage
    setStep(3, 4, "Disk Flush (base/ filenode)", "Checkpointer writes dirty Page 1 into base/16384/24576 and issues fsync().");
    playBeep(480, 'sine', 0.15);
    highlightNode('disk-base', 'glow-orange', 1400);
    log("[CHECKPOINTER] Writing dirty Page 1 to disk: base/16384/24576 and issuing kernel fsync().", "disk");
    activatePath('conn-checkpointer-disk', 'active-checkpoint');
    await animatePacket('conn-checkpointer-disk', '#fb923c', 1200);
    deactivatePath('conn-checkpointer-disk', 'active-checkpoint');

    state.slot1State = 'CLEAN';
    updateSlotUI(1, 'CLEAN');
    playBeep(650, 'sine', 0.15);
    await sleep(800);

    // Step 4: Synchronize pg_control
    const lsnHex = '0/' + state.lsnNum.toString(16).toUpperCase();
    setStep(4, 4, "Synchronize pg_control", "Checkpointer writes the latest Checkpoint LSN (" + lsnHex + ") into pg_control.");
    playBeep(560, 'triangle', 0.15);
    highlightNode('disk-control', 'glow-orange', 1400);
    document.getElementById('txt-control-lsn').textContent = 'pg_control [LSN: ' + lsnHex + ']';
    document.getElementById('txt-walbuf-status').textContent = 'LSN: ' + lsnHex + ' • 0 Pending Records';
    log("[CHECKPOINTER] Checkpoint completed. Updated pg_control with synchronized REDO point: " + lsnHex, "checkpoint");

    clearStep("Checkpoint completed. All dirty shared buffers flushed to disk, and pg_control updated.");
    state.busy = false;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = false;
  }

  // 4. AUTOVACUUM ACTION (Slow, Smooth 4-Step Flow)
  async function handleVacuum() {
    if (state.busy) return;
    state.busy = true;
    btnQuery.disabled = btnWrite.disabled = btnCheckpoint.disabled = btnVacuum.disabled = true;

    // Step 1: Autovacuum Spawned
    setStep(1, 4, "Autovacuum Worker Spawned", "Autovacuum launcher spawns dedicated worker process for table 'demo_page'.");
    playBeep(350, 'sine', 0.15);
    highlightNode('rect-vacuum', 'glow-purple', 1400);
    log("[AUTOVACUUM] Autovacuum worker started for relation 'demo_page' (filenode 24576).", "vacuum");
    await sleep(800);

    // Step 2: Scan Heap & Detect Dead Tuples
    setStep(2, 4, "Scanning 8 KB Heap Blocks", "Worker scans Shared Buffers and table pages to identify obsolete dead row versions.");
    playBeep(450, 'sine', 0.15);
    highlightNode('rect-shared-buffers', 'glow-purple', 1400);
    highlightNode('rect-vacuum', 'glow-purple', 1400);
    log("[AUTOVACUUM] Scanning heap blocks for dead row versions created by UPDATE statements...", "vacuum");
    activatePath('conn-vacuum-shmem', 'active-vacuum');
    await animatePacket('conn-vacuum-shmem', '#c084fc', 1100);
    deactivatePath('conn-vacuum-shmem', 'active-vacuum');
    await sleep(800);

    // Step 3: Defragment Page
    setStep(3, 4, "Pruning Dead Tuples & Compacting", "Worker prunes dead tuple slots and defragments the 8 KB page.");
    playBeep(580, 'sine', 0.15);
    if (state.deadTuples > 0) {
      log("[AUTOVACUUM] Pruned " + state.deadTuples + " bytes of dead tuples. Reclaiming free space.", "vacuum");
      state.freeSpace += state.deadTuples;
      state.deadTuples = 0;
    } else {
      log("[AUTOVACUUM] Zero dead tuples found. Free space already optimal.", "vacuum");
    }
    await sleep(800);

    // Step 4: Update FSM & VM
    setStep(4, 4, "Update Free Space & Visibility Maps", "Worker updates 24576_fsm (Free Space Map) and 24576_vm (Visibility Map).");
    playBeep(680, 'sine', 0.15);
    highlightNode('disk-base', 'glow-purple', 1400);
    log("[AUTOVACUUM] Writing updated block metrics to Free Space Map (_fsm) and Visibility Map (_vm).", "vacuum");
    activatePath('conn-vacuum-disk', 'active-vacuum');
    await animatePacket('conn-vacuum-disk', '#c084fc', 1100);
    deactivatePath('conn-vacuum-disk', 'active-vacuum');

    document.getElementById('prop-dead-count').textContent = '0 bytes (Clean)';
    document.getElementById('prop-fsm').textContent = state.freeSpace + ' Bytes (Optimal)';
    document.getElementById('prop-vm').textContent = 'All-Visible: TRUE';

    clearStep("Autovacuum finished. Dead row versions pruned, FSM updated, and Visibility Map set to All-Visible for Index-Only Scans.");
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

    clearStep("Cluster architecture and buffer pool reset to initial baseline state.");
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