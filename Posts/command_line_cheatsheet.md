# Command Line Cheatsheet

A collection of useful keyboard shortcuts and essential Bash commands to improve your terminal productivity.

## ⌨️ Command Line Navigation (Readline Shortcuts)

Mastering these shortcuts will allow you to fly through the command line without reaching for the arrow keys.

### Cursor Movement
| Shortcut | Action | Mnemonic/Note |
| :--- | :--- | :--- |
| **Ctrl + A** | Go to the **beginning** of the line | **A**lpha (Start) |
| **Ctrl + E** | Go to the **end** of the line | **E**nd |
| **Alt + B** | Move back one **word** | **B**ack |
| **Alt + F** | Move forward one **word** | **F**orward |
| **Ctrl + B** | Move back one **character** | **B**ackward |
| **Ctrl + F** | Move forward one **character** | **F**orward |
| **Ctrl + XX** | Toggle between start of line and current cursor position | |

### Editing
| Shortcut | Action | Note |
| :--- | :--- | :--- |
| **Ctrl + K** | Cut text from cursor to the **end** of the line | "Kill" |
| **Ctrl + U** | Cut text from cursor to the **start** of the line | |
| **Ctrl + W** | Cut the word **before** the cursor | Useful for deleting typos |
| **Alt + D** | Cut the word **after** the cursor | |
| **Ctrl + Y** | **Paste** (Yank) the last deleted text | Restores text cut with K, U, or W |
| **Alt + T** | Swap current word with previous word | |
| **Ctrl + _** | Undo the last edit | |

### History & Control
| Shortcut | Action | Note |
| :--- | :--- | :--- |
| **Ctrl + R** | **Search** history backward | Type to search, Ctrl+R again to cycle |
| **Ctrl + G** | **Quit** history search mode | |
| **Ctrl + L** | **Clear** the screen | Preserves current command |
| **Ctrl + C** | **Kill** the current running process | SIGINT |
| **Ctrl + Z** | **Suspend** the current process | Send to background (resume with `fg`) |
| **Ctrl + D** | **Exit** the current shell | Same as `exit` |

---

## 🛠️ Important Bash Commands

### File & Directory Management
*   `ls -lah`: List all files, including hidden ones, with details in human-readable format.
*   `cd -`: Switch to the **previous** directory you were in.
*   `mkdir -p path/to/folder`: Create nested directories in one go.
*   `cp -r source dest`: Copy directories recursively.
*   `rm -rf path`: Force remove a directory and its contents (⚠️ use with caution).

### Searching & text Processing
*   `grep -r "text" .`: Recursively search for "text" in the current directory.
    *   `grep -i`: Case insensitive search.
    *   `grep -v`: Invert match (exclude lines).
*   `find . -name "*.txt"`: Find files ending in `.txt` starting from current directory.
*   `head -n 5 file`: Show the first 5 lines of a file.
*   `tail -f file.log`: Follow the output of a log file in real-time.
*   `history | grep "command"`: Search your command history for a specific command.

### System & Processes
*   `ps aux`: List all running processes.
*   `top` / `htop`: Interactive process viewer (shows CPU/RAM usage).
*   `df -h`: Show disk space usage in human-readable format.
*   `du -sh *`: Show the size of files and directories in the current folder.
*   `chmod +x script.sh`: Make a file executable.
*   `chown user:group file`: Change file owner and group.

### Productivity Tricks
*   `!!`: Run the **last command** again.
    *   Example: `sudo !!` (Run the last command with sudo).
*   `!$`: Reuse the **last argument** of the previous command.
    *   Example: `mkdir project; cd !$` (Makes 'project' and then cds into it).
*   `alias name='command'`: Create your own shortcuts.
    *   Example: `alias ll='ls -lah'`
