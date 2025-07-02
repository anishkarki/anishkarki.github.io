## Day 3 [Interview Prep]
### 1.  Cardinality estimation of SQL server
* Optimizer predicts the number of rows that will be returned by each operation in a query plan. Generated from sampled column values only.
* it uses statistics (histograms, density vectors) Deciding between the hash and a nested loops join.
    * High cardinality: Hash Join ( large estimated row count)
    ```
    SELECT *
    FROM Orders o
    JOIN Customers c ON o.CustomerID = c.CustomerID
    WHERE o.Status = 'A';
    ```
    * Low cardinality: Nested Loops Join (few rows)

```SQL
UPDATE statistics <Tablename>;
UPDATE STATISTICS dbo.YourTableName WITH FULLSCAN;

--whole database
exec sp_updatestats;

-- can also alter index all on table reorganize or rebuild.

-- How to view statistics
DBCC SHOW_STATISTICS ("Person.Address", AK_Address_rowguid);
GO
```
### 2. Implicit conversions affect query performance
* this is when the server auto converts data from one datatype to another data type to satisfy the comparision. 
    * prevent idex usage
    * CPU overhead
        * look for the convert operator in plan. "TYPE_WARNING" event in extended events. 
```SQL
SELECT BusinessEntityID, LastName
FROM Person.Person
WHERE BusinessEntityID = '42';  -- INT column compared to VARCHAR literal
-- Do the explain of the query and then check for the clustered index seek popup last line. seek predicate. 
```
### Window function: Calculations on the set of rows that are related to current row without collapsing data.
* Ranking, Aggregate, Analytics with over clause
* Over ([order by] [partition by ] [ rows | range frame]) 
* Allows complex calculations like percentage of total, detect changes or grouping etc on a single pass over the data. 
* avoid self-joins, subqueries in single data scan.

### Table variables vs temporary table  Table Variable (@table)
|Table Variables | Temp table|
|---|---|
| no lock or log, no txn| full stats so better plans |
| good for small table| indexes,  txn, flexible for complex scenarios
|NO stats so poor plan, no index, no parition, less visibility| more logging, locking, recompile due to stat change, tempdb contention |
> Tempdb contention: when the multiple sessions try to access or allocate pages from the same tempdb structures at the smae time. 
```SQL
SELECT
    wait_type,
    waiting_tasks_count,
    wait_time_ms
FROM sys.dm_os_wait_stats
WHERE wait_type LIKE 'PAGELATCH_%'
  AND wait_type NOT LIKE '%IO%';
```

### Check details of the page:
```SQL
SELECT 
    bd.database_id,
    bd.file_id,
    bd.page_id,
    bd.page_type,
    bd.is_modified,
    bd.row_count,
    OBJECT_NAME(p.object_id, bd.database_id) AS ObjectName
FROM sys.dm_os_buffer_descriptors AS bd
JOIN tempdb.sys.dm_db_partition_stats AS p
    ON bd.database_id = DB_ID('tempdb') 
    AND bd.allocation_unit_id = p.partition_id
WHERE bd.database_id = 2 -- tempdb
  AND bd.page_type = 'DATA_PAGE'
ORDER BY bd.page_id;
-- Syntax: DBCC PAGE ( {dbid}, {fileid}, {pageid}, {printopt} )
DBCC PAGE (2, 1, 8, 3);
```
### FORCESEEK hint work:
* Optimizer use index seek opration for data access even if it chooses scan. Influence cost model. 
* e.g., due to stale statistics or parameter sniffing

### Statistics hysteresis
* Delay or threshold SQL server uses before auto updating columns or index stat. (20% + 500 rows change)
* frequent changing table but below the threshold.

### Database tuning advisor. What are limitations:
* GUI that analyse the SQL trace, XE sessions or query store data and recommend optimal set of indexes, indexed views or partitioning stat. 
    * Good as long as data
    * no write performance consider
    * can be slow
    * redundant or overlay specific index.
    * limited scope.
    * No query rewrites, server config, non-index tuning

### In-memory OLTP objects.
* Hekaton are tables (memory-optimized tables) and stored procedures ( natively compiled stored procedures) that reside in RAM and are optimised for OLTP workloads.
    * Speed, no locks, natively compiled procedure reduce CPU cycles.
    * memory footprint, limited feature set, persistent overhead, migration complexity. no tempdb.

### Database Partitioning
* Very large table (billions of rows) having distinct logical paritioning schema based on date, region or ID range.

### Troubeshoot tempdb contention
* High PAGELATCH_UP or EX wait types on tempdb allocation pages (GAM, SGAM, PFS pages)
    * monitor sys.dm_os_wait_stats and find PAGELATCH_%
    * sys.dm_db_session_space_usage and dm_db_task_space_usage
    * Exection plan for tempdb spills (sort warning, hash warning) large temp objects, table variables, temp tables.
    * You can also do the XE evernt for sort_spill.

