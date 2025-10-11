---
title: Ansible Day 9 Notes
layout: default
render_with_liquid: false
---

## Day 7 Notes
### Ansible Collections
- A collection is a distribution format for Ansible content that can include playbooks, roles, modules, and plugins.
- Ansible bundle.
#### Collection may contain
* modules:  Custom modules for specific tasks.
* roles:  Predefined sets of tasks and handlers.
* plugins:  Custom plugins for various functionalities.
---
* collections have FQCN such as ansible.netcommand
* start with a collections setting in the play header.
---
## Roles
* Community provided resource that makes working with ansible easier
* Standard solution for common tasks
* Pull from galaxy and use in the code
* Can create roles custom
#### Tasks exection order
* executed before other tasks
* use pre_tasks to execute tasks before the role
* Handles that are triggered by pre_tasks before the roles
* ```install the role and have fun```
---
## Galaxy
* community website that provides access to roles and collections.
---
### Using roles and collections
* Install the role or collection using ansible-galaxy command
* Reference the role or collection in the playbook
* Use the tasks, modules, or plugins provided by the role or collection in your playbook.
* in play headers, use collections keyword
* ```ansible-galaxy collection install <collection_name>```
* see ```collections/requirements.yaml``` for example
* ```ansible-galaxy role install <role_name>```
* see ```collectionusage/requirements.yaml``` for example
* ```ansible-galaxy collection install -r <requirements_file>```
---
## Create your own roles
* defaults: main.yml - default variables will be included here. Variables defined here have the lowest precedence. Variables are accessible as normal variables in playbooks and tasks.
* handlers: main.yml - handlers will be included here. Handlers are tasks that are triggered by other tasks.
* vars: main.yml - variables will be included here. Variables defined here have a higher precedence than those in defaults. Variables are accessible as normal variables in playbooks and tasks.
* tasks: main.yml - tasks will be included here. Tasks are the main actions that the role will perform.
  * main.yml - main task file that will be executed when the role is called.
  * other task files can be included and called from main.yml
  * How to import other task files
    * include: other_task_file.yml - includes the specified task file and executes it as part of the current task list.
    * import_tasks: other_task_file.yml - imports the specified task file and adds its tasks to the current task list at the point of import.
* meta: main.yml - metadata about the role will be included here. Metadata can include information such as the role's author, license, and dependencies on other roles.
* files: - static files that can be copied to the target system will be included here.
* templates: - jinja2 templates that can be rendered and copied to the target system will be included here.
---
### Example of creating custom role
* ```ansible-galaxy init myrole``` - creates a new role named myrole with the standard directory structure.
* Create a template file named motd.j2 in the templates directory with the following content:
  ```
  Welcome to the system managed by {{ system_manager }}.
  ```
* Create a task in tasks/main.yml to copy the template file to /etc/motd on the target system:
  ```
- name: copy motd file
  template:
    src: templates/motd.j2
    dest: /etc/motd
    owner: root
    group: root
    mode: '0444'

  ```
* Create a playbook named my-motd.yaml to use the role:
  ```
---
- name: use motd role playbook
  hosts: all
  become: true

  roles:
    - role: myrole
      system_manager: test@example.com
  ```
* Run the playbook using the command:
  ```ansible-playbook -i inventory my-motd.yaml
  ```
* Verify pre-tasks are executed before the role tasks by creating a playbook named pretasks.yaml:
  ```
---
- name: Apply myrole to set custom motd
  hosts: all
  become: yes
  pre_tasks:
    - name: test pre tasks
      apt:
        update_cache: yes
  roles:
    - myrole
  ``` 
* Run the playbook using the command:
  ```ansible-playbook -i inventory pretasks.yaml
  ```
---
### Explain how the whole role setup is working
* The role is created using the ansible-galaxy command, which sets up the standard directory structure for the role.
* The template file motd.j2 is created in the templates directory, which contains a placeholder for the system manager's email address.
* The task in tasks/main.yml uses the template module to copy the motd.j2 file to /etc/motd on the target system, replacing the placeholder with the actual email address provided in the playbook.
* The playbook my-motd.yaml calls the role and passes the system_manager variable, which is used in the template to customize the message of the day.
* The playbook pretasks.yaml includes a pre_task that updates the apt cache before executing the role, demonstrating how pre_tasks are executed before the role's tasks.
* The playbook exection starts with pre_tasks, then the execution of the role tasks starts