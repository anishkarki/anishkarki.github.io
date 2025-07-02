# SQL Server architecture [Interview Prep]
### SQL server storage architcture (pages, extent, allocation units)
* Pages: Smallest unit 8KB
    * data page: Store data row for table (heap and clustered). 96 bytes header, a row offset array at the end.
    * index page: store the index entries (Key) for non-clustered indexes or non-leaf level. Key value and pointers
    * LOB Data pages: Store large object (LOB) data. which does not fit in IN_ROW_DATA. managed using LOB_DATA allocation unit
    * Global allocation map (GAM): tracks which extents are current allocated or free within a allocation unit. Each bit in GAM is 64KB extent.
    * SGAM: Tracks the mixed extents and uniform extents that are currently full.
    * page free space (PFS): free space in each pages. each byte represents the data or index page. 
    * Index allocation mapping (IAM): map the extents allocated to a toble or an index (or a partition). Each IAM is 4GB range of files and points to GAM and SGAM. 

>Allocation units: How space is managed and allocated for data and  indexes within a db files. Internally manage the ownership of the extent.
* ```IN_ROW```: fixed-length column, variable-length column and pointer to lob ro row overflow data if the row exceeds the page limit.
* ```LOB_DATA```: Pointer in IN_ROW_DATA to lob_data pages.
* ```ROW_OVERFLOW```: VCHAR,NVARCHAR,VARBINARY: combined length exceeds the 8KB page size. Leave 24 bytes pointer in the original in_row_data page.

## Checkpoints:
* Flush dirty pages from buffer pool to disk.
* updates database metadata (DB state, LSNs).
* Core to WAL and crash recovery.

## Explain the WAL mechanism.
* log record must be written to the disk before associated data pages.
* ensure ACID compliance, durability.

## Buffer pool
* in-memory cache of data/index pages.
* reduces physical i/o
* for memory management, performance, and memory pressure.

## Query lifecycle.
* Parser (syntax analyse & symentic analysis) &rarr; algebrizer (convert into a tree structure) &rarr; Optimizer ( generates estimated plan using stats and other information and store the generated query in plan cache) &rarr; Execution engine ( executs the query using the plan with least cost) &rarr; results
* for subsequent exection of same query, optimizer depends on plan cache if available. 

## Important DBCC
```SQL
DBCC CHECKDB;

DBCC OPENTRAN;

DBCC INPUTBUFFER(<session_id>);

DBCC SQLPERF(LOGSPACE);

DBCC FREEPROCCACHE; -- not in production, force recompilations of plan cache. 
```
## memory management
* Dynamic memory manager for allocate and deallocate memory. buffer pool, query workspace and lock manager
max server memory, lazy writer, memory grants. 
* out of memory and slow-down.

## Lock and latch:
* lock is logical for row, table
* latch is physical for memroy (page, buffers)

## Lock escalation:
* if sql server needs to lock more than certian rows in a table then it locks whole table.

## I/O affinity and CPU affinity
* ```sys.dm_io_vitual_file_stats```
* perfmon
* wait stats: pagelatch_XX, writelog
> binding sql server to specific core. managed by cpu affinity mask.\
> 2016+ auto partitions CPUs into NUMA nodes for better cache locality.\
> reduced cache misses (L2/L3 caches), no context switching with os and other apps.

```sys.dm_os_schedulars sys.dm_os_ring_buffers```
* CPU Affinity: Binds query processing threads to specific CPUs
* I/O Affinity: Binds disk I/O operations to specific CPUs

* NUMA is computer memory design where CPU or socket has its own local memory. Access to local memory is faster than remote memory. Non-Uniform memory access. 
* 4 sockets and 256 GB then it has 128GB.

*As covered earlier:*
* 15 in binary = 00001111
* Each 1 represents a CPU core SQL Server can use
* This means SQL Server is using CPU cores 0, 1, 2, and 3
* Both for query execution and possibly for I/O completion threads

Same for the IO mask which is ```Online_schedule_mask```