* Create multiple tempdb data files. 1 for each CPU core up to 8.
* optimise query.

### ghost records.
* when a row is deleted or updated ( cause row to move to new location) doesn't delete immediate. instead marks ghost record. GHOST CLEANUP TASK: async deletes.
    * If the cleanup process falls behind: more i/o
    * CPU overhead.
    * fragmentaion

### Concept of plan cache
* Optimiser generates the estimated plan and save it in the cache to reuse if same query is encountered in future. "ad-hoc"
* millions due to no using parameterization
* sys.dm_exec_cached_plans
* DBCC FREEPROCCACHE

### How do the choice of datatypes impact performance and storage.
* TINYINT vs INT
* Smaller row, each row per page ,reducing number of read of jump to ROW_OVerflow allocation.
* Implicit conversion
* NVARCHAR(MAX) is cpu-intensive for sorting and comparision.
* fixed and variable length. 
* INdexing: Narrow index key are more efficient with shallower index trees few io. index inefficient for large types like MAX or XML
### Cost thresholding for parallelism
* CTFP: specifies minimum estimated cost a query must have for sql server to consider parallelize its exection. 
* if too low, CXPACKET waits becomes high and poor performance. For oltp 25 to 50.

### Query tuning assitance
* Introduced in 2017+. 
* used after the upgrade to test the query before and after the upgrade or change of the compatibility level.


## Scenario based questions.
### 1. Mentor a Jounior DBA: 
* Foundation first: wait stats, execution plan, indexing basics, I/O principles.
* Practical application: Show them and engage them instead of doing alone. Shadow them.
* SSMS (exection plan, activity monitor), query store, XE
* Methodology is key: Identify bottleneck then identify the query then analyze plan then propose solution, test and implement.
* Let them know that its hard to see a drastic change in any query at once unless they are completely unoptimised. Small changes group to make the whole system exteremly fast.
* Asking questions.
* Reputable online communities

### 2. The legacy systems. critical outdated SQL server 2008 instance
* Phased migration, risk-mitigated upgrade strategy, end of life.
* Problems: Lack of support, security risk, downtime, compliance issues.
* Propose a Phased Apprach:
    * Phase 1: Compatibility assesment and upgrade to supported version 2019/2022 on modern OS: Use DMA for dependency assessment.
    * Phase 2: Application compatibility testing: closely work with applciaition team. Recommend a dedicated test environment (mirroring production) throughly test the application agaist the upgraded database.
    * Phase 3: Performance validation: use query store and query tuning assistant cound be there.

* Benefits: query store, ADR, columnsotre. 

### 3. Need for new monitoring tool that would significantly impove effeciency.
* Quantify the manhour saving and estimate the cost saving
    * Checkout for opensource (graphana, prometheous)
    * leverage existing tools and automation codes.
    * Phased acquisiton: lite version or module of the tool for demo before full investment.
* Present the business case to management and relevent teams (IT leadership, finance). Calcuate the ROI and risk reduction.

### 4. Security Breach
1. Isolate and contain (immediate)
    * conform the vulnerability is real and its scope
    * if actively exploited, isolate the affected system from the network if feasible or block suspicious IPs/accounts.
    * Preseve evidence: don't make changes that could destroy forensic. Take snapshot or backups if safe.
2. Assess Impact: Data exposure, data modification/loss, system compromise, timeline, severity.
3. Notify and communicate (IT security, management, legal communication) external legal
4. mitigate:
    * Patch/fix: apply necessary security patches, reconfigure or implemnt controls to colsoe the vulnerability
    * change credentials
    * resotre for integirty.
5. Document and learn

### 5. Embracing the new: 
* Intelligent query processing (IQP): feature like memory grant feedback and parameter sensative plan optimisation. 
    * it is a step toward adaptive database system by ms. 
        * memory grant feedback: ineffectient memroy grants (too high lead to wastage of resotuce and too low spills to tempdb)
        * parameter sensative plan optimisation (PSP): long standing parameter sniffing issue by allowing multiple plan for a single parameterized query. 
##### How to implement
1. Phase 1: POC (pilot and proof of concpet): Dev/test env
    * upgrade test and restore production alike with masking.
    * upgrade compatibility
    * capture workload: query store.
    * monitor and analyze: XE and performance conter to identify queries that bebefit from IQP features or confirm no regression. look for change in memory grant

2. Phase 2: Controlled Rollout - Staging/ pre-production
    * staging env
    * application testing
    * feature flagging: database scoped config options that can be toggled
3. Phase 3: procution implementation:
    * gradual rollout: if the application supports (microservices) subset rollout.
    * agressive monitor and feedback look.
    
