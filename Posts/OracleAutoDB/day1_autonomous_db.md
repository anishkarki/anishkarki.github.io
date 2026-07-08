# Oracle Autonomous Database (ADB) — Quick Reference Notes  
---

## Overview & Value Proposition

- **Revolutionizes data management** — eliminates full-stack administration burden.
- Lets you **focus on innovation, app development, and business logic**.
- Oracle **fully manages infrastructure, maintenance, security, and tuning**.
- **99.95% availability SLA** — backed by 20+ years of automation maturity (since Oracle 9i → 21c → 23ai).
- Built on **Oracle Engineered Systems** — preconfigured, retested, optimized platform.

---

## ADB is a Family of Services  
*Same core Autonomous Database, optimized per workload*

### 1. **Autonomous Data Warehouse (ADW)**
- Optimized for **analytics**: data warehouses, data marts, data lakes.
- **Columnar storage** by default → best for analytical queries.
- Uses **storage indexes, result cache, auto-parallelization** for fast analytics.
- Memory used for **large joins & aggregations (GROUP BYs)**.
- Stats gathered **during bulk loads**.

### 2. **Autonomous Transaction Processing (ATP)**
- Optimized for **OLTP & mixed workloads** — ideal for new app dev.
- **Row storage** by default → best for fast single-row lookups.
- Uses **indexes** for transaction speed.
- Memory used to **cache active dataset** → avoids I/O.
- Uses **RAC (Real Application Clusters)** for in-memory access across nodes.
- Stats gathered **periodically** (due to traditional INSERTs).
- **Auto-detects & creates missing indexes**.

> **Both share the same feature set**:  
> - Automated provisioning, patching, backups, scaling, security  
> - Exadata infrastructure → world-class performance & availability  
> - Native **JSON support** + **SODA APIs** + **SQL for JSON**  
> - **RESTful endpoints** for easy app integration  
> - **MongoDB API compatibility** → simplifies dev for MongoDB users

---

## Data Storage & Optimization Flexibility

- Default storage format (row/column) can be **overridden** per table → flexibility for hybrid use cases.
- **Optimizer statistics kept current automatically** → ensures optimal query plans.
- **SQL Plan Management** prevents performance regressions → plans only change if better.

---

## Deployment Options

### ➤ **ADB Serverless (ADP Serverless)**

- **Simple, elastic, pay-per-use**.
- Start small → scale big:  
  - **Compute**: 1 → 512+ ECPUs (auto-scaling)  
  - **Storage**:  
    - ADW: Start at 1 TB → 100s of TB  
    - ATP: Start at 20 GB → scale up  
- **Billing**: Pay only while running → can STOP and avoid CPU charges.
- **Auto-failover**, zero data loss, full security & protection.
- Ideal for: Dev/test, variable workloads, startups, cost-sensitive projects.

### ➤ **ADB Dedicated (ADP Dedicated)**

- **Private, isolated cloud within public cloud**.
- **Dedicated Exadata infrastructure** — full control over:  
  - Compute, memory, network, storage  
  - Provisioning schedules  
  - Software updates  
  - Server density & availability policies
- Physically separated from other tenants → **highest isolation & compliance**.
- Runs **any size/criticality database**.
- Ideal for: Enterprises, regulated industries, custom ops requirements.

---

## ✅ Key Takeaways

- ADB = **Self-driving, self-securing, self-repairing** database.
- Choose **ADW for analytics**, **ATP for transactions** — same engine, different optimizations.
- Deployment: **Serverless for agility & cost**, **Dedicated for control & isolation**.
- Oracle’s 20+ years of automation + Exadata = unmatched reliability & performance.
- Developer-friendly: JSON, REST, MongoDB API, SODA, SQL.

---

🔖 **Save this for quick reference when:**
- Choosing between ADW vs ATP
- Deciding Serverless vs Dedicated deployment
- Explaining ADB value to stakeholders
- Designing new apps or migrating workloads to Oracle Cloud

—
# 📌 Oracle Autonomous Database Licensing — Quick Reference Notes  
*Presented by Kamryn Vinson, Oracle University*

---

## 💡 What Are ECPUs?

- **ECPU** = **Elastic Compute Processing Unit** — Oracle’s abstract, performance-based compute metric for cloud.
- Not tied to physical cores or threads → **elastic allocation** from shared Exadata compute/storage pool.
- **Default compute model** for all new ADB instances (ADW & ATP).
- Decouples pricing from underlying hardware → avoids complexity during hardware refreshes.

