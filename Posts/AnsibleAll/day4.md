# Devops best practices
## Ansible Best Practices
### Day 4
* Ansible is all about configuration as code
* To provide site sepecific code, variables can be used
* apart from vairables, ansible provides facts
* Facts are pieces of information derived about the systems to which Ansible connects
* Facts are gathered by the setup module, which is automatically run at the start of each play
---
### Syntax:
* create a different file for variables
* while referring to a variable, use {{ var_name }}
* if a value starts with a variable, variables needs to be between double quotes and double curly braces:
    * msg: "{{ var_name }} is set"
* from when ansible 2.5, you can use vars keyword to define variables and curly braces are not needed
    * vars:
        var_name: value
---
* Can be set from the play headers
* in play headers using vars keyword
* in play header suing an include with vars_files keyword
* using the set_fact module
* on the command line -e key=value
* as inventory variables
* as host or host_group variables
* using vars_prompt keyword
---
* use vault to store sensitive data as variables
---
* set_fact is a module that can be used anywhere in a play to set variables
* Variables set using set_fact are persistent and can be used in later tasks
* dynamic set variables that are based on the result of any task in the playbook
* also, variables set with set_fact have a playbook scope
---
* for group_vars:
    * create a directory named group_vars in the same directory as the playbook
    * create a file with the name of the group inside the group_vars directory
    * add variables in YAML format
---
Access facts:
* ansible_facts is a dictionary that contains all the facts
* to access a specific fact, use dot notation
    * ansible_facts['os_family'] or ansible_facts.os_family
* to see all the facts, use debug module
    * - name: Show all facts
      debug:
        var: ansible_facts
---
Slow fact gathering:
* fact gathering can be slow on some systems
* to disable fact gathering, use gather_facts: no in the play header
* set /etc/hosts and replicate in all the nodes
---
#### Multi-valued variables
* Dictionaries and lists can be used as variables
* An array (list) is an ordered collection of values
* A dictionary (hash) is a collection of key-value pairs
* Use the yaml syntax to define multi-valued 
* ```dict2items``` filter can be used to iterate over a dictionary
* dictinaries are used in ansible facts array's in conditionals
* [] for list and {} for dictionary
* outputs is just showing "", it is a string
* check ansible_mounts in the facts, which actually presents a list of dictionaries
---
#### Magic Variables
* reserved variables that are created by ansible
  * hostvars : can be used to access variables of other hosts. eg ```hostvars['hostname']['var_name']```
  * groups: used to list all hosts in an inventory group. eg ```{% for host in groups['group_name'] %}```
  * inventory_hostname: the name of the host as it appears in the inventory. It can be used as host as an alternative to ansible_hostname when fact-gathering is disabled
  * inventory_hostname_short: the short name of the host (without domain)
  * group_names: a list of all groups the host is a member of. eg ```{% if 'group_name' in group_names %}```
  ---
  ### Registers
  * register keyword can be used to store the output of a task in a variable
  * the variable can be used in later tasks
---
### Ansible-vault
* used to encrypt sensitive data
* can encrypt entire files or just variables
* to create a vault file: ```ansible-vault create filename```
* to edit a vault file: ```ansible-vault edit filename```
* to view a vault file: ```ansible-vault view filename```
* to encrypt an existing file: ```ansible-vault encrypt filename```
* ```ansible-playbook --ask-vault-pass playbook.yml```
* to decrypt a file: ```ansible-vault decrypt filename```
---
#### Lab exercise: 
* Create an inventory file that defines a host group webservers, as well as a group dbservers
* Create the file group_vars/webservers
  * web_pacakge: httpd
  * web_service: httpd
* create a simple playbook that uses the debug module to show the current value of the variables of the variables ```web_package``` and ```web_service```
