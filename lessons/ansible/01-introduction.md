## Understand the Ansible Roles
* Roles: reusble bundle of tasks, variables, and files. We will be creating a single role
* Collections: Namespaced package of roles, modules, and more. FQCN: my_namespace.postgresql_monitor.postgresql_monitor
* Tasks: Individual actions (e.g, run a command)
* Variables: Customize behavior (default, vars files, group_var)
* Handlers: Run on changes/notifications (eg, alerts)
* Templates: Jinja2 files for dynamic content.
* Modules: Built-in or custom actions ( we use community.docker)

### We create the proper directory structure for the ansible collection creation
```bash
mkdir -p ansible_collections/my_namespace/postgresql_monitor
cd ansible_collections/my_namespace/postgresql_monitor
```

### Everything good starts with a beautiful docs (Go ask Linus Trevalod)
```sh
mkdir docs
touch galaxy.yml README.md CHANGELOG.md docs/README.md
```
* galaxy.yml: this will tell the world about your collection everything what it is and what you are trying to create.
* ```namespace```+ ```name```: Unique ID
* Dependencies ensure community.docker is installed
---