---

## ✅ Benefits of ECPUs

- **Durable pricing metric** — unaffected by processor make/model/clock speed changes.
- **Finer granularity** for system sizing.
- **Auto-scaling support** (especially for ADW).
- **Reduced storage costs** for ADW when using ECPU model.

---

## ⚙️ Key Licensing & Pricing Details

### 🔹 Minimum Configuration
- **2 ECPUs minimum** for both ADW and ATP.
- Beyond 2 ECPUs → scale in **single-step increments** → maximum cost efficiency.

---

## 🧾 Licensing Models

### 1. **Pay-As-You-Go (Universal Credit Model - UCM)**
- Includes **all database options**.
- No need to own Oracle licenses.
- Pay only for what you use → **flexible, no upfront commitment**.
- Standard pricing → full feature access.

### 2. **Bring-Your-Own-License (BYOL)**
- For customers with **existing Oracle Database licenses**.
- **Reduces cost** — pay a fraction of UCM pricing.
- Edition selection depends on licenses brought → affects **maximum ECPU limit**.

---

## 📊 BYOL Edition Limits & Requirements

| Oracle Edition         | Max ECPUs (w/ or w/o Auto-Scaling) | Additional License Requirements for >64 ECPUs |
|------------------------|-------------------------------------|-----------------------------------------------|
| **Standard Edition**   | 32 ECPUs                            | N/A                                           |
| **Enterprise Edition** | Higher (depends on config)          | Requires **RAC licenses**                     |

> 💡 **To achieve 99.995% SLA under BYOL**, customer must have:
> - Oracle Enterprise Edition
> - Real Application Clusters (RAC)
> - Active Data Guard

---

## 💰 Universal Credit Pricing Structures

### 1. **Pay-As-You-Go (Consumption-Based)**
- Provision instantly → pay per unit of usage.
- Unit cost varies by service type.
- Includes required licenses (e.g., Oracle Database, options).

### 2. **Annual Universal Credits (Prepaid Model)**
- Like a **prepaid gift card** for OCI.
- **1-year minimum commitment**.
- Credits can be used across **any OCI IaaS/PaaS service**, in **any region**.
- **Volume discounts** available based on commitment size.
- No disruption to running services.

---

## 🔄 License Switching (Dynamic & Zero Downtime)

✅ You can **toggle between BYOL and License-Included (Pay-As-You-Go)** at any time:

**Steps to Switch (Console Example):**
1. Go to ADB instance → **More Actions** dropdown.
2. Select **“Update License and Oracle Database Edition”**.
3. Toggle radio button:  
   - **Enable License Included** → Subscribe to Enterprise Edition (Pay-As-You-Go).  
   - **Disable BYOL**.
4. Click **Save** → license type updates instantly → **no downtime**.

> 📌 License info disappears from console after switch — clean and seamless.

---

## ✅ Key Takeaways

- **ECPU** = flexible, hardware-agnostic, cost-efficient compute unit.
- Choose **UCM (Pay-As-You-Go)** for simplicity & full features.
- Choose **BYOL** to reduce cost — if you have existing licenses.
- **Edition matters**: Standard Edition caps at 32 ECPUs; Enterprise supports higher + RAC.
- **99.995% SLA under BYOL** requires EE + RAC + Active Data Guard.
- **Annual Credits** = prepaid flexibility + potential discounts.
- **Switch licenses on-the-fly** → zero downtime, no service interruption.

---

🔖 **Save this when:**
- Advising customers on cost vs. licensing trade-offs.
- Configuring ADB with BYOL vs UCM.
- Planning for high availability (99.995% SLA).
- Needing to switch license models dynamically.
---
# 📌 Oracle Cloud Infrastructure (OCI) — Quick Reference Overview  
*Presented by Kay Malcolm, VP of Product Management, Oracle University*

---

## 🌍 **OCI at a Glance**
- **Next-generation cloud platform** trusted by the world’s largest enterprises for **mission-critical workloads**.
- Built for **performance, security, scalability, and enterprise-grade reliability**.
- Offers **80+ services** across 7 core categories (and growing).
- **Industry-leading free tier** — including **Always Free** services and **$0.01/core/hour** compute pricing.

---

## 🧱 **7 Major Service Categories**

---

### 1. **Core Infrastructure**
The foundational building blocks:

