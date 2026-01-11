---
title: "PostgreSQL Administration: Complete Guide"
date: "2026-01-12"
category: "PostgreSQL Administration"
tags: []
excerpt: "A comprehensive, production-ready guide to postgresql administration, covering fundamentals, best practices, troubleshooting, and real-world examples from enterprise environments."
author: "Anish Karki"
featured: true
---

# Database Architectures
## SQL SERVER
1. monolithic, multi-Layered Architecture within single sqlserver.exe
    * Client Application
    * &darr; (TDS tabular data stream orver TCP/IP or named pipes)
    * Protocol Layer (SMI) (handles network protocols)
    * &darr;
    * Relational Engine (Quer Processor)
        * Commond Parser: validates syntax and semantics
        * algebrizer: resolves name and objects
        * Optimizer: Multiple possible exection plans for a query, Estimates their IO, CPU and selects the most effieicit one
        * query executor: connector of plan and storage engine
    * &darr;
    * Storage Engine: 
        * Access Methods: Heap, B-tree index and Columnstore access.
        * Buffer Manger (Plan cache, data cache): Cache data pages in memoery LRU
        * Txm manager or log manager: manages write-ahead logging
        * lock manager: controls concurrency. 
    * &darr;
    * SQLOS: a user-mode application layer between SQL server and windows os. Handles OS_like services such as thread scheduling, memory management and I/O management specifically tailored for SQL server's needs. 
        * thread scheduling
        * memory management
        * I/O management
* SQL server uses cooperative scheduling via SQLOS - not relying solely on windows thread scheduler. 

## Postgresql
It is a different beast. It has a sinlge master postmaster running and for each client connection it forks a new process (not thread). 
* Postmaster is reponsible for forking the backend processes that uses shared memeory content. It also handles background processes like ```autovaccum, checkpoint, WAL writer, stats collectors```.
* Background workers:
* Client connection: if you have 2 processors and more than 2 conneciton, there will be context switching overhead. Processes share CPU time slices fairly. Use tools like PgBouncer and Pgpool-II keep a pool of backend processes. 

### Parts of Server's Storage Engine?
1. Access methods
2. Buffer manaer (buffer pool, plan cache) LRU-K algorithms
3. Tranaction log manager: WAL and LSN
4. Lock manger: row/pages/db locks
    * RID, Page, EXTENT, TABLE, DB (S, X, U, Intent)
5. Recovery manager: REDO/UnDO using write-ahead log during startups.
```All data modification goes through locks first for durability.```
#### CHECK
* RID, Page, EXTENT, TABLE, DB (S, X, U, Intent)
### Postmaster
#### Backend process
1. Handles exactly one client sessions.
2. Has its own memory context but shares
    * shared buffer
    * WAL buffers
    * lock tables
    * stats
3. Access to the data files, WAL files

### Database instance model sql serer vs cluster model postgreSQL
1. SQL SERVER - Instance model
    * running copy of sql server services (engine, agent, broker etc)
    * Isolated security and configuration
    * listen to different ports.
2. Postgresql
    * a single postmaster.
    * Multiple databases in single cluster
    * all databases in a cluster shares
        * postmaster
        * port
        * memory and background workers
        * same global objects (tables, tablespaces)
        * roles, pg_dba.conf, WAL, Config
    * ``` Databases are isolated and can't join across them without postgres_fdw or dblink.```

### Comparision of Transaction log and WAL
1. PostgreSQL:
    * Wal for durability and enables crash recovery and replication
    * all changes in WAL segments (16MB each in pg_wal/)
    * WAL records decribe low-level changes ("set x of page y to z") low level record.
    * ```Checkpoints: they flush dirty buffers to data files -- WAL before data```
    * Used for crash no UNDO always use MVCC.
    * Point-in-time recovery. 
    * WAL record is flushed to disk (fsync) before the dirty page itself is written back. That’s why it’s called Write-Ahead Logging → logs are always persisted first.
    * WAL is physical not logical like mysql
    * WAL entry: page 1232, offset 200, new tuple inserted.
    * lazy writer for dirty page but WAL is immediate to disk (fsync)

* Restart the crashed postgresql
    * reads the WAL segment files (PG_WAL/) and finds the last checkpoint record (safe known state) using LSN and replay WAL. 
* Checkpoint ( checkpointer + background writer ) triggers Triggered by:
    *   WAL size growth (max_wal_size).
    *   Time interval (checkpoint_timeout).
    *    Manual command: CHECKPOINT;.
    *   Shutdown (always does a final checkpoint).

2. SQL server Txn log:
    * uses WAL - all modifications logged before being written to data files.
    * Log records are the logical operations (e,g Insert ROW r into table t).
    * supports rollback- contains both REDO and UNDO information.
    * divied into virtual log files (VLFs) -- internal segements in ```(.ldfs)```
        * used in crash recovery
        * replication (txn, always on)
        * log shipping
        * CDC, temporal tables.
    * Log records are logical + physical ( unlike postgresql with only physical )
        * example (logical desc: insert x into table y)
        * enough is stored to redo committed txn and undo uncommitted ones.

    * VLFs: there is at least one log file. SQL Server breaks this into smaller chunks called VLFs.  Internal division for easier management. <64 is 4 VLFs, 64 to 1G is 8 VLFs and >1 is 16 VLFs. Circular fashion when last is full comes to first and use VLF that are no longer needed. The crality is after the checkpoint or log backup in FULL recovery model, old VLFs are inactive. That’s why DBAs recommend setting reasonable initial size + growth increments.

* there is a checkpoint process (no lazy writer)
* Triggered by 
    * Automatic *(based on recovery interval settings)
    * indirect checkpoint (per-database, smoother writes)
    * manual checkpoint;
    * shutdown
* CYCLE (ARIES model)  

```lazy writer = memory manager, checkpoint = durability & recovery manager.```
##### NOTE: in case of postgresql there is background writer that works continuously and flush dirty pages gradually to reduce checkpoint spikes. and there is checkpointer, all dirty pages to disk and record to WAL, like after the full backup. everything before this WAL lSN is persistent. now you can truncate the WAL. The same kind of lazy writer occur in sql server as well. The checkpoint worker does flush and end checkpoint log record in txn log and records active txns needed for UNDO phase. After checkpoint the inactive VLFs can be truncated or reused. 

### TEMP DB
* system db -- recreated every time sql server restarts
* used for:
    * temporary tables, temporary variables
    * sorts, hashes, spools (query workspaces)
    * version store ( for RCSI, online index rebuilds, triggers)
    * cursors, LOB variables
    

    










