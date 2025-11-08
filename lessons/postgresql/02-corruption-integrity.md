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
