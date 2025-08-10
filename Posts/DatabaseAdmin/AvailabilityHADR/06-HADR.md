# Describe high availability and disaster recovery strategies
## HA: Single Region HA example 1: always on availability groups
* only HA and not DR, Configuring an (AG). 
* Availability Sets. 
    * Protects data by having more than one copy
    * easy, standard method for applications to access both primary and secondary replicas
    * enhanced availability during patching
    * no shared storage.

##  HA: Single Region Always on failover cluster instance
* popular
* improved shard storage with Azure Shared Disk
* easy method to access the clustered instance
* provides enhanced availability during patching. 

## DR: Multi-region or hybrid always on availability group
* WSFC (windows server failover cluster)
* requires AD DS and DNS
* all nodes in same AG

WSFC Between Two DC-----------------------------------------------------|
|                                |
|                                |
|       Primary                  |    secondary
|       Secondary                |    secondary
|-----------------------------------------------------------------------|

## DR: Distributed availability group: 
* only enterprise
* Multiple AG with its own quorum and witness.
* one on premise and other in cloud. Each has its own WSFC and AG with two replicas. 
* the global primary is responsible for the secondary in AG1 and the forwarder, the primary of AG2. 
    * No sinlge point of failure
    * multiple regions
    * One primary isn't recocniging all replicas

DR: Log shipping:
* Log shipping is a tried-and-true feature that has been around for over 20 years
* Log shipping is easy to deploy and administer since it's based on backup and restore.
* Log shipping is tolerant of networks that aren't robust.
* Log shipping meets most RTO and RPO goals for DR.
* Log shipping is a good way to protect FCIs.

DR: Azure Site recovery:
* Part of azure platform.
* Replicate the whole VM


# Descirbe Hybrid Solutions
* SQL Server’s transactional replication feature can be configured from a publisher located on premises (or another cloud) to an Azure SQL Managed Instance subscriber, but not the other way.
* For example, a secondary replica for an AG can be added in Azure. That means any associated infrastructure must exist, such as AD DS and DNS.
* usually IaaS based.


