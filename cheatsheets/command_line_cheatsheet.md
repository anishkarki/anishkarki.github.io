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

## 🟢 Readline Keyboard Shortcuts (Vi Mode)

Enable Vi mode in Bash with `set -o vi` (or `set editing-mode vi` in `~/.inputrc`).
Press **`Esc`** to enter Command Mode.

### Movement (Command Mode `Esc`)
| Shortcut | Action | Mnemonic / Description |
|:---|:---|:---|
| **`h`** / **`l`** | Move cursor **left** / **right** one character | Standard Vi direction |
| **`w`** / **`b`** | Move cursor **forward** / **back** one word | **W**ord / **B**ack |
| **`e`** | Move cursor to **end** of current word | **E**nd of word |
| **`0`** / **`$`** | Jump cursor to **start** / **end** of line | Line boundaries |
| **`f{char}`** / **`F{char}`** | Find **next** / **previous** occurrence of `{char}` | **F**ind character |

### Editing, Deleting & Pasting (Command Mode `Esc`)
*   **`i`** / **`a`** — Insert **before** / Append **after** cursor (returns to Insert mode).
*   **`I`** / **`A`** — Insert at **start** / Append at **end** of line.
*   **`x`** / **`X`** — Delete character **under** / **before** cursor.
*   **`dw`** / **`db`** — Cut word **after** / **before** cursor.
*   **`D`** / **`d0`** — Cut text from cursor to **end** / **start** of line.
*   **`dd`** / **`C`** — Cut **entire line** / Change to end of line.
*   **`p`** / **`P`** — Paste last cut buffer **after** / **before** cursor.
*   **`u`** / **`~`** — **Undo** last edit / Toggle character case.
*   **`v`** — **Open current line in Vim** (`$EDITOR`) for complex editing.

### History Navigation (Command Mode `Esc`)
*   **`k`** / **`j`** — Move to **previous** (older) / **next** (newer) command in history.
*   **`/pattern`** — Search history **backward** for `pattern` (press `Enter` to edit, `n`/`N` for next/prev match).
*   **`?pattern`** — Search history **forward** for `pattern`.
*   **`G`** — Jump to most **recent** command line.
*   **`Ctrl + r`** — Interactive reverse incremental history search.

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

---

## 🚨 God-Tier Production Debugging & Emergency Incident Response

Essential production survival commands for debugging live systems under load.

### 1. Memory & OOM Killer Audits
* **Audit Kernel OOM Kills (with real human-readable timestamps):**
  ```bash
  dmesg -T | grep -i oom
  journalctl -k -g "Out of memory" --no-pager
  ```
* **Top Memory Consumers by Fair PSS (Proportional Set Size):**
  ```bash
  smem -r -k -s pss | head -15
  ```
* **Inspect Real Available RAM & Kernel Slab Leaks:**
  ```bash
  cat /proc/meminfo | grep -E "MemAvailable|SUnreclaim"
  ```

### 2. Disk Space Leaks & File Lock Locks
* **Find Hidden Disk Leaks (Deleted files held open by active PIDs):**
  ```bash
  lsof | grep deleted
  ```
* **Truncate & Reclaim Space from Deleted Open File Descriptor (without restart!):**
  ```bash
  > /proc/$PID/fd/$FD
  ```
* **Identify / Kill Processes Blocking Partition Unmount:**
  ```bash
  fuser -v /mountpoint
  fuser -k -9 -m /mountpoint
  ```
* **Real-time Disk Bottleneck & I/O Wait Latency Audit:**
  ```bash
  iostat -xz 1 5   # (%util at 100% or high await indicates disk bottleneck)
  ```

### 3. CPU Bottlenecks & System Call Profiling
* **Per-Process CPU & Disk I/O Breakdown:**
  ```bash
  pidstat -u 1 5   # Per-process CPU usage
  pidstat -d 1 5   # Per-process Disk Read/Write rates
  ```
* **Syscall Summary Histogram (Find which system call is hanging the process):**
  ```bash
  strace -c -p <PID>
  ```
* **Live System Call Data Preview (Trace open files & sockets):**
  ```bash
  strace -fp <PID> -e trace=file,network -s 512
  ```
* **Live Function-Level C/Java Profiler (Without restarting app):**
  ```bash
  perf top -p <PID>
  ```

### 4. Network Queues & HTTP Latency Profiling
* **Socket Queue Backlog Audit (Non-zero Recv-Q/Send-Q = Application thread pool backlog):**
  ```bash
  ss -tulpn
  ss -s
  ```
* **Pinpoint Exact HTTP Latency Bottlenecks (DNS vs TLS vs Backend TTFB):**
  ```bash
  curl -ivs -o /dev/null -w "DNS: %{time_namelookup}s | TLS: %{time_appconnect}s | TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" https://example.com
  ```
