# Advanced SQL Server Concepts
## Row-Level Security (RLS)
RLS filters via inline table-valued functions (ITVFs) bound by a security policy. 
* Use ```SESSION_CONTEXT``` for middle-tier apps. (```EXEC sp_set_session_context 'tenant_id', 42```)
* Always implement predicates as inline TVFs.
* Index the security columns / use filtered indexes
* Block predicates for write: ```ADD BLOCK PREDICATE ... AFTER INSERT/UPDATE```
* Plan testing
    * predicate funcitons: returns 1 if it should have access
    * security policy: binder predicate funciton to the table
    * predicate types
        * filter: never know what is there
        * block: explicitly blocks write opeations (after insert, after update, before update, before delete)
---
* Don't use as replacement for encryption or privileged-account protection.
* Cross-database or cross-server access complicates RLS (policies per-database).
* side channel attacks
## Dynamic Data Masking (DDM)
* Combine DMM with grant unmask. Mask by default
* Use DDM metadata to inventory masked columns.
* Use DDM in the pipeline for the dev/test refresh. Combine with masking scripts or redgate
* Combine DDM with auditing and RBAC
* backup contains unmasked data, secure backups
## Resource Governor
* Use app_name/login/session_context for classifier function
* Limit heavy maintenance backups cpu
* Protect memory grants
* Per-AG instance config
* **Create (Resource pool &rarr; workload group &rarr; classifier function) &rarr; Alter (link resource governer with classifier function, alter resource reconfigure)**
    * resource pools
    * workload group 
    * classifier function
## Table-Valued Function (TVFs)
* Prefer inline TVFs
* 2019: Table-variable deferred compilation, so estimates use real row count on the first run. Parameter sniffing and plan stability may still require hists/ ```option (recompile)```. 
* Use ```cross apply``` for per-row TVF joins efficiently. 
## Encryption
* Provides servral layers of encryption to protect data "at rest", "in transit" and "in use".
    * TDE: encrypts the entire database file at rest. Only authorised user and apps can directly access the data.
    * Always Encrypted: Client side technology where data is encrypted before it even reaches sql server. Protects the data in use.
    * Column-level encryption: Encrypts data in specific columns using built-in functions like ```ENCRYPTBYKEY```
## Database Snapshots
* trasnactionally-consistent view of source database at the moment of the snapshot's creation.
    * Instantaneous, read-only  copy of a database.
    * Running reporting query without blocking or being affected by other txn.

## Columnstore indexes
* rowstore is like reading a book page by page and finding all mention of a sinlge character 
* Columnstore is like having a seperate list of every character's name and the page they appear on, faster to analyse single character.

## In-memory OLTP (Hekaton)
* memory optimised table and natively optimised stored procedures for unparalleled performance.
* for stock trading or e-commerce booking. 
* Durability option on restarts
    * schema and data
    * schema only
* used for one way input sensors, online game leaderboards, financial trading, small txn.
* It is latch-free and lock-free internally (optimistic MVCC)
    * F – Fast OLTP
    * A – Avoid locks/latches
    * S – Small hot datasets
    * T – Throughput critical
## Query Store
* Captures a history of queries, exection plans and running statistics.
## Always on availability groups
* HA/DR. 
* Set of readable secodary databases that can be failed over to if the primary db is unavailable.
## Temporal tables
* Automaticaly tracks the history of data changes in a table. like a CDC.'
* create index on sysstarttime and sysendtime. 
## MVCC
* concurrent traditional locking without traditional locking
* Read committed snashot (RCSI) and snapshot isolation (SI)
### How does it works?
* Doesn't overwrite the rows immediately instead
* Copied into a special area in tempdb called version store. 14-byte pointer is added to the new row, pointing back to the old version in the version store.
* any query that needs to read the data follows the pointer.
* background processes cleans up old row versions from the PVS once they are no longer needed.
    * RCSI: default read committed isolation level to use versioning instead of shared locks. 
    * Snapshot isolation: explicit level. A traxantion running in this isolation see a consistent view of the entire database as it existed when the txn started. Lead to "update conflicts'

## IQP
* adapt for the workload's runtime characteristics, correcting to common perfromance problems. (150 or high)
    * memory grant feedback: Adjust the memory grant for subsequent exections of the same query
    * Adaptive hash: For a query, the optimiser might not know if a hash join or a nested loop join is better, until it sees how many rows the first input produces. Start with one and dynamically switch to other.
    * batch mode on rowstore. 
    * table variable deferred compilation: delay compilcation until the first exection, to see the actual number of rows in the variables.

## PVS and ADR
* The database keeps a snapshot version called PVS in the database itself instead of tempdb and rollback directly from the snapshot of the database then the actual txan log rollback. This accelerate the process.
