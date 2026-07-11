# Tmux Advanced Cheatsheet (Pro Edition)

A high-density reference for terminal multiplexing mastery. Tailored for engineers who live in the terminal and require efficient session survival, complex layouts, scriptability, and instant muscle memory.

---

## 🟢 Quick Navigation

| Section | Level | Focus |
|:---|:---|:---|
| [Essential Commands](#essential-commands) | 🟢 Basic | Key bindings, windows, and panes |
| [Session & Socket Management](#session--socket-management) | 🟡 Intermediate | Sockets, detachment, nested sessions |
| [Pane & Window Mastery](#pane--window-mastery) | 🟡 Intermediate | Layouts, syncing, movement, sizing |
| [Copy Mode & Buffers](#copy-mode--buffers) | 🟠 Advanced | Clipboard, search, vi-keys |
| [Automation & Scripting](#automation--scripting) | 🟠 Advanced | tmux-cli, send-keys, session templates |
| [Mnemonic Reference](#mnemonic-reference) | 💡 Setup | Muscle memory hacks |

---

## 🟢 Essential Commands

*Default prefix is `Ctrl + b` (referenced as `Prefix` below).*

### Windows & Panes
| Command | Action | Mnemonic |
|:---|:---|:---|
| `Prefix` + `c` | **Create** a new window | **C**reate |
| `Prefix` + `&` | Kill current window | **&** (Destroy/terminate) |
| `Prefix` + `,` | Rename current window | **Comma** (Edit tag) |
| `Prefix` + `w` | **Window** list (interactive picker) | **W**indows |
| `Prefix` + `"` | Split pane horizontally | **"** (Horizontal cut) |
| `Prefix` + `%` | Split pane vertically | **%** (Vertical slice) |
| `Prefix` + `x` | Kill current pane | **X**-out pane |
| `Prefix` + `z` | **Zoom** current pane to full screen | **Z**oom |
| `Prefix` + `o` | Rotate focus to the **other** pane | **O**ther |

---

## 🟡 Session & Socket Management

Control sessions programmatically and handle shared sockets or nested client environments.

### Session CLI Controls
```bash
tmux new -s prod_debug          # Start named session 'prod_debug'
tmux attach -t prod_debug       # Attach to 'prod_debug'
tmux ls                         # List running tmux sessions
tmux kill-session -t prod_debug # Kill specific session
tmux kill-server                # Kill all sessions and tmux server daemon
```

### Multi-Client & Socket Sharing
*   **Share terminal session with co-workers (Pair Programming):**
    ```bash
    tmux -S /tmp/shared_socket new -s pair_session
    chmod 777 /tmp/shared_socket
    # Peer attaches:
    tmux -S /tmp/shared_socket attach -t pair_session
    ```
*   **Detaching other clients (Steal session focus):**
    ```bash
    tmux attach -d -t dev_session  # Attach and Detach all other clients
    ```

### Nested Sessions Control
When running tmux inside another tmux (e.g., SSH into a remote machine running tmux):
*   `Prefix` (Local) then `Prefix` (Remote) sends the prefix command to the remote nested session.
*   *Or* configure local/remote prefix key toggles in your config.

---

## 🟡 Pane & Window Mastery

### Layouts & Alignment
| Key Binding | Action | Mnemonic |
|:---|:---|:---|
| `Prefix` + `Space` | Cycle through default layouts | **Space** to rotate layout |
| `Prefix` + `Ctrl + o` | Rotate all panes in current window | **O**rbit panes |
| `Prefix` + `!` | Break current pane out into a new window | **!** (Exclamation/Stand alone) |
| `Prefix` + `join-pane -s :2` | Pull window 2 into current window as a pane | Join pane |

### Advanced Resizing & Navigation
*   **Micro-adjust Pane Size:** Hold `Alt` + Arrow keys (usually default) or:
    `Prefix` + `Ctrl + Up/Down/Left/Right` (adjusts by 5 cells).
*   **Synchronize Panes (Run command in all panes simultaneously):**
    Press `Prefix` + `:`, then type:
    ```tmux
    setw synchronize-panes on   # Toggle ON (Run sync commands)
    setw synchronize-panes off  # Toggle OFF
    ```

---

## 🟠 Copy Mode & Buffers

Instantly search logs, scroll back, yank code, and manage internal buffers.

### Navigation (VI Mode)
To enable VI navigation in copy mode, add `setw -g mode-keys vi` to `~/.tmux.conf`.

| Command | Action | Mnemonic / VI Match |
|:---|:---|:---|
| `Prefix` + `[` | Enter **Copy Mode** (Scrollback mode) | **[** (Open bracket to hold text) |
| `g` / `G` | Go to top / bottom of buffer | Top / Bottom |
| `/` / `?` | Search forward / backward | Search |
| `Space` | Begin text selection (Visual mode) | Select |
| `Enter` | Yank selection and exit | Yank |
| `Prefix` + `]` | **Paste** last yanked buffer | **]** (Close bracket to insert text) |

### Buffer Management CLI
```bash
tmux list-buffers               # View all yanked buffers
tmux show-buffer -b 0           # Show contents of buffer 0
tmux save-buffer -b 0 log.txt   # Save buffer 0 to log.txt
```

---

## 🟠 Automation & Scripting

Automate development environment spin-ups using shell scripts.

### spinup_dev.sh (Interactive Setup Template)
Create a reproducible workspace template:
```bash
#!/usr/bin/env bash
SESSION="backend_dev"

# Check if session exists; if not, create detached server
tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
  # 1. Create session, name first window 'editor' and run vim
  tmux new-session -d -s $SESSION -n "editor"
  tmux send-keys -t $SESSION:1 "vim ." C-m

  # 2. Create second window 'services' for backend runner
  tmux new-window -t $SESSION -n "services"
  tmux split-window -h -t $SESSION:2
  tmux send-keys -t $SESSION:2.1 "docker compose up" C-m
  tmux send-keys -t $SESSION:2.2 "tail -f logs/app.log" C-m

  # 3. Create third window for shell
  tmux new-window -t $SESSION -n "shell"
  
  # Select default editor window
  tmux select-window -t $SESSION:1
fi

# Attach client
tmux attach-session -t $SESSION
```

---

## ⚙️ Config Optimization (~/.tmux.conf)

Put this high-productivity configuration in your `~/.tmux.conf`:

```tmux
# Change prefix to Ctrl + a (Easier to reach)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Reload config with prefix + r
bind r source-file ~/.tmux.conf \; display "Config Reloaded!"

# Split panes using logical | and - keys
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# Enable VI mode for scrolling/copying
setw -g mode-keys vi
bind-key -T copy-mode-vi v send-keys -X begin-selection
bind-key -T copy-mode-vi y send-keys -X copy-selection-and-cancel

# Vim-like pane switching
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Switch windows using Alt + Arrow without prefix
bind -n M-Left previous-window
bind -n M-Right next-window

# Fast pane resizing
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# Miscellaneous
set -g base-index 1          # Start window numbering at 1
setw -g pane-base-index 1     # Start pane numbering at 1
set -g renumber-windows on   # Renumber windows sequentially on close
set -g mouse on              # Enable mouse for scrolling/clicking
set -g history-limit 50000   # Large scrollback buffer
set -g default-terminal "screen-256color"
```

---

## 💡 Mnemonic Reference

*   `Prefix` + **`c`** = **C**reate window
*   `Prefix` + **`d`** = **D**etach client from current session
*   `Prefix` + **`w`** = **W**indows interactive list
*   `Prefix` + **`[`** = **[** Bracket open to hold/scroll scrollback buffer (Copy mode)
*   `Prefix` + **`]`** = **]** Bracket close to release/insert yanked content (Paste)
*   `Prefix` + **`z`** = **Z**oom current pane (Maximize toggle)
*   `Prefix` + **`s`** = **S**ession list (interactive picker)
*   `Prefix` + **`t`** = **T**ime display (shows clock)
*   `Prefix` + **`%`** = **%** Vertical slice (looks like split down the middle)
*   `Prefix` + **`"`** = **"** Horizontal cut (looks like upper/lower section division)
