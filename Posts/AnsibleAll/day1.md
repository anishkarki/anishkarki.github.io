# Anisble: A configuration management tool. Manage configuration on a pre-deployed infrastructure.
* Anisble is ease of use than puppet, chef or saltstack.
* It is about devops tool as well. Playbook through GiT
---
## Setting up the control node
* server where ansible software is installed. 
* install using ```pip install ansible```
* Control node is the operator workstation and not so much a server. It has playbooks.
* Managed nodes are assets that are managed with Ansible: can be anything.
* Requirement: SSH
* Have dedicated user account, for convenience same user
* Configure privilege escalation to install software
---
### Initial Setup
* Passwordless ssh
* passwordless privilege escalation
* For secure management
    * ```-k``` command line option to prompt for ssh password
    * ```-K``` for privilege escalation password
* **For convenient and secure management: consider using Ansible Tower, which allows you to cache passwords.**
---
### Configuring Inventory
* DNS or /etc/hosts are hostname to IP resolving
* Ansible needs inventory
    * identify managed hosts
    * define host groups to be useed by Ansible
* Default inventory is in ```/etc/ansible/hosts```
* Project based inventory is common, and inventory files can be referred to using the ```-i inventoryfilename``` command line
---
### Running Ad-hoc commands
* Ansible modules can be used in ad-hoc commands to perform specific tasks.
* recommended to use the most specific module you can find. 
* With over 3000 modules
#### Understanding modules names
* different in 2.10 and 2.9
* modules are part of collections
* To refer to module names in Ansible 2.10 and later, A fully qualified collection name (FQCN) is used, like ansible.builtin.command.
---
### Modules
* ```ansible.builtin.command```: is a generic module that will allows you to run any command using ansible
* ```ansible.builtin.shell``` : uses a bash shell, which allows you to run shell features like pipes and redirects
* ```ansible.builtin.user```: specific module for managing user accounts
* ```ansible.builtin.copy```: used to copy files
---
#### Environment:
##### Central host
1. Control node
2. Collection node
##### Managed hosts:
3. Managed environment (ubuntu and view hosts in kubernetics)
4. Windows
5. esxi
6. CISCO
7. Cloud Azure, AWS
---
### Managed hosts setup
* requirements
    * ssh is running
    * there is a user with admin priv
* Ad-hoc commands can be used.
* ```ssh-keygen``` ```ssh-copy-id```
* ```-m command/shell/user/file ```
---
## Setting up privilege escalation
* echo 'ansible ALL=(ALL) NOPASSWD: ALL'>/tmp/sudoers
* sudo cp /tmp/sudoers /etc/sudoers.d/ansible

### Ansible configuration cfg and working with settings.
* on the command line in setting/settings or ansible.cfg
* specific level settings override the default.
---
```ansible -i inventory 192.168.0.175 -m shell -a "echo 'ansible:MyS3cureP@ss' | chpasswd" -u swordfish -b -k -K```

---
### Windows control is run with ```WINRM```


