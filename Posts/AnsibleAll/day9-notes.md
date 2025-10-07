# Using Filters and variable types
* Filters: lookup plugin that allows you to manipulate data
* jinja2 filters can be used in Ansible
* Filters process the value of a variable on the control host 
---
* Variable types:
  * string
  * numbers
  * booleans
  * dates
  * null
  * list or arrays
  * dict or hash
---
## Using filters to change the variables
```yaml
          - "(filesize | int) <= 100"
          - "(filesize | int) > 0"
```
* mandatory 
* default
* capitalize
* int/float/ ```+-/*```
* union
* random from list 
* sort will sort
* password_hash: generate a hashed password
* quote: put command output santizited
---
### Working with IP address.
* ipaddr
* using community general collection
---
### Using filter in loop
* using map
* by default map returns a list
* ```{{ basedir_files['files'] | map(attribute='path') | list }}```
#### Flatten recuresively
* flatten aything into one list. nested lists into flat list
* ```loop: "{{ whatever | map(attribute='cities') | flatten }}```
### Subelements
* item.0 and item.1
### Dict2items
* you cannot use loop over a dictionary
---
### Plugins
* plugins and fliters
* lookup plugins
* common lookup plugings
* fileglob
* callback plugins
* fact caching
---
#### Plugins
* pieces of code that augment ansible's core functionality
* default plugins
* activate them in ansible.cfg
* a filter is a program that allows you to modify data
---
* Types
  * filter plugins: modify text
  * cache plugins: allow caching of facts
  * inventory plugins: plugins that allow different types of dynamic inventory
  * lookup plugins: fetch data externally
  * callback plugins: used to collect usage information about ansible
---
### Lookup plugins
* ansible-doc -t lookup -l: for complete list
* lookup plugins: lookup and query
  * file: conent of files 
  * template: processes the contents of a template
  * env: environment variable
  * url: get content from URL
  * pipe: output fo command that is executed on the remote host
  * k8s: fetches a kubernetes object
---
* using lookup: file contents seperated by ```,```
* query: file conetents as a list
---
* **Notice: the template lookup plugin is not the same as the template module: the tempelate plugin is used to generate text that can be used in the modules like copy**
---
* fileglob can be used with wildcard
* ```{{ lookup('fileglob', '*') }}```: provide , seperate string of all the files
---
## Using callbacks and timer plugins
* extends ansible by modifying how it responds to events
* to do their work, callback plugins modify the output of the ansible commands
* use ```ansible-doc -t callback -l``` for a complete list
* enable in ansible.cfg with ```callback_whitelist```

---
* ```cgroup_perf_recap```: montior resource usage
* Cgroups allow for system perf tuning and monitoring
* define the controller: control_group=ansible_group
* ```cgcreate -a ansible:ansible -t ansible:ansible -g cpuacct, memory, pids:ansible_profile```
* Run with ```cgexec -g cpuacct, memory, pids:ansible_profile ansible-playbook cgcreate.yaml```
---
* timer show the duration fo playbook exection
* profile_task and profile_roles
---
## Used plugin-based inventory
* yaml format
* ansible.cfg lists
* ini plugin old style
* script plugin old-style dynamic inventory
* yaml plugin supports new style YAML format
---
* always do group_vars and host_vars.
---
* can do redis based fact caching
* add the configurations
* add checkfacts.yaml
---
* use password lookup plugin
