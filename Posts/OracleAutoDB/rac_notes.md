# Oracle Exadata Rack Comparison

| Feature | Quarter Rack | Half Rack | Full Rack |
|---------|-------------|-----------|-----------|
| **Database Servers (Compute Nodes)** | 2 | 4 | 8 |
| **Storage Servers** | 3 | 6 | 14 |
| **Total OCPUs (Database)** | ~92 | ~184 | ~368 |
| **Memory (RAM per DB server)** | 1 TB | 1 TB × 2 = 2 TB | 1 TB × 4 = 4 TB |
| **Flash Storage** | ~12.8 TB | ~25.6 TB | ~76.8 TB |
| **Disk Storage (HDD)** | ~144 TB | ~288 TB | ~864 TB |
| **Network** | 10/25 GbE + InfiniBand | Same, more capacity | Same, full capacity |
| **InfiniBand Switches** | 1 | 2 | 2 |
| **Maximum RAC Nodes** | 2 | 4 | 8 |
| **Maximum PDBs Supported** | Multiple | Multiple | Multiple |
| **Typical Use Case** | Small workloads, dev/test, small production | Medium workloads, larger production | Enterprise-level, large production, high performance |
| **Power and Space Requirements** | Smallest | Medium | Full |

---

## Notes
- **Quarter Rack:** 2 DB nodes + 3 storage nodes, small workloads.  
- **Half Rack:** 4 DB nodes + 6 storage nodes, medium workloads.  
- **Full Rack:** 8 DB nodes + 14 storage nodes, large enterprise workloads.  
- **Scaling:** You can start with Quarter or Half Rack and scale to Full Rack.  
- **Networking:** Private interconnect for RAC + InfiniBand for storage and compute.  
- **Flash/Hybrid Storage:** Combines flash and disk for high performance I/O.  

--- 
# Oracle RAC Storage Types

In Oracle RAC (Real Application Clusters), storage is critical because **multiple nodes access the same database simultaneously**. RAC uses **shared storage** to ensure consistency and high availability.

---

## 1. ASM (Automatic Storage Management)
- **Type:** Clustered storage management within Oracle.  
- **Purpose:**  
  - Simplifies disk management for RAC.  
  - Provides **striping, mirroring, and redundancy**.  
- **Notes:**  
  - Fully integrated with Oracle Database.  
  - Uses **disk groups** to manage datafiles, redo logs, and temporary files.  

---

## 2. Shared Disk Storage
All RAC nodes must access the **same storage**. Common types:

| Storage Type | Description | Use Case |
|--------------|------------|----------|
| **SAN (Storage Area Network)** | Block-level storage via Fibre Channel or iSCSI | Enterprise; high performance and reliability |
| **NAS (Network Attached Storage)** | File-level storage via NFS | Simpler setups; less common for RAC due to performance |
| **Direct-Attached Shared Storage (DAS)** | Shared SAS/SATA drives with clustering support | Smaller environments or labs |
| **Exadata Storage** | Hybrid storage (Flash + Disk) optimized for Oracle | High-performance RAC; tightly integrated with Oracle |

---

## 3. Temporary and Redo Storage
- **Redo Logs:** Stored on **shared disks** for all nodes to write.  
- **Undo Tablespaces:** Can be **local per node** or shared via ASM.  
- **Temp Tablespaces:** Often stored on **ASM disks** to allow shared access.  

---

## 4. Key Characteristics of RAC Storage
1. **Shared Access:** All nodes see the same datafiles, redo logs, and control files.  
2. **High Availability:** Redundant storage (mirroring) prevents single points of failure.  
3. **Performance:** Low-latency interconnects like Fibre Channel or InfiniBand are preferred.  
4. **Oracle-Managed:** ASM handles striping, mirroring, and rebalancing automatically.  

---

## Summary
- **Primary storage for RAC:** ASM-managed disks (recommended).  
- **Other options:** SAN, NAS (NFS), Exadata hybrid storage.  
- **Logs and temporary files:** Stored on shared disks via ASM for consistency and availability.
