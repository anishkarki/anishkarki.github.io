# Plan cache
* storage of the exection plan
* avoid repeated compilation, improved performance, and reduce CPU overhead.
* Created:
    * Either first exection
    * when the parameterized query is compiled.

|Components| Description|
|---|---|
| compiled plans| exection plans for queries, stored procedures or ad-hoc SQL|
|metadata plans | internal plans for system queries, schema, statistics|
| plan stub/single-use plans| minimal placeholder for rarely used ad-hoc queires (```used with optimize for ad hoc workloads```).|
|object types in cache| adhoc regualr queries, sp_executesql queries, stored procedures,system-generated queries
---
### How does it works:
1. Query exectures: SQL Server parses it
2. Optimize creates a plan: estimates costs, choose indexes, joins, operators
3. plan stored in plan cache: linked to query hash or object handle
4. Subsequent execution: SQL server checks cache:
    * Cache hit: plan reused
    * cache miss
---
```
1. Parameterized queries educe cache duplication
2. Dynamic or ad-hoc queries with many vairables may pollute cache.
```
### Plan lifecycle
1. memory pressure: too much memory pressure for buffer pool
2. query usage: frequently and rarely used
3. Schema/statistics changes
    * alter table, index rebuild, stats update: recompilation, old plan removed
4. Server restart
5. configuration: optimize for ad hoc workloads, max server memory and trace flags affect caching behavior.
### monitor plan cache
1. Top plan by memory usage
```SQL
select * from sys.dm_exec_cached_plans as cp cross apply sys.dm_exec_sql_text(cp.plan_handle) as st;

-- Ad-hoc plan usage
SELECT cp.usecounts, COUNT(*) AS plan_count
FROM sys.dm_exec_cached_plans AS cp
WHERE cp.cacheobjtype = 'Compiled Plan' AND cp.objtype = 'Adhoc'
GROUP BY cp.usecounts
ORDER BY usecounts;

-- Memory usage by plan cache
SELECT
    type,
    SUM(single_pages_kb + multi_pages_kb) AS total_kb
FROM sys.dm_os_memory_clerks
WHERE name LIKE '%cache%'
GROUP BY type;

```
### Problems:
1. Cache pollution: many single use ad-hoc queries: evict useful
2. Memory pressure
3. parameter sniffing: query plan optimised for first parameter, poor on other
4. Recompile stroms: frequent schema/stat changes

### best practices
1. Enable "optimise for ad hoc workloads"
2. parameterize queries: use sp_executesql or stored procedures to reduce unique plans
3. monitor frequently
4. avoid unnecessary clearning
    * dbcc freeproccache: clears entire cache ```only emergency```
5. Use query stoe: identify regression, track plan change,force stable plans
6. Index and stats management
    * prevent unnecessary recompilation due to schema changes

```SQL
DBCC FREEPROCCACHE;
DBCC FREEPROCCACHE(plan_handle);
DBCC FLUSHPROCINDB(<db_id>);
```
## Final:
* Plan Guides: Force specific plans for problematic queries.
* Partition hot/warm/cold workloads: Reduces cache churn.
* Memory settings: Adjust max server memory to balance buffer pool vs plan cache.
* Extended Events: Track recompilation events and plan evictions.


