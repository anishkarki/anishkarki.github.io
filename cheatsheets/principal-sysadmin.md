# Principal Sysadmin 2-Page Cheatsheet

A consolidated, ultra-dense reference for veteran systems administrators. Designed to maximize keyboard uptime, optimize remote multiplexing, and facilitate stream parsing.

---

## 📄 PAGE 1: The Shell and the Multiplexer

### ⌨️ Bash CLI Command Editing & Shortcuts
Maximize typing speed and command mutation efficiency inside standard POSIX shells.

| Category | Shortcut | Description / Action |
| :--- | :--- | :--- |
| **Editing** | `Ctrl + a` / `Ctrl + e` | Jump cursor to the **beginning** / **end** of the current command line. |
| | `Alt + f` / `Alt + b` | Move cursor **forward** / **backward** by one full word. |
| | `Ctrl + u` / `Ctrl + k` | Cut text from cursor to the **start** / **end** of the line. |
| | `Ctrl + w` / `Alt + d` | Cut one word **backward** (to space) / **forward** (to end of word). |
| | `Ctrl + y` | Paste (**yank**) the last cut text buffer back at the cursor. |
| | `Ctrl + xx` | Toggle cursor position between the current character and the start of the line. |
| **History** | `Ctrl + r` / `Ctrl + g` | Search history backward (incremental) / Exit history search mode. |
| | `!!` | Re-run the **entire last command** (e.g., `sudo !!`). |
| | `!$` | Insert the **last argument** of the previous command (e.g., `mkdir dir; cd !$`). |
| | `!*` | Insert **all arguments** of the previous command. |
| | `!:n` | Insert the **n-th argument** of the previous command (0-indexed). |
| | `!string` | Run the last command that **started** with `string`. |
| | `!?string?` | Run the last command that **contained** `string`. |
| | `^str1^str2^` | Quick substitution: Run last command, replacing `str1` with `str2`. |
| **Process** | `Ctrl + z` | Suspend current foreground process (sends `SIGTSTP`). |
| | `jobs -l` | List active background/suspended jobs with their process IDs (PIDs). |
| | `fg %n` / `bg %n` | Resume job `n` in the **foreground** / **background**. |
| | `disown -h %n` | Prevent job `n` from receiving a hangup (`SIGHUP`) signal when shell exits. |
| | `nohup cmd >/dev/null 2>&1 &` | Run command detached from terminal, immune to hangups. |
| **Streams** | `cmd &> file` | Redirect **both** stdout and stderr to `file` (equivalent to `cmd > file 2>&1`). |
| | `cmd1 |& cmd2` | Pipe **both** stdout and stderr of `cmd1` into `cmd2` (equivalent to `cmd1 2>&1 | cmd2`). |
| | `cmd <(other_cmd)` | **Process Substitution**: Treats stdout of `other_cmd` as a temporary file read by `cmd`. |
| | `(cd dir && cmd)` | Run `cmd` inside a subshell so your parent shell's directory doesn't change. |

---

### ⚡ Tmux Terminal Multiplexer (Vim-Mode Integration)
Persist sessions across flaky SSH connections, synchronize clusters, and navigate scrollbacks.

#### Session Control
```bash
tmux new -s admin_session       # Create named session 'admin_session'
tmux attach -t admin_session    # Attach to session 'admin_session'
tmux ls                         # List running sessions on current socket
tmux kill-session -t session    # Kill specific session
tmux kill-server                # Kill all tmux sessions and daemon
```

