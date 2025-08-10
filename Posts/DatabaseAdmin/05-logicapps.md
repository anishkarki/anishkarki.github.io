# Automate with logic apps
* integrates app, data, service and systems. 

Here are some example tasks, business processes, and workloads you can automate using Azure Logic Apps:
* Schedule and send email notifications using Office 365 when specific events occur, such as a new file upload.
* Route and process customer orders across on-premises systems and cloud services.
* Move uploaded files from an SFTP or FTP server to Azure Storage.
* Monitor tweets, analyze sentiment, and create alerts or tasks for items that need review.
---
## Why use azure logic apps?
* ms managed API connectors and built-in operations, making it easier and quicker to connect and integrate apps, data, services, and systems. 
* sql server connector is available in multitenant azure logic apps:managed connecter, integration service environment (ISE), and single-tenant azure logic apps (other: managed connector and built-in connector).
    * built-in has no triggers
    * the built in sql server connectro has only one operation: execute query.
* add trigger and action: get-row/delete-row/execute query.
    * trigger: when an item is created/when modified.
    * This action returns only one row from the selected table, and nothing else.
---
* For example, to view the data in this row, you can add other actions that create a file that includes the fields from the returned row, and then send email alerts. To learn about other available actions for this connector, see the connector's reference page.
* This action returns only one row from the selected table, and nothing else.

