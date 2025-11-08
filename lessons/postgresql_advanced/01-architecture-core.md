# PostgreSQL Data Directory Files

This document explains the purpose of important files and directories in the PostgreSQL data directory (`/var/lib/postgresql/data`).

| File / Directory         | Purpose                                                                 |
|--------------------------|-------------------------------------------------------------------------|
| `pg_control`             | Cluster-wide metadata, checkpoints, WAL info. Critical for cluster state and crash recovery. |
| `pg_filenode.map`        | Maps logical table OIDs to physical files. Helps locate the correct file for a table or index. |
| `pg_internal.init`       | Initialization info for system catalogs. Supports fast cluster startup and internal consistency checks. |
| `<number>`               | Table or index data file (binary, stored in 8 KB blocks). Each number corresponds to a table or index OID. |
| `<number>_fsm`           | Free Space Map for that table. Tracks free space in table blocks to optimize inserts and updates. |
| `<number>_vm`            | Visibility Map for that table. Tracks which blocks are fully visible for index-only scans and vacuum optimization. |
| `pg_tblspc`              | Tablespace links. Points to alternate storage locations for tables and indexes outside the default cluster directory. |
| `pg_wal`                 | Write-Ahead Logs (WAL). Stores transaction logs for durability and crash recovery. Contains WAL segment files, `archive_status/` directory, and `summaries/`. |
| `pg_commit_ts`           | Tracks commit timestamps if `track_commit_timestamp` is enabled. |
| `pg_dynshmem`            | Temporary files for dynamic shared memory used by Postgres processes. |
| `pg_logical`             | Stores logical replication data, including mappings, replication origins, and snapshots. |
| `pg_multixact`           | Tracks multi-transaction locks with `members` and `offsets` subdirectories. |
| `pg_notify`              | Stores pending `NOTIFY/LISTEN` messages for inter-process communication. |
| `pg_replslot`            | Stores replication slot data to prevent WAL removal before a replica consumes it. |
| `pg_serial`              | Tracks conflicts for serializable transactions. |
| `pg_snapshots`           | Stores active transaction snapshots for MVCC. |
| `pg_stat`                | Persistent statistics collected by Postgres, such as table scans, index usage, and vacuum info. |
| `pg_stat_tmp`            | Temporary statistics, cleared on server restart. |
| `pg_subtrans`            | Sub-transaction status information for nested transactions. |
| `pg_twophase`            | Stores two-phase commit transaction information. |
| `pg_xact`                | Transaction commit status files, tracking which transactions are committed. |

---

## Notes

- Files with `_fsm` and `_vm` suffixes are **internal helper files** and **should not be edited manually**.  
- Table and index files (`<number>`) are **binary** and require PostgreSQL access to read.  
- `pg_control` is **critical**; corruption can make the cluster unusable.  
- `pg_wal` is essential for **durability**; do not delete WAL files manually unless using proper backup methods.  
- `pg_tblspc` allows storage to be spread across different disks or directories.

---

## pg_tblspc TL;DR

✅ `pg_tblspc/<OID>` → symbolic link to actual tablespace location on disk  

✅ Postgres uses it to **redirect tables/indexes outside the main cluster directory**  

✅ Each tablespace OID corresponds to **one symbolic link directory**  

> Tip: You can visualize how `base/`, `pg_tblspc/`, and table OIDs map to physical locations. This helps understand how PostgreSQL maps logical tables to disk.

---

## References

- [PostgreSQL: Data Directory Layout](https://www.postgresql.org/docs/current/storage-file-layout.html)  
- [PostgreSQL: WAL](https://www.postgresql.org/docs/current/wal.html)  
- [PostgreSQL: Tablespaces](https://www.postgresql.org/docs/current/manage-ag-tablespaces.html)
---
## Most important here: 
- **`pg_wal`**: This is arguably the most critical directory. It contains the Write-Ahead Logs (WAL), which are essential for data durability and crash recovery. Every change to the database is first written here, ensuring that even if the server crashes, the data can be recovered to a consistent state.

- **`pg_xact`**: This directory stores the transaction commit status for all transactions. It's a fundamental part of PostgreSQL's concurrency control system, allowing the database to track which transactions have been committed or aborted.

- **`pg_control`**: This file contains vital, cluster-wide metadata. It holds information about checkpoints, the current WAL location, and other critical state data. It's used during startup to determine the status of the database and is crucial for crash recovery.

- **`base`**: While not explicitly in your list, this directory is foundational as it's where the actual data for all user-created tables and indexes is stored.

- **`postgresql.conf` & `pg_hba.conf`**: These two files are paramount for administration and security. `postgresql.conf` controls the server's behavior and performance, while `pg_hba.conf` manages all client authentication rules, making it a key security component.
---
```sql
select * from pg_database;
select * from pg_settings;
CREATE EXTENSION IF NOT EXISTS pageinspect;
create table test_page (a int);
insert into test_page values(1);

select * from heap_page_items(get_raw_page('test_page',0));
-- line pointer index
-- t_xmin: t_xmax: transaction IDs (for mvcc)
-- t_ctid: tuple ID (physical location)
-- t_data: actual tuple data (in hex)
-- Tuples are stored in physical order, but not necessarily insert order due to HOT (heap-only tuples).
select encode(get_raw_page('test_page', 0), 'hex');
-- Parse the 8192 blocks manually or with a tool like pg_hexedit or pgpage
```
# Logical Concepts in the PostgreSQL database 
## Memory Architecture(Logical)
### Local memory (per Bakcend)
* work mem: for sorts, hashes, and materialization
* maintenance work mem: for vacuum, create index
* Temp buffers: for temporary tables
### Shared Memory (global)
* shared buffers
* WAL buffers
* lock manager
* CLOG (Commit LOG)
* ProcArray