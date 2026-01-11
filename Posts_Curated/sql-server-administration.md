---
title: "SQL Server Administration: Complete Guide"
date: "2026-01-12"
category: "SQL Server Administration"
tags: []
excerpt: "A comprehensive, production-ready guide to sql server administration, covering fundamentals, best practices, troubleshooting, and real-world examples from enterprise environments."
author: "Anish Karki"
featured: true
---

# Oracle Autonomous Database Dedicated Infrastructure – Key Points

## Deployment Options
- **Serverless:**  
  - Fully automated infrastructure and database management (provisioning, tuning, backup, scaling).  
  - Scales instantly based on workload.  
- **Dedicated:**  
  - Private database cloud on dedicated Exadata infrastructure (public cloud or Cloud@Customer).  
  - Complete isolation from other tenants, customizable policies, software updates, and availability.  
  - Ideal for consolidating multiple databases and offering DBaaS within an enterprise.  

## Dedicated Infrastructure Features
- Requires **Exadata Cloud subscription** with dedicated compute, storage, memory, and network.  
- Supports **Autonomous VM Clusters (AVMC)** and **Autonomous Container Databases (ACD)** for workload isolation.  
- Network is via **VCN/subnet**, private by default (no public internet access).  
- Oracle manages **DB, hypervisor, OS, and hardware**; customer manages **data schemas and encryption keys**.  
- Supports **network services**: VCN peering, IPsec, VPN, FastConnect.  

## Cloud@Customer
- Brings Exadata and Autonomous Database behind **customer firewall** for strict data sovereignty.  
- High performance:  
  - Up to 45× higher SQL read IOPS  
  - 40× higher SQL throughput  
  - 98% lower SQL latency than AWS RDS Outposts  
- Control plane via **secure WebSocket tunnel** to Oracle Cloud; continuous monitoring and patching.  
- Exadata DB server connectivity: 10/25/100 Gbps, RDMA over Converged Ethernet internally.  
- Autonomous Database continues **normal operations even if control plane connectivity is lost**.  

## Security & Backup
- **Transparent Data Encryption (TDE):** Automatically encrypts/decrypts data for authorized users.  
- Backup options:  
  - On-premises  
  - Zero Data Loss Recovery Appliance  
  - Locally mounted NFS storage  
  - Oracle Public Cloud storage  

## Summary
- Dedicated infrastructure provides **high security, isolation, and control**, while still offering **automated scaling, backups, and Oracle management**.  
- Cloud@Customer combines **cloud automation and local data control**, ideal for regulatory, performance, or legacy integration requirements.

---
# Autonomous Database Dedicated – Workflow & Functionality

## Workflow
1. **Fleet Administrator:**  
   - Provisions Exadata infrastructure.  
   - Partitions system with Autonomous VM Clusters (AVMC) and Autonomous Container Databases (ACD).  
2. **Developers/DBAs:**  
   - Provision databases within container databases (self-service model).  
   - Optionally set up their own container databases.  

## Billing
- **Infrastructure cost:** Based on Exadata size, number of databases, storage.  
- **Database compute:** Cost based on active CPUs used by Autonomous Databases.  
- **Provisioning of AVMC/ACD:** No cost until databases are running.  

## Infrastructure & Shapes
- Supported Exadata shapes: **X9M, X10M, X11M**.  
- X10M/X11M offer **elastic shapes** for flexible resource allocation.  

## Getting Started
1. Request **service limit increase** for Exadata Rack.  
2. Create **fleet and DBA roles**.  
3. Set up **private cloud** with OCI compartments.  
4. Create **network model** and resources (AVMC, ACD).  
5. Provide **access to end users** for provisioning databases.  

## Features & Capabilities
- Minimum subscription: **48 hours**, no ongoing cost after termination.  
- Control over **patch scheduling** and **software versioning**.  
- Database migration via **export/import, Data Pump, or GoldenGate**.  
- **Auto-scaling** and **cloning** available.  
- **Dedicated vs Serverless:**  
  - Private, single-tenant infrastructure  
  - Workload separation (containers, VM clusters)  
  - Separate dev/test/prod environments  
  - Custom maintenance scheduling  
  - Multiple DB versions, sharding, in-memory support, synchronous/asynchronous replication, Active Data Guard  
  - Regular TCP connections (no wallet needed)  
  - Note: Oracle Machine Learning Notebooks only in serverless  

