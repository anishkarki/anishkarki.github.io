---
title: "SQL Server Automation: Complete Guide"
date: "2026-01-12"
category: "SQL Server Automation"
tags: []
excerpt: "A comprehensive, production-ready guide to sql server automation, covering fundamentals, best practices, troubleshooting, and real-world examples from enterprise environments."
author: "Anish Karki"
featured: true
---

## IaaC: Provision the cloud infrastructure with code.

### ARM Templates
* Complete set of resoruce using single deployment template.
* Declarative methods.
* Extensibility, allowing you to run powershell or bash scripts on your resources post-deployment.

### Powershell and Azure CLI (imperative model): follows the sequence of tasks to be executed.
* With AZ module, provides commandlet
* Az.Compute: Azure VMs
* can deploy ARM templates.

### AZURE CLI
* Deploy or modify azure resources, some commands are for azure postgresql and azure mysql databases are only CLI.

### Azure Portal:
* UI for ARM.
* Export template in the automation section

### Azure Devops services
* Azure Pipelines (build, test, deploy) 
* Deploy by powershell or by defining tasks that stage your artifacts and then deploy templates.
* CI focus on small frequent changes to code and check VCS and CD focus automating the delivery of code change to underlying infrastrucrure

# Automate Deployment using Azure Resource Manager Template and Bicep
* ARM template are JSON documents that describe the resource to deploy within an Azure Resource Group.
* Declarative
* Orchestration: interdependent resources.
## Benefits:
* Repeatable
* Orchestration
* modular
* exportable code
* Authoring tools
## Deploy with powershell
### Template:
1. $Schema
2. contentVersion
3. parameters
4. resources.
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2021-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "serverName": {
      "type": "string"
    },
    "sqlDBName": {
      "type": "string"
    },
    "location": {
      "type": "string"
    },
    "administratorLogin": {
      "type": "string"
    },
    "administratorLoginPassword": {
      "type": "secureString"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Sql/servers",
      "apiVersion": "2022-02-01",
      "name": "[parameters('serverName')]",
      "location": "[parameters('location')]",
      "properties": {
        "administratorLogin": "[parameters('administratorLogin')]",
        "administratorLoginPassword": "[parameters('administratorLoginPassword')]"
      }
    },
    {
      "type": "Microsoft.Sql/servers/databases",
      "apiVersion": "2022-02-01",
      "name": "[format('{0}/{1}', parameters('serverName'), parameters('sqlDBName'))]",
      "location": "[parameters('location')]",
      "dependsOn": [
        "[resourceId('Microsoft.Sql/servers', parameters('serverName'))]"
      ]
    }
  ]
}
```
#### Deploy with powershell
```ps1
$projectName = Read-Host -Prompt "Enter the project"
$location = Read-Host -Prompt "enter location"
$adminUser = Read-Host -Prompt "Enter the SQL server administrator username"
$adminPassword = Read-Host -Prompt "Enter the SQL server administrator password" -AsSecureString

$resourceGroupName = "${projectName}rg"

# Create a new resource group
New-AzResourceGroup -Name $resourceGroupName -Location $location

# Deploy resources using an ARM template
New-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateUri "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.sql/sql-database/azuredeploy.json" -administratorLogin $adminUser -administratorLoginPassword $adminPassword
```

## Bicep is new delclerative language for deployeing azure resources. IaC tools.
### Benefits:
1. Continuous full support
2. Simple syntax
3. Easy to use.

```bicep
param location string = resourceGroup().location
param storageAccountName string = 'toylaunch${uniqueString(resourceGroup().id)}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}
```
### Azure free tire deployment with bicep
```
@description('Name of the SQL Server')
param serverName string

@description('SQL administrator username')
param administratorLogin string

@secure()
@description('SQL administrator password')
param administratorPassword string

@description('SQL Database name')
param databaseName string = 'SampleDB'

@description('Location for all resources')
param location string = resourceGroup().location

