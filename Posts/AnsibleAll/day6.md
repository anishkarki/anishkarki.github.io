# Managing files
* copy
* synchronize
* fetch

### copy
* 
### synchronize
* it uses rsync to sync files from the control host to managed hosts.
---
* if you use delegate_to: to change the source host to a host different than localhost
---
## using fetch
* anisble.builtin.fetch can be used to fetch a file from a amanged machine and store it on contol host
* use flat option as well.
---
### Change file content
* ```use copy```
* replace, lineinfile, blockinfile
* content argument 

* lininfile: add single lineinfile
* blockinfile: multiple line


## Find modules
* operation on multiple files 
* works with regex
* register together with Find
* blockinfile
* use marker and block to add lines after marker
---
## Templates
* templates: is a sample configuration file that is combined with environment variables to produce site specific configuration files
* Templates are based on the jinja2 language.
* in template conditional structures as well as loop structure can be used.
```yaml
---
- name: install motd using template modules
  hosts: templateserver
  become: yes
  tasks:
    - name: install motd
      template:
        src: motd.j2
        dest: /etc/motd
        owner: root
        group: root
        mode: '0644'
```