## Summary
Autonomous Database Dedicated provides **private, flexible, and highly customizable infrastructure** for enterprise workloads while still supporting **self-service provisioning, scaling, and cloning** for end users.

---
#  Provisioning Dedicated Resources

**Lesson Focus:** Setting up dedicated infrastructure and provisioning an Autonomous Database on Exadata.

---

## 1. Provisioning Exadata Infrastructure
1. Sign in to **Oracle Cloud (OCI)** as a **network or fleet administrator**.
2. Navigate to **Autonomous Database → Autonomous Exadata Infrastructure → Create**.
3. Configure:
   - **Display name** (meaningful)
   - **Availability domain**
   - **Shape**: Quarter Rack (92 OCPUs)
   - **Subnet selection**
   - **Maintenance schedule** (default or custom, e.g., quarterly)
   - **License type**
4. Infrastructure is provisioned in a few minutes.

---

## 2. Network Setup
1. Create a **VCN** in the fleet compartment (CIDR `10.0.0.0/16`) for subnets.
2. Add **security lists** for:
   - Exadata subnet
   - Application subnet
3. Two-tier setup:
   - Exadata subnet: hosts the database.
   - Application subnet: hosts VPN, app servers, bastion hosts, etc.
4. Optional **Internet access**:
   - Deploy **Internet Gateway**.
   - Configure **route tables** (`0.0.0.0/0` for public access if needed).

### Subnet Configuration
| Subnet | CIDR Block | Route Table | Notes |
|--------|------------|------------|-------|
| Exadata | 10.0.0.0/24 | Default | Database hosts only |
| Application | 10.0.1.0/24 | Custom (internet access) | App servers, bastion hosts |

---

## 3. Provisioning Autonomous Container Database (ACD)
1. Log in as **fleet administrator**.
2. Navigate to **Autonomous Transaction Processing → Autonomous Container Database → Create**.
3. Configure:
   - Compartment hosting Exadata
   - Apply **Release Update (RU)** if needed
   - **Maintenance schedule** (monthly/quarterly)
   - **Backup retention** (up to 60 days)
4. Click **Create Autonomous Container Database**.

---

## 4. Provisioning Autonomous Database on Dedicated Infrastructure
1. Log in as **database user**.
2. Navigate to **Autonomous Transaction Processing / Autonomous Data Warehouse → Create**.
3. Configure:
   - Database name
   - **Dedicated infrastructure**
   - Select **compartment** and **Autonomous Container Database**
4. Click **Create Autonomous Database**.

---

**Key Notes:**
- Two-tier network: Exadata (DB) + Application (compute/servers)
- Flexible **maintenance schedules** and **backup retention**
- Dedicated autonomous databases use **container databases (ACD)** for multitenancy
- Internet access and security lists must align with corporate policies

---
# Oracle University: Creating OCI Policies for Autonomous Dedicated

**Instructor:** Linda Foinding  
**Lesson Focus:** Managing roles, groups, and policies for Autonomous Dedicated Databases in OCI.

---

## 1. User Roles and Responsibilities

| Role | Responsibilities | Permissions |
|------|----------------|------------|
| **Fleet Administrator** | - Manage Exadata infrastructure, Autonomous VM (AVM) clusters, and Autonomous Container Databases (ACD) <br> - Allocate budgets by compartments <br> - Provision Exadata infrastructure, AVM, ACD | Oracle Cloud user with permissions to manage resources and networking required for provisioning |
| **Database Administrator (DBA)** | - Manage Autonomous Databases <br> - Create/manage Oracle Database users <br> - Provide access info to developers | Oracle Cloud user with permissions for Autonomous Database, backups, ACD, and networking |
| **Database Users / Developers** | - Write applications connecting to Autonomous Databases <br> - Access data via credentials from DBA | Do not require Oracle Cloud accounts; rely on network connectivity & credentials from DBA |

---

## 2. Life Cycle Management
- Can be performed via **OCI Console, CLI, REST APIs, SDKs** (Java, Node, Python, Go).  
- Operations include:
  - Create/delete/start/stop Exadata AVM and ACD  
  - Create/delete/start/stop Autonomous Databases  
  - Scale CPU, storage, or other resources  
  - Backup/restore to point-in-time or long-term backups  
  - Schedule updates for Exadata infrastructure, AVM, and ACD  
  - Monitor via OCI monitoring and logging services  

---