#### Key Bindings (Prefix = `Ctrl + b` by default)
| Scope | Key Binding | Action / Mnemonic |
| :--- | :--- | :--- |
| **Session** | `Prefix` + `d` | **Detach** client from current session. |
| | `Prefix` + `$` | Rename current session. |
| | `Prefix` + `s` | Interactive list of all sessions. |
| **Window** | `Prefix` + `c` | **Create** new window. |
| | `Prefix` + `,` | Rename current window. |
| | `Prefix` + `p` / `n` | Select **previous** / **next** window. |
| | `Prefix` + `w` | Interactive list of all windows in all sessions. |
| | `Prefix` + `&` | Kill current window. |
| **Pane** | `Prefix` + `%` | Split pane **vertically** (side-by-side). |
| | `Prefix` + `"` | Split pane **horizontally** (top-and-bottom). |
| | `Prefix` + `o` | Rotate focus to the **other** pane. |
| | `Prefix` + `x` | Kill current pane. |
| | `Prefix` + `z` | **Zoom** toggle: Toggle current pane full screen. |
| | `Prefix` + `!` | Break current pane out into a new separate window. |
| | `Prefix` + `Space` | Cycle through default tmux layouts. |

#### Multi-Pane Cluster Operations (Same Input)
Run command in all panes of the current window simultaneously:
*   Activate: `Prefix` + `:`, then type `setw synchronize-panes on`
*   Deactivate: `Prefix` + `:`, then type `setw synchronize-panes off`

#### Copy Mode & Buffer Management (VI Navigation)
First, ensure VI mode is enabled in configuration (`setw -g mode-keys vi`).
1.  **Enter Copy Mode:** `Prefix` + `[` (allows free cursor movement and scrollback search).
2.  **Navigation:** Use standard Vim movements (`h`, `j`, `k`, `l`, `w`, `b`, `g`, `G`).
3.  **Search:** Press `/` (search forward) or `?` (search backward), type query, hit `Enter`. Press `n`/`N` to cycle.
4.  **Select Text:** Move to start, press `Space` (selects characters) or `V` (selects lines).
5.  **Yank Text:** Press `Enter` (or `y` if custom binding is set) to copy to Tmux clipboard and exit.
6.  **Paste Text:** `Prefix` + `]` to insert the copied buffer.

#### Paste Buffer Command Line Interface (CLI)
```bash
tmux list-buffers               # View all yanked buffers stored in memory
tmux show-buffer -b 0           # Display the contents of buffer index 0
tmux save-buffer -b 0 log.txt   # Dump paste buffer 0 directly into log.txt
```

#### Highly Efficient `~/.tmux.conf` Configuration
```tmux
# Rebind Prefix to Ctrl + a (Easier target on home row)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Reload configurations dynamically
bind r source-file ~/.tmux.conf \; display "Config Reloaded!"

# Split panes using intuitive visual keys
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# Enable VI mode bindings for copying text
setw -g mode-keys vi
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind-key -T copy-mode-vi y send-keys -X copy-selection-and-cancel

# Vim-style pane hopping without repeating Prefix
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Quality of life settings
set -g base-index 1          # Start window index at 1 (not 0)
setw -g pane-base-index 1     # Start pane index at 1
set -g renumber-windows on   # Renumber windows dynamically when one closes
set -g mouse on              # Enable mouse scrolling and window sizing
set -g history-limit 100000  # Expand scrollback buffer limit
```

<div style="page-break-after: always;"></div>

## 📄 PAGE 2: Stream Manipulation and Text Editing

### 🔍 Grep: High-Performance Pattern Matching
Find strings and parse code bases with recursive engines and regular expressions.

```bash
grep [options] "pattern" [files]
```

| Flag | Meaning | Description / Sysadmin Target Use-Case |
| :--- | :--- | :--- |
| `-r` / `-R` | Recursive | Search directory. `-R` follows symbolic links; `-r` ignores them. |
| `-i` | Case Insensitive | Ignores case checks when evaluating matching lines. |
| `-v` | Invert Match | Return lines that **do not** contain the specified pattern. |
| `-c` | Count | Output only the number of matching lines instead of lines themselves. |
| `-l` / `-L` | List Files | Output only names of files with matches / files **without** matches. |
| `-o` | Only Matching | Print only the matching parts of lines (on new lines) rather than full line. |
| `-E` | Extended Regex | Support `?`, `+`, `{}`, `()`, `|` syntax without escaping. |
| `-P` | Perl Regex (PCRE) | Enable Perl engine (support `\d`, `\w`, `\s`, negative lookaheads). |
| `-A n` / `-B n` | Context | Print `n` lines **After** / **Before** the match. |
| `-C n` | Context | Print `n` lines of context **before and after** the match. |

