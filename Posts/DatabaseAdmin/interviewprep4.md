# All Scenario Based [Interview Prep]
### 1. A critical production database is performing slowly during clinical hours. How do you diagnose and fix it without disrupting services?
* Its clinical hour so you can't disrupt the database or service.

|Steps|SQL SERVER| POSTGRES|
|--|--|--|
Verification: Identify the expensive query current and historical |```sys.dm_exec_requests, sys.dm_exec_sessions, sys.dm_exec_sql_text(sql_handle), dm_exec_query_plan(plan_handle)```|```pg_stat_acitivity, pg_stat_statements, pg_stat_user_tables (heavy scan tables)```
Diagnosis | check for the index fragmentation, wait-time, plan history if the query store is enabled, missing indexes, analyse the query plans | Check for fragmentation, wait-time, plan history, analyze the query plan. 
Short term fixes | kill the blocking or resource consuming query, use query hints like OPTION RECOMPILE, USE sp_create_plan_guide | kill blocking query pg_cancel_backend(), pg_terminate_backend(), set work_mem (careful), create index concurrently, analyze table.
Long Term | Offload reporting to replica monitor replciation lag or log shipping | check pg_is_in_recovery()
Long Term| analyze index and stats, optimize indexes (fragmentations), resource close monitor, bottleneck, Server configuration and application tuning. like maxdop or cost threshold memory | Adjust workload pattern, app interactions, match config, tune shared_buffers, work-Mem, WAL settings. pgBouncer, Copy for loads.

### 2. The ministry introduced new privacy compliance rules. How would you assess and enforce changes across all databases?
1. Check for data discovery and classifciation
2. TDE, column level encrypt, row-level encrypt
3. RBAC
4. Audic for all access and DDL changes.
5. Backup encrypt and rotate keys. 

---
* Perform data classification to identify sensative field. Use data discovery and classification feature in sql server or PostgreSQL Anonymizer, pgcrypto for column level encryption, pgaudit.
```SQL
EXEC sp_addextendedproperty
    @name = N'SensitivityClassification',
    @value = N'Restricted - PII (Contact info)',
    @level0type = N'SCHEMA', @level0name = N'Person',
    @level1type = N'TABLE',  @level1name = N'Person',
    @level2type = N'COLUMN', @level2name = N'AdditionalContactInfo';
GO
EXEC sp_addextendedproperty
    @name = N'SensitivityClassification',
    @value = N'Confidential - PCI (Credit Card)',
    @level0type = N'SCHEMA', @level0name = N'Sales',
    @level1type = N'TABLE',  @level1name = N'CreditCard',
    @level2type = N'COLUMN', @level2name = N'CardNumber';
GO

SELECT
    obj.name AS TableName,
    col.name AS ColumnName,
    ep.name AS ExtendedPropertyName,
    CAST(ep.value AS NVARCHAR(MAX)) AS ClassificationValue
FROM sys.extended_properties AS ep
JOIN sys.objects AS obj ON ep.major_id = obj.object_id
JOIN sys.columns AS col ON ep.major_id = col.object_id AND ep.minor_id = col.column_id
WHERE ep.name = 'SensitivityClassification' -- Or 'Sensitivity Labels' if using the built-in wizard
ORDER BY TableName, ColumnName;
```
* enforce transparent data encryption, column level encrypiton and row-level security as needed. 
#### Create the database encryption
1. create master key and certificate in the masterdb.
2. Create the backup certifcate 
3. create the user database encryption key in user db with server certificate
4. Alter db set encryption on. 
    * Create a master key in master DB
    ```SQL
    USE master;
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'YourVeryStrongPasswordForMasterKey!';
    GO
    ```
    * Create a certificate in master db
    ```SQL
    USE master;
    CREATE CERTIFICATE TDE_AW_Cert
    WITH SUBJECT = 'TDE Certificate for AdventureWorks2019';
    GO
    ```
    * Create a backup certificate:
    ```SQL
    BACKUP CERTIFICATE TDE_AW_Cert
    TO FILE = '/tmp/TDE_AW_Cert.cer' -- Adjust path
    WITH PRIVATE KEY (FILE = '/tmp/TDE_AW_Cert.pvk', -- Adjust path
    ENCRYPTION BY PASSWORD = 'AnotherStrongPassword!');
    GO
    ```
    * Create the database encrytion:
    ```SQL
    USE AdventureWorks2022OLTP;
    CREATE DATABASE ENCRYPTION KEY
    WITH ALGORITHM = AES_256
    ENCRYPTION BY SERVER CERTIFICATE TDE_AW_Cert;
    GO

    ALTER DATABASE AdventureWorks2022OLTP SET ENCRYPTION ON;
    GO
    ```
