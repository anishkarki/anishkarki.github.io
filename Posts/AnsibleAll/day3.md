# Task exection and errors
* use --force-handlers to force handlers to run even if a task fails
* use --skip-tags to skip tasks with specific tags
* use --limit to limit the hosts on which the playbook runs
* use --tags to run only tasks with specific tags
---
**There is no default way to undo what you are doing to playbooks. You have to write your own playbook to undo the changes.**
* use --diff to see the changes made by the playbook
* use --check to see what changes would be made without actually making them
---
## LAB: 
1. start and enable vsftpd service on all managed hosts, open firewalld firewall to allow access to this service
2. Run playbook, observer and make it idempotent
```yaml
---
- name: Installing VSFTPD
  become: yes
  hosts: 192.168.1.222
  tasks:                      
  - name: installing the package
    package:
      name: vsftpd
      state: present
      update_cache: yes      

  - name: enable service
    service:
      name: vsftpd
      enabled: yes
      state: started

  - name: enable firewalld
    apt:
      name:
        - ufw
        - net-tools
      state: present
      update_cache: yes

  - name: ensure UFW is enabled
    ufw:
      state: enabled
      policy: allow

  - name: allow FTP ports in UFW
    ufw:
      rule: allow
      port: '21'
      proto: tcp

  - name: check if vsftpd is listening
    shell: netstat -tulpn | grep vsftpd
    register: port_check
    changed_when: false
    ignore_errors: yes

  - name: Display port status
    debug:
      var: port_check.stdout_lines 

  - name: verify FTP port is open
    wait_for:
      port: 21
      state: started
      timeout: 10
```
```sh
(anenv) swordfish@swordfish:~/PROJECTS/EveryThing0and1/playbook$ ansible-playbook -i inventory vsftpd.yaml -k -K
SSH password:
BECOME password[defaults to SSH password]:

PLAY [Installing VSFTPD] ***********************************************************************************************************************************

TASK [Gathering Facts] *************************************************************************************************************************************
[WARNING]: Host '192.168.1.222' is using the discovered Python interpreter at '/usr/bin/python3.12', but future installation of another Python interpreter could cause a different interpreter to be discovered. See https://docs.ansible.com/ansible-core/2.19/reference_appendices/interpreter_discovery.html for more information.
ok: [192.168.1.222]

TASK [installing the package] ******************************************************************************************************************************
changed: [192.168.1.222]

TASK [enable service] **************************************************************************************************************************************
ok: [192.168.1.222]

TASK [enable firewalld] ************************************************************************************************************************************
ok: [192.168.1.222]

TASK [ensure UFW is enabled] *******************************************************************************************************************************
changed: [192.168.1.222]

TASK [allow FTP ports in UFW] ******************************************************************************************************************************
changed: [192.168.1.222]

TASK [check if vsftpd is listening] ************************************************************************************************************************
ok: [192.168.1.222]

TASK [Display port status] *********************************************************************************************************************************
ok: [192.168.1.222] => {
    "port_check.stdout_lines": [
        "tcp6       0      0 :::21                   :::*                    LISTEN      744461/vsftpd       "
    ]
}

TASK [verify FTP port is open] *****************************************************************************************************************************
ok: [192.168.1.222]

PLAY RECAP *************************************************************************************************************************************************
192.168.1.222              : ok=9    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```
---
# Ansible Tower
* Web based solution for managing Ansible
* Ansible tower is RH web-based platform that manages Ansible projects, inventories, and schedules jobs
* ADD some features:
    - role-based access control
    - job scheduling
    - graphical inventory management
    - real-time job monitoring
    - logging and auditing
    - integration with external authentication systems (LDAP, SAML)
    - Caching of playbooks and roles and passwords
    - workflow designer
* AWX is the open-source upstream of Ansible Tower

* Ansible Automation Platform is a comprehensive solution that includes Ansible Tower along with other tools and services for enterprise-level automation.
    * Ansible Engine: The core automation engine that executes Ansible playbooks.
    * Ansible Tower: The web-based interface for managing and monitoring Ansible automation.
    * Ansible Content Collections: Pre-packaged content that includes modules, plugins, and roles for specific use cases.
    * Ansible Automation Hub: A repository for sharing and discovering Ansible content.
    * Automation analytics: Tools for analyzing and reporting on automation activities.
---
* Start free 60 days trial to see the what Ansible Tower can do for you
* https://www.ansible.com/products/automation-platform
* https://www.ansible.com/products/tower
* https://www.ansible.com/blog/getting-started-with-ansible-tower
---
* AWX: ansible tower machine (opensource)
##### installation steps:
    * Install Docker and Docker Compose
    * Clone the AWX repository from GitHub
    * Navigate to the installer directory
    * Modify the inventory file to set configuration options
    * Run the installation playbook using Ansible
    * Access the AWX web interface
    * login with redhat credentials
    * Default username: admin
    * access UI: http://<your-server-ip>/
---
