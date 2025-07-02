# Backups [SQL Server]
## Backup encryption
* use the certificate or asymmetric keys to protect data
```SQL
Backup database mydb to disk = '<filepath>'
with encryption (
    algorithm = AES_256,
    SERVER CERTIFICATE = MyBackupCert
)
```
## Backup Compression
Use with compression

## Copy_only backup: don't affect the sequence of backups

## Partial Backups: Backup only the specific filegroups for faster backup and recovery
```SQL
BACKUP DATABASE myDB read_write_filegroups to disk = '<Path>';
```
## Striped Backups
* split the backup across multiple files for faster I/O and parallelism.
```SQL
BACKUP Database myDB to disk='<filepath>', disk = '<filepath>';
```
## Backup to URL (Azure Blob storage)
```SQL
Backup database mydb to URL = <> with credential = '';
```

## CHECKSUM AND VERIFYONLY
```SQL
BACKUP database myDB to disk='' with checksum;

-- Restore
restore verifyonly from disk='';
```
## Tail-log backup
```SQL
Backup log mydb to disk = <> with norecovery;
```
## Differential Backups
```SQL
backup database mydb to disk = '<>' with differential;
```
## Smart Recovery Planning (STOPAT, STOPBEFOREMARK)
```SQL
RESTORE log mydb
from disk=''
with stopat='';
```
## Parallel backup is only possible with multiple disk striped backups using multiple I/O in different disk
```SQL
BACKUP DATABASE MyDB
TO 
  DISK = 'E:\Backup\MyDB_1.bak',
  DISK = 'F:\Backup\MyDB_2.bak',
  DISK = 'G:\Backup\MyDB_3.bak'
WITH COMPRESSION, CHECKSUM;
```

## LASTLY Monitoring:
```SQL
SELECT TOP 5 * from msdb.dbo.backupset order by backup_finish_date desc;

SELECT * 
FROM sys.dm_io_virtual_file_stats(NULL, NULL);

SELECT * 
FROM sys.dm_exec_requests 
WHERE command LIKE 'BACKUP%';
```
