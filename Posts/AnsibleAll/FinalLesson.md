---
title: Ansible Day 9 Notes
layout: default
render_with_liquid: false
---

## Managing Heterogeneous environment with Ansible
* VM with ansible
* K8s with ansible
### Managing windows with ansible
```ansible win -m win_ping```
* ```winrm```
* 
---
#### Widows modules
* win_command
* shell
* features
* update
* package
* reboot
* format
* win_users
* win_domain: to convert it into AD
* win_reboot
* create dns_deligation: no 
* winrm quickconfig
* disbale IE smart security configure
* ```winrm enmerate winrm/config/listner```
* ```pip3 install pywinrm```
---
```yaml
---
- name: runing the command
  hosts: win
  tasks:
    - name: runnign the command
      win_command: whoami.exe
      register: wiebenik
    - name: show the result
      debug:
        var: wiebenik.stdout
```
---
## Docker
* add respo to install docker
* install start docker daemon
---
* if you use when statement, use the include not import_tasks
* Podmen are rootless container and can run without root privileges. 
---
## Aws with ansible
* IAM >USERS> create user
* give the new user a name, and select "access key" as the access type.
* when setting up permissions, attach the admin access policy.
* Access key id and secret key id
* ```pip install boto boto3```
* for ec2 create the ssh key pair .pem to .ssh
* To provision instances, you need an AMI instance id
* get from EC2 console > instances
* select public images and search for an instance
* ssh -i .pem <instancename>
---
### Configuring inventory dynamic
* Using python script as the dynamic inventory is old school
* use the ansible plugin.
* Using AWS dynamic inventory requires you to use a YAML file that is in /opt/ansible/inventory/aws_ec2.yaml.
```yaml
---
plugin: aws_ec2
aws_access_key: 
aws_secret_key:
keyed_groups:
  - key: tags
    prefix: tag
regions: 
- us-west-2    
```
* edit ansible cfg
```cfg
[defaults]
inventory=/opt/ansible/inventory/aws_ec2.yaml
[inventory]
enable_plugins=aws_ec2
```
```ansible-inventory -i /opt/ansible/inventory/aws_ec2.yaml --list```
* if the vault variables are in ./group_vars, you will need to add --ask-vault-pass.
---
# Managing the network devices
* put it in inventory
* use dynamic inventory is suggested
* connecting with SSH in some cases, look for connecion protocol
### Modules are executed on the control nodes
* no of forks shouldn't be higher than 5
* backup stored in control nodes
* ansible_connection: local
* ansible_connection: network_cli, netconf, httpapi
* ```ansible-galaxy install community.ciscosmb```
* ```pip3 install paramiko```
---
* Connect switch directly to a linux machine using network cable.
* Use ```tcpdump -i eth0``` to discover network traffic. 
* Use ```nmap -sn 192.168.1.0/24``` to discover nodes on the network.
* save config in ~/.ssh/config
* Ansible.cfg
  * add connection persistent config
* inventory
  * ansible_connection=network_cli
  * ansible_network_os: community.ciscosmb.ciscosmb
---
* ```ansible.netcommon```
---

### managing the KVM VM with ansible
* libvirtd: daemon that must be running on the managed hosts
  * Xml config
  * a disk file /var/lib/
* ```xml: lookup('template' '<.j2>')```
#### Vshphere engine
* ```pyVmomi```
* SSL encrypted for ansible to connect to either vCenter or ESXi
* Using dynamic inventory
#### manage VMs on ESXi environment
* Login in to ESXI web UI
* enale TSM-SSH
#### Managing Kubernetes with Ansible
* Aio
* kubuntu
* control (client)
* Kube control host
---
* install all the requirements and the kubeadm, kubectl and kubelet
* set up networking and remove taint from kube control
* tigera-operator and fetch yaml
* change the network to 10.10
* custom-resources.yaml change the ip from 192.168 to 10.10.
* kubectl get ns calico-system (calico)
* create custom resources. ```kubectl taint nodes --all node-role.kubernetes.io/master-
---





