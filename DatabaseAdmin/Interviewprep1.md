# The modern SQL Server DBA - HandBook [Interview Prep]
In the age of LLM where you can buy memory on cheap price, the deciding factors for capable employee has drastically changed. Unlike the technical requirements, it has been necessary to analyse the phychological and behavioural traits of a person.
* Stress Innoculation and Cognitive performance under stress: Reaction and approach during the production-down scenario.
* Root cause analysis and systematic thinking:
* Intellectual humility and a growth mindset: Open about their mistakes and what they learned from them. How to stay current to rapidly evolving tech?
* Ownership and Accountability: We vs I when describing successes and failures. 
* Leadership and mentoring propensity: How do they explain complex topics? Articulate a vision.

### ARIES (Algorithm for Recovery and Isolation Exploiting Semantics): It is a recovery algorithm. ARIES ensures that committed transactions are durable and that incomplete transactions are rolled back during recovery. Achieves through WAL, fuzzy checkpointing (LSN), and redo/undo operations.
1. Analysis Phase: Last successful checkpoint to identify dirty pages in the buffer pool at the time of the crash and the active transactions. Start of redo phase. determine ```redoLSN```: point from which redo should begin.
2. Redo Phase: Starting from the determined point (min(recoveryLSN)) of dirty pages. All logging changes (redoes). 
3. ARIES rolls back the changes made by tXN that were incomplete or uncommitted at the time of the crash. Log record in reverse LSN order. Undo log CLRs can be tracked.

### ADR: It uses 
* ```Persistent Version Store (PVS)``` Maintains the version store directly in the user database: tracks row level changes, access previous version of data.
* Logical Revert: Instant revert using the PVS.
* sLog: A secondary in-memory log stream that stores log records for non-versioned operations. Only process these small operations quickly in redo and undo. 
## Interview Preperation
### 1. Describe troubleshooting a slow-running query reported by a user:
    * Try reproducing the issue
    * capture exection plan (actual and estimated)
        * ```set statistics IO on;```
        * ```set statistics TIME on;```
        * Look for anything like Table scans taking high cost and long time or missing indexes or warnings like implicit conversions or memory spills.
    * check waits (```sys.dm_os_wait_stats```):
        * CXPACKET: parallelism tuning
        * PAGEIOLATCH: io bottleneck
        * LCK_M_IX: insert/update locking
    * review indexes and stats on involved tables
        * Are the used column indexed
        * use ```exec sp_helpindex 'tablename';```
    * check for blocking/locks
        * check if there is any blocking ```sys.dm_tran_locks```
    * Validate parameter sniffing, implicit conversions, or bad query patterns
        * Try with different ```@OrderDate``` values.
        * Use ```option(recompile)``` to see if the plan changes.
        * Set query store on.
    * Tune query/indexes or rewrite as needed
        * in some cases filtered index or for reporting query indexed view can be helpful. 

### 2. Difference between recompile and optimize for unknown

|recompile | Optimize for unknown|
|----------|---------------------|
|fresh plan for each exection(parameter-sensative query)| ignores specific parameters values; uses average distribution (avoid parameter sniffing)|
```SQL
SELECT COUNT_BIG(*)
FROM Sales.SalesOrderDetail sod
JOIN Sales.SalesOrderHeader soh ON sod.SalesOrderID = soh.SalesOrderID
WHERE sod.LineTotal > 0;
-- OPTION (Optimize for unknown);
-- OPTION (recompile);
```
### 3. Common wait status and Prameters
| parameters | meaning| values|
|--|--|--|
|CXPACKET|there are often multiple threads in the query execution (producer and consumer). CXPACKET is measure of time these threads spends waiting to sync and exchange data with each other. High CXPACKET doesn't always means its bad. In OLAP with processors and large queries, its expected. Skewed parallelism. Uneven data distribution.(Cause: missing index, MAXDOP, Cost threshold for parallelism, out of stat, CPU pressure, IO bottleneck| CTFP (cost threshold for parallelism) is 5 by default, raise to 20,50 for OLTP. CXPACKET should be non-existant or low. ```high cxpacket + low cxconsumer, both high``` &rarr; bad
|PAGEIOLATCH | Shared, Exclusive, Update &rarr; waiting for the page data loaded from disk into the buffer pool or change to a page in memory to be completed. | Always be low for OLTP. Poor disk latency. Use PerfMon (Windows Performance Monitor)
|LCK_M_XX| shared lock, exclusive lock, update lock: process waiting to acquire a lock on a resource (row, page, object, database) | even minor affects
|SOS_SCHEDULER_YIELD| Thread has yielded the cpu to allow other threads to execure. Busy scheduler. |
|WriteLOG| when txn commits and sql server has to wait for the txn log records to be physcially flushed to the txn log file on disk. | should be very low
| ASYNC_NETWORK_IO | server has sent data to the client application, but waiting for the acknowledgement. | High fast server but network or client is dead

