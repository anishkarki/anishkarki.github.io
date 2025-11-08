# Montioring PostgreSQL

## Storage & Page-level monitoring
* Where PostgreSQL physically stores and retrives data

|Aspect | Tools/Views/Functions | What to Monitor|
|---|---|---|
|Heap Page Inspection| ```pageinspect``` extension (```heap_page_items()```, ```bt_page_items()```) | view tuple headers, LP flags, free space, visibility info |
| **Corruption Detection** | ```pg_amcheck, pg_verify_checksum (cluster-wide```) | Detects corruption in heap/index pages

```sql
--Heap page inspect (return linepointer LP and tuple headers) and raw binary content. I will have x_min, t_infomask, lp, lp_flags. 
SELECT * FROM heap_page_items(get_raw_page('test', 0));
-- View the used and free space in the block
SELECT * FROM page_header(get_raw_page('my_table', 0));
```
```sh
# using pg_amcheck for corruption tection
pg_amcheck -a --heapallindexed --parent-check --jobs=4
```
```sql
create extension if not exists pageinspect;
```
```sh
pg_controldata $PGDATA | grep "Data page checksum version"

select * from heap_page_items(get_raw_page('public.customer',0));
```
The output interpretation:
1. lp: line pointer number: Each entry on the page (like an array index)
2. lp_off: Offsets in bytes from the start of the page
3. lp_flags: always 1 means it is valid
4. lp_len: physical size of tuples, includes header + data
5. t_xmin: insert tranaction if : row is created by transaction 193.
6. t_xmax: delete/update "0" zero means not deleted - row still visible
7. t_field3: internal field (unused in this context)
8. t_ctid: Tuple ID (block row): shows physical position in heap (0,1): block 0, tuple 1
9. t_infomask2: visibility/lock flags: 21: bitmask encoding (HEAP_XMIN_COMMITTED, no locks, no multi-txn) 
10. t_infomask: visibility and hot chain info: 2818: another bitmask defines status (commited, hint bits set, etc)
11. t_hotoff: tuple offset
12. t_bits: null bitmap or flags: No null columns or bitmap not printed
13. t_oid: object id (if oids enabled): not using OIDs.
14. t_data: actual row data (binary)

