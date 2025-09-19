# Managing and Monitoring Autonomous Databases
* REST calls
* Configure for DR
---
# Autonomous DB: REST APIs
* full rest apis for dbas and developers.
* use HTTPS requests and response and supports https and ssl protocol TLS 1.2.
* Call for REST using scripting languages.
---
* Must be signed for authentication purposes.
* Steps to create and sign API requsts:
    * form the HTTPS request (SSL protocol tls 1.2)
    * create the signing string, which is based on parts of the request.
    * create the signature from the signing string, using your pvt key and RSA-SHA256 algo
    * add the resulting signature and other required inforamtion to the Authorization header in the request
    * You will also need to generate an SSH key in the pem format. 
# OCI Exam Notes: Managing Autonomous Database via REST API

**Instructor:** Kamryn Vinson

---

## Key Points
- REST APIs allow **programmatic management** of Autonomous Databases (ADB/ADB-D) instead of using the OCI Console.  
- Useful for **custom scripts, automation, and version-controlled infrastructure**.

---

## API Features
- **HTTPS requests/responses**, supports **TLS 1.2**.  
- Can use **Node.js, Python, Ruby, Perl, Java, Bash, curl**.  
- **All API requests must be signed** (no username/password):
  1. Form HTTPS request  
  2. Create signing string from request parts  
  3. Generate signature using **RSA-SHA256** and private key  
  4. Add signature to **Authorization header**  

- **SSH key pair** in PEM format may be required.

---

## Common Operations via REST API
- **Create Autonomous Database**
  - Specify: DB name, password, CPU count, storage, compartment/tenancy, license model  
  - Response includes: creation status, DB parameters, console link  

- **Start / Stop / Delete** databases  

- **Scale database** (adjust number of OCPUs/ECPUs)  

- **Initiate backups**  

---

## Exam Tips
- REST APIs provide **automation, repeatable deployments, and custom configuration**.  
- All requests must be **signed for security**.  
- Operations possible via REST API mirror what’s available in the OCI Console.
---
# OCI CLI to manager ADB
* Based on the python. 
* create:
* delete:
* generate-wallets:
* get:
* list:
* restore:
* stop:
* switchover:
* backups, create, gets-list backups:
---
# Managing autonomous database instance: Patching, upgrades, and services
    * early or regular patch.
    * while provisioning/ can't change provisioned or cloned database
# OCI Exam Notes: Patching, Upgrades, and Services (Autonomous Database)

**Instructor:** Kamryn Vinson

---

## 1. Patching & Maintenance
- **Autonomous Database** performs maintenance and patching automatically.  
- Database remains **available during maintenance**.  
- **Patch Levels (selected at provision/clone only):**
  - **Regular** – default scheduled patches  
  - **Early** – patches applied **1 week before** Regular  
- Cannot change patch level after the database is provisioned.  
- Cloning rules:
  - Regular → Early allowed  
  - Early → Regular **not allowed**  

- **Maintenance schedule** is visible in the OCI Console.  

---

## 2. Database Services & Concurrency
- When connecting, **must select a service**:  
  - **HIGH** – highest resources, lowest concurrency, queries run in parallel  
  - **MEDIUM** – moderate resources, higher concurrency, queries run in parallel  
  - **LOW** – least resources, highest concurrency, queries run **serially**  

- **Concurrency examples (16 OCPUs)**:  
  - HIGH → 3 concurrent statements  
  - MEDIUM → 20 concurrent statements  
  - LOW → 32–4800 concurrent statements (limits queuing/connectivity)  

- Queuing occurs when concurrency limits are reached.  

---

## 3. Continuous Availability
- Planned maintenance, unplanned outages, and load imbalances are **hidden from applications**.  
- **Best practices:**
  - Transparently **drain workloads** before maintenance  
  - Define **request boundaries** for connection pooling  
  - Use **ORAchk protection report** to verify protection levels  
- **AC (Application Continuity)** allows restoring complex session states (LOBs, session duration) during failover.  
- Ensures **zero-visible disruption** to applications.  

---

⚡ **Exam Tips**
- Patch level set at **provision/clone only**.  
- Service selection determines **resource allocation & concurrency**.  
- AC and request boundaries enable **transparent maintenance & failover**.  
---
# OCI Exam Notes: ACLs & Private Endpoints (Autonomous Database)

**Instructor:** Kamryn Vinson

---

## 1. Access Control Lists (ACLs)
- ACLs **restrict database access** to specified IPs, CIDR blocks, or VCNs.  
- **Default:** database accessible from any IP.  
- Once ACL is enabled:
  - Only IPs in the list can connect.  
  - Services like SQLDeveloper Web, APEX, and OML Notebooks are also restricted.  
- Can be configured:
  - During **provisioning** or on an **existing database**  
  - For individual IPs, CIDR blocks, VCNs, or OCID of VCN  