resource sqlServer 'Microsoft.Sql/servers@2022-02-01' = {
  name: serverName
  location: location
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2022-02-01' = {
  name: '${serverName}/${databaseName}'
  location: location
  sku: {
    name: 'Basic'      // Basic = 5 DTUs, 2 GB
    tier: 'Basic'
    capacity: 5
  }
  dependsOn: [
    sqlServer
  ]
}
```
```ps1
New-AzResourceGroup -Name exampleRG -Location eastus
New-AzResourceGroupDeployment -ResourceGroupName exampleRG -TemplateFile ./main.bicep -administratorLogin "<admin-login>"
```
### Main sections
1. param: param location string = resourceGroup().location
2. var: var fullDbName = '${serverName}-${databaseName}'
3. resource: resource sqlDb 'Microsoft.Sql/serers/database@2022-02-01' = {...}
4. Module: reuse logic by referencing other bicep files Module vnetModule './vnet.bicep' = {...}
4. output: output sqlServerName string = sqlServer.name
5. targetScope: define scope of deployement targetScope = 'resourceGroup'
## Source control for templates
1. use the deploy to azure in github pages for sql database templates, the tempate load and fill in few details like resource group, location and admin credential.


# Automate deployment by using powershell
* supports both text and .NET objects
* Az.Sql powershell module part of Az powershell module
* from creating database to configuring geo-replciation and full azure sql amangement
* Az.Sql PowerShell module in various environments, including PowerShellGet, Azure Cloud Shell, and an Az PowerShell Docker container
* the verb-noun structure.
    * <command-name> -<Required Parameter Name> <Required param value> [-<Optional paramer name> <operational param value>]
    * Create resource group: ```Get-AzSqlServer -ResourceGroupName "ResourceGroup01" -ServerName "Server01"```
    * create amanaged instance: ```New-AzSqlInstance -Name managedInstance2 -ResourceGroupName ResourceGroup01 -Location westcentralus -AdministratorCredential (Get-Credential) -SubnetId "/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/resourceGroups/resourcegroup01/providers/Microsoft.Network/virtualNetworks/vnet_name/subnets/subnet_name" -LicenseType LicenseIncluded -StorageSizeInGB 1024 -VCore 16 -Edition "GeneralPurpose" -ComputeGeneration Gen4```
    * ```New-AzSqlDatabase -ResourceGroupName "ResourceGroup01" -ServerName "Server01" -DatabaseName "Database01"```

```ps1
New-AzSqlInstance -Name managedInstance2 -ResourceGroupName ResourceGroup01 -ExternalAdminName DummyLogin -EnableActiveDirectoryOnlyAuthentication -Location westcentralus -SubnetId "/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/resourceGroups/resourcegroup01/providers/Microsoft.Network/virtualNetworks/vnet_name/subnets/subnet_name" -LicenseType LicenseIncluded -StorageSizeInGB 1024 -VCore 16 -Edition "GeneralPurpose" -ComputeGeneration Gen4

$val = Get-AzSqlInstance -Name managedInstance2 -ResourceGroupName ResourceGroup01 -ExpandActiveDirectoryAdministrator
```

# deploy with Azure CLI
```az account set --subscription "my subscription name"```


|Command| Azure CLI|Azure PowerShell|
|---|---|---|
Sign in with Web Browser|	az login|	Connect-AzAccount
Get available subscriptions|	az account list	|Get-AzSubscription
Set Subscription|	az account set –subscription|	Set-AzContext -Subscription
List all virtual machines	|az vm list	|Get-AzVM
Create a new SQL server	|az sql server create	|New-AzSqlServer

```Invoke-Sqlcmd```: to invoke the command

```
let "randomIdentifier=$RANDOM*$RANDOM"

$resourceGroup = "<your resource group>"
$location = "<your location preference>"
$server = "dp300-sql-server-$randomIdentifier"
$login = "sqladmin"
$password = "Pa$$w0rD-$randomIdentifier"

az sql server create --name $server --resource-group $resourceGroup --location "$location" --admin-user $login --admin-password $password

az sql server firewall-rule create --resource-group $resourceGroup --server $server -n AllowYourIp --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
```

## Deploy ARM template with azure CLI and powershell
```ps1
New-AzResourceGroupDeployment -Name ExampleDeployment -ResourceGroupName ExampleResourceGroup -TemplateFile c:\MyTemplates\azuredeploy.json -TemplateParameterFile c:\MyTemplates\storage.parameters.json
```

```bash
az deployment group create --resource-group ExampleResourceGroup --template-file '\path\template.json'
```

* Currently, Azure CLI doesn't support deploying remote Bicep files directly. Instead, you can use the Bicep CLI to convert the Bicep file into a JSON template, and then deploy the JSON template from a remote location.


