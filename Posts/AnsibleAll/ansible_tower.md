## ansible tower
* Tower users: used by people that need access to the tower interface
* Tower users are used with RBAC to grant users access to specific roles
### Organisation:
* Colleciton of teams, projects and inventories.
* Organisation very large deploymnets, as they allow users and teams to be configured with access to specific sets of resources.
* USERS:
    * system admin
    * system auditor
    * normal users
* TEAMS: Group of users at orgnaisation level.
    * only access to resource within the orgns.
* ORGN ROLES:
    * orgn admin
    * project admin
    * inventory admin
    * credential admin
    * notification admin
    * workflow admin
    * job template admin
    * auditor
    * memeber
    * read
    * execute
* roles are assigned with an orgn scope or a project scope
---
* create users
* creat teams
---
### Create job template surveys
* vars_prompt: from the ansible engine is not supported in tower
* alternative job template surverys
* Use extra variables. Interactive in the jobs
    * Text: this is text on a single line
    * textarea: text on multiple lines
    * password: treated as sensitive information
    * Multiple Choice (single select): a list of options where one can be selected
    * Multiple Choice (multiple select): a list of options where one or more can be selected
    * Integer: an integer number
    * Float: a floating point decimal
* Create a survey
* create template and put survey in it.
---
### Configure notifications
* Create notification for the job templates
---
### Workflow
* Workflow job template has been defined, the workflow visualizer is used to define the actual workflow
* Job Templates
---
### Scheduling jobs
* The schedule option in templates
* Start the whole process.
---
## Importing static inventories
* if they are in Git or any other external system
* local static inventory files are imported with the awx-manage cli utility
```awx-manage ivntory_import --source=/root/myinventory --inventory-name='myinventory'```
### Creating and updating dynamic invenotry
* Connect to the cloud hosts
* ```github.com/bonnevil/ldap-freeipa```
* and add the inventory scripts for LDAP
* Dynamic inventory in Ansible Tower allows users to fetch inventory information from external sources such as AWS, Azure, OpenStack, and more. This eliminates the need for manual maintenance of inventory files and provides a more flexible and scalable approach to managing inventory.
* 
---
### Smart inventories
* dynamic created from other inventory using filters
* Filter may look like ```ansible_facts.ansible_distribution:RedHat```
* **ansible_facts**: indicates the filter applies to Ansible facts, and not a host name or something else.
* Also notice there is no white space
---
## Using Vault
* value-encrypted files, you need to create a vault credentials
* job templates
* put machine credentials and also the vault cred
---
### Tower API
* REST API
* ```Curl -x get --user admin:password https://tower.example.com/api/v2/activity_stream/ -ks | json_pp```
* get job ids and all
---
## Backup tower

* A workflow template in Ansible Tower is a YAML file specifying job templates' order and dependencies within a workflow. It allows you to define the sequence of jobs and their relations, such as running the next job based on the result of the previous job. The workflow template serves as the foundation for creating workflows in Ansible Tower.