- **Database restores do not overwrite ACLs**.  
- Steps to set ACL: Add IP/CIDR/VCN → Save → ACL enabled.

---

## 2. Private Endpoints
- Allow database access **without public internet exposure**.  
- Benefits:
  - Cloud services or on-premises data can connect **privately**.  
  - Avoids need for Transit Routing for cloud-to-database connections.  
- Limitations:
  - Cannot convert existing DB to private endpoint; **must clone** into VCN.  
- Requirements:
  - VCN in the same region  
  - Private subnet with default DHCP  
  - At least **one Network Security Group (NSG)**

---

## 3. Network Security Groups (NSG)
- Acts as a **virtual firewall** for the Autonomous Database.  
- Can have up to **5 NSGs per database**.  
- Configure **Ingress/Egress rules**:
  - Example: Ingress TCP **1522** for database listener port  

---

⚡ **Exam Tips**
- ACL = whitelist; blocks everything else.  
- Private endpoint = database accessible **entirely within private network**.  
- ACL + NSG + private endpoint = **layered security** for ADB.  
---
# OCI Exam Notes: Encryption & Key Management (Autonomous Database)

**Instructor:** Kamryn Vinson

---

## 1. Transparent Data Encryption (TDE)
- **Purpose:** Encrypt sensitive data stored in **tables and tablespaces**.  
- **Behavior:** Data is **transparently decrypted** for authorized users/applications.  
- **Protection:** Secures **data at rest** on media in case of theft.  
- **Keys:** Stored externally in a **keystore (TDE Wallet)**.  

---

## 2. Oracle Key Vault (Optional)
- Centralized management of **TDE keystores**.  
- Allows **uploading keystores** and sharing across TDE-enabled databases.  

---

## 3. Autonomous Database Encryption
- **Always-on encryption**:
  - **Data at rest** and **in transit** encrypted by default.  
  - Encryption **cannot be turned off**.  
- **Key management options**:
  - **Oracle-managed keys**: Default, keys stored in **PKCS 12 keystore** on Exadata.  
  - **Customer-managed keys**: Customers control **key generation and rotation**.  
    - ADBs created in an **Autonomous Container Database configured for CMK** automatically use them.  

---

## 4. End-to-End Encryption Layers
1. **TDE** → protects data at rest from admins and Oracle operators  
2. **TLS** → protects data in transit  
3. **Database Vault** → protects data from privileged user access  

---

⚡ **Exam Tips**
- Always-on encryption = **cannot disable encryption**.  
- CMK (Customer-Managed Keys) = allows **control of key lifecycle**.  
- TDE keys can be **centralized using Oracle Key Vault**.  
---
# Monitoring ADB performance.
* Metrics page
    * storage: total allocation for all tabelspace
    * CPU: avg CPU utilisation (2* ECPU)
    * Session
    * Execute count
    * running sql statements
---
# Service Notificaiton
# OCI Exam Notes: Service Notifications

**Instructor:** Kamryn Vinson

---

## 1. Purpose of Notifications
- Provide **alerts and updates** to users/admins, including:
  - Security alerts  
  - Quota breaches  
  - Planned/unplanned service outages  
  - Order approvals  
  - Oracle promotions  
  - Scheduled maintenance notifications  

- **Visibility depends on role**:
  - **Service admins** → notifications for all services in current domain & region  
  - **Identity domain admins** → notifications for all services  

---

## 2. Managing Notifications
- Access via **OCI Console**:  
  `Governance & Administration → Announcements`  
- Announcements page provides:
  - Current & historical notifications  
  - Filters and sorting options  
  - Dashboard view and links to OCI service status  

---

## 3. Announcement Subscriptions
- Publish announcements to **multiple endpoints** using **OCI Notifications service**  
- Key steps to create a subscription:
  1. Click **Create Announcement Subscription**  
  2. Enter **name, optional description, compartment**  
  3. **Subscription type**:
     - **All Announcements** → publish all announcements  
     - **Selected Announcements Only** → filter-specific announcements  
  4. Set **Display Preferences** (e.g., time zone)  
  5. Create **Notifications Topic**:
     - Name, compartment, optional description  
     - Choose **protocol**: Email, HTTPS, Function, Custom URL, PagerDuty, Slack, SMS  
     - Can add **multiple subscription protocols**  

---

⚡ **Exam Tips**
- **Announcements** = in-console alerts for admins/users  
- **Subscriptions** = allow **automated delivery** of announcements to endpoints  
- Protocol options include **email, SMS, HTTPS, functions, Slack, PagerDuty**  
---
# Auto Indexing
* Capture
* Identify
* verify
* Decide
* Monitor

```sql
exec dbms_auto_index.configure("AUTO_INDEX_MODE", "IMPLEMENT");
select DBMS_AUTO_INDEX.report_activity() from dual;
```
* retention period: 373
* Exclude schemas. 