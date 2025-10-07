# 📘 Ansible Playbook & Role Components — Detailed Reference

This document explains **each component of an Ansible project**: playbooks, roles, tasks, handlers, variables, and supporting files.  
It describes **what is stored/written in each part** and how they are used during execution.

---

## 🔄 Playbook-Level Structure

A playbook YAML file is the **entry point**.

### Components:
- **`pre_tasks`**
  - Tasks executed before roles.
  - Used for preparation steps (install packages, gather environment info).
  - Example:
    ```yaml
    pre_tasks:
      - name: Ensure required package is present
        ansible.builtin.package:
          name: python3-libselinux
          state: present
    ```

- **`roles`**
  - Calls roles defined in `roles/` or Galaxy collections.
  - Each role executes in a defined order internally.
  - Example:
    ```yaml
    roles:
      - geerlingguy.nginx
      - collect_and_validate
    ```

- **`tasks` (playbook-level)**
  - Run after all roles finish.
  - Example:
    ```yaml
    tasks:
      - name: Debug hostname
        ansible.builtin.debug:
          msg: "{{ inventory_hostname }}"
    ```

- **`post_tasks`**
  - Cleanup, finalization, reporting tasks.
  - Example:
    ```yaml
    post_tasks:
      - name: Cleanup temp files
        ansible.builtin.file:
          path: /tmp/output
          state: absent
    ```

- **`handlers`**
  - Defined at playbook or role level.
  - Triggered only when tasks notify them.
  - Run **after all tasks/post_tasks**.

---

## 📂 Role Structure

A role is a **self-contained unit** inside `roles/`.  
Typical structure (like `geerlingguy.nginx`):

```
roles/
└── myrole/
    ├── defaults/
    │   └── main.yml
    ├── vars/
    │   └── main.yml
    ├── tasks/
    │   └── main.yml
    ├── handlers/
    │   └── main.yml
    ├── templates/
    │   └── *.j2
    ├── files/
    │   └── *
    ├── meta/
    │   └── main.yml
    ├── molecule/
    │   └── (testing configs)
    └── README.md
```

### 🔑 Components in a Role:

1. **`defaults/main.yml`**
   - Stores **default variables**.
   - Lowest precedence.
   - Example:
     ```yaml
     nginx_port: 80
     nginx_service_name: nginx
     ```

2. **`vars/main.yml`**
   - Stores **static variables** (higher precedence).
   - Used when values should not be overridden easily.
   - Example:
     ```yaml
     nginx_conf_path: /etc/nginx/nginx.conf
     ```

3. **`tasks/main.yml`**
   - The **entry point** of tasks.
   - Can import/include other task files.
   - Example:
     ```yaml
     - name: Install Nginx
       ansible.builtin.package:
         name: "{{ nginx_service_name }}"
         state: present

     - name: Include configuration task
       ansible.builtin.import_tasks: configure.yml
     ```

4. **`handlers/main.yml`**
   - Defines **handlers** (triggered tasks).
   - Example:
     ```yaml
     - name: restart nginx
       ansible.builtin.service:
         name: nginx
         state: restarted
     ```

5. **`templates/*.j2`**
   - Jinja2 templates for dynamic configuration files.
   - Example: `nginx.conf.j2`
     ```nginx
     server {
         listen {{ nginx_port }};
         server_name {{ ansible_hostname }};
     }
     ```

6. **`files/`**
   - Static files to copy to hosts.
   - Example: `index.html`  
     ```html
     <h1>Hello from Ansible</h1>
     ```

7. **`meta/main.yml`**
   - Role metadata and dependencies.
   - Example:
     ```yaml
     dependencies:
       - role: geerlingguy.repo-epel
     ```

8. **`molecule/`**
   - Testing scenarios (not executed in production).
   - Contains `molecule.yml` for CI/CD pipelines.

9. **`README.md`**
   - Documentation for the role.

---

## 🗂️ Collections Structure

Collections are **bundled sets of roles, modules, plugins, playbooks**.

```
my_collection/
├── galaxy.yml        # Metadata for Galaxy
├── docs/             # Documentation
├── playbooks/        # Reusable playbooks
├── plugins/          # Custom plugins/modules
│   └── modules/
├── roles/            # Roles bundled in collection
├── tests/            # Integration tests
└── README.md
```

- **`galaxy.yml`**
  - Metadata for publishing collection.
  - Example:
    ```yaml
    namespace: swordfish
    name: my_collection
    version: 1.0.0
    ```

- **`plugins/`**
  - Custom Ansible modules, filters, lookups.
  - Example: `plugins/modules/custom_check.py`

- **`playbooks/`**
  - Predefined playbooks shipped with collection.
  - Example:
    ```yaml
    - hosts: all
      roles:
        - collect_and_validate
    ```

- **`tests/`**
  - Integration tests for CI/CD.

---

## 🧭 Execution Order Recap

1. **Playbook:**
   - `pre_tasks` → `roles` → `tasks` → `post_tasks` → `handlers`

2. **Role:**
   - `defaults/` → `vars/` → `tasks/` → `handlers/` → `meta/` (dependencies)

3. **Handlers:**
   - Run **at the end of playbook execution** if notified.

---

## ⚖️ Variable Precedence

Lowest → Highest:

1. `defaults/main.yml`
2. `vars/main.yml`
3. Inventory vars
4. Playbook vars
5. Extra vars (`-e` on CLI)

---

## 📊 Visual Map

```
Playbook
   ├── pre_tasks
   ├── roles/
   │      ├── defaults/
   │      ├── vars/
   │      ├── tasks/
   │      ├── handlers/
   │      ├── templates/
   │      ├── files/
   │      └── meta/
   ├── tasks
   ├── post_tasks
   └── handlers (executed last)
```

---

✅ This note fully lists **all Ansible components**, what goes inside them, and their execution order.
