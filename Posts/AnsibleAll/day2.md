# Anisble Ad-hoc command
---
### Ad hoc command vs playbook
* ansible modules are a python script that will be executed on the managed host
* more than 3000 modules
* running ad-hoc commands using ansible command, -m option to address a specific module and -a option to pass arguments to the module.
    * example: 
        * ```ansible -i inventory <host or group> -m <module name/ ansible.windows.win_ping> -a "<module arguments>>" <user> -b -k -K```
        * ```ansible -i inventory all -m ansible.builtin.command -a reboot```
        * ```ansible -i inventory ubuntu -m ansible.builtin.user -a "name=ansible state=present" -u swordfish -b -k -K```
---
### Esssential ansible modules
* Modules are part of ansible collections and use FQCN of ansible.builtin.module_name
* ```ansible.builtin.command```: run commands
* ```ansible.builtin.shell```: run shell commands
* ```ansible.builtin.user```: manage user accounts
* ```ansible.builtin.copy```: copy files
* ```ansible.builtin.file```: manage file properties
* ```ansible.builtin.service```: manage services
* ```ansible.builtin.raw```: run raw commands without using SSH
* ```ansible.builtin.package```: manage packages
    * ```ansible -i inventory 192.168.0.175 -m package -a "name=nmap state=latest" -k -K -u swordfish```


---
* ```ansible-doc -l```: list all modules
* ```ansible-doc <module name>```: get details of a specific module
* ```ansible-doc -s <module name>```: get a short summary of a specific module
---
## Module Documentation
* in ansible-doc for everything
* https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html
* ```ansible-doc -l```: list all modules
* ```ansible-doc <module name>```: get details of a specific module
* ```ansible-doc -s <module name>```: get a short summary of a specific module
* if ```=``` sign is used in the argument, then the argument should be enclosed in double quotes and these are mandatory. 
    * example: ```ansible -i inventory ubuntu -m ansible.builtin.user -a "name=ansible state=present" -u swordfish -b -k -K```
---
## Using ansible in idempotent way
* idempotent: running the same command multiple times will not change the result beyond the initial application
* example: ```ansible -i inventory ubuntu -m ansible.builtin.user -a "name=ansible state=present" -u swordfish -b -k -K```
    * running the above command multiple times will not create multiple users
* Avoid using command, shell, raw modules for tasks that can be accomplished using other modules
* ```ansible all -m ping -u swordfish -k ```
* avoid using command, shell, raw modules for tasks that can be accomplished using other modules
---
#### Lab Questions
1. Use adhoc for ansible fetch on windows server
    * ```ansible -i inventory win -m win_product_facts -u swordfish -k -K```
2. adhoc for create user
    * ```ansible -i inventory win -m win_user -a "name=ansible password=present@123!" -u swordfish -b -k -K```
---
## Ansible Playbooks
* playbooks are yaml files that contain a series of tasks to be executed on the managed hosts
* playbooks are idempotent
* playbooks can be used to automate complex tasks
* playbooks can be used to manage multiple hosts and groups
* playbooks can be used to manage variables and templates
    * multiple plays
    * each play can have multiple tasks
* playbooks can include other playbooks
* playbooks can use roles to organize tasks and variables
#### Playbook rules
* use .yml or .yaml extension
* use spaces instead of tabs
* use 2 spaces for indentation
* use - to indicate a list item
* use : to indicate a key-value pair
* use | or > to indicate a multi-line string
* use # to indicate a comment
* use --- to indicate the start of a document
* use ... to indicate the end of a document
* use variables with {{ variable_name }}
* use jinja2 templating for complex variables and expressions
* use ansible-galaxy to manage roles and collections
* use ansible-lint to check for best practices and syntax errors
---
* **tasks always instart with a hyphen (-)**
* **name is optional but recommended**
```sh
(anenv) swordfish@swordfish:~/PROJECTS/EveryThing0and1/playbook$ ansible-playbook -i inventory  sample.yaml -k
SSH password: 

PLAY [myplay] ******************************************************************************************************************************************************************

TASK [Gathering Facts] *********************************************************************************************************************************************************
[WARNING]: Host '192.168.0.175' is using the discovered Python interpreter at '/usr/bin/python3.12', but future installation of another Python interpreter could cause a different interpreter to be discovered. See https://docs.ansible.com/ansible-core/2.19/reference_appendices/interpreter_discovery.html for more information.
ok: [192.168.0.175]

TASK [task1] *******************************************************************************************************************************************************************
ok: [192.168.0.175] => {
    "msg": "hello world"
}

TASK [task2] *******************************************************************************************************************************************************************
ok: [192.168.0.175] => {
    "msg": "hello world2"
}

PLAY RECAP *********************************************************************************************************************************************************************
192.168.0.175              : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0

```
---
## Writing and running playbooks
* use -v for verbose output
* use -C for check mode
* No output log is written by default. Use -vvv to see the full details of what is being executed.
* use --start-at-task="task name" to start from a specific task.
#### Example playbook.
```yaml
- name: install start and enable httpd
  become: yes
  hosts: 192.168.0.175
  tasks:
  - name: install package
    package:
      name: apache2
      state: present
  - name: start and enable service
    service:
      name: apache2
      state: started
      enabled: yes
```
* *always use state: present or state: absent for idempotency*
* fact gathering, task execution, and play recap
---
## Defining multiple playbooks
* to write the playbook in a modular way
* to limit the number of tasks that run in one play
* to run some tasks on one host, while others are running on another host.
---
## Understanding playbook errors
* A play contians a series of tasks
* Task dependencies in general are very important
* if a task fails, playbook will stop execting on that host
* use ignore_errors: yes to ignore errors and continue execution