```SQL
SELECT 
    [Wait_Type],
    [Wait_Time_MS] / 1000.0 AS [Wait_Time_Seconds],
    [Waiting_Tasks_Count],
    [Wait_Time_MS] * 1.0 / NULLIF([Waiting_Tasks_Count], 0) AS [Avg_Wait_Time_MS],
    CASE [Wait_Type]
        WHEN 'CXPACKET' THEN 'Too much parallelism or bad query plan; tune MAXDOP and cost threshold'
        WHEN 'PAGEIOLATCH_SH' THEN 'Slow I/O subsystem; improve storage or tune queries'
        WHEN 'PAGEIOLATCH_EX' THEN 'Heavy write activity or contention; consider batching or faster disks'
        WHEN 'LCK_M_IX' THEN 'Blocking caused by concurrent writes; tune indexing or isolation levels'
        ELSE 'Other wait type – check official documentation'
    END AS [Interpretation]
FROM sys.dm_os_wait_stats
WHERE [Wait_Type] IN (
    'CXPACKET',
    'PAGEIOLATCH_SH',
    'PAGEIOLATCH_EX',
    'LCK_M_IX',
	'CXCONSUMER'
)
ORDER BY [Wait_Time_MS] DESC;

-- ReadwriteIO
SELECT DB_NAME(database_id) AS db_name, file_id,
       io_stall_read_ms / NULLIF(num_of_reads, 0) AS avg_read_ms,
       io_stall_write_ms / NULLIF(num_of_writes, 0) AS avg_write_ms
FROM sys.dm_io_virtual_file_stats(NULL, NULL);

-- Missing index:
SELECT TOP 10 *
FROM sys.dm_db_missing_index_details
ORDER BY avg_total_user_cost DESC;
```
## Checking for the LOG FLUSH: 
```SQL
SELECT 
    instance_name AS database_name,
    counter_name,
    cntr_value
FROM sys.dm_os_performance_counters
WHERE counter_name IN ('Log Bytes Flushed/sec', 'Log Flush Wait Time')
  AND object_name LIKE '%Databases%'
ORDER BY instance_name;

-- 
SELECT TOP 10
    wait_type,
    wait_time_ms / 1000.0 AS total_wait_seconds,
    waiting_tasks_count AS wait_count,
    wait_time_ms / NULLIF(waiting_tasks_count, 0) AS avg_wait_time_ms,
    100.0 * wait_time_ms / SUM(wait_time_ms) OVER() AS percent_of_total
FROM sys.dm_os_wait_stats
WHERE wait_type NOT IN (
    'CLR_SEMAPHORE','LAZYWRITER_SLEEP','RESOURCE_QUEUE','SLEEP_TASK',
    'SLEEP_SYSTEMTASK','SQLTRACE_BUFFER_FLUSH','WAITFOR','LOGMGR_QUEUE',
    'CHECKPOINT_QUEUE','REQUEST_FOR_DEADLOCK_SEARCH','XE_TIMER_EVENT','BROKER_TO_FLUSH',
    'BROKER_TASK_STOP','CLR_MANUAL_EVENT','CLR_AUTO_EVENT','DISPATCHER_QUEUE_SEMAPHORE',
    'FT_IFTS_SCHEDULER_IDLE_WAIT','XE_DISPATCHER_WAIT','XE_DISPATCHER_JOIN',
    'SQLTRACE_INCREMENTAL_FLUSH_SLEEP','BROKER_EVENTHANDLER','TRACEWRITE',
    'WAIT_XTP_HOST_WAIT','HADR_FILESTREAM_IOMGR_IOCOMPLETION',
    'HADR_WORK_QUEUE','HADR_LOGCAPTURE_WAIT','HADR_TIMER_TASK','HADR_WORK_QUEUE',
    'HADR_SIGNAL_ACCESS','WAIT_FOR_RESULTS','BROKER_RECEIVE_WAITFOR','PREEMPTIVE_OS_GETPROCADDRESS',
    'PREEMPTIVE_OS_AUTHENTICATIONOPS','PREEMPTIVE_OS_LIBRARYOPS','PREEMPTIVE_OS_COMOPS',
    'PREEMPTIVE_OS_WAITFORSINGLEOBJECT','PREEMPTIVE_OS_AUTHORIZATIONOPS'
)
ORDER BY wait_time_ms DESC;

DBCC SQLPERF('sys.dm_os_wait_stats', CLEAR);
```
### 4. How do you resolve the blocking and deadlocking?
> sys.dm_tran_locks, sp_who2, sys.dm_exec_requests, Extended events. Find the blocker, check for slowness, review indexing and adjust isolation, SI or RCSI. 
```SQL
-- Find blocking session:
SELECT 
    r.session_id AS blocked_session_id,
    r.status,
    r.blocking_session_id,
    r.wait_type,
    r.wait_time,
    r.wait_resource,
    s.login_name,
    s.host_name,
    t.text AS blocked_query
FROM sys.dm_exec_requests r
JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.blocking_session_id <> 0;

-- Head blockers (sessions not blocked by others but blocking others)
SELECT 
    session_id,
    login_name,
    host_name,
    status,
    cpu_time,
    memory_usage,
    program_name
FROM sys.dm_exec_sessions
WHERE session_id IN (
    SELECT blocking_session_id
    FROM sys.dm_exec_requests
    WHERE blocking_session_id <> 0
)
AND session_id NOT IN (
    SELECT session_id
    FROM sys.dm_exec_requests
    WHERE blocking_session_id <> 0
);

SELECT 
    request_session_id AS session_id,
    resource_type,
    resource_database_id,
    resource_associated_entity_id,
    request_mode,
    request_status
FROM sys.dm_tran_locks
WHERE request_status = 'WAIT';
```
#### ISOLATION TYPES
---
|Type | Define | USE|usage|
|---|---|---|---|
READ UNCOMMITTED| dirty, non-repeatable, phantom | It can just read anything like commited uncommited doesn't care | No blocking atall. read row even when another txn hasn't committed.
COMMITTED| no dirty, non-repeatable, phantom | You will see the data in your txn once other session commits it with ending your txn | Uses shared locks only during read, other session can still write afterwareds. Order entry, inventory lookup.
REPEATABLE READ| only phantom | prevent changes to rows read. Only to the single rows | Prevent other rows from updating or deleting these rows, loan approval
SERIALIZABLE| Full isolation | prevent anything selected between the range of rows. like it can be >1000 | prevent insert, updates or deletes on any row. protect against phantom read
SNAPSHOT| full isolation | High concurrency with consitency. It will just show you a version. Once you start your txn, it a different version of database at that state for you | System with high concurrency small OLTP with complex analytics like hospital system.

