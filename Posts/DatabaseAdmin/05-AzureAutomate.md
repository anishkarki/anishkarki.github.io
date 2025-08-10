# Understanding the Azure Automation with Runbook
* automation
* configuration management activities
* main components
    * runbook
    * modules
    * credentials
    * schedules
---
## Runbook automation tutorial

## Azure Policy:
* scope upto subscription
* GPO (group policy) has been used to manage security and ensure consitency. Enforce password complexity and mapping shared network drives.
* Azure policy: enforcing region limitations, naming standards, and resource sizes. Management groups, subscriptions or resource groups. 
* for resource taggin, which store metadata. all the resource to have tags for env and cost center

## azure subscriptions and tags.
* budget management, security or resource isolation.
* Stored as key:value pairs, tags appear in the Azure portal alongside your resources. 

```ps1
$tags = @{"Dept"="Finance"; "Status"="Normal"}

$resource = Get-AzResource -Name demoStorage -ResourceGroup demoGroup

New-AzTag -ResourceId $resource.id -Tag $tags
```

# Create the automation runbook
## Create one automation account
* import required modules into your azure automation account
* navigate to the shared resoruce section select modules
* import the az.accounts module as the az.sql module depend on it
* Optional: create credential for your runbook to use. (credentials in the shared resource section of the main blade of your automation account.)
## Create a runbook
* on the process automation section of your automation account, select runbooks to create a runbook.
  * name, type of runbook, runtime version, description. (type: powershell)
* in the editor give powershell code
```ps1
# Uses the system-managed identity to log in to Azure
try {
    Write-Output "Logging in to Azure..."
    Connect-AzAccount -Identity
} catch {
    Write-Error -Message $_.Exception
    throw $_.Exception
}

# Get SQL Database name
$dbname = (Get-AzSQLDatabase -ResourceGroupName 'SQLDB' -ServerName 'GSData' -DatabaseName 'GSData').DatabaseName

# Set SQL Server name
$AzureSQLServerName = $dbname + ".database.windows.net"

# Get SQL credentials
$Cred = Get-AutomationPSCredential -Name "SQLUser"

# Execute SQL query
$SQLOutput = $(Invoke-Sqlcmd -ServerInstance $AzureSQLServerName -Username $Cred.UserName -Password $Cred.GetNetworkCredential().Password -Database $dbname -Query "SELECT * FROM INFORMATION_SCHEMA.TABLES" -Verbose) 4>&1

Write-Output $SQLOutput
```

