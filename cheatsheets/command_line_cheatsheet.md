# Advanced Command Line & Shell Scripting

A dense CLI reference for system engineers and principal developers. Covers advanced Bash scripting paradigms, pipeline debugging, network diagnostics, process tracing, and text parsers.

---

## 🟢 Quick Navigation

| Section | Level | Focus |
|:---|:---|:---|
| [Readline Keyboard Shortcuts](#readline-keyboard-shortcuts) | 🟢 Basic | Terminal line control |
| [Process Inspection & Signals](#process-inspection--signals) | 🟡 Intermediate | System tracing, ports, process signals |
| [Network Diagnostics](#network-diagnostics) | 🟡 Intermediate | Sockets, routing, packet sniffing |
| [Bash Parameter & History Expansion](#bash-parameter--history-expansion) | 🟠 Advanced | Dynamic string manipulation, bang commands |
| [Pipeline Mastery (Awk, Sed, Jq)](#pipeline-mastery-awk-sed-jq) | 🟠 Advanced | Log parsing, structural data filters |
| [Shell Options & Execution Control](#shell-options--execution-control) | ⚙️ Setup | Safety flags, process redirection |

---

## 🟢 Readline Keyboard Shortcuts

Control the shell command prompt without breaking flow.

### Cursor Movement
| Shortcut | Action | Mnemonic |
|:---|:---|:---|
| **`Ctrl + a`** | Move cursor to the **beginning** of the line | **A**lpha (Start) |
| **`Ctrl + e`** | Move cursor to the **end** of the line | **E**nd |
| **`Alt + b`** / **`Alt + f`** | Move cursor **back** / **forward** one word | **B**ack / **F**orward |
| **`Ctrl + b`** / **`Ctrl + f`** | Move cursor **back** / **forward** one character | **B**ackward / **F**orward |
| **`Ctrl + xx`** | Toggle cursor between start of line and current position | X-axis jump |

### Editing & Yanking
*   **`Ctrl + k`** — **Kill** (cut) text from current cursor to the **end** of the line.
*   **`Ctrl + u`** — **Undo** (cut) text from cursor to the **start** of the line.
*   **`Ctrl + w`** — Cut the word **before** the cursor.
*   **`Alt + d`** — Cut the word **after** the cursor.
*   **`Ctrl + y`** — **Yank** (paste) the last cut text back into the terminal.
*   **`Ctrl + _`** — Undo the last keyboard edit.

---

## 🟡 Process Inspection & Signals

Debug application runtimes, lock files, and zombie processes.

### System Tracing & Process Audits
*   **Find process holding port open:**
    ```bash
    lsof -i :8080
    ss -tulanp | grep 8080
    ```
*   **Trace system calls of running process:**
    ```bash
    strace -p <PID> -f -e trace=network,openat
    ```
*   **View process tree hierarchy:**
    ```bash
    pstree -aps <PID>
    ```

### Signal Codes (`kill -[SIGNAL] <PID>`)
| Signal | Value | Action | Mnemonic / Purpose |
|:---|:---|:---|:---|
| **`SIGHUP`** | `1` | Hangup / reload configuration | **H**ang **U**p (Daemon hot reload) |
| **`SIGINT`** | `2` | Interrupt from keyboard (`Ctrl+c`) | **I**nterrupt |
| **`SIGKILL`** | `9` | Forceful shutdown (non-catchable) | **Kill** immediately |
| **`SIGTERM`** | `15` | Polite terminate (allows cleanup / default) | **Term**inate |
| **`SIGSTOP`** | `19` | Suspend process execution | **Stop** scheduling |
| **`SIGCONT`** | `18` | Continue suspended process | **Cont**inue |

---

## 🟡 Network Diagnostics

Inspect network packets and test endpoint listeners.

### Tools & Use Cases
*   **Audit Active Listeners:**
    ```bash
    ss -tulanp  # (t: TCP, u: UDP, l: Listening, a: All, n: Numeric, p: Process PID)
    ```
*   **Port Scanning & Banner Grabbing:**
    ```bash
    nc -zv 10.0.0.1 22-80      # Scan port range (z: zero-I/O, v: verbose)
    nc -w 3 10.0.0.1 80        # Probe HTTP header banner with 3s timeout
    ```
*   **Packet Sniffing (Raw Traffic Dump):**
    ```bash
    tcpdump -i eth0 -A port 80  # Dump HTTP text payload from eth0 (A: ASCII)
    tcpdump -i any host 1.1.1.1 # Monitor all interface traffic targeting IP
    ```

---

## 🟠 Bash Parameter & History Expansion

Manipulate variables dynamically and invoke command history.

### Bash Parameter Expansions
Assume `FILE="/opt/app/src/server.ts"`

| Pattern | Expansion Code | Result / Action | Mnemonic |
|:---|:---|:---|:---|
| Default Value | `${TIMEOUT:-30}` | Returns `30` if `TIMEOUT` is unset or empty | **Default** |
| Error on Unset | `${DB_URL:?Need DB}` | Exits script with error message if unset | **Assert** |
| Replace First | `${FILE/server/client}` | `"/opt/app/src/client.ts"` | **Substitute** |
| Replace All | `${FILE//s/z}` | `"/opt/app/zrc/zerver.tz"` | **Global sub** |
| Strip Prefix (Short) | `${FILE#*/}` | `"opt/app/src/server.ts"` (Removes up to first `/`) | **#** (Front trim) |
| Strip Prefix (Long) | `${FILE##*/}` | `"server.ts"` (Extract file basename) | **##** (Max front trim) |
| Strip Suffix (Short) | `${FILE%/*}` | `"/opt/app/src"` (Extract parent directory) | **%** (Back trim) |
| Strip Suffix (Long) | `${FILE%%/*}` | `""` (Removes everything after first `/`) | **%%** (Max back trim) |

### History (Bang Commands)
*   **`!!`** — Re-run the last command (e.g., `sudo !!` to run with root permissions).
*   **`!$`** — Select the **last argument** of the previous command (e.g., `cat !$`).
*   **`!^`** — Select the **first argument** of the previous command (e.g., `mkdir !^`).
*   **`!*`** — Select **all arguments** of the previous command.
*   **`!:2`** — Select the **second argument** of the previous command.
*   **`!gi`** — Run the most recent history command starting with `gi` (e.g., `git status`).
*   **`^old^new`** — Substitute `old` with `new` in last command and run (fix typo).

---

## 🟠 Pipeline Mastery (Awk, Sed, Jq)

Process unstructured logs or structured payloads inside shell streams.

### Advanced Awk
*   **Average values in column 3:**
    ```bash
    awk '{ sum += $3; count++ } END { print "Avg:", sum/count }' metrics.log
    ```
*   **Count occurrences of unique values (simulates uniq -c):**
    ```bash
    awk '{ count[$1]++ } END { for (ip in count) print ip, count[ip] }' access.log
    ```

### Advanced Sed
*   **In-place edit with backup configuration:**
    ```bash
    sed -i.bak 's/localhost/production/g' config.env
    ```
*   **Delete lines containing pattern OR empty lines:**
    ```bash
    sed -e '/DEBUG/d' -e '/^$/d' server.log
    ```

### Jq (Structured JSON Parser)
*   **Filter JSON and extract nested arrays:**
    ```bash
    jq '.users[] | select(.role == "admin") | .email' users.json
    ```
*   **Reconstruct JSON keys and export as CSV:**
    ```bash
    jq -r '.items[] | [.id, .metadata.name] | @csv' data.json > output.csv
    ```

---

## ⚙️ Shell Options & Execution Control

Write safe and defensive scripts. Place these flags at the top of your scripts.

### Defensive Shell Configurations
```bash
set -o errexit   # (set -e) Exit immediately if any command returns non-zero status
set -o nounset   # (set -u) Exit if script tries to reference an undefined variable
set -o pipefail  # Pipeline exit code matches the rightmost command that failed
set -o xtrace    # (set -x) Print commands to stderr before executing (debug mode)
```
*Combined safety shorthand:* `set -euo pipefail`

### Redirections & Process Substitution
*   **Silent stdout and stderr:**
    ```bash
    run_command &>/dev/null
    ```
*   **Process Substitution (compare outputs of two commands as files):**
    ```bash
    diff <(curl -s api.com/v1) <(curl -s api.com/v2)
    ```
