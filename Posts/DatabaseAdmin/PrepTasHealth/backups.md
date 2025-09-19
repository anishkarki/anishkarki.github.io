# Backups:
1. Full
2. Diff backups
3. Txn log backup
4. Tail-log backup
### Tricks:
1. Use local and transfer to network disk
2. Use compression CPU compression
3. Use maxbuffercount start from 4MB and Maxtransfersize start from
    * maxbuffercount
        * Controls the number of I/O buffers allocated to the backup operation.
        * Each buffer = MAXTRANSFERSIZE in size.
        * Large DB 50-100, small default
    * Maxtransfersize
        * Defines the largest chunk of data (in bytes) that SQL Server will write to the backup device in a single operation.
        * Default: 1 MB (1,048,576 bytes).
        * Allowed range: 64 KB (65536 bytes) → 4 MB (4194304 bytes).
4. Always verify and test restore
```sql
-- Full Backup (striped across four volumes)
BACKUP DATABASE MyDB
TO DISK = 'F:\Backups\MyDB_Full_1.bak',
   DISK = 'G:\Backups\MyDB_Full_2.bak',
   DISK = 'H:\Backups\MyDB_Full_3.bak',
   DISK = 'I:\Backups\MyDB_Full_4.bak'
WITH COMPRESSION, 
     BUFFERCOUNT = 160, 
     MAXTRANSFERSIZE = 4194304, 
     STATS = 5;

-- Differential Backup
BACKUP DATABASE MyDB
TO DISK = 'F:\Backups\MyDB_Diff_20250912.bak'
WITH DIFFERENTIAL, 
     COMPRESSION, 
     BUFFERCOUNT = 120, 
     MAXTRANSFERSIZE = 4194304, 
     STATS = 5;

-- Transaction Log Backup
BACKUP LOG MyDB
TO DISK = 'F:\Backups\MyDB_Log_20250912.trn'
WITH COMPRESSION, 
     BUFFERCOUNT = 100, 
     MAXTRANSFERSIZE = 4194304, 
     STATS = 5;

-- Tail-log backup:
BACKUP LOG MyDB
TO DISK = 'D:\Backups\MyDB_TailLog.trn'
WITH NO_TRUNCATE, NORECOVERY;
```
### Backup tuning — practical defaults for large DBs (5 TB+ on local NVMe, 128 GB RAM)

* MAXTRANSFERSIZE = 4194304 (4 MB)
* BUFFERCOUNT:
    * Full backups (striped across N files): BUFFERCOUNT = 120–200 (increase if memory available)
    * Differential: BUFFERCOUNT = 80–140
    * Log backups: BUFFERCOUNT = 32–80
    * Number of stripes: 4–8 (test to match your controller and CPUs)
```sql
-- Example full backup (4 stripes):
BACKUP DATABASE MyDB
TO DISK = 'F:\Backups\MyDB_Full_1.bak',
   DISK = 'G:\Backups\MyDB_Full_2.bak',
   DISK = 'H:\Backups\MyDB_Full_3.bak',
   DISK = 'I:\Backups\MyDB_Full_4.bak'
WITH COMPRESSION,
     BUFFERCOUNT = 160,
     MAXTRANSFERSIZE = 4194304,
     STATS = 5;
```

After backup to local NVMe, use robocopy/azcopy/parallel copy to transfer to remote NAS/object store, throttled during business hours.
