# 🐚 Bash Tricks: A Guide to Effective Bash Programming

## Table of Contents
- [TTY (Teletypewriter)](#tty-teletypewriter)
    - [Modern Meaning](#modern-meaning-linux)
    - [Identifying Your Terminal](#identifying-your-terminal)
    - [The Difference Between TTY and TERM](#the-difference-between-tty-and-term)
    - [Mental Model](#mental-model)
- [Whiptail: GUI Dialogs for Scripts](#whiptail-gui-dialogs-for-scripts)
    - [Example Usage](#example-usage)

---

## TTY (Teletypewriter)

A **TTY** is any text terminal interface that:
*   ⌨️ Accepts keyboard input
*   🖥️ Displays output on a screen
*   🔄 Provides a way to interact with a program

### Modern Meaning (Linux)

| Type | Name | Example |
| :--- | :--- | :--- |
| **Real TTY** | Linux Console | `/dev/tty1` (Access via `Ctrl+Alt+F1`) |
| **Pseudo TTY** | Terminal Emulator | `gnome-terminal`, `iTerm`, `Alacritty` |
| **Pseudo TTY** | Remote Session | SSH session |
| **Not a TTY** | Non-interactive | Background scripts, Pipes `|`, Files, Logs, CI/CD output |

### Identifying Your Terminal

*   `/dev/tty`: The current terminal attached to the process.
*   `pts`: Pseudo Terminal Slave.

You can check your current TTY with the `tty` command:

```bash
➜  BASH_SCRIPT tty
/dev/pts/8
```

### The Difference Between TTY and TERM

It is crucial to distinguish between the device and its capabilities:

*   **TTY** (`/dev/tty1`): The actual terminal **device** (connection). Used to send output.
*   **TERM** (`xterm-256color`): The terminal **type** description. It defines the capabilities (colors, cursor movement). Used to know which control codes to send.

> The `tput` command uses the **TTY** to send data and checks the **TERM** to know *what* data to send.

### Mental Model

> 🧠 "Think of a TTY as a very smart typewriter with a cursor and memory, but no concept of permanence."

---

## Whiptail: GUI Dialogs for Scripts

**Whiptail** is a text-based user interface (TUI) library for Bash scripts. It enables you to create user-friendly dialog boxes (like message boxes, input boxes, and menus) directly in the terminal. It is often installed by default on many Linux distributions (e.g., Ubuntu, Debian).

### Example Usage

Here is a simple example of a message box:

```bash
#!/bin/bash
set -e

# Display a message box with "Ok" button
whiptail --msgbox "Hello, World! 🌍" 8 40
```

*   **8**: Height of the box
*   **40**: Width of the box

When you run this script, it will pop up a TUI dialog box in your terminal.