---
#### Main 3 tools are pginspect (bt_page_items(), pg_amcheck and pg_verify_checksums)
```sql
--- get all info of a table
\dt+ public.customer
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    pg_size_pretty(pg_table_size(schemaname || '.' || tablename)) as size_pretty
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'customer';

-- Additional statistics
SELECT 
    schemaname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_tup_hot_upd,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname = 'customer';

-- Column information
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'customer'
ORDER BY ordinal_position;
```
Monitoring Indexes inside out
```sql
---Create extension amcheck and pgstattuple
CREATE EXTENSION IF NOT EXISTS pgstattuple;
CREATE EXTENSION amcheck;


WITH params AS (
    SELECT
        'public'::text   AS target_schema,   -- <<-- SET SCHEMA (or NULL)
        'customer'::text AS target_table     -- <<-- SET TABLE  (or NULL for all)
),
idx AS (
    SELECT
        i.indrelid                              AS relid,
        i.indexrelid                            AS indexrelid,
        n.nspname                               AS schemaname,
        t.relname                               AS relname,
        ix.relname                              AS indexrelname,

        pg_get_indexdef(i.indexrelid)           AS index_def,
        am.amname                               AS access_method,
        i.indisprimary                          AS is_primary,
        i.indisunique                           AS is_unique,
        i.indisvalid                            AS is_valid,
        i.indisready                            AS is_ready,
        i.indisclustered                        AS is_clustered,
        i.indnullsnotdistinct                   AS nulls_not_distinct,
        pg_get_expr(i.indexprs, i.indrelid)     AS predicate,
        pg_get_expr(i.indexprs, i.indrelid) IS NOT NULL AS has_predicate,

        (SELECT string_agg(
                  a.attname ||
                  CASE WHEN (i.indoption[k.ord-1] & 2) = 2 THEN ' DESC' ELSE '' END ||
                  CASE WHEN (i.indoption[k.ord-1] & 1) = 1 THEN ' NULLS FIRST' ELSE '' END,
                  ', ' ORDER BY k.ord)
         FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        )                                       AS key_columns,

        pg_relation_size(i.indexrelid)          AS size_bytes,
        pg_size_pretty(pg_relation_size(i.indexrelid)) AS size_pretty,
        COALESCE(ts.spcname, 'pg_default')      AS tablespace
    FROM pg_index i
    JOIN pg_class t  ON t.oid = i.indrelid
    JOIN pg_class ix ON ix.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ix.relnamespace
    JOIN pg_am am ON am.oid = ix.relam
    LEFT JOIN pg_tablespace ts ON ts.oid = ix.reltablespace
    CROSS JOIN params p
    WHERE (p.target_schema IS NULL OR n.nspname = p.target_schema)
      AND (p.target_table  IS NULL OR t.relname  = p.target_table)
),
usage AS (
    SELECT
        s.relid,
        s.indexrelid,
        s.idx_scan,
        s.last_idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch
    FROM pg_stat_user_indexes s
    JOIN params p ON (p.target_schema IS NULL OR s.schemaname = p.target_schema)
                 AND (p.target_table  IS NULL OR s.relname    = p.target_table)
),
io AS (
    SELECT
        io.indexrelid,
        io.idx_blks_read,
        io.idx_blks_hit,
        (io.idx_blks_read + io.idx_blks_hit) AS total_io,
        CASE WHEN (io.idx_blks_read + io.idx_blks_hit) > 0
             THEN ROUND(100.0 * io.idx_blks_hit / (io.idx_blks_read + io.idx_blks_hit), 4)
             ELSE 0 END AS cache_hit_pct,
        ROUND(COALESCE(io.idx_blks_read::numeric / NULLIF(u.idx_scan, 0), 0), 4) AS avg_blks_per_scan
    FROM pg_statio_user_indexes io
    JOIN usage u USING (indexrelid)
),

build AS (
    SELECT
        p.index_relid AS indexrelid,
        p.phase,
        ROUND(100.0 * p.blocks_done / NULLIF(p.blocks_total, 0), 2) AS build_pct
    FROM pg_stat_progress_create_index p
    JOIN idx i ON p.relid = i.relid
),
vac AS (
    SELECT
        v.relid,
        v.indexes_total,
        v.indexes_processed,
        ROUND(100.0 * v.indexes_processed / NULLIF(v.indexes_total, 0), 2) AS vac_idx_pct,
        v.phase AS vac_phase
    FROM pg_stat_progress_vacuum v
    JOIN idx i ON v.relid = i.relid AND v.phase LIKE 'vacuuming index%'
),

/* --------------------------------------------------------------
   6. Locks on indexes
   -------------------------------------------------------------- */
locks AS (
    SELECT
        l.objid AS indexrelid,
        COUNT(*) FILTER (WHERE NOT l.granted) AS waiting,
        array_agg(l.pid) FILTER (WHERE NOT l.granted) AS wait_pids
    FROM pg_locks l
    WHERE l.locktype = 'object'
      AND l.objid IN (SELECT indexrelid FROM idx)
    GROUP BY l.objid
)

SELECT
    i.relid,
    i.indexrelid,
    i.schemaname,
    i.relname,
    i.indexrelname,

    /* --- Your exact columns --- */
    COALESCE(u.idx_scan, 0)        AS idx_scan,
    u.last_idx_scan,
    COALESCE(u.idx_tup_read, 0)    AS idx_tup_read,
    COALESCE(u.idx_tup_fetch, 0)   AS idx_tup_fetch,

    /* --- I/O from pg_statio_user_indexes --- */
    COALESCE(io.idx_blks_read, 0)  AS idx_blks_read,
    COALESCE(io.idx_blks_hit, 0)   AS idx_blks_hit,
    io.cache_hit_pct || '%'        AS cache_hit_pct,
    io.avg_blks_per_scan           AS avg_blks_per_scan,

    /* --- Structure --- */
    i.access_method,
    i.is_primary,
    i.is_unique,
    i.is_valid,
    i.is_ready,
    i.is_clustered,
    i.nulls_not_distinct,
    i.has_predicate,
    i.key_columns,

    /* --- Size & Location --- */
    i.size_pretty,
    i.tablespace,

    /* --- Progress --- */
    COALESCE(b.build_pct::text, '-') AS build_progress_pct,
    COALESCE(b.phase, '-')           AS build_phase,
    COALESCE(v.vac_idx_pct::text, '-') AS vac_index_progress_pct,
    COALESCE(v.vac_phase, '-')       AS vac_phase,

    /* --- Locks --- */
    COALESCE(l.waiting, 0)           AS waiting_locks,
    COALESCE(l.wait_pids::text, '{}') AS waiting_pids,

    /* --- Full DDL --- */
    i.index_def

FROM idx i
LEFT JOIN usage u ON u.indexrelid = i.indexrelid
LEFT JOIN io ON io.indexrelid = i.indexrelid
LEFT JOIN build b ON b.indexrelid = i.indexrelid
LEFT JOIN vac v ON true
LEFT JOIN locks l ON l.indexrelid = i.indexrelid
ORDER BY i.size_bytes DESC NULLS LAST;
```
#### How to Interprete
|Section | Column | Good | Warning| Bad| Action|
|---|---|---|---|---|---|
|Index Usage| idx_scan| >1000| 1-1000| 0 | Drop it if 0 for weeks|
| | last_idx_scan| Recent | > 1 week | NULL| unused index|
| | idx_tup_fetch| High| low | 0 | no rows returned &rarr; Likely not helping|
|I/o and cache| cache_hit_pct| >95% | 80-90| <80% | Investigate: too big? random access? ```if this is less than 90, index is not in memory, it is performance killer```|
| | avg_blks_per_scan| <3 | 3-10| >10| index too deep or fragmented|
| | avg_blks_read| low| medium| very high| index doing full scans|

### Advanced physical level monitoring
* ```get_raw_page(<table>,<blockid>)```: Gives the actual page information in the table in physical level
* ```bt_page_items()```: It inspects the B-tree index pages. 