>Dirty Read:	Reading data that is uncommitted and may roll back\
>Non-Repeatable Read:	A row value changes between two reads in the same transaction\
>Phantom Read:	New rows are added or removed between reads, changing the result set

> OPEN Transaction can prevent cleanup of older row versions in the tempdb version store (for snapshot isolation) or the persistent version store (PVS) for database.

### Switch between READ COMMITTED AND SNAPSHOT
#### READ COMMITTED &rarr; SNAPSHOT
1. Read heavy OLTP systems: 90% reads. 
2. ETL or financial processes needing stable views.
3. Frequent non-repeatable reads or phantom.
4. Deadlocks in high-concurrency workloads.
5. Frequent blocking during long reads. (reporting query blocked by OLTP writes)

#### Shapshot &rarr; READ COMMITTED
1. tempdb Pressure/ version store overflow (high update rates and long-running readers)
2. Non need for repeatable reads or phantom protection.
3. Reduce disk i/o for small txn. 
4. Conflicts between multiple writers: writers using snapshot can cause update conflicts. 
5. Third-party apps that don't handle snapshot isolation conflict errors.

### 5 Parameter Sniffing
Sometimes the plan is made using the first parameter used which can be good for common values but bad for outliers.
>FIXES: ```optimise for, recompile```, plan guides, or rewrite procedure.\
Optimise for unknown: use avg distribution whereas recomile genrates new plan for the value

