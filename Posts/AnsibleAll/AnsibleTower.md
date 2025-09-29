# Ansible Tower
* Organisation: a collection of managed devices
* Users: Administrative users that can be grant access to tasks
* inventories: managed servers, can be created statsic or dynamically.
    * check host remaining on the settings > Licenses
* Credentials: store credentials for accessing remote machines. user with sudo previlages
* Projects: a logical collection of Ansible playbooks. can be linked to a git repo.
* Job Templates: a definition and set of parameters for running an Ansible playbook. can be linked to an inventory, project, credentials and other settings.
--- 
## Setting up
1. Setup /etc/hosts first
2. Inventory setup: Demo inventory
    * go to hosts > add hosts
3. Credentials setup: Demo credentials
    * go to credentials > add credentials
4. Project setup: Demo project
    * go to projects > add project
    * setup git repo
5. Templates setup: Demo template
    * go to templates > add template
    * select inventory, project, credentials
6. Save and launch it.
---
## Project with Ansible Tower
#### FOr windows
* use winrm
* use ansible.windows.win_user module
* ansible_connection: winrm
* ansible_port: 5986
* ansible_winrm_transport: credssp
* ansible_winrm_server_cert_validation: ignore
---
* windows become:
    * user should be admin on the remote machine. 
    * create user and password for the windows
---
## Lab2: Install ansible tower on RHEL8: add new centos 7 VM and configure ansible tower can manage ir
* run and test httpd.yaml playbook on the centos7 VM
* Credential type is important: Machine
---
```yaml
---
- name: Install and start httpd
  hosts: centos7
  become: yes
  tasks:
    - name: Install httpd
      package:
        name: httpd
        state: present
    - name: Start and enable httpd service
      service:
        name: httpd
        state: started
        enabled: yes
    - name: Open firewall port 80
      firewalld:
        port: 80/tcp
        permanent: yes
        state: enabled
        immediate: yes
    - name: Test httpd service
      uri:
        url: http://{{ inventory_hostname }}
        return_content: yes
      register: httpd_response
```
