# Types of storage in OCI Data Science
| Storage Type | Description |
|--------------|-------------|
| Object Storage | Used for storing large datasets, models, and other files. It is highly scalable and durable. |
| Block Volume | Provides high-performance block storage for compute instances. Useful for applications requiring low-latency access to data. |
| File Storage | Offers a managed file system that can be mounted to multiple compute instances, suitable for shared access to files. |
| Database | Managed databases for structured data storage, such as Oracle Database or MySQL. Useful for applications requiring relational data management. |

## Types of Block storage
| Block Storage Type | Description |
|--------------------|-------------|
| iSCSI Block Volumes | Provides block storage over the iSCSI protocol, suitable for a wide range of applications. |
| Fibre Channel Volumes | High-performance block storage accessed over Fibre Channel networks, ideal for enterprise applications. |
| Local NVMe Disks | High-speed local storage attached directly to compute instances, offering low-latency access to data. |

## Modern features of block storage in OCI
| Feature | Description |
|---------|-------------|
| Elastic Volumes | Allows for dynamic resizing of block volumes without downtime, providing flexibility for changing workloads. |
| Data Encryption | Supports encryption of data at rest and in transit, ensuring data security and compliance. |
| Snapshot and Cloning | Enables point-in-time snapshots and cloning of block volumes for backup and recovery purposes. |

    * ONNX: Open source format for representing machine learning models, allowing interoperability between different frameworks.

* work with Oracle with ADS connector, sqlalchemy and ipython-sql
* Data-flow is OCI spark for distributed data processing.
* sparksql-magic for running Spark SQL queries in Jupyter notebooks.

#### slug: oci-data-science-notebook-session
* Browse
* search
* install
* clone
* modigy
* publish: initialisize conda bucket, publish --slug SLUG
* delete
* create from YAML: conda create --from-yaml <yaml-file>
---
* A conda slug is a versioned collection of conda packages that can be used to create a reproducible environment for running Jupyter notebooks in Oracle Cloud Infrastructure (OCI) Data Science. It allows users to share and deploy their data science environments easily. \
How to create a conda slug:
  1. Create a conda environment with the required packages.
  2. Use the `conda slug create` command to package the environment into a slug.
  3. Publish the slug to OCI Data Science for use in notebook sessions.

### OCI Valult
#### Introuduction
* ceneralized service for managing secrets, such as API keys, passwords, and certificates.
* Provides secure storage and access control for sensitive information.
* AES, RSA, ECDSA for encryption and decryption.
---
1. Virtual private vaults for isolating partition in HSM. 
2. Vault in a shared partition for shared access to secrets. can't backup.

* keys: logical representation of cryptographic keys used for encryption and decryption.zEncrypt or in digital signing operations.
    * master encryption keys (MEKs): used to encrypt and decrypt data.
    * Data encryption keys (DEKs): used to encrypt and decrypt specific data. Envalope encryption is used to protect DEKs with MEKs.
    * Rotating key: periodically changing the keys used for encryption to enhance security. (older is saved behind the scene.)
* secrets: sensitive information such as API keys, passwords, and certificates.
    * create using the console, SDK, CLI or API and rotate with version.

&rarr; OCI-Valuts: Keys, FIPS 140-2 level 3 certificate, secrets.

## Oracle manged keys:
a. Master key + oracle vault \
b. Customer key + customer vault

* Data at rest is always encrypted.
* buckets are not allowed to use oracle manage key, customer needs to use their own key.
---
* **ADBSecretkeeper**: for autonomous database
* **BDSSecreetKeeper**: big data service
* **MySQLDBsecretkeeper**: mysql
* **Authtokensecretkeeper**:  auth token or access token string. streming, github.
---