#### 💻 Compute
- Virtual Machines (VMs)
- Bare Metal Servers
- Containers & **Managed Kubernetes (OKE)**
- **Managed VMware Service**

> *Use Case: Run apps, execute logic, host workloads*

#### 💾 Storage
- Block Volumes (disks for VMs)
- File Storage
- **Object Storage** + **Archive Storage**
- Data Migration Services

> *Use Case: Store & manage structured/unstructured data at scale*

#### 🌐 Networking
- Software-defined private networks (VCNs)
- **Broadest & deepest networking services** in cloud
- Highest reliability, security, and performance
- Built-in DDoS protection, private connectivity, load balancing

---

### 2. **Database Services**
**Oracle + Open Source** — fully managed & autonomous options:

#### 🤖 Autonomous Database (ADB) Flavors:
- **ATP** — Autonomous Transaction Processing (OLTP/apps)
- **ADW** — Autonomous Data Warehouse (analytics)
- **AJD** — Autonomous JSON Database (document apps)

> ✅ **Always Free Tier Available**  
> ✅ **Download ADB container image → run locally**

#### 🛠️ Other Database Options:
- Run Oracle DB on VMs, Bare Metal, or **Exadata Cloud**
- **Open Source**: MySQL, NoSQL

---

### 3. **Data & AI Services**
Build intelligent, data-driven apps:

- **Generative AI Service** — advanced language models for enterprise apps
- **Data Flow** — Managed Apache Spark
- **Data Catalog** — Track & govern data artifacts
- **Data Integration** — Managed ETL & ingestion
- **Data Science** — End-to-end ML model training & deployment
- **Streaming** — Managed Apache Kafka for event-driven architectures

---

### 4. **Governance & Administration**
Enterprise-grade control, security & observability:

#### 🔐 Security & Identity
- **Compartments** — Simplify management of complex environments
- **Cloud Security Posture Management (CSPM)** — auto-detect & remediate risks
- Encryption by default, network protection, IAM

#### 📊 Observability & Management
- Logging + Logging Analytics
- Application Performance Monitoring (APM)
- Metrics, alarms, dashboards

---

### 5. **Developer Services**
Accelerate app dev & deployment:

- **APEX** — Low-code app development platform
- **Resource Manager** — Managed Terraform for IaC
- SDKs, CLI, DevOps tools, CI/CD integrations

---

### 6. **Analytics**
- **Oracle Analytics Cloud (OAC)** — Fully managed BI & analytics
- Integrates with 3rd-party tools & data sources
- Visualizations, dashboards, augmented analytics

---

### 7. **Application Services**
Build modern, scalable apps:

- **Functions** — Serverless compute (FaaS)
- **API Gateway** — Manage, secure, monitor APIs
- **Events Service** — Trigger workflows via events → microservices & event-driven architecture

---

## 🏢 **OCI-Powered SaaS Suite**
Run your entire business on OCI with integrated Oracle SaaS:

- Finance | HR | Supply Chain | Manufacturing
- Advertising | Sales | Customer Service | Marketing

> ✅ All built natively on OCI → seamless integration, performance, governance

---

## 💡 **Key Advantages of OCI**

- ✅ **Performance**: Engineered systems + bare metal + RDMA networking
- ✅ **Security**: Built-in, by default, end-to-end
- ✅ **Cost Efficiency**: $0.01/core/hour — industry’s lowest price
- ✅ **Free Tier**: Always Free ADB, compute, storage, and more
- ✅ **Hybrid & Multi-cloud Ready**: Run anywhere — cloud, on-prem, edge
- ✅ **Enterprise Scale**: Trusted by Fortune 500 for mission-critical apps

---

## 🚀 Getting Started

- **Free Tier Account** → Try services instantly, no credit card needed for Always Free.
- **Migrate or Start Fresh** → OCI supports both greenfield and enterprise migration.
- **Container Image** → Download and run Autonomous DB locally for dev/testing.

---

## ✅ Key Takeaways

- OCI = **broad + deep enterprise cloud** — not just infrastructure, but full-stack platform.
- **7 pillars** cover everything from core compute to AI to SaaS.
- **Autonomous + Open Source DBs** → flexibility + innovation.
- **Security & governance built-in** → meet compliance effortlessly.
- **Low-code + Serverless + GenAI** → accelerate modern app dev.
- **Always Free + Penny Pricing** → lowest barrier to entry in cloud.

—