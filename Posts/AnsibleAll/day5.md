---
title: Ansible Day 9 Notes
layout: default
render_with_liquid: false
---

## Using Conditionals
* Conditionals are used to perform different actions based on certain conditions.
* Conditionals are defined using the when keyword.
* The condition can be any valid Jinja2 expression that evaluates to true or false.
* using ```when: condition``` after a task
* ```loop```, ```fail```, ```assert```, ```when```, ```register``` can be used together
* ```failed_when``` can be used to define custom failure conditions
* ```changed_when``` can be used to define custom changed conditions
---
### Overview of Conditional
* **handlers**: can be notified to run at the end of a play. runs if triggered by a task
* **items**: can be used to iterate over a list of items
* **when**: can be used for conditionals tasks exection
* **blocks**: used to implement if-then-else like statements
* **register**: used to store the output of a task in a variable
* **fail**: used to fail a play with a custom message
* **assert**: used to assert that a condition is true
---
### Using handlers
* if any task fails after the task that has called the handler, the handler will not be executed
* use ```force_handlers: yes``` in the play header to force the execution of handlers even if a task fails
---
### Using When condition
* ansible_machine="x86_64"
* my_variable is defined
* my_variable is not defined
* my_variable
* ansible_distribution in supported_distros
---
* use ```register``` and ```var_prompt``` and ```when```
---
### Blocks:
* A block is a logical group of tasks
* blocks are used to control how tasks are executed
* one block can, for instance, be enabled using a single when
* blocks can also be used in error conditgion handeling
  * use **block** to define the main tasks to run
  * use rescue to define taks that run if tasks defined in the block fail
  * Use "always" to defgine taks
* can't use items in blocks
---
### Loop
* use ```loop```.
* use loop syntax, but with_X is still supported
---
### Fail module
* exit status of a task to determine whether it has failed.
* lead to failures occurring when nothing is really is going on
* use ```failed_when```
* ```fail```: print a message that informs why a task has failed.
* must have ```ignore_errors``` yes
---
* use debug: var: command_result.error
* fail and when
---
## Assert
* assert and that fail_msg success_msg






