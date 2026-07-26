# Sysadmin All-in-One Cheatsheet

A ultra-condensed single-page reference of core operations for systems administrators. Optimized for physical printing (A4/Letter) or single-screen display.

---

### ⌨️ Bash CLI (Vi Mode) & Job Control
| Shortcut / Command | Action / Sysadmin Use-Case |
| :--- | :--- |
| `set -o vi` | Enable **Vi Editing Mode** in current Bash session. |
| `Esc` -> `h` / `l` / `w` / `b` | Command mode navigation: cursor **left** / **right** / **word forward** / **word back**. |
| `Esc` -> `0` / `$` | Jump cursor to **beginning** / **end** of current command line. |
| `Esc` -> `D` / `d0` / `dd` | Cut text from cursor to **end** / **start** / **entire line**. |
| `Esc` -> `dw` / `p` / `u` / `v` | Cut word forward / Paste yank buffer / Undo edit / **Edit line in Vim** (`$EDITOR`). |
| `Esc` -> `k` / `j` / `/pat` | History navigation: **previous** command / **next** command / **search backward** for `pat`. |
| `!!` / `!$` | Re-run **entire last command** / Insert **last argument** of previous command. |
| `^old^new` | Quick correction: Run last command, replacing `old` with `new`. |
| `Ctrl + z` | Suspend current foreground process (sends `SIGTSTP`). |
| `jobs -l` / `fg %1` / `bg %1` | List jobs with PIDs / Resume job 1 in **foreground** / **background**. |
| `disown -h %1` | Keep background job 1 running even after exiting parent shell. |
| `cmd &> file` / `cmd1 |& cmd2` | Redirect stdout + stderr to `file` / Pipe stdout + stderr to `cmd2`. |
| `cmd <(other_cmd)` | **Process Substitution**: Treat stdout of `other_cmd` as a temporary file. |
| `(cd dir && cmd)` | Execute `cmd` in a subshell without changing current shell directory. |

---

### ⚡ Tmux Terminal Multiplexer (Prefix = `Ctrl + b` or `Ctrl + a`)
| Key Binding / Command | Action / Mnemonic |
| :--- | :--- |
| `tmux new -s name` / `attach -t name` | Create a new session named `name` / Attach to session named `name`. |
| `Prefix` + `d` / `Prefix` + `$` | **Detach** client from current session / Rename current session. |
| `Prefix` + `c` / `Prefix` + `,` | **Create** new window / Rename current window. |
| `Prefix` + `p` / `n` / `w` | **Previous** window / **Next** window / Interactive window list. |
| `Prefix` + `%` / `Prefix` + `"` | Split pane **vertically** / Split pane **horizontally**. |
| `Prefix` + `o` / `Prefix` + `x` / `Prefix` + `z` | Cycle focus / Kill current pane / Toggle **zoom** pane full screen. |
| `Prefix` + `!` | Break current pane out into its own window. |
| `Prefix` + `:setw synchronize-panes on/off` | Toggle **synchronized input** across all panes in current window. |
| `Prefix` + `[` | Enter **Copy/Scrollback Mode** (Use `/` to search, `Space` select, `Enter` yank). |
| `Prefix` + `]` | **Paste** last yanked buffer from Tmux clipboard. |
| `tmux list-buffers` / `show-buffer -b 0` | List Tmux paste buffers / Print contents of paste buffer index 0. |

---

### 🔍 Grep, Sed & Awk Text Processing Trio
```bash
# Grep: Print only matching IP addresses from logs recursively, ignoring node_modules
grep -r -oP --exclude-dir=node_modules "\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b" /var/log/

# Sed: In-place edit configuration file to change key/value pairs (GNU syntax)
sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config

# Awk: Aggregate nginx logs to find count of requests per IP ($1), sort highest first
awk '{ip[$1]++} END {for (k in ip) print k, ip[k]}' access.log | sort -rn -k2
```

| Tool | Snippet / Command | Action Description |
| :--- | :--- | :--- |
| **Grep** | `grep -r "pat" dir/` | Recursive search for `"pat"` inside `dir/`. |
| | `grep -v "pat"` / `grep -i "pat"` | **Invert** match (exclude) / Case-insensitive search. |
| | `grep -o "pat"` / `grep -P "pat"` | Output **only** matching parts / Use Perl regex (support `\d`, `\w`). |
| | `grep -C 3 "pat"` | Output 3 lines of context **before and after** match. |
| **Sed** | `sed 's/old/new/g' file` | Substitute `old` with `new` globally on each line. |
| | `sed -i 's/old/new/g' file` | **In-place** edit `file` (BSD/macOS requires backup suffix, e.g., `sed -i '' ...`). |
| | `sed '10,20s/old/new/g'` | Substitute `old` with `new` **only** between lines 10 and 20. |
| | `sed '/pat/d'` / `sed '5d'` | Delete all lines matching `/pat/` / Delete line number 5. |
| | `sed -E 's/(.*)\s(.*)/\2 \1/'` | Capture groups: Swaps first two words on line. |
| **Awk** | `awk -F',' '{print $1, $NF}'` | Parse CSV using field separator `,`, printing first and last columns. |
| | `awk '$5 > 90'` | Filter: Print lines where column 5 is greater than 90. |
| | `awk '{s+=$5} END {print s/NR}'` | Accumulate column 5 and output average at the end. |
| | `awk '!seen[$0]++'` | **Deduplicate**: Print only unique lines while maintaining file order. |

---

### 📝 Vim High-Efficiency Command Engine
| Motion / Command | Action / Command Description |
| :--- | :--- |
| `Ctrl + o` / `Ctrl + i` | Jump **backward** / **forward** through the historical jump list. |
| `g;` / `g,` | Jump **backward** / **forward** through the historical edit (change) list. |
| `*` / `#` | Search forward / backward for the exact word under the cursor. |
| `Ctrl + v` | Enter **Visual Block Mode** (ideal for column editing). |
| *Visual Block Edit* | Select lines -> `I` (or `A`) -> Type text -> Press `Esc` `Esc` (replicates to all lines). |
| `"0` / `"+` | Registers: Paste from **last yank** (safe from deletions) / Access **system clipboard**. |
| `"_d` / `"_c` | **Black Hole Register**: Delete or change text without overwriting your copy buffer. |
| `qa` / `q` / `@a` / `@@` | Record macro to register `a` / Stop / Play macro `a` / Replay last macro. |
| `:g/pattern/d` | **Global command**: Delete all lines containing `/pattern/`. |
| `:v/pattern/d` | **Inverse Global**: Delete all lines that **do not** contain `/pattern/`. |
| `:cfdo %s/old/new/g \| update` | Execute search-and-replace across all files in the current **Quickfix** list. |
