# SQL Server Data tools (SSDT)
* Visual studio
* Used to develop a package of tasks and define how they connect

## Insallation Step
* Installed as a shared component of SQL Server
* Runs in the background
* Stores packages and connections to data sources
---
* Use serperate server for ETL and SSIS. (Developer)
---
* Running Packages
* Stored packages
    * File System
        * subfoler: ```/Micorsoft SQL server  / 150 / DTS/ Packages```
    * MSDB
        * Data collector
        * maintenance plans
---
* Integration service is added to the SQL server instance as a shared resource.
---
### Solution Explorer
* Main File: Package.dtsx
* Solutions: containers that holds server business application together
    * can add project to the solution
    * Make sure the packge version is compatible with sql server version.

### Design surface
* Control Flow: Drag and drop from tool box.d
---
### Add tasks in control flow
### Precedence Contraints
    * Precedence executable
    * Constraints executable
* Evaluation operations: Contraint, expression, expression and constraint, expression or constraint
### Sequence Container
---
### Control Flow Task
1. Data flow task
2. Data preperation Tasks
3. Workflow tasks: communicate with other processes to run packages or programs. Send email messages, read WMI data, and watch for WMI events.
4. SQL server tasks
5. Scripting Tasks
6. Analysis services tasks: create modify, delete and process analysis services objects
7. Maintanence Tasks: administrative like backup, indexes
8. Custom Tasks: C# and visual basic

#### Data flow task


### Tranformation
1. BI transformation
    * cleaning
    * fuzzy matching
2. Row Transformation
3. Rowset transformatins
4. Split and join
5. Audit tranformations
---
1. Data flow container
2. Sequence container
3. Loop container
---

