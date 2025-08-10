## monitor runbooks: IN automation account
    * db stroage account/shared file to monitor.
    * check last action before new.
* select the jobs in process automation
## Alerts
    * goto alerts in autmation account and create alert rules/select a signal slide out(total job/all administrative runs). 
    * configure signal logic slide-out, static and threshold.
    * set the opeartor property to greater than, the aggregation to total 10.
    * action  group: collection of actions that you can do: email, runbook, webhooks and more.

## Activity log.
    * azure automation, runbook exected and details in activity log.
    * as alternative you can do powershell command.  
    
```ps1
$JobActivityLogs = (Get-AzLog @params).Where( { $_.Authorization.Action -eq 'Microsoft.Automation/automationAccounts/jobs/write' })
Get-AzAutomationJob @jobParams | Where-Object RunbookName -EQ $runbookName
```
---
## Log Analytics
* select logs from monitoring section of automation account.
* azure automation sends to log analytics workspace.
* Azure Monitor logs integrated with Automation account, enables you to:
    * View the status of your Automation jobs
    * Write advanced queries across your job workflow
    * Trigger an email or alert based on your runbook job status
    * Correlate data from multiple Automation jobs
* KQL to list all  completed jobs in the automation account.
* Before you start using Log Analytics to query Automation jobs data, you must configure Diagnostic settings for your Automation Account.

## Monitor elastic jobs
1. Azure portal: history in overview in elastic job agent db.
2. powershell : ```get-azsqlelasticjobexection```
3. tsql: ```jobs.job_exections```