#### Grep High-Value Shell Snippets
```bash
# Search recursively, excluding binary folders & dependency trees
grep -r --exclude-dir={.git,node_modules,vendor} "pattern" /etc/

# Extract IP addresses from log files using Perl regex syntax
grep -oP "\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b" /var/log/nginx/access.log

# Inspect system panic errors alongside their following stack logs
grep -A 10 "Kernel panic" /var/log/messages
```

---

### 🌊 Sed: Stream Editor for In-Place Modifications
Automate text replacement, filter ranges, and edit system files in place.

```bash
sed [options] 'script' input_file
```

*   **In-Place Editing (`-i`):** Modifies files directly.
    *   *Linux (GNU):* `sed -i 's/old/new/g' file`
    *   *macOS/BSD:* `sed -i '' 's/old/new/g' file` (requires blank string to skip backup suffix)

| Operation | Command Example | Action Description |
| :--- | :--- | :--- |
| **Substitution** | `sed 's/old/new/' file` | Replaces **first** occurrence of `old` with `new` on each line. |
| | `sed 's/old/new/g' file` | **Global**: Replaces **all** occurrences on each line. |
| | `sed 's/old/new/2' file` | Replaces only the **second** match on each line. |
| **Address Scope** | `sed '5s/old/new/' file` | Perform replacement **only** on line number 5. |
| | `sed '10,20s/old/new/g' file`| Perform replacement **only** between lines 10 and 20 (inclusive). |
| | `sed '/pattern/s/old/new/g'` | Perform replacement **only** on lines matching `/pattern/`. |
| **Deletion** | `sed '5d' file` | Delete line number 5 from output. |
| | `sed '10,20d' file` | Delete range from line 10 to 20. |
| | `sed '/pattern/d' file` | Delete all lines matching `/pattern/`. |
| **Backref** | `sed -E 's/(.*)\s+(.*)/\2 \1/'` | Swaps two words separated by spaces (`\1` and `\2` capture groups). |

#### Hold Space & Pattern Space (Multi-line manipulation)
*   **Reverse file lines (`tac` equivalent):**
    `sed -n '1!G;h;$p' file`
    *(Mnemonic: If not line 1, append Hold to Pattern space; overwrite Hold with Pattern; at end of file, print).*
*   **Double space a file:**
    `sed 'G' file` (appends empty hold space to every line before printing).
*   **Print only odd-numbered lines:**
    `sed -n 'p;n' file` (prints line, then reads next line without printing).

---

### 📊 Awk: Structured Log Parsing & Calculations
Extract fields, build tables, execute mathematical pipelines, and compile reporting logic.

```bash
awk [options] 'BEGIN{ actions } pattern{ actions } END{ actions }' file
```

#### Core Built-in Variables
*   `$0`: Entire current record/line.
*   `$1`, `$2` ... `$NF`: Field indices (by default split by whitespace).
*   `NF`: **Number of Fields** in current line (last field is `$NF`).
*   `NR`: **Number of Records** (overall line counter across all files).
*   `FNR`: **File-specific Record Number** (resets to 1 when reading a new file).
*   `FS` / `OFS`: Field Separator (Input) / Output Field Separator.
*   `RS` / `ORS`: Record Separator (Input) / Output Record Separator.

