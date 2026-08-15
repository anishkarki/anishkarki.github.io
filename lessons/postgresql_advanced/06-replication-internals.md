# Replication & Streaming Internals

Replication is a core pillar of high availability (HA), disaster recovery (DR), and read scalability in enterprise database systems. In PostgreSQL, replication has evolved from simple file-based log shipping to real-time streaming, logical replication, and now, modern disaggregated cloud-native architectures.

This chapter explores the internal mechanisms of traditional PostgreSQL replication and contrasts it with the shared-storage architecture found in next-generation engines like **Azure HorizonDB**.

---

## 1. Traditional Physical Streaming Replication

Traditional PostgreSQL replication is **physical**—it operates on the byte-level changes of the database files. The standby replica is an exact physical copy of the primary node.

```
+-----------------------------------+             +-----------------------------------+
|          PRIMARY COMPUTE          |             |          STANDBY COMPUTE          |
|                                   |             |                                   |
|   +-----------+   +-----------+   |             |   +-----------+   +-----------+   |
|   |  Shared   |   |   WAL     |   |             |   |  Shared   |   |  Startup  |   |
|   |  Buffers  |   |  Buffers  |   |             |   |  Buffers  |   |  Process  |   |
|   +-----------+   +-----------+   |             |   +-----------+   +-----------+   |
|         |               |         |             |         ^               ^         |
|         v               v         |             |         |               |         |
|   +-----------+   +-----------+   |             |   +-----------+   +-----------+   |
|   |  Storage  |-->| walsender |===|==[ TCP ]===>|===|walreceiver|-->|  Storage  |   |
|   | (pgdata)  |   |  Process  |   |             |   | Process   |   | (pgdata)  |   |
|   +-----------+   +-----------+   |             |   +-----------+   +-----------+   |
+-----------------------------------+             +-----------------------------------+
```

### The Walsender and Walreceiver Architecture
1. **walsender (Primary Node)**: A background process spawned on the primary node for each connected standby. Its job is to read new Write-Ahead Log (WAL) records from shared memory (`WAL Buffers`) or from the `pg_wal` directory on disk, and stream them over a TCP connection to the standby.
2. **walreceiver (Standby Node)**: A background process running on the standby replica. It connects to the primary, receives the streamed WAL bytes, and writes them to the standby's local disk in the `pg_wal` directory.
3. **Startup Process (Standby Node)**: The standby runs a dedicated recovery process (often called the `Startup` process) that constantly reads the WAL segments written by the `walreceiver` and applies/replays those changes to the standby's local database files (`pgdata`) on disk, while simultaneously updating pages cached in its memory buffer pool (`shared buffers`).

### Synchronous vs. Asynchronous Modes
* **Asynchronous replication (Default)**: The primary commits transactions as soon as WAL is written to its local disk. It does not wait for standbys to acknowledge receipt. If the primary crashes, there is a risk of data loss (RPO > 0) due to replication lag.
* **Synchronous replication**: The primary waits for acknowledgments from one or more standbys before returning a "success" commit message to the client. The wait behavior is controlled by the `synchronous_commit` parameter:
  * `on`: Wait until the standby has written the WAL to its local disk.
  * `remote_write`: Wait until the standby has received the WAL and passed it to the OS kernel (not yet flushed to disk).
  * `remote_apply`: Wait until the standby has fully replayed the WAL to its data pages, making the changes visible to concurrent standby queries.

---

## 2. Logical Replication

Unlike physical replication, **Logical Replication** replicates data based on SQL-like operations (INSERT, UPDATE, DELETE) rather than raw physical bytes.

* **Logical Decoding**: The primary decodes raw binary WAL records into logical change events using a logical decoding plugin (e.g., `pgoutput`).
* **Publication & Subscription**: The primary defines a **Publication** (the tables to replicate), and the standby node defines a **Subscription** to pull those logical changes.
* **Replication Slots**: The primary maintains a "slot" tracking the LSN (Log Sequence Number) consumed by the subscriber. The primary guarantees that it will not delete any WAL files needed by the subscriber until acknowledged.

---

## 3. The Cloud-Native Shared Storage Architecture

With the advent of cloud-native database engines (such as AWS Aurora, Neon, and **Azure HorizonDB**), PostgreSQL has been refactored to support a **disaggregated storage architecture**. 

### What is the "Underlying Storage Connection"?
In Azure HorizonDB, the **underlying storage connection** refers to this shared-storage design. Rather than keeping separate copies of database files on the compute virtual machines (VMs), the database engine decouples **compute** (CPU/RAM) from **storage** (durable disks).

Replicas in this architecture do **not** maintain separate copies of `pgdata` and `pgwal` on their own local disks. Instead, they all connect to a single, shared, highly available virtual storage tier.

### Comparison: Traditional Replication vs. Azure HorizonDB

| Feature | Traditional PostgreSQL | Azure HorizonDB (Shared Storage) |
| :--- | :--- | :--- |
| **Storage Location** | Each server (Primary/Standby) has its own local, dedicated disk. | A single, shared, zone-redundant storage service (decoupled from compute). |
| **pgdata Copy** | **Multiple copies**: Each standby maintains a full physical copy of `pgdata` on its own disk. | **One logical copy**: All replicas read from the same virtualized storage fleet. |
| **pgwal Copy** | **Multiple copies**: WAL files are streamed to standbys and saved to their local disks. | **One logical copy**: WAL is written directly to a shared, durable WAL service. |
| **Data Replication** | Streaming replication (Sync or Async) over the network between VMs. | No physical database files are replicated; only cache invalidation messages are sent to standbys. |
| **Replica Provisioning** | **Slow**: Requires copying the entire `pgdata` snapshot/basebackup. | **Near-instant**: New compute nodes just connect to the existing shared storage. |

---

