---
title: Ansible Day 9 Notes
layout: default
render_with_liquid: false
---

# This will include
* Ansible best practices and optimisations
* Using filters
* using plugins
* advaced ansible tower usage
---
# Ansible Best Practices and Optimizations
* using includes and imports
* configurating security
* using tags
* using delegation
* using async and poll
* Effective copuing files
* SSH optimise
---
## Using includes and imports
* include and imports can happen for roles, plays as well as tasks
* include is dynamic and import is static. Ansible will read the import statement during the playbook parsing stage and include it in the playbook. Include will happen during the execution stage
* import is recommended for tasks and roles. it is static. Ansible will preproecesses the imported file content and include it in the playbook 
* *use include when you want to include a file based on a condition*
* *use import when you want to include a file unconditionally*
---
## Configurating Security
* passphrase-less ssh keys to connect to remote hosts
* become=true as a standard setting
* passwordless privilege escalation
* use -b -K when needed
* use ssh-keygen to generate an SSH key
* use ```eval ssh-agent $SHELL``` to start the SSH agent after login
* Use ```ssh-add ~/.ssh/id_rsa``` to add your identity to the agent
* verify using ```ssh-add -l```.
* considering by putting in bash_profile
```sh
if [-z "$SSH_AUTH_SOCK"]; then
eval `ssh-agent -s`
ssh-add
```
* don't use NOPASSWD option
* instead the timestamp option in /etc/sudoers to decrease the frequency.
* timestamp_global
* use line_in_file.
* use -K
* ommit -K until error
* ```ansible -i inventory all -a 'ls /root' -b -K```
---
### Tag
* tag is a label that can be used in a playbook to identify playbook elements.
* use it under any tasks or handlers.
* you can list tags, skip tags and so on.
* run with ```ansible-playbook -t```
---
### Delegation
* run tasks on another host
* use delegate_to as a task property to run that task on a different host.
* allows you to run an individual  task on a different host
* requirements:
  * python installed
  * ssh access
  * host name to ip
* it should be in inventory
* use delegation to copy file between hosts.
```yaml
- name: copy files between hosts
  hosts: ansible1
  tasks:
    - name: copy file from ubuntu to rocky
      synchronize:
        src: /etc/hosts
        dest: /tmp/hosts
      delegate_to: ansible2
    - name: check file
      stat:
        path: /tmp/hosts
      register: stafile
    -debug:
      var: stafile
```
---
## Parallelism
* ```forks=nn or -f nn```
* if processing is happening in the control node
* consider using callback plugin to measure the impact of increasing the number of forks
---
### Use synchronize for effecent copy and rsync should be installed on all the amanged nodes
---
## Optimise the SSH
* ansible uses SSH to manage hosts
* establish a new SSH session takes a lot of time.
* Methods:
  * controlMaster: multiple connection simultaneously with remote host using one network connections
  * controlpersis: keeps the connection open
  * pipelining allows more commands to use a simultaneous SSH connection
* use an [ssh_connection] section in the Ansible config file to specify how to use these options.
* requiretty sudo security options should be disabled.
* visudo and look for ```default !requiretty```: sudo can only be run from a terminal. 
```sh
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersis=120
pipelining = true
```
```yaml
---
- name: optimise sudo for ssh
  hosts: all
  tasks:
    - lineinfile:
      path: /etc/sudoers
      line: 'Defaults !requiretty'
      validate: /usr/sbin/visudo -cf %s
```
---
* **make sure the hostname resoultion is working properly**
---
### Using ssh agent and sudoers configuation for the secure ssh optimisation
# 🔑 SSH-Agent with Ansible — Complete Notes

## 1. Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh-copy-id user@hostname
eval $(ssh-agent)
ssh-add ~/.ssh/id_ed25519
ssh-add -l
ansible -i inventory all -m ping -u swordfish
```
```yaml
---
- name: secure sudo
  hosts: all
  tasks:
    - name: remote insecue /etc/sudoers.d/ansible file
      file: 
        name: /etc/sudoers.d/ansible
        state: absent

    - name: create new and secure /etc/sudoers.d/ansible file
      copy:
        content: 'ansible ALL=(ALL) ALL'
        dest: /etc/sudoers.d/ansible

    - name: tunning /etc/sudoer.d/
      lineinfile:
        line: 'Defaults timestamp_type=global, timestamp_timeout=120, !requiretty'
        name: /etc/sudoers
        validate: /usr/sbin/visudo -cf %s
```