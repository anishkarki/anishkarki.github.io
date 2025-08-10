# Isolation Level
## Important Concepts
1. Phantom Read: It is a state of transaction in which two read queries on the same table gives different result within a tranaction.
```SQL
BEGIN TRANSACTION trans1;
SET Transaction isolation level repeatable read;

-- 1. query 1
select * from  dbo.test where i > 2;

-- Execute this in between on a different query window--------------------------
BEGIN TRANSACTION trans2;
SET Transaction isolation level repeatable read;
-- 1. query 1
insert into dbo.test values (4);
commit;
----------------------------------------------------

select * from  dbo.test where i > 2;
commit;
```
### Locking
a. Shared lock: for read \
b. Exclusive lock: for write
### Versioning
The sql server keeps PVS (previous version store) of rows changed in tempdb, allowing reader to see a consitent snapshot of the data.
* Accelerated Recovery (ADR): Persistent version store (PVS) directly in the database than tempdb, using logical revert to undo changes without scanning txn logs and aggressive log truncation. 
* SLOG (secondary log steam) for non-versioned operations, metadata changes. 
* async cleaner.
### Blocking
* reads row with a shared lock

|Isolation Level | Dirty reads | Non-Repeatable Reads (update & commit) | Phantom Reads (inserted & deleted) | Locking Behavior| versioning | blocking | Use case|
|---|---|---|---|---|---|---|---|
|1. Uncommitted Read | Yes | 