### 6. Clustered and non-clustered index
* Clustered: Physcial index on any key or combination of keys/columns. ONly one.
    * If you create ```primary key``` without specifying the nonclustered, server will create by default. Incrementing rows are ideal.
* non-clustered: Logical index with pointer to actual rows. they include clustered index key in their leaf level.
    * Can be multiple. Can do with ```include()```
    * This is called covering index.
* Unique index (clustered or non-clustered): Enforce uniqueness of the value in index key
* Flitered index (non-clustered): includes a where clause to filter the data.
* Columnstore index: For OLAP, data warehousing. Column-oriented format rather than row, compressed, and vastly imporves the aggregate queries, data warehousing query. 
* XML index (primary and secondary): optimize querying of XML data stored in XML data type columns. Primary XML index: shared the XML data into set of internal tables and secondary further optimise for query patterns like path, property, value.

```SQL
-- Base table for most examples
CREATE TABLE Customers (
    CustomerID INT IDENTITY(1,1) NOT NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Email NVARCHAR(100) NULL,
    RegistrationDate DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Base table for XML Index example
CREATE TABLE ProductCatalog (
    ProductID INT PRIMARY KEY,
    ProductName NVARCHAR(100),
    ProductDetails XML
);

-- Option A: Primary Key defaults to Clustered Index
ALTER TABLE Customers
ADD CONSTRAINT PK_Customers PRIMARY KEY NONCLUSTERED (CustomerID);

ALTER TABLE Customers
DROP CONSTRAINT PK_Customers;


-- Option B: Explicitly create a Clustered Index on a non-primary key column
-- (If PK is NONCLUSTERED, or if no PK)
-- This assumes CustomerID is NOT already the clustered index
-- Example: If you frequently query by LastName ranges
CREATE CLUSTERED INDEX CX_Customers_LastName
ON Customers (LastName ASC, FirstName ASC);


-- Create a Non-Clustered Index on the Email column
CREATE NONCLUSTERED INDEX IX_Customers_Email
ON Customers (Email ASC);

-- This index can satisfy queries needing CustomerID, FirstName, LastName, and Email
-- without going back to the base table (if CustomerID is the clustered key).
CREATE NONCLUSTERED INDEX IX_Customers_EmailWithDetails
ON Customers (Email ASC)
INCLUDE (FirstName, LastName, RegistrationDate);

-- Create a Unique Non-Clustered Index on the Email column
-- This prevents duplicate email addresses.
CREATE UNIQUE NONCLUSTERED INDEX UQ_Customers_Email
ON Customers (Email ASC);

-- If you wanted a unique clustered index, you'd specify CLUSTERED with UNIQUE
-- (e.g., if you created a new table where a composite key defined physical order and uniqueness)
CREATE TABLE UserLogins (
    UserID INT NOT NULL,
    LoginProviderID INT NOT NULL,
    LoginDate DATETIME NOT NULL,
    CONSTRAINT UQ_UserLogins UNIQUE CLUSTERED (UserID, LoginProviderID)
);

-- Create a Filtered Index on LastName, but only for active customers.
-- This index will be smaller and faster for queries specifically on active customers.
CREATE NONCLUSTERED INDEX IX_Customers_Active_LastName
ON Customers (LastName ASC, FirstName ASC)
WHERE IsActive = 1;

-- SELECT CustomerID, FirstName, LastName FROM Customers WHERE IsActive = 1 AND LastName = 'Smith';

-- To convert an existing table to a Clustered Columnstore Index,
-- you must first drop any existing clustered index (like PK_Customers from above)
DROP index CX_Customers_LastName on Customers;
DROP INDEX IF EXISTS IX_Customers_Active_LastName ON Customers;
DROP INDEX IF EXISTS IX_Customers_Email ON Customers;
DROP INDEX IF EXISTS IX_Customers_EmailWithDetails ON Customers;
DROP INDEX IF EXISTS UQ_Customers_Email ON Customers;


-- Then create the Clustered Columnstore Index.
-- The table itself is now stored in a column-oriented format.
CREATE CLUSTERED COLUMNSTORE INDEX CCI_Customers
ON Customers;

CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_CustomersMinimal
ON Customers (Email);



-- If uniqueness is still required
CREATE UNIQUE NONCLUSTERED INDEX UQ_Customers_Email
ON Customers (Email);

-- Optional narrow lookup
CREATE NONCLUSTERED INDEX IX_Customers_Email
ON Customers (Email);

-- Optional if filtering by active and sorting by name
CREATE NONCLUSTERED INDEX IX_Customers_Active_LastName
ON Customers (LastName, FirstName)
WHERE IsActive = 1;  -- assuming this is a real column


exec sp_helpindex 'Customers';


SELECT 
    i.name AS index_name,
    c.name AS column_name
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('dbo.Customers')
AND i.type_desc = 'CLUSTERED COLUMNSTORE';
```
* Clustered Columnstore index (CCI): replaces the rowstore entirely and NON-clustered columnstore index (NCCI) sits alongside the rowstore. Hence, only one can be created for consistency.
### Fragmantation in SQL server: Internal and External
* Fragmantation: logical order of data doesn't equal to the physical order of data.
* REORGANIZE: Online, defrag only (< 30% fragmentation)
* REBUILD: recreated index( offline > 30%)
>Internal: Wasted empty space within a data page or index page. Rows don't perfectly fill the page.\
>External: Logical(Index scan order) and physical (disk storage) order of pages being out of sync. Pages are not contiguous on disk leading to extra I/O
```SQL
SELECT
    DB_NAME(ips.database_id) AS DatabaseName,
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.index_type_desc,
    ips.alloc_unit_type_desc,
    ips.index_depth,
    ips.index_level,
    ips.avg_fragmentation_in_percent, -- This is the key metric for external fragmentation
    ips.fragment_count,
    ips.page_count,
    ips.avg_page_space_used_in_percent -- This indicates internal fragmentation
FROM
    sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED') AS ips
INNER JOIN
    sys.indexes AS i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE
    ips.avg_fragmentation_in_percent > 5 -- Filter for indexes with more than 5% fragmentation
    AND ips.page_count > 100 -- Ignore very small indexes
ORDER BY
    ips.avg_fragmentation_in_percent DESC;
```
>* FILLFACTOR: Amount of leafs to be filled with data. 100 means all data (chances of fragmantion on more inserts, less storage), 70-90 means more free space for future inserts but high amount of space and I/O during index scans.\
>* PAD_INDEX: Boolean value (ON or OFF): when pad_index is on the fill factor is applied to intermediate leavels of index's B-tree not just the leaf level. 