#### Operations & Aggregations
```bash
# Parse CSV using customized Field Separator (FS)
awk -F',' '{print $1, $NF}' data.csv

# Perform sums and averages on column 5
awk '{sum += $5} END {print "Total: " sum " | Avg: " sum/NR}' system.stats

# Filter by column threshold value
awk '$5 > 90 {print "High Usage Line: " NR ", Value: " $5}' sys.log

# Extract logs occurring within a specific date/time range
awk '$1 >= "2026-07-08T09:00:00" && $1 <= "2026-07-08T10:00:00" {print}' access.log
```

#### Associative Arrays (Dictionaries & Analytics)
```bash
# Frequency distribution: Count hits per IP and sort results
awk '{ip_hits[$1]++} END {for (ip in ip_hits) print ip, ip_hits[ip]}' /var/log/nginx/access.log | sort -rn -k2

# Deduplicate lines while maintaining original line ordering (Fastest method)
awk '!seen[$0]++' duplicated_file.txt
```

---

### 📝 Vim: High-Performance Command Engine
Manipulate configs, refactor streams, and apply visual patterns inside the POSIX editor.

#### Advanced Jump & Change Lists
*   `Ctrl + o` / `Ctrl + i` : Jump **backward** / **forward** through the historical jump list (across files).
*   `g;` / `g,` : Jump **backward** / **forward** through the historical location of your edits (change list).
*   `*` / `#` : Search forward / backward for the word currently sitting under the cursor.

#### Visual Block Multi-Line Operations (`Ctrl + v`)
Apply edits to multiple parallel lines simultaneously:
1.  **Block Select:** Press `Ctrl + v` and use arrow keys/movement to select a column range.
2.  **Insert Mode:** Press `I` (uppercase i) to insert text *before* the block, or `A` to append *after* the block.
3.  **Apply Change:** Type your text, then press `Esc` twice. Vim will replicate the typed characters on all lines.
4.  **Replace Block:** Select block, press `c` (change), type replacement, and press `Esc` twice.

#### Advanced Register Manipulation
Registers hold text, macros, or clipboard systems. Specify registers using `"{register_name}`.

| Register | Name / Type | Behavior and Use Case |
| :--- | :--- | :--- |
| `""` | Unnamed | Default copy/delete destination. Overwritten on every change. |
| `"0` | Yank Register | Holds the **last yanked text** (safe from deletion overwrites). |
| `"+` / `"*` | System Clipboard | Interface with operating system clipboard (`"+` is standard ctrl+c/ctrl+v buffer). |
| `"_` | Black Hole | Trashes deleted text without writing to registers (`"_d` deletes text forever). |
| `"a` to `"z` | Named | Permanent storage buckets. Uppercase (e.g. `"A`) **appends** to the register. |

#### Macro Orchestration & Refactoring
Record repetitive key combinations to repeat them precisely on lines.
*   **Record:** Press `q` followed by a register name (e.g. `qa` to record into register `a`). Perform actions.
*   **Stop:** Press `q` in normal mode to terminate recording.
*   **Execute:** Press `@a` to play back macro `a`. Press `@@` to run the last executed macro.
*   **Edit a Macro:**
    1.  Paste macro contents: `"ap` (displays key sequence in a line).
    2.  Edit the keystrokes manually.
    3.  Yank edited sequence back: `0"ay$` (copies updated commands back to register `a`).

#### Global Command Actions (`:g`)
Perform commands on lines that match a regular expression pattern.
```vim
:g/pattern/d                     # Delete all lines matching 'pattern'
:v/pattern/d                     # Delete all lines that DO NOT match 'pattern' (alternative: :g!/pattern/d)
:g/TODO/t $                      # Find all lines with TODO and copy them (t) to the end of the file ($)
:g/pattern/s/old/new/g           # Substitute 'old' with 'new' only on lines matching 'pattern'
```

#### Project-Wide Quickfix Search & Replacement
```vim
:vimgrep /pattern/ **/*.txt     # Search files and populate the quickfix window
:copen                          # Open the interactive quickfix navigation window
:cfdo %s/old/new/g | update      # Run substitution across ALL files in list and save them
```