## 4. How HorizonDB Works Under the Hood

Decoupling compute from storage transforms the execution path of database writes and reads.

### 1. The Write Path (WAL Service)
When the Primary replica receives a write:
1. It generates WAL records and writes them directly to the **Shared WAL Service** in the storage tier over the network.
2. The transaction is committed once the WAL Service acknowledges receipt.
3. **There is no traditional streaming of WAL files** from the primary VM's disk to a standby VM's disk.

### 2. The Read Path (Page Storage Fleet)
The storage tier (not the compute replicas) is responsible for applying WAL records to update data blocks. Compute replicas remain stateless.
1. When a replica (primary or standby) needs to read data, it first checks its local RAM (`shared buffers`) and local NVMe SSD cache (used for hot pages).
2. If the page is not cached locally (a **cache miss**), the replica fetches it on-demand over the network from the **Page Storage Fleet**.
3. The Page Storage Fleet reconstructs the block by applying any outstanding WAL records up to the requested LSN (Log Sequence Number) and returns the completed page.

```
   [ Client Query ]
          |
          v
   [ Is page in Standby Cache? ]
      /                   \
   (Yes - Valid)       (No or Invalid / Cache Miss)
     /                       \
[ Read RAM/SSD ]      [ Fetch Page from Storage Fleet ]
(Ultra-fast)                 |
                             v
                      [ Page Server reconstructs block ]
                             |
                             v
                      [ Load page into local cache ]
```

### 3. Compute vs. Storage Software Stack Split

To bridge open-source PostgreSQL with their cloud-native storage tier, Microsoft developed a hybrid architecture dividing proprietary Rust services in storage and customized hooks in compute:

#### 1. In the Storage Layer (The WAL & Page Servers)
The storage tier runs as a completely separate, proprietary service written in **Rust**. 
* It does **not** run PostgreSQL code.
* It is a custom-built distributed systems service designed specifically by Microsoft for Azure.
* It is composed of two primary processes running on their own dedicated storage machines:
  * **WAL Service**: A lightweight Rust process optimized for ultra-fast, sequential log writing and replication across availability zones.
  * **Page Service**: A Rust process that maintains the page versions, reads WAL logs, applies them to data pages, and serves them to compute nodes on demand.

#### 2. In the Compute Replica (The PostgreSQL Node)
Instead of rewriting PostgreSQL from scratch, Microsoft modified the open-source PostgreSQL codebase and integrated custom processes into the compute replica to make PostgreSQL "talk" to this Rust-based storage layer:
* **A. A Custom Storage Manager (smgr) Patch**: In vanilla PostgreSQL, when the engine needs a page, it calls the operating system's standard file system APIs (e.g., `read()` or `write()` to a file in `/pgdata`). Microsoft replaced PostgreSQL's internal Storage Manager (`smgr`) and Virtual File System (`VFS`) layer. On a cache miss, the customized engine redirects the read request over the network via a proprietary RPC protocol to the Rust Page Service instead of hitting a local disk.
* **B. A Custom Background Worker (The Invalidation Receiver)**: To handle the WAL/invalidation pub-sub stream, Microsoft integrated a custom background worker process directly into the PostgreSQL instance. When the Standby replica starts up, this background process is spawned alongside standard Postgres processes (like the checkpointer or background writer). Its sole job is to establish the TCP connection to the Rust WAL service, listen for page invalidation messages, and use PostgreSQL's internal memory APIs to flag pages in the shared buffers (RAM) as invalid.

---

## 5. Keeping Standby Caches in Sync: Cache Invalidation

Because all standbys read from the same shared storage, they must be notified when the primary modifies a page that they currently have cached in their local RAM or SSD. This process is called **Cache Invalidation** (or Redo Notification).

### What does it look like step-by-step?
Imagine the record for user "Alice" is located on **Page 42** of a table. Both the Primary and Standby replicas have Page 42 cached in their local RAM.

#### Step 1: The Write on the Primary
When a client updates Alice's record on the Primary:
1. The Primary modifies Page 42 in its local memory buffer.
2. It generates a WAL record and writes it to the Shared WAL Service.

#### Step 2: The Redo Notification to the Standby
Instead of sending the entire updated page over the network, the storage system pushes a lightweight **Redo Notification** packet to all connected standbys. The payload is conceptual metadata containing the page addresses:

```json
{
  "event": "page_modified",
  "lsn": "0/1A2B3C4D",
  "relation_id": 16384,
  "page_number": 42
}
```

#### Step 3: Marking the Buffer Invalid
On the Standby replica, a background receiver process intercepts this notification and performs a local lookup in its memory structures:
1. **In RAM (Shared Buffers)**: It searches the buffer header for Page 42. If found, it flips a bit flag on the buffer header to set its state to `BM_VALID = false` (or evicts it).
2. **In local NVMe SSD Cache**: It updates its cache index, marking the block containing Page 42 as stale.

```
       [Standby RAM Shared Buffers]
+--------------------------------------------------------+
| Buffer #512: Page 42  | Status: [VALID] ---> [INVALID] |
+--------------------------------------------------------+
```

The standby does not waste CPU cycles or write I/O replaying the write locally. It simply invalidates the pointer.

#### Step 4: Lazy Fetching on Next Read
When a client subsequently runs a SELECT query looking up Alice on the Standby:
1. The Standby checks its local cache, finds Page 42, but sees it is marked **Invalid** (a cache miss).
2. The Standby makes a network request to the **Page Storage Fleet**: *"Give me Page 42 at LSN 0/1A2B3C4D."*
3. The storage tier returns the reconstructed, updated page.
4. The Standby stores the updated page in its local cache (marking it `VALID`) and returns the fresh data to the client.

---

## 6. Network Protocols & Socket Internals

For the standby replica to receive invalidation notifications instantly, a persistent, long-lived network connection is required.