### 8. Covering indexing
* It is a non-cluster index that covers all the columns using include. No lookup needed. It reduces I/O and improves read performance. 

### 9. Filtered index:
* It is a non-clustered index targing the subset of row. 

### 10. Purpose of Query Store.
* It saves the historical query executed along with query plan, runtime stat. As a whole full history.
* Helps to identify regression, force good plans. 
* Used for performance tuning and trobuleshooting.

### 11. Describe when to use Extended events to trouble shoot a perfomance issue. 
* Example: to generate a deadlock report using xml_deadlock_report
* Captured event using XE session and analyzed details (locks, processes, victims)
    * Long running queries: Events: sql_statment_completed, rpc_completed
    * Filter: duration > x ms or CPU > y ms
    * CPU time, reads, writes, duration, SQL text
* Wait Info, wait_completed, wait_info_external
    * understand bottleneck
    * better than sys.dm_os_wait_stats.

* TempDB contention:
    * event: wait_info + page_allocated
    * Excessive allocation contention. 

### Usage of TempDB:
* User-defined temporary tables #localtemptable, ##globaltemptable
* Internally use tempdb if memory spills occur @tableVar
* Work tables: Sorts, joins, hash match (query plans that spills intermediate results.)
* Select into #temp from.. Write into tempdb
* Cursor: use tempdb for large datasets
* Triggers: nested trigger operations. uses tempdb if recursion or resultset size requires it
* Snapshot isolation, version store. 
* Online index rebuild
* groupby order by
* spooling operators (lazy spools, eager spool)
* DBCC Checkdb checktable
* service broker
* caching
* Parallelism
* XE (extended events/ring buffers)
* QUERY STORE (tempspace during flishing to disk.)
---
Best Practice
* Add multiple data files to reduce allocation contention (1 file per logical CPU upto 8)
* Place tempdb on SSD (fast storage) instead of SAN disk with high throughput
* Use trac flat 1117/1118 or rely on auto-uniform extent allocations.
* Monitor with wait stats, perfmon, and XE.
---
1. filesize and space usage
2. internal/user/version store page
3. session-wise usage
4. tempdb-related waits

