---
title: Ansible Best Practices — Day 4
layout: default
render_with_liquid: false
---

# DevOps Best Practices

## Ansible Best Practices — Day 4

> **Core Concept:**  
> Ansible is all about **Configuration as Code** — defining infrastructure and configuration in declarative YAML playbooks for automation, consistency, and repeatability.

---

### 🔹 Variables and Facts

- Variables allow **site-specific customization** in playbooks.  
- **Facts** are pieces of information **gathered automatically** about managed hosts by the **setup** module (runs at the start of each play).  

---

### 🧩 Syntax Rules

- Store variables in **separate files** for better organization.  
- To reference a variable, use double curly braces:  
  ```yaml
  {{ var_name }}
  ```
- If a value **starts with a variable**, wrap the variable in **double quotes**:
  ```yaml
  msg: "{{ var_name }} is set"
  ```
- Since **Ansible 2.5**, variables can be defined using the `vars:` keyword **without curly braces**:
  ```yaml
  vars:
    var_name: value
  ```

---

### 📦 Variable Precedence — Common Ways to Define Variables

Variables can be defined in multiple places:

1. **Play headers** (using `vars:`)  
2. **Include files** with `vars_files:`  
3. **At runtime** with the `set_fact` module  
4. **Command line** via `-e key=value`  
5. **Inventory files**  
6. **Host or host group variable files**  
7. **Interactive prompts** using `vars_prompt`  

> 🔐 Use **Ansible Vault** to store sensitive variables securely.

---

### 🧠 Using `set_fact`

- The `set_fact` module sets variables **dynamically during playbook execution**.
- Variables set this way:
  - Are **persistent** within the playbook.  
  - Can be used in **later tasks**.  
  - Are useful for **creating dynamic variables** based on results of previous tasks.  

Example:
```yaml
- name: Set a dynamic fact
  set_fact:
    my_fact: "Value from previous task"
```

---

### 📁 Group Variables (`group_vars`)

To define variables for inventory groups:

1. Create a directory named **`group_vars/`** in the same directory as your playbook.
2. Create a file named after the group (e.g., `webservers`).
3. Add variables in YAML format.

Example:
```yaml
# group_vars/webservers
web_package: httpd
web_service: httpd
```

---

### 💡 Accessing Facts

- `ansible_facts` is a **dictionary** that contains all system facts.
- Access a specific fact using **dot** or **key** notation:
  ```yaml
  ansible_facts['os_family']
  ansible_facts.os_family
  ```
- To display all facts:
  ```yaml
  - name: Show all facts
    debug:
      var: ansible_facts
  ```

---

### 🐢 Fact Gathering Performance

- Fact gathering can be **slow** on some systems.  
- Disable it when unnecessary using:
  ```yaml
  gather_facts: no
  ```
- Use `/etc/hosts` to ensure consistent name resolution across nodes.

---

### 🧰 Multi-Valued Variables

- **Lists (arrays)** and **dictionaries (hashes)** can both be used as variables.  
- Lists are ordered, dictionaries are key-value pairs.  
- YAML syntax example:
  ```yaml
  fruits:
    - apple
    - banana
  person:
    name: John
    age: 30
  ```
- Use `dict2items` to iterate through dictionaries in a loop.  
- Example fact: `ansible_mounts` → list of dictionaries describing mounted filesystems.

---

### 🧙 Magic Variables

Reserved variables automatically created by Ansible:

| Variable | Description |
|-----------|-------------|
| `hostvars` | Access variables of other hosts, e.g., `hostvars['hostname']['var_name']` |
| `groups` | List all hosts in an inventory group, e.g., `{% for host in groups['group_name'] %}` |
| `inventory_hostname` | Name of the host as in the inventory (useful when facts are disabled) |
| `inventory_hostname_short` | Short hostname (without domain) |
| `group_names` | List of all groups the host belongs to, e.g., `{% if 'group_name' in group_names %}` |

---

### 📝 Registers

- Use the `register` keyword to **store task output** in a variable.  
- The variable can be referenced in later tasks.  

Example:
```yaml
- name: Check uptime
  command: uptime
  register: uptime_output

- name: Display uptime
  debug:
    var: uptime_output.stdout
```

---

### 🔐 Ansible Vault

Used to encrypt sensitive data and variables.

| Command | Description |
|----------|-------------|
| `ansible-vault create filename` | Create a new encrypted file |
| `ansible-vault edit filename` | Edit an encrypted file |
| `ansible-vault view filename` | View an encrypted file |
| `ansible-vault encrypt filename` | Encrypt an existing file |
| `ansible-vault decrypt filename` | Decrypt an encrypted file |
| `ansible-playbook --ask-vault-pass playbook.yml` | Run playbook prompting for vault password |

---

### 🧪 Lab Exercise

1. Create an inventory file defining two groups: `webservers` and `dbservers`.  
2. Create the file `group_vars/webservers` with:
   ```yaml
   web_package: httpd
   web_service: httpd
   ```
3. Write a simple playbook that uses the **debug** module to display the values of `web_package` and `web_service`.

Example:
```yaml
- name: Display web variables
  hosts: webservers
  gather_facts: no
  tasks:
    - name: Show web package and service
      debug:
        msg: "Package: {{ web_package }}, Service: {{ web_service }}"
```