#### Column level encryption
> * Use the SSMS always encrypted wizard and choose the master key configuration select between the deterministic and randomized option. and generate powershell or finish.
> * User with unmask permission can ssee the data

#### Row level encrypt
* Ceate the reqired roles and grants
* Create the schema security. 
* Create security predicate function.
```SQL
CREATE SCHEMA Security;
GO

CREATE FUNCTION Security.fn_SalesPersonRLS(@SalesPersonID INT)
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS accessResult
    WHERE @SalesPersonID = CAST(SESSION_CONTEXT(N'current_sales_person_id') AS INT)
       OR IS_MEMBER('db_owner') = 1; -- db_owner can see all
GO
``` 
* Create security policy
```SQL
CREATE SECURITY POLICY SalesOrderHeaderFilter
ADD FILTER PREDICATE Security.fn_SalesPersonRLS(SalesPersonID)
ON Sales.SalesOrderHeader
WITH (STATE = ON);
GO
```
* Test RLS

---
* Data masking.
* RBAC across roles and enable auditing for all access and DDL changes.
* rotate key securely. 

#### Audit (server and db): tacks who accessed what data and any schema modifications.
```SQL
USE master;
CREATE SERVER AUDIT AW_Server_Audit
TO FILE (FILEPATH = 'C:\SQLAuditLogs\AdventureWorks\', -- Ensure this path exists and SQL Server service account has write permissions
          MAX_SIZE = 100 MB,
          MAX_ROLLOVER_FILES = 10,
          RESERVE_DISK_SPACE = OFF)
WITH (QUEUE_DELAY = 1000, ON_FAILURE = CONTINUE); -- Continue if audit fails
ALTER SERVER AUDIT AW_Server_Audit WITH (STATE = ON);
GO

-- For Select insert update delete: 
USE AdventureWorks2019;
CREATE DATABASE AUDIT SPECIFICATION AW_DataAccess_Audit
FOR SERVER AUDIT AW_Server_Audit
ADD (SELECT ON OBJECT::Person.Person BY public), -- Audit all select on Person table
ADD (SELECT ON OBJECT::Sales.CreditCard BY public), -- Audit all select on CreditCard
ADD (UPDATE ON OBJECT::HumanResources.Employee BY public), -- Audit updates to Employee
ADD (DELETE ON OBJECT::Sales.SalesOrderHeader BY public) -- Audit deletes from SalesOrderHeader
WITH (STATE = ON);
GO

-- Using fn_get_audit_file to view logs
SELECT *
FROM sys.fn_get_audit_file('C:\SQLAuditLogs\AdventureWorks\*.sqlaudit',DEFAULT,DEFAULT);
```
#### Encypted backups
```SQL
BACKUP DATABASE AdventureWorks2019
TO DISK = 'C:\SQLBackups\AdventureWorks2019_Encrypted_Full_$(ESCAPE_SQUOTE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(20), GETDATE(), 120), '-', ''), ' ', '_'), ':', ''))).bak'
WITH FORMAT, -- Overwrite previous backups (use NOINIT for appending)
     INIT,   -- Initialize new media set
     STATS = 10,
     COMPRESSION, -- Recommended for backup size
     ENCRYPTION (ALGORITHM = AES_256, SERVER CERTIFICATE TDE_AW_Cert); -- Use the TDE certificate
GO
```

## 3 Dropped the table in the dev env?
* Recover from the latest full or snapshot backup
* lock down DDL permission to only authorized roles.
* intergrate schema changes in CI/CD deployment process.
* DDL autdit to log modification
* Notify team, dev and dba.

## 4 Upgrade to information relies on changes to database schema. 
* Apply backward compatible schema change such as addming nullable columns, not renaming or dropping objects. 
* Use pre-scripted deployment validated in staging or test environement.
* Consider shadow tables, views or versioned schema for larger changes. 

## 5. Regional Health database with limited WAN connection.
* Always on AG for SQL server or streaming replication for postgresql within each region. 
* Use async replication to the central DR site.
* Appropriate quorum with witness server to prevent split-brain. 