### Traditional Processes are Offloaded
In Azure HorizonDB, **the traditional `walsender` and `walreceiver` compute processes are not in play**. The database engine has been refactored to offload log shipping and disk replaying to the storage tier.

### Design A (Compute-to-Compute) vs. Design B (Storage-to-Compute)

There are two primary architectures for distributing cache invalidations:

#### Design A: Compute-to-Compute (Brokerless)
* The Primary node maintains a direct TCP/IP connection to every Standby replica.
* The Primary broadcasts page metadata updates directly to all standbys.
* *Drawbacks*: If you scale up to 15 standbys, the Primary wastes CPU and memory managing connections and replication lag.

#### Design B: Storage-to-Compute (Pub-Sub) - *Used in Azure HorizonDB*
* The compute replicas are stateless. Standbys establish persistent TCP/IP connections directly to the **Shared Storage Layer** (WAL Service).
* The WAL Service acts as a publisher. As WAL records are written, it broadcasts lightweight invalidation packets over these TCP connections to all subscribed standbys.
* *Advantages*: The Primary only interacts with the storage layer. Scaling standbys up or down has zero performance impact on the Primary.

### OS-Level Socket Interaction
Here is how a standby node processes an invalidation message at the operating system and socket level:

```
[ WAL Service / Storage ]                   [ Standby Compute Node ]
           |                                           |
           | === (TCP Packet: Invalidate Page 42) ====>| (Network Interface Card)
           |                                           |          |
           |                                           | (Kernel: Network Stack)
           |                                           |          v
           |                                           | [Socket Read Buffer]
           |                                           |          | (Wakeup Signal)
           |                                           |          v
           |                                           | [Postgres Daemon: epoll()]
           |                                           |          |
           |                                           | [Mark Buffer 42 Invalid]
           |                                           |          |
           |                                           | [Re-enter epoll() block]
```

1. **OS Listening Thread**: On startup, the Standby's database background receiver thread opens a TCP socket connection to the storage layer and registers the socket descriptor with the OS kernel.
2. **Kernel-Space Sleeping**: The thread makes a blocking system call (such as `epoll()` on Linux or `GetQueuedCompletionStatus()` / `select()` on Windows) and goes to sleep. It consumes **0% CPU** while waiting.
3. **Packet Arrival**: When a write occurs on the Primary, a tiny TCP packet containing the page invalidation metadata is sent. The Standby’s Network Interface Card (NIC) receives the packet and triggers a hardware interrupt.
4. **OS TCP Stack Processing**: The OS kernel processes the packet, copies the payload into the socket's read buffer, and wakes up the sleeping database thread.
5. **Memory Invalidation**: The thread reads the binary data from the socket, parses the page ID (e.g., Page 42), performs a hash lookup in PostgreSQL’s shared memory segment, and sets the buffer status flag to `INVALID`.
6. **Return to Blocking**: The thread loops back and executes `epoll()` again, waiting for the next packet.

---

## 7. Interactive Storage & HA Simulator

The dashboard below demonstrates the disaggregated storage model and its high-availability (HA) characteristics in **Azure HorizonDB**. Interact with the controls to trigger writes, execute read queries, see how the shared storage pushes page invalidations, and simulate a compute node failover.