## 3. Policies in OCI
- Fine-grained control via **policies applied to groups**.  
- **Resources:** Exadata infrastructure, Autonomous VM clusters, Autonomous Container Databases, Autonomous Databases, backups, data archives.  
- **Policy Syntax:**  
```Allow group <GROUP> to <VERB> <RESOURCE> in compartment <COMPARTMENT>```

- **Verbs & Access Levels:**

| Verb | Description |
|------|------------|
| Inspect | Limited read-only; for auditors |
| Read | Read-only access to see details of resources |
| Use | Full actions on existing resources |
| Manage | Full access including create, delete, modify |

---

## 4. Sample Policy Structure
- **Groups:**
- **AcmeFA** → Fleet Administrators  
- **RoadrunnerDBA / CoyoteDBA** → Developers & DBAs  
- **Access Rules:**
- AcmeFA: Manage, create, delete, and use Exadata infrastructure, AVM clusters, ACD in FA compartment.  
- RoadrunnerDBA / CoyoteDBA: Read access to ACD in FA compartment; can create/manage Autonomous Databases in those ACDs.  

```ResourceNames: autonomous-databases, autonomus backups```

```Fleet Admin: cloud-exadata-infrastructure, cloud-autonomous-vmclusters, autonomous-container-databases```

**Key Takeaway:**  
- Fleet administrators control infrastructure and high-level resources.  
- DBAs and developers manage databases and applications within their compartments while respecting constraints set by Fleet Admins.
---
# Oracle University: Monitoring Dedicated Infrastructure

**Instructor:** Linda  

Autonomous Database automates many DBA tasks, but **application DBAs** still need to monitor and diagnose databases to ensure **performance** and **security**.

---

## Key Responsibilities of Application DBAs
- Perform operations on databases  
- Clone and move databases  
- Monitor performance and capacity  
- Create alerts  
- Perform low-level diagnostics for application performance  
- Identify trends in usage and capacity  

---

## Tools Available
- **Enterprise Manager**  
- **Performance Hub**  
- **OCI Console**  

---

## Autonomous Database Dedicated (ADB-D)
All operations are available via:
- **Console UI**  
- **REST API**  

### Supported Operations
- Provisioning  
- Start/stop lifecycle management  
- On-demand backups & restores  
- CPU scaling and storage management  
- Connectivity setup (wallets)  
- Scheduling updates  

---

## Deep-Dive Exploration Tools
- **Database Actions**  
- **Performance Hub**  
- **Enterprise Manager**  

---

## Additional Monitoring Resources
- Oracle Documentation for:  
  - **Resource usage tracking & visualization**  
  - **Database Management services**  
  - **Operations Insights**  
  - **Events & notifications monitoring**  

---

**Conclusion:**  
Application DBAs play a vital role in ensuring optimal performance and security by leveraging Oracle's monitoring tools and documentation.
---
# OCI Exam Notes: ADB-D Maintenance Scheduling

## Key Concepts
- **Autonomous Database Dedicated (ADB-D)** allows **custom patching schedules**.  
- Customers control:
  - **Quarter** → which month  
  - **Month** → which week  
  - **Week** → which day  
  - **Day** → which patching window  
- Schedule can be **changed dynamically** if needed.

## Best Practices
- Patch flow: **Dev → Staging → Production**.  
- Dev can run latest, Prod can lag behind (alternate quarters).  
- Different DBs (e.g., mission-critical) can have **unique schedules**.  

## Maintenance Options
- Independent scheduling for **infrastructure, cluster, and container DB**.  
- Options: **skip, reschedule, patch now**.  
- Transparent application continuity built-in.  

## Updates & Notifications
- Updates released **quarterly**.  
- Shown in **OCI Console** + **OCI Notifications**.  
- Fleet admins may run **different patch levels** across environments.  

## One-Off Patching
- Outside normal cycle.  
- Customer can **initiate patch now** or **reschedule**.  
- Events/notifications track schedule, reminders, start, and end.

---
**Exam Tip:** Remember that **ADB-D = customer-controlled scheduling**, unlike shared ADB where Oracle controls patching.  

---
1. Actions in ACD details page:
   * restart the CDB
   * chagne the backup retention policy for the CDB
   * move the CDB to a different compartment
2. Inputs for provisioning autonomous exadata infra resource
   * shape
   * VCN
   *  Availability domain
3. which three levels can you implement isolation with ADD-D?
   * VCN level
   * container level
   * database level 
---