```SQL
SELECT 
    s.session_id,
    r.status,
    r.command,
    t.text AS sql_text,
    tsu.internal_objects_alloc_page_count,
    tsu.user_objects_alloc_page_count
FROM sys.dm_exec_requests r
JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
JOIN sys.dm_db_task_space_usage tsu ON r.request_id = tsu.request_id
OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.database_id = 2;
---
USE msdb;
GO

IF NOT EXISTS (SELECT * FROM tempdb.sys.tables WHERE name = 'TempDB_Monitor_Log')
BEGIN
    CREATE TABLE dbo.TempDB_Monitor_Log (
        LogTime DATETIME DEFAULT GETDATE(),
        FileSizeMB INT,
        UsedSpaceMB INT,
        InternalObjectsMB INT,
        UserObjectsMB INT,
        VersionStoreMB INT,
        PagelatchWaits BIGINT,
        TopSessionID INT,
        TopSessionCommand NVARCHAR(100),
        TopSessionMBUsed INT
    );
END

---SQL Agent job
USE msdb;
GO

EXEC sp_add_job @job_name = N'TempDB Monitoring Job';

EXEC sp_add_jobstep
    @job_name = N'TempDB Monitoring Job',
    @step_name = N'Capture TempDB Metrics',
    @subsystem = N'TSQL',
    @command = N'
DECLARE @FileSizeMB INT, @UsedSpaceMB INT, @InternalMB INT, @UserMB INT, @VersionMB INT;
DECLARE @PagelatchWaits BIGINT, @TopSessionID INT, @TopSessionCommand NVARCHAR(100), @TopSessionMBUsed INT;

-- File size
SELECT @FileSizeMB = SUM(size) * 8 / 1024
FROM sys.master_files
WHERE database_id = 2;

-- Used space
EXEC tempdb..sp_spaceused;
SELECT @UsedSpaceMB = SUM(unallocated_extent_page_count + version_store_reserved_page_count
  + user_object_reserved_page_count + internal_object_reserved_page_count) * 8 / 1024
FROM tempdb.sys.dm_db_file_space_usage;

-- Internal and User pages
SELECT 
    @InternalMB = SUM(internal_objects_alloc_page_count) * 8 / 1024,
    @UserMB = SUM(user_objects_alloc_page_count) * 8 / 1024
FROM tempdb.sys.dm_db_task_space_usage;

-- Version store
SELECT @VersionMB = SUM(version_store_reserved_page_count) * 8 / 1024
FROM tempdb.sys.dm_db_file_space_usage;

-- PAGELATCH waits
SELECT @PagelatchWaits = SUM(waiting_tasks_count)
FROM sys.dm_os_wait_stats
WHERE wait_type LIKE ''PAGELATCH_%'';

-- Top session by TempDB usage
SELECT TOP 1 
    @TopSessionID = s.session_id,
    @TopSessionCommand = r.command,
    @TopSessionMBUsed = SUM(internal_objects_alloc_page_count + user_objects_alloc_page_count) * 8 / 1024
FROM tempdb.sys.dm_db_task_space_usage t
JOIN sys.dm_exec_sessions s ON t.session_id = s.session_id
JOIN sys.dm_exec_requests r ON t.request_id = r.request_id
GROUP BY s.session_id, r.command
ORDER BY SUM(internal_objects_alloc_page_count + user_objects_alloc_page_count) DESC;

-- Insert log
INSERT INTO dbo.TempDB_Monitor_Log
(FileSizeMB, UsedSpaceMB, InternalObjectsMB, UserObjectsMB, VersionStoreMB, PagelatchWaits,
 TopSessionID, TopSessionCommand, TopSessionMBUsed)
VALUES
(@FileSizeMB, @UsedSpaceMB, @InternalMB, @UserMB, @VersionMB, @PagelatchWaits,
 @TopSessionID, @TopSessionCommand, @TopSessionMBUsed);
',
    @database_name = N'tempdb',
    @on_success_action = 1;

```
>For most new allocations in user databases and tempdb, SQL Server now defaults to allocating uniform extents from the very beginning, even if the object only needs one page.