<div class="horizondb-interactive-dashboard">
  <style>
    .horizondb-interactive-dashboard {
      background: #0b1528;
      border: 1px solid rgba(81, 162, 218, 0.15);
      border-radius: 14px;
      padding: 24px;
      margin: 30px 0;
      color: #ffffff;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .controls-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(81, 162, 218, 0.1);
    }
    .dash-btn {
      padding: 10px 18px;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      color: #ffffff;
    }
    .btn-success { background: #1b8a5a; border-color: #24b878; }
    .btn-success:hover:not(:disabled) { background: #24b878; box-shadow: 0 0 12px rgba(36,184,120,0.4); }
    .btn-primary { background: #1d4ed8; border-color: #3b82f6; }
    .btn-primary:hover:not(:disabled) { background: #3b82f6; box-shadow: 0 0 12px rgba(59,130,246,0.4); }
    .btn-secondary { background: #334155; border-color: #475569; }
    .btn-secondary:hover:not(:disabled) { background: #475569; }
    .btn-danger { background: #991b1b; border-color: #ef4444; }
    .btn-danger:hover:not(:disabled) { background: #ef4444; box-shadow: 0 0 12px rgba(239,68,68,0.4); }
    .btn-outline { background: transparent; border-color: #475569; }
    .btn-outline:hover:not(:disabled) { background: rgba(255,255,255,0.05); }
    .dash-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    
    .visuals-wrapper {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      background: #060c17;
      margin-bottom: 20px;
      border: 1px solid rgba(81, 162, 218, 0.1);
    }
    .dashboard-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    
    /* Log Panel */
    .log-panel {
      background: #020617;
      border: 1px solid rgba(81, 162, 218, 0.1);
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      overflow: hidden;
    }
    .log-title {
      background: #0f172a;
      padding: 8px 16px;
      font-weight: 600;
      color: #51a2da;
      border-bottom: 1px solid rgba(81, 162, 218, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .log-content {
      padding: 12px 16px;
      height: 150px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .log-line { line-height: 1.5; color: #cbd5e1; }
    .log-time { color: #64748b; margin-right: 6px; }
    .log-line.system { color: #51a2da; }
    .log-line.primary { color: #38d39f; }
    .log-line.standby { color: #51a2da; }
    .log-line.storage { color: #e0aa3e; }
    .log-line.error { color: #ef4444; font-weight: 600; }
    
    /* SVG Node and Connection Styling */
    .node-card {
      fill: #0b1528;
      stroke-width: 2;
      transition: all 0.3s ease;
    }
    .node-card.stroke-default { stroke: #cbd5e1; }
    .node-card.active-primary { stroke: #38d39f; filter: drop-shadow(0 0 6px rgba(56,211,159,0.3)); }
    .node-card.active-standby { stroke: #51a2da; }
    .node-card.active-storage { stroke: #e0aa3e; }
    .node-card.crashed { stroke: #ef4444; filter: drop-shadow(0 0 8px rgba(239,68,68,0.5)); animation: shake 0.5s infinite; }
    .node-card.provisioning { stroke: #64748b; stroke-dasharray: 4, 4; animation: rotateBorder 2s linear infinite; }
    
    .node-text-title { font-size: 11px; font-weight: 700; fill: #ffffff; }
    .node-text-sub { font-size: 9px; fill: #cbd5e1; }
    .node-text-status { font-size: 8px; font-weight: 600; fill: #64748b; }
    
    .conn-line {
      fill: none;
      stroke: #1e293b;
      stroke-width: 2;
      stroke-dasharray: 4, 4;
      transition: all 0.3s ease;
    }
    .conn-line.active-write { stroke: #38d39f; stroke-width: 2.5; stroke-dasharray: 6, 4; animation: flow 0.8s linear infinite; opacity: 1; }
    .conn-line.active-read { stroke: #51a2da; stroke-width: 2.5; stroke-dasharray: 6, 4; animation: flow 0.8s linear infinite; opacity: 1; }
    .conn-line.active-pubsub { stroke: #ff4d4d; stroke-width: 2.5; stroke-dasharray: 6, 4; animation: flow 0.8s linear infinite; opacity: 1; }
    .conn-line.active-storage { stroke: #e0aa3e; stroke-width: 2.5; stroke-dasharray: 6, 4; animation: flow 0.8s linear infinite; opacity: 1; }
    .conn-line.crashed { stroke: rgba(239, 68, 68, 0.2); }
    
    @keyframes flow { to { stroke-dashoffset: -20; } }
    @keyframes shake {
      0%, 100% { transform: translate(0, 0); }
      10%, 30%, 50%, 70%, 90% { transform: translate(-2px, -1px); }
      20%, 40%, 60%, 80% { transform: translate(2px, 1px); }
    }
    @keyframes rotateBorder { to { stroke-dashoffset: -20; } }
  </style>

  <div class="controls-panel">
    <button id="btn-write" class="dash-btn btn-success"><i class="fas fa-edit"></i> Trigger Write (Alice)</button>
    <button id="btn-read-s1" class="dash-btn btn-primary"><i class="fas fa-search"></i> Read (Standby 1)</button>
    <button id="btn-read-s2" class="dash-btn btn-secondary" disabled><i class="fas fa-search"></i> Read (Standby 2)</button>
    <button id="btn-failover" class="dash-btn btn-danger"><i class="fas fa-bolt"></i> Simulate HA Failover</button>
    <button id="btn-reset" class="dash-btn btn-outline"><i class="fas fa-sync-alt"></i> Reset Cluster</button>
  </div>

  <div class="visuals-wrapper">
    <svg id="dashboard-svg" viewBox="0 0 800 480" class="dashboard-svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#0f2d24"/>
        </linearGradient>
        <linearGradient id="standby-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="storage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1329"/>
          <stop offset="100%" stop-color="#1f1a0f"/>
        </linearGradient>
        <linearGradient id="crashed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b1b"/>
          <stop offset="100%" stop-color="#2e1a1a"/>
        </linearGradient>
      </defs>

      <!-- Connections -->
      <path id="path-client-dns" class="conn-line" d="M 130 240 L 178 240" />
      <path id="path-dns-primary" class="conn-line" d="M 210 220 L 290 135" />
      <path id="path-dns-s1" class="conn-line" d="M 225 230 Q 380 40 590 100" />
      <path id="path-dns-s2" class="conn-line" d="M 225 250 Q 380 430 590 310" />
      <path id="path-primary-wal" class="conn-line" d="M 380 140 L 380 210" />
      <path id="path-wal-s1" class="conn-line" d="M 470 235 L 590 125" />
      <path id="path-wal-s2" class="conn-line" d="M 470 255 L 590 275" />
      <path id="path-s1-page" class="conn-line" d="M 590 135 L 470 345" />
      <path id="path-s2-page" class="conn-line" d="M 590 305 L 470 365" />
      <path id="path-s1-wal" class="conn-line" d="M 590 115 L 470 230" />

      <text x="140" y="232" class="node-text-status" fill="#cbd5e1" font-size="8">TCP</text>
      
      <!-- Nodes -->
      <!-- CLIENT -->
      <g transform="translate(30, 195)">
        <rect id="rect-client" class="node-card stroke-default" width="100" height="90" rx="8" />
        <text x="50" y="32" class="node-text-title" text-anchor="middle">Client App</text>
        <text x="50" y="52" class="node-text-sub" text-anchor="middle">Queries data &amp;</text>
        <text x="50" y="65" class="node-text-sub" text-anchor="middle">updates records</text>
        <text x="50" y="80" class="node-text-status" fill="#38d39f" text-anchor="middle">CONNECTED</text>
      </g>

      <!-- DNS ROUTER -->
      <g transform="translate(180, 215)">
        <circle id="circle-dns" cx="25" cy="25" r="25" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="25" y="22" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">DNS / LB</text>
        <text x="25" y="34" font-size="7" fill="#cbd5e1" text-anchor="middle">Router</text>
      </g>

      <!-- PRIMARY COMPUTE -->
      <g id="node-primary" transform="translate(290, 50)">
        <rect id="rect-primary" class="node-card active-primary" width="180" height="90" rx="8" fill="url(#primary-grad)" />
        <text id="text-primary-title" x="90" y="28" class="node-text-title" text-anchor="middle">Primary Node</text>
        <text id="text-primary-sub" x="90" y="46" class="node-text-sub" text-anchor="middle">Compute Node AZ-1</text>
        <text id="text-primary-status" x="90" y="70" class="node-text-status" fill="#38d39f" text-anchor="middle">ONLINE • Read/Write</text>
      </g>

      <!-- STANDBY 1 COMPUTE -->
      <g id="node-s1" transform="translate(590, 50)">
        <rect id="rect-s1" class="node-card active-standby" width="180" height="90" rx="8" fill="url(#standby-grad)" />
        <text id="text-s1-title" x="90" y="24" class="node-text-title" text-anchor="middle">Standby 1 Node</text>
        <text id="text-s1-sub" x="90" y="38" class="node-text-sub" text-anchor="middle">Compute Node AZ-2</text>
        
        <g id="badge-s1-container">
          <rect id="badge-s1-bg" x="25" y="52" width="130" height="22" rx="4" fill="#38d39f" />
          <text id="text-s1-buffer" x="90" y="66" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">Buffer: VALID</text>
        </g>
        <text id="text-s1-status" x="90" y="72" class="node-text-status" fill="#38d39f" text-anchor="middle" opacity="0">ONLINE • Read/Write</text>
      </g>

      <!-- STANDBY 2 COMPUTE -->
      <g id="node-s2" transform="translate(590, 240)">
        <rect id="rect-s2" class="node-card active-standby" width="180" height="90" rx="8" fill="url(#standby-grad)" />
        <text id="text-s2-title" x="90" y="24" class="node-text-title" text-anchor="middle">Standby 2 Node</text>
        <text id="text-s2-sub" x="90" y="38" class="node-text-sub" text-anchor="middle">Compute Node AZ-3</text>
        
        <g id="badge-s2-container">
          <rect id="badge-s2-bg" x="25" y="52" width="130" height="22" rx="4" fill="#38d39f" />
          <text id="text-s2-buffer" x="90" y="66" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">Buffer: VALID</text>
        </g>
      </g>

      <!-- WAL SERVICE -->
      <g transform="translate(290, 210)">
        <rect id="rect-wal" class="node-card active-storage" width="180" height="90" rx="8" fill="url(#storage-grad)" />
        <text x="90" y="30" class="node-text-title" text-anchor="middle">Shared WAL Service</text>
        <text x="90" y="50" class="node-text-sub" text-anchor="middle">Storage Tier (Zone-Redundant)</text>
        <text x="90" y="72" class="node-text-status" fill="#e0aa3e" text-anchor="middle">Active log publisher</text>
      </g>

      <!-- PAGE STORAGE -->
      <g transform="translate(290, 330)">
        <rect id="rect-page" class="node-card active-storage" width="180" height="90" rx="8" fill="url(#storage-grad)" />
        <text x="90" y="30" class="node-text-title" text-anchor="middle">Page Storage Fleet</text>
        <text x="90" y="50" class="node-text-sub" text-anchor="middle">Disaggregated Page Servers</text>
        <text x="90" y="72" class="node-text-status" fill="#e0aa3e" text-anchor="middle">Ready for page reconstruction</text>
      </g>
    </svg>
  </div>

  <div class="log-panel">
    <div class="log-title"><i class="fas fa-terminal"></i> Database Engine &amp; Replication Logs</div>
    <div id="log-content" class="log-content">
      <div class="log-line system"><span class="log-time">00:00:00</span> [HA_SYSTEM] Cluster initialized successfully. Shared WAL service online. Compute instances connected.</div>
    </div>
  </div>
</div>

<script>
(function() {
  const btnWrite = document.getElementById('btn-write');
  const btnReadS1 = document.getElementById('btn-read-s1');
  const btnReadS2 = document.getElementById('btn-read-s2');
  const btnFailover = document.getElementById('btn-failover');
  const btnReset = document.getElementById('btn-reset');
  const logContent = document.getElementById('log-content');
  const svg = document.getElementById('dashboard-svg');
  
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
    isPrimaryCrashed: false,
    activePrimary: 'primary',
    standby1State: 'VALID',
    standby2State: 'VALID',
    busy: false
  };

  function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
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

  function animatePacket(pathId, color, duration, reverse = false) {
    return new Promise(resolve => {
      const pathElement = document.getElementById(pathId);
      if (!pathElement) {
        resolve();
        return;
      }
      
      const pathLength = pathElement.getTotalLength();
      const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      packet.setAttribute("r", "6");
      packet.setAttribute("fill", color);
      packet.setAttribute("filter", "url(#glow)");
      svg.appendChild(packet);
      
      const startTime = performance.now();
      
      function update(time) {
        const elapsed = time - startTime;
        let progress = elapsed / duration;
        if (progress > 1) progress = 1;
        
        const currentLength = reverse 
          ? pathLength * (1 - progress) 
          : pathLength * progress;
          
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

  function updateBufferUI(id, sState) {
    const bg = document.getElementById(`badge-${id}-bg`);
    const txt = document.getElementById(`text-${id}-buffer`);
    
    if (!bg || !txt) return;
    
    if (sState === 'VALID') {
      bg.setAttribute('fill', '#38d39f');
      txt.textContent = 'Buffer: VALID';
      txt.setAttribute('opacity', '1');
    } else if (sState === 'INVALID') {
      bg.setAttribute('fill', '#ff4d4d');
      txt.textContent = 'Buffer: INVALID';
      txt.setAttribute('opacity', '1');
    } else if (sState === 'PROVISIONING') {
      bg.setAttribute('fill', '#64748b');
      txt.textContent = 'PROVISIONING...';
      txt.setAttribute('opacity', '1');
    } else if (sState === 'OFFLINE') {
      bg.setAttribute('fill', '#1e293b');
      txt.textContent = 'OFFLINE';
      txt.setAttribute('opacity', '0.5');
    }
  }

  async function handleWrite() {
    if (state.busy) return;
    state.busy = true;
    playBeep(600, 'sine', 0.1);
    
    btnWrite.disabled = btnReadS1.disabled = btnReadS2.disabled = btnFailover.disabled = true;
    
    if (state.activePrimary === 'primary') {
      log("Client initiates write transaction: UPDATE users SET email = 'alice@example.com' WHERE id = 1;", "primary");
      
      activatePath('path-client-dns', 'active-write');
      activatePath('path-dns-primary', 'active-write');
      await animatePacket('path-client-dns', '#38d39f', 400);
      await animatePacket('path-dns-primary', '#38d39f', 600);
      deactivatePath('path-client-dns', 'active-write');
      deactivatePath('path-dns-primary', 'active-write');
      
      log("[PRIMARY] Page 42 modified in Shared Buffers. Transaction record generated.", "primary");
      log("[PRIMARY] Transmitting WAL record sequentially to Shared WAL Service...", "primary");
      
      activatePath('path-primary-wal', 'active-storage');
      await animatePacket('path-primary-wal', '#e0aa3e', 600);
      deactivatePath('path-primary-wal', 'active-storage');
      
      log("[WAL_SERVICE] WAL record written and replicated across storage tier. Acknowledging primary.", "storage");
      
      activatePath('path-primary-wal', 'active-storage');
      await animatePacket('path-primary-wal', '#38d39f', 400, true);
      deactivatePath('path-primary-wal', 'active-storage');
      
      log("[PRIMARY] Transaction committed. Returning confirmation to client.", "primary");
      
      activatePath('path-dns-primary', 'active-write');
      activatePath('path-client-dns', 'active-write');
      animatePacket('path-dns-primary', '#38d39f', 600, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-primary', 'active-write');
        deactivatePath('path-client-dns', 'active-write');
      }, 600);
      
      log("[WAL_SERVICE] Storage tier pushing page invalidation for Page 42 via persistent TCP pub-sub.", "storage");
      activatePath('path-wal-s1', 'active-pubsub');
      activatePath('path-wal-s2', 'active-pubsub');
      
      animatePacket('path-wal-s1', '#ff4d4d', 800).then(() => {
        deactivatePath('path-wal-s1', 'active-pubsub');
        state.standby1State = 'INVALID';
        updateBufferUI('s1', 'INVALID');
        playBeep(300, 'sawtooth', 0.15);
        log("[STANDBY 1] epoll_wait() woke up. Marked Page 42 in Shared Buffers as INVALID (BM_VALID = false).", "standby");
      });
      
      if (state.standby2State !== 'OFFLINE' && state.standby2State !== 'PROVISIONING') {
        animatePacket('path-wal-s2', '#ff4d4d', 800).then(() => {
          deactivatePath('path-wal-s2', 'active-pubsub');
          state.standby2State = 'INVALID';
          updateBufferUI('s2', 'INVALID');
          log("[STANDBY 2] epoll_wait() woke up. Marked Page 42 in Shared Buffers as INVALID (BM_VALID = false).", "standby");
        });
      } else {
        deactivatePath('path-wal-s2', 'active-pubsub');
      }
      
    } else {
      log("Client initiates write transaction to Promoted Primary (Standby 1 node)...", "primary");
      
      activatePath('path-client-dns', 'active-write');
      activatePath('path-dns-s1', 'active-write');
      await animatePacket('path-client-dns', '#38d39f', 400);
      await animatePacket('path-dns-s1', '#38d39f', 800);
      deactivatePath('path-client-dns', 'active-write');
      deactivatePath('path-dns-s1', 'active-write');
      
      log("[STANDBY 1 (PRIMARY)] Page 42 modified. Streaming WAL log to WAL service...", "primary");
      
      activatePath('path-s1-wal', 'active-storage');
      await animatePacket('path-s1-wal', '#e0aa3e', 700);
      deactivatePath('path-s1-wal', 'active-storage');
      
      log("[WAL_SERVICE] WAL replicated in storage tier. Acknowledging primary.", "storage");
      
      activatePath('path-s1-wal', 'active-storage');
      await animatePacket('path-s1-wal', '#38d39f', 500, true);
      deactivatePath('path-s1-wal', 'active-storage');
      
      log("[STANDBY 1 (PRIMARY)] Transaction COMMITTED. Returning confirm to client.", "primary");
      
      activatePath('path-dns-s1', 'active-write');
      activatePath('path-client-dns', 'active-write');
      animatePacket('path-dns-s1', '#38d39f', 800, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-s1', 'active-write');
        deactivatePath('path-client-dns', 'active-write');
      }, 800);
      
      if (state.standby2State !== 'OFFLINE' && state.standby2State !== 'PROVISIONING') {
        log("[WAL_SERVICE] Pushing invalidation for Page 42 to Standby 2.", "storage");
        activatePath('path-wal-s2', 'active-pubsub');
        await animatePacket('path-wal-s2', '#ff4d4d', 800);
        deactivatePath('path-wal-s2', 'active-pubsub');
        state.standby2State = 'INVALID';
        updateBufferUI('s2', 'INVALID');
        playBeep(300, 'sawtooth', 0.15);
        log("[STANDBY 2] Marked Page 42 in local RAM as INVALID.", "standby");
      }
    }
    
    setTimeout(() => {
      state.busy = false;
      btnWrite.disabled = false;
      btnFailover.disabled = state.isPrimaryCrashed;
      if (state.activePrimary === 'primary') {
        btnReadS1.disabled = false;
        btnReadS2.disabled = true;
      } else {
        btnReadS1.disabled = true;
        btnReadS2.disabled = false;
      }
    }, 1000);
  }

  async function handleReadS1() {
    if (state.busy || state.activePrimary === 'standby1') return;
    state.busy = true;
    playBeep(800, 'sine', 0.08);
    btnWrite.disabled = btnReadS1.disabled = btnReadS2.disabled = btnFailover.disabled = true;
    
    log("Client requests read query on Standby 1: SELECT email FROM users WHERE id = 1;", "standby");
    
    activatePath('path-client-dns', 'active-read');
    activatePath('path-dns-s1', 'active-read');
    await animatePacket('path-client-dns', '#51a2da', 400);
    await animatePacket('path-dns-s1', '#51a2da', 800);
    deactivatePath('path-client-dns', 'active-read');
    deactivatePath('path-dns-s1', 'active-read');
    
    if (state.standby1State === 'VALID') {
      log("[STANDBY 1] Cache Hit! Page 42 is VALID. Reading directly from Shared Buffers.", "standby");
      
      activatePath('path-dns-s1', 'active-read');
      activatePath('path-client-dns', 'active-read');
      animatePacket('path-dns-s1', '#38d39f', 800, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-s1', 'active-read');
        deactivatePath('path-client-dns', 'active-read');
      }, 800);
    } else {
      log("[STANDBY 1] Cache Miss! Buffer Page 42 is marked INVALID.", "standby");
      log("[STANDBY 1] Requesting page 42 from disaggregated Shared Page Storage Fleet...", "standby");
      
      activatePath('path-s1-page', 'active-storage');
      await animatePacket('path-s1-page', '#cbd5e1', 800);
      deactivatePath('path-s1-page', 'active-storage');
      
      log("[PAGE_STORAGE] Page Server applying logs to reconstruct Page 42. Sending page.", "storage");
      
      activatePath('path-s1-page', 'active-storage');
      await animatePacket('path-s1-page', '#38d39f', 800, true);
      deactivatePath('path-s1-page', 'active-storage');
      
      log("[STANDBY 1] Page 42 loaded into Shared Buffers. Marking page as VALID.", "standby");
      state.standby1State = 'VALID';
      updateBufferUI('s1', 'VALID');
      
      log("[STANDBY 1] Returning read result to client.", "standby");
      
      activatePath('path-dns-s1', 'active-read');
      activatePath('path-client-dns', 'active-read');
      animatePacket('path-dns-s1', '#38d39f', 800, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-s1', 'active-read');
        deactivatePath('path-client-dns', 'active-read');
      }, 800);
    }
    
    setTimeout(() => {
      state.busy = false;
      btnWrite.disabled = btnFailover.disabled = false;
      btnReadS1.disabled = false;
      btnReadS2.disabled = true;
    }, 1000);
  }

  async function handleReadS2() {
    if (state.busy || state.standby2State === 'OFFLINE' || state.standby2State === 'PROVISIONING') return;
    state.busy = true;
    playBeep(800, 'sine', 0.08);
    btnWrite.disabled = btnReadS1.disabled = btnReadS2.disabled = btnFailover.disabled = true;
    
    log("Client requests read query on Standby 2...", "standby");
    
    activatePath('path-client-dns', 'active-read');
    activatePath('path-dns-s2', 'active-read');
    await animatePacket('path-client-dns', '#51a2da', 400);
    await animatePacket('path-dns-s2', '#51a2da', 800);
    deactivatePath('path-client-dns', 'active-read');
    deactivatePath('path-dns-s2', 'active-read');
    
    if (state.standby2State === 'VALID') {
      log("[STANDBY 2] Cache Hit! Reading Page 42 directly from Shared Buffers.", "standby");
      
      activatePath('path-dns-s2', 'active-read');
      activatePath('path-client-dns', 'active-read');
      animatePacket('path-dns-s2', '#38d39f', 800, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-s2', 'active-read');
        deactivatePath('path-client-dns', 'active-read');
      }, 800);
    } else {
      log("[STANDBY 2] Cache Miss! Fetching page from Page Storage Fleet...", "standby");
      
      activatePath('path-s2-page', 'active-storage');
      await animatePacket('path-s2-page', '#cbd5e1', 700);
      deactivatePath('path-s2-page', 'active-storage');
      
      log("[PAGE_STORAGE] Reconstructing Page 42. Sending page.", "storage");
      
      activatePath('path-s2-page', 'active-storage');
      await animatePacket('path-s2-page', '#38d39f', 700, true);
      deactivatePath('path-s2-page', 'active-storage');
      
      log("[STANDBY 2] Loaded Page 42. Setting buffer status to VALID.", "standby");
      state.standby2State = 'VALID';
      updateBufferUI('s2', 'VALID');
      
      activatePath('path-dns-s2', 'active-read');
      activatePath('path-client-dns', 'active-read');
      animatePacket('path-dns-s2', '#38d39f', 800, true);
      animatePacket('path-client-dns', '#38d39f', 400, true);
      setTimeout(() => {
        deactivatePath('path-dns-s2', 'active-read');
        deactivatePath('path-client-dns', 'active-read');
      }, 800);
    }
    
    setTimeout(() => {
      state.busy = false;
      btnWrite.disabled = btnFailover.disabled = false;
      btnReadS1.disabled = true;
      btnReadS2.disabled = false;
    }, 1000);
  }

  async function handleFailover() {
    if (state.busy || state.isPrimaryCrashed) return;
    state.busy = true;
    
    playBeep(180, 'triangle', 0.8);
    setTimeout(() => playBeep(180, 'triangle', 0.8), 200);
    
    btnWrite.disabled = btnReadS1.disabled = btnReadS2.disabled = btnFailover.disabled = true;
    
    log("[CRITICAL ALERT] PRIMARY COMPUTE NODE EXPERIENCED A FAILURE AND WENT OFFLINE!", "error");
    
    const rectPrimary = document.getElementById('rect-primary');
    rectPrimary.classList.remove('active-primary');
    rectPrimary.classList.add('crashed');
    rectPrimary.setAttribute('fill', 'url(#crashed-grad)');
    
    document.getElementById('text-primary-title').textContent = 'Primary Node (OFFLINE)';
    document.getElementById('text-primary-sub').textContent = 'Compute failure AZ-1';
    const statusText = document.getElementById('text-primary-status');
    statusText.textContent = 'CRASHED / VM OFFLINE';
    statusText.setAttribute('fill', '#ef4444');
    
    activatePath('path-dns-primary', 'crashed');
    activatePath('path-primary-wal', 'crashed');
    
    log("[SYSTEM] Decoupled Storage tier (WAL Service & Page storage) is unaffected. Shared data is 100% SAFE.", "storage");
    log("[HA_CONTROLLER] Primary heartbeats lost. Initiating failover orchestrator...", "system");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    log("[HA_CONTROLLER] Standby 1 has lowest replication lag. Promoting Standby 1 to Primary.", "system");
    
    await animatePacket('path-dns-s1', '#e0aa3e', 1000, true);
    
    const rectS1 = document.getElementById('rect-s1');
    rectS1.classList.remove('active-standby');
    rectS1.classList.add('active-primary');
    rectS1.setAttribute('fill', 'url(#primary-grad)');
    
    document.getElementById('text-s1-title').textContent = 'Promoted Primary Node';
    document.getElementById('text-s1-sub').textContent = 'Compute (AZ-2 Writer)';
    
    document.getElementById('badge-s1-container').style.display = 'none';
    const textS1Status = document.getElementById('text-s1-status');
    textS1Status.setAttribute('opacity', '1');
    
    state.activePrimary = 'standby1';
    log("[DNS] Load balancer updated. Rerouting all write queries to Promoted Node (AZ-2).", "system");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    log("[HA_CONTROLLER] Launching a new Standby Compute node (AZ-3) to restore high availability...", "system");
    
    const rectS2 = document.getElementById('rect-s2');
    rectS2.classList.remove('active-standby');
    rectS2.classList.add('provisioning');
    state.standby2State = 'PROVISIONING';
    updateBufferUI('s2', 'PROVISIONING');
    
    log("[PROVISIONING] Spawning compute node in availability zone 3...", "system");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    rectS2.classList.remove('provisioning');
    rectS2.classList.add('active-standby');
    state.standby2State = 'VALID';
    updateBufferUI('s2', 'VALID');
    
    log("[PROVISIONING] New compute instance online. Mounting shared disaggregated storage connection.", "system");
    log("[SYSTEM] HA architecture fully restored. Cluster is healthy and write-active.", "system");
    
    state.isPrimaryCrashed = true;
    state.busy = false;
    
    btnWrite.disabled = false;
    btnFailover.disabled = true;
    btnReadS1.disabled = true;
    btnReadS2.disabled = false;
  }

  function handleReset() {
    playBeep(440, 'sine', 0.1);
    
    state = {
      isPrimaryCrashed: false,
      activePrimary: 'primary',
      standby1State: 'VALID',
      standby2State: 'VALID',
      busy: false
    };
    
    const rectPrimary = document.getElementById('rect-primary');
    rectPrimary.className.baseVal = 'node-card active-primary';
    rectPrimary.setAttribute('fill', 'url(#primary-grad)');
    document.getElementById('text-primary-title').textContent = 'Primary Node';
    document.getElementById('text-primary-sub').textContent = 'Compute Node AZ-1';
    const statusText = document.getElementById('text-primary-status');
    statusText.textContent = 'ONLINE • Read/Write';
    statusText.setAttribute('fill', '#38d39f');
    
    const rectS1 = document.getElementById('rect-s1');
    rectS1.className.baseVal = 'node-card active-standby';
    rectS1.setAttribute('fill', 'url(#standby-grad)');
    document.getElementById('text-s1-title').textContent = 'Standby 1 Node';
    document.getElementById('text-s1-sub').textContent = 'Compute Node AZ-2';
    document.getElementById('badge-s1-container').style.display = 'block';
    document.getElementById('text-s1-status').setAttribute('opacity', '0');
    updateBufferUI('s1', 'VALID');
    
    const rectS2 = document.getElementById('rect-s2');
    rectS2.className.baseVal = 'node-card active-standby';
    rectS2.setAttribute('fill', 'url(#standby-grad)');
    updateBufferUI('s2', 'VALID');
    
    deactivatePath('path-dns-primary', 'crashed');
    deactivatePath('path-primary-wal', 'crashed');
    
    btnWrite.disabled = false;
    btnReadS1.disabled = false;
    btnReadS2.disabled = true;
    btnFailover.disabled = false;
    
    log("[SYSTEM] Cluster reset to original configuration. Primary AZ-1 online.", "system");
  }

  btnWrite.addEventListener('click', handleWrite);
  btnReadS1.addEventListener('click', handleReadS1);
  btnReadS2.addEventListener('click', handleReadS2);
  btnFailover.addEventListener('click', handleFailover);
  btnReset.addEventListener('click', handleReset);
  
})();
</script>

---

## 8. Summary of Shared-Storage Replication Benefits

1. **Zero Replication Lag Accumulation**: Since standbys read directly from the shared storage layer, they do not fall behind replaying WAL disks. Invalidation notifications are instantaneous TCP transactions.
2. **Reduced Resource Overhead**: The compute replicas consume virtually zero CPU/IO overhead for replaying logs. They dedicate all compute capacity to serving client queries.
3. **Instantaneous Scalability**: Spinning up a new reader node takes seconds. It requires zero file copying or syncing—the node simply mounts the virtual connection to the shared storage layer.
4. **Resiliency**: If a compute node crashes, it can be replaced instantly without losing sync, as the source of truth is always secure in the decoupled storage tier.
