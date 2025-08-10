# Baseline Metrics
* If you are using linux then you need to install influxdb, collecd and grafana to capture similar to windows perfmon.
* monitor: sql server wait statistics.

## Windows counters
* process(_Total)% Processor Time: cpu utilisation
* paging file % usage: memory shouldn't page to the paging file on disk. page swapping
* physicalDisk\Avg disk sec/read and sec/write: storage subsystem is working. <20ms with premimum <10ms
* system\processor queue lenght: no of therads that are waiting for the time on the processor. >0, then add CPUs
* SqlServer: Buffer Manager\ Page life expectency: how long sql server expects a page to live in memory.  300 secs as proper sudden drop could indicate poor query patterns, external memoery pressure (SSIS package) or could be normal server process like consitency checks.
* Sqlserver: Sql statics \ batch requests\sec: How consistently busy a sql server is over time. 
* sql server: sql statistics\ sql compilations\sec and sql re-compilations\sec: sql server has to compile and recopile an exection plan for a query no plan cache. 


## Extended Events:
* admin: targeted for end user and admin. like xml deadlock report to identify the root cause.
* Operational: for analysis and diagnostics of common problems. can be used to trigger action or task. db in AG changing the state which is failover, add new file opeation error
* Analytics: related to performance events or are published in high volume. tacing stored procedure or query excection or lock type, lock chain
* debug: not documented and only use with support.
---
There are:
1. Global Field (actions): extra field to the events.
2. Predicate filter
3. Event that are collected. like cpu_time, duration, statement,
4. choose storage. like a file or ring buffer

Most targets process data asynchronously, which means that the event data is written to memory before being persisted to disk. The exception is the Event Tracing for Windows target (ETW), and Event Counter targets, which are processed synchronously.
* Event Pairing	Many events that generally occur in pairs (for example, lock acquire, lock release), and this collection can be used to identity when those events do no occur in a matched set.	Asynchronous
* Event Tracing for Windows (ETW)	Used to correlate SQL Server events with the Windows OS event data.	Synchronous



## Database watcher:
1. Azure data explorer cluster
2. Fabirc realtime analytics.

## Explore query performance insight

### The sql VM resource provider
### Azure monitor

