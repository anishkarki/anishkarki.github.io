---
title: "Azure SQL Database: Complete Guide"
date: "2026-01-12"
category: "Azure SQL Database"
tags: []
excerpt: "A comprehensive, production-ready guide to azure sql database, covering fundamentals, best practices, troubleshooting, and real-world examples from enterprise environments."
author: "Anish Karki"
featured: true
---

| Target Azure Service            | Migration Method                          | Type    | Description                                                                                   | Applicability (Azure SQL MI) | Applicability (Azure SQL DB) | Applicability (SQL Server on Azure VM) |
|--------------------------------|-------------------------------------------|---------|-----------------------------------------------------------------------------------------------|------------------------------|------------------------------|----------------------------------------|
| Azure SQL Managed Instance     | Managed Instance Link (Always On AG)      | Online  | Leverages Always On AG for near real-time replication with minimal downtime.                 | Yes                          | No                           | No                                     |
| Azure SQL Managed Instance     | Log Replay Service (LRS)                  | Online  | Continuously restores log backups from Azure Blob Storage for near-zero downtime.            | Yes                          | No                           | No                                     |
| Azure SQL Managed Instance     | Azure Database Migration Service (DMS)    | Online  | Fully managed service orchestrating backup/restore and log shipping for continuous sync.     | Yes                          | Limited                      | Yes                                    |
| Azure SQL Managed Instance     | Transactional Replication                 | Online  | Configures Managed Instance as a subscriber for continuous data synchronization.             | Yes                          | Yes                          | Yes                                    |
| Azure SQL Managed Instance     | Native Backup and Restore (.bak)         | Offline | Take full backup on-premises, upload to Azure Blob Storage, then restore to MI.              | Yes                          | No                           | Yes                                    |
| Azure SQL Managed Instance     | Azure Database Migration Service (DMS)    | Offline | DMS orchestrates backup/restore; source is offline during migration.                         | Yes                          | Yes                          | Yes                                    |
| Azure SQL Managed Instance     | BACPAC Import                             | Offline | Export schema and data to .bacpac, then import to MI. Best for smaller databases.            | Yes                          | Yes                          | No                                     |
| Azure SQL Database             | Transactional Replication                 | Online  | Configure Azure SQL DB as a subscriber for continuous data synchronization.                  | Yes                          | Yes                          | Yes                                    |
| Azure SQL Database             | Azure Database Migration Service (DMS)    | Online  | While DMS supports online, for Azure SQL DB it often means logical migration with downtime.  | Limited                      | Yes                          | Yes                                    |
| Azure SQL Database             | BACPAC Export/Import                      | Offline | Export schema and data to .bacpac, then import to Azure SQL DB. Best for smaller databases.  | Yes                          | Yes                          | No                                     |
| Azure SQL Database             | Generate Scripts (with data)             | Offline | Generate SQL scripts for schema and data, then execute on Azure SQL DB. For small databases. | No                           | Yes                          | No                                     |
| Azure SQL Database             | BCP (Bulk Copy Program)                   | Offline | Export data from tables using BCP, then import to Azure SQL DB. Requires manual schema.      | No                           | Yes                          | No                                     |
| Azure SQL Database             | Azure Data Factory (Initial Load)         | Offline | Create data pipelines for initial bulk data copy. Subsequent incremental loads can be online.| No                           | Yes                          | No                                     |
| SQL Server on Azure VM         | Always On Availability Groups             | Online  | Extend on-premises Always On AG to include an Azure VM replica, then failover.               | No                           | No                           | Yes                                    |
| SQL Server on Azure VM         | Transactional Replication                 | Online  | Configure Azure VM as a subscriber for continuous data synchronization.                      | Yes                          | Yes                          | Yes                                    |
| SQL Server on Azure VM         | Log Shipping                              | Online  | Continuously back up transaction logs on-premises and restore to Azure VM.                   | No                           | No                           | Yes                                    |
| SQL Server on Azure VM         | Azure Database Migration Service (DMS)    | Online  | DMS orchestrates backup/restore with log shipping for continuous sync to Azure VM.           | Yes                          | Limited                      | Yes                                    |
| SQL Server on Azure VM         | Native Backup and Restore (.bak)         | Offline | Standard SQL Server backup/restore to/from Azure VM.                                         | Yes                          | No                           | Yes                                    |
| SQL Server on Azure VM         | Detach and Attach Database Files          | Offline | Copy .mdf/.ldf files to Azure Blob Storage, then attach to SQL Server on Azure VM.           | No                           | No                           | Yes                                    |
| SQL Server on Azure VM         | Azure Migrate (VM Lift-and-Shift)         | Offline | Migrates the entire on-premises server (OS, SQL Server, apps) as an Azure VM.                | No                           | No                           | Yes                                    |
| SQL Server on Azure VM         | Azure Database Migration Service (DMS)    | Offline | DMS orchestrates backup/restore for offline migration to Azure VM.                           | Yes                          | Yes                          | Yes                                    |
| SQL Server on Azure VM         | Data Box Family                           | Offline | Physically ship large datasets to Azure, then restore to SQL VM using native methods.        | No                           | No                           | Yes                                    |

---
| Migration Method                            | Type     | Description                                                                                   | Azure SQL MI | Azure SQL DB | SQL Server on Azure VM |
|---------------------------------------------|----------|-----------------------------------------------------------------------------------------------|--------------|---------------|-------------------------|
| **Always On AG / MI Link**                  | Online   | High-availability replication with minimal downtime.                                          | ✅            | ❌             | ✅ (AG only)            |
| **Log-based (LRS / Log Shipping)**          | Online   | Continuous restore of transaction logs for near-zero downtime.                               | ✅ (LRS)      | ❌             | ✅ (Log Shipping)       |
| **Transactional Replication**               | Online   | Continuous data sync by configuring as a subscriber.                                          | ✅            | ✅             | ✅                      |
| **Azure DMS (Online)**                      | Online   | Uses backup/restore + log shipping or logical sync.                                           | ✅            | ⚠️ (Logical)   | ✅                      |
| **Azure DMS (Offline)**                     | Offline  | Orchestrates full backup/restore, requires downtime.                                          | ✅            | ✅             | ✅                      |
| **Native Backup/Restore (.bak)**            | Offline  | Backup DB locally, upload to Blob, and restore.                                               | ✅            | ❌             | ✅                      |
| **BACPAC Import/Export**                    | Offline  | Export schema + data, best for small DBs.                                                     | ✅            | ✅             | ❌                      |
| **Generate Scripts / BCP**                  | Offline  | Manual scripting or data export/import, best for very small DBs.                             | ❌            | ✅             | ❌                      |
| **Azure Data Factory (Bulk Load)**          | Offline  | Data pipeline for initial load; can be combined with incremental sync.                        | ❌            | ✅             | ❌                      |
| **Attach MDF / Azure Migrate / Data Box**   | Offline  | File-based or VM lift-and-shift methods.                                                      | ❌            | ❌             | ✅                      |

