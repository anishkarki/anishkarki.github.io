# MVCC in PostgreSQL
The difference between multiversion and lock models is that in MVCC locks acquired for querying (reading) data don't conflict with locks acquired for writing data and so reading never blocks writing and writing never blocks reading
## What happens
* Instead of overwriting the data create new version same concept as (ADR in sql server)
* Each transaction sees a snapshot of db at a point of time, ensuring isolation (ACID)
* **Benefit**
    * no blocking
    * rollback support via version history.

## Implementation in Hardwarelevel
```py
# Data Structure
class RowVersion:
    def __init__(self, value, xmin, xmax):
        self.value = value
        self.xmin = xmin
        self.xmax = xmax
        self.next = None # Pointer to older version

class MVCCStore:
    def __init__(self):
        self.data = {}
        self.xid_counter = 1
        self.active_transactions =set() # Tracks running XIDs

```
## Monitoring MVCC
#### A. Montioring the session details for MVCC
```SQL
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state,
    backend_xid AS transaction_id,   -- XID of the current transaction (if any)
    backend_xmin AS snapshot_xmin -- Oldest XID visible to this session's snapshot
FROM pg_stat_activity 
WHERE (backend_xid IS NOT NULL OR backend_xmin IS NOT NULL)
ORDER BY pg_stat_activity.query_start;

```
**Key Points**
* The Session sees data as of 1152
* If the session stays ideal autovaccum can't clean row deleted after 5670
#### B. Wraparound Risk
```SQL
-- Database-wide XID wraparound status
SELECT 
    datname,
    age(datfrozenxid) AS xid_age,         -- Transactions since last freeze
    datfrozenxid,
    current_setting('autovacuum_freeze_max_age') AS max_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
```
* If xid_age nears max_age (e.g >1.9B), postgresql will force a shutdown to prevent wraparound
* Run ```Vaccum Freeze``` on old tables
#### C. Inspect ROW_LEVEL
```SQL
-- View xmin/xmax for a specific table
SELECT 
    ctid,           -- Physical row location
    xmin,           -- XID that created the row
    xmax,           -- XID that deleted the row (0 if active)
    *
FROM Test_Table
LIMIT 10;
```
D. Monitor Dead rows and Bload
```SQL
-- Dead rows per table (indicates vacuum lag)
SELECT 
    schemaname,
    relname,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_autovacuum,
    last_vacuum
FROM pg_stat_all_tables 
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;
```
* High dead_rows suggest autovacuum isn't working 
* Action: Tune autovacuum_vacuum_scale_factor or run manual ```VACUUM```

