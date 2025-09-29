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
