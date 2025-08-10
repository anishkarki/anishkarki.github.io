# Server Agents
1. Database and transaction log backups
2. Database consistency checks
3. Index maintenance
4. Statistics updates

* The backups doesn't detect corrupution in the database.


## Proxy account for the backups to a file share
* an acoount with stored credentials that the SQL server agent can use to execute job steps. granual security rights.

## Job schedules
* agent jobs and schedules have a many-to-many relationship

* don't shrink database: cause fragmentation.

## Multiserver environment:
* One server as a master that can execute jobs on other servers. 


# Notification
1. Opeartors: alias for individual
2. Notifications: Inform an operator
3. Alerts: assigned to an operator for either a notification or a defined error condition
---
* Enable sql server agent's email profile
* Create an operator who receives the mail
* In the notification of the job set the opeator.
* Can create individual alerts for specific error number.
---
* Do for everything above 16.
* add alerts for specific critical storage errors or Availability Group failovers.

**Types:**
* sql server event alerts,
* sql server performance condition
* windows management instrumentation (WMI) events.
* &rarr; either notify the operator or execute another job for the fix.
---
* For example, you could create an alert for SQL Server storage error conditions (errors 823, 824, 825) and execute a job to perform a database consistency check. Notifications for these alerts use the same SQL Server Agent subsystem.
* Check for object, counter, instance, alert if counter value. \
&rarr; Rebuilding an index updates the statistics on the index not reorganize.
---
# Azure Automation on PaaS
* azure db MI has the agent jon
* azure sql database: azure automation, logic apps, and elastic jobs

## Elastic Jobs
* limit to executing T-SQL.
* To configure
    * needs a job agent
    * S1 or higher for job database
* components
    * Elastic job agent
    * job database
    * target group
    * job
* if tje sa,e server os target. meed credemtoa; wotjom the master database of the server or pool, job agent enumerate the dbs. If single db, a db credential is needed. least privileges
---
For azure cli
* New-AzSqlelasticjobtargetgroup
* ```add-azsqlelasticjobtarget```
* ```new-azsqlelasticjob``` -Name $jobname -runonce
* $sqltext1 = "select 8 from sys.tables where object_id = object_id("my_table")
* ```Add-azsqlelasticjobstep```
* ```start-azsqlelasticjob```

```ps1
# create MyServerGroup target group
$serverGroup = $jobAgent | New-AzSqlElasticJobTargetGroup -Name 'MyServerGroup'
$serverGroup | Add-AzSqlElasticJobTarget -ServerName $targetServerName -RefreshCredentialName $masterCred.CredentialName
Write-Output "Creating a new job..."
$jobName = "MyFirstElasticJob"
$job = $jobAgent | New-AzSqlElasticJob -Name $jobName -RunOnce

Write-Output "Creating job steps for $($jobName) job..."
$sqlText1 = "IF NOT EXISTS (SELECT * FROM sys.tables WHERE object_id = object_id('MyTable')) CREATE TABLE [dbo].[MyTable]([Id] [int] NOT NULL);"

$job | Add-AzSqlElasticJobStep -Name "Step1" -TargetGroupName $serverGroup.TargetGroupName -CredentialName $jobCred.CredentialName -CommandText $sqlText1
Write-Output "Start the job..."
$jobExecution = $job | Start-AzSqlElasticJob
$jobExecution
```
**Uses**
* Automate management tasks to run on a specific schedule.
* Deploy schema changes seamlessly.
* Move data efficiently.
* Collect and aggregate data for reporting or other purposes.
* Load data from Azure Blob storage.
* Configure jobs to execute across multiple databases on a recurring basis, such as during off-peak hours.
* Process data across numerous databases, such as telemetry collection, and compile results into a single destination table for further analysis.