>Mixed extents are still used for some internal purposes (like Index Allocation Map (IAM) pages) but are no longer the default initial allocation for user tables/indexes.

### What is impact of NoLock
* dirty reads; ignores nolocks, incositent read.

### Reading Execution plan
* estimated vs actual, costly operators (key lookup, sort, nested loop).
* Analyze index usage, join types, and warning (missing stats)

### Keyloopup vs RID lookup. 
* Keylookup: on the clustered table (seeks using clustered index)
* RID lookup: on heap( row id fetch)
* RID is more expensive due to heap access and less efficient page reads.
### MAXDOP
* It is maximum degree of parallelism. Total number of processor that a query can use to create thread and run the query. 
* Unlimited by default; can casuse cxpacket waits. skewed parallelism. Tuned based on CPU core, workload type (OLTP often set to 1 or 2)


## Scenario-based Questions (TOP 5)
### 2 AM, and the prod DB is down. Walk thorough your response.
* check alert detials (monitoring system)
* RDP into server; validate the service and the server itself.
* Check error logs and Event Viewer
* Check system resource (disk,cpu, memory, network)
* Communicate status and recovery plan to the stakeholders
* Start a incident ticket with vendor if enterprise db
* Try bringing it up if its a known cause and can be resolved else
    *  Initiate failover if in an HA setup
* Document post-mortem in depth root cause and resolution for future reference and communicate with stakeholders.
### Blame Game: Dev blames DB
* Classic, Try to replicate the issue.
* Collect all the metrics (execution plan, wait stats, resource usage)
* present finding along with evidence and give suggestion if applicable
* ask for collaborative review.
* focus on join resolution.
### impossible request: Real-time report on OLTP system.
* Assess load impact and explain consequences.
* Propose alternative (replication, read-only AG secondary, caching)
* set expectations clearly.
### Time you made a significant technical mistake
* It was when i started the job was writing automation script for backups and failover maintainence or percona cluster mysql.
* I ran the script with production .env file and as the script was on the test phase. 
* I ran the wrong directory structure and remove  root directory in linux of the server.
* As it was Multi-master cluster with percona was all in sync. 
* Informed manager as it wasn't so raise the ticket with system adim to rebuild the server (VM).

### Proactive improvement: 30-60-90 day plan.
* Audit current state, implement basic monitoring, setup alerts if not. Check for the replication status, architecture. I believe understanding business is vital for DBA. Need to know what is critical and what is not. need to figure out which system needs load and which are free ones.
* 60: Automated backups, index/stat maintencance, baseline metrics, Automated backups integrity and verification
* 90: DR test plan, optimise high-cost queries, implement security and performance policy. 


