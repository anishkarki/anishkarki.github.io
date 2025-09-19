# VLDB Reference Architecture — “Atlas” (≥10 TB, OLTP + Analytics hybrid)
## SQL server parameters
### General: 
1. Server name
2. Product version
3. Engine/instance type
4. Server collation
    * Default character set and set order
    * affect string comparision, storing and stroage.
5. server mode
6. Is HADR enabled: for Always on Availability
7. XTP: allows the memory-optimised tables and natively compiled stored procedures. 
8. Is polybase installed: allow SQL server to query external data source like HADOOP, Azure blob storage or other RDBMS via T-SQL.
9. Is clustered: if its part of WSFC then it is True. 
### Memory
1. Minimum server memory (MB)
2. Maximum server memeory (MB): Leave 4–6 GB for the OS on a dedicated database server, or 10–20% of total memory.
3. Lock page in memory: prevents sql server's memory page from being paged out to the disk.
4. Minimum memory per query: at least the amount of memory for sorting, joins and exection. 
5. Index creation memory: SQL Server tries to allocate enough memory to efficiently build indexes, but it can spill to tempdb if memory is limited. Configuring enough buffer pool and/or using SORT_IN_TEMPDB is critical for large tables.
### Processor
1. CPU affinity (processor affinity): allows sql server to bind its thread to specific CPUs or cores. Reduce CPU context switching. Affinity masks for the contorol. For example you can use 0-5 for SQL and 6-7 for OS.
```sql
-- Show current affinity
EXEC sp_configure 'affinity mask';

-- Set affinity mask (example: use CPUs 0-3)
EXEC sp_configure 'affinity mask', 15; -- Binary 1111 for cores 0-3
RECONFIGURE;

```
2. IO affinity: Binds specific CPU to handle disk I/O operations.  Can imporve I/O throughput by dedicating cores for heavy read/write workloads. 
```sql
EXEC sp_configure 'affinity I/O mask';
```
3. MAXDOP: Max degree of parallelism. 
    * 0 = auto, 1 = serial, >1 = parallel
    * OLTP: MAXDOP=1(many small queries)
    * OLAP: MAXDOP = no of cores per NUMA node (2-8 usually)
4. Cost threshold for parallelsim
    * increase 25-50 for OLTP to avoid oerhead from parallelism on small queires. (query cost units)
5. Maximum worker threads
    * uses worker threads to process queries and background tasks. 
    * doin't change if you don't have very high concurrency or very large NUMA server. 
        * Setting too low → query queuing and delays.
        * Setting too high → CPU context switching overhead.
6. Trusted for delegation:
    * Allows SQL Server to impersonate users for Kerberos delegation (used in linked servers or SSRS).
7. Server proxy account: Tasks that requires external system access. Access to the fileshare, network resource, Replication SSIS or maintance plans. 
8. Enable common criteria complicance: for security certifcaiton. provides autditing, security checks and restricitions. 
9. C2 audit tracing: Detailed security audit records of server activity.
    * for C2-compiance certificaiton, usually in government and high-security contexts.
10. Cross-db owership chaining: determines wether owenership chaing. allow access to an obj in different db if owner is same. 
### Connections
1. Max number of concurrent servers
2. remote server connections
3. Use remote procedure calls(RPC): Controls whether SQL Server can execute stored procedures remotely on linked servers.
4. Distribted txn: Allow SQL server to participate in MSDTC if multiple dbs and servers are involved in same txn. 
5. Connection encryption: Forces client connections to use SSL/TLS encryption. Protect data in transit.
6. Fill factors: while creating index does the sql server leaves the gap in pages or not. 
```sql
CREATE INDEX IX_Column
ON dbo.Table(Column)
WITH (FILLFACTOR = 80);

ALTER INDEX IX_Column ON dbo.Table
REBUILD WITH (FILLFACTOR = 90);
```
### Others
1. Filestreams: enables storing unstructured data (docs, images) in file system while keeping it integrated with SQL server. 
2. Containement: isolating users and settings from the instance. 
3. Lightweight Pooling (Fiber Mode): Enables SQL Server to use fibers instead of threads. Rarely used; can improve performance for extremely high concurrency but usually discouraged.
4. optimise for ad hoc workloads: The optimize for ad hoc workloads option is used to improve the efficiency of the plan cache for workloads that contain many single use ad hoc batches. When this option is set to 1, the Database Engine stores a small compiled plan stub in the plan cache when a batch is compiled for the first time, instead of the full compiled plan. when recompiled, it indetifies removes the stub and saves the full plan cache. 

---
## Partial and filegroup backups in SQL server:
1. Filegroup: logical grouping of datafiles. 
    * place specific tables/indexes in dedicated storage.
    * Filegroup level backups. 
    * **TYPES**
        * Primary:  system tables and primary data
        * user-defined: tables/indexs/paritions
        * read-only filegroup: for historical data.
```SQL
Backup database [mydb]
filegroup = 'PRIMARY'
to disk = 'D:\'
with init, format;
```