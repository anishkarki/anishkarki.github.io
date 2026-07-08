# VS Code Advanced Productivity

A high-density reference for power users. Focuses on advanced multi-cursor execution, workspace search filters, regular expression replacements, and custom task scripting.

---

## 🟢 Quick Navigation

| Section | Level | Focus |
|:---|:---|:---|
| [Multi-Cursor Mastery](#multi-cursor-mastery) | 🟢 Basic | Inline edits, selections |
| [Advanced Navigation & Views](#advanced-navigation--views) | 🟡 Intermediate | Symbol search, layout groups |
| [Regular Expression Search & Replace](#regular-expression-search--replace) | 🟠 Advanced | Capture groups, case filters |
| [Tasks & Keybindings Config](#tasks--keybindings-config) | 🟠 Advanced | Workspace automations |
| [Mnemonic Reference](#mnemonic-reference) | 💡 Setup | Keyboard shortcuts mappings |

---

## 🟢 Multi-Cursor Mastery

Accelerate edits by manipulating multiple variables or code structures simultaneously.

### Operations & Shortcuts
| Shortcut | Action | Mnemonic |
|:---|:---|:---|
| `Alt` + Click | Insert cursor at target location | Direct insert |
| `Ctrl + Alt + Up/Down` | Insert cursor vertically above / below | Vertical stack |
| `Ctrl + D` | Select next occurrence of current word | **D**uplicate cursor |
| `Ctrl + K` then `Ctrl + D` | Skip current occurrence and move cursor to next | Skip match |
| `Ctrl + Shift + L` | Select all occurrences of current selection | Select **L**ine/all matches |
| `Shift + Alt + I` | Insert cursor at the end of each selected line | Cursor at **I**ndividual line ends |
| `Shift + Alt + Right` | Expand visual selection block | Grow selection |
| `Shift + Alt + Left` | Shrink visual selection block | Shrink selection |
| `Ctrl + U` | Undo last cursor movement or selection | **U**ndo cursor |

---

## 🟡 Advanced Navigation & Views

Navigate large directories and complex symbol trees without touching the mouse.

### Quick Open Command Box Commands
Press `Ctrl + P` to activate the Quick Open command line, then prepend these characters:

| Prepend | Target | Example |
|:---|:---|:---|
| *None* | File name search | `UserService` |
| `:` | Go to line number | `:128` |
| `@` | Go to symbol in current file | `@calculateTotal` |
| `@:` | Group symbols in current file by category | `@:constants` |
| `#` | Go to symbol in workspace globally | `#authMiddleware` |
| `?` | Show list of available command modifiers | `?` |

### Window Layout & Focus Management
*   **Split Editor Vertically:** `Ctrl + \`
*   **Split Editor Layout (Vertical to Horizontal Toggle):** `Shift + Alt + 0`
*   **Focus Editor Groups:** `Ctrl + 1`, `Ctrl + 2`, `Ctrl + 3` (Focuses group 1, 2, or 3)
*   **Move Editor File to Next Group:** `Ctrl + Alt + Right` / `Left`
*   **Toggle Sidebar Visibility:** `Ctrl + B` (Focuses/hides **B**ar)
*   **Zen Mode Toggle:** `Ctrl + K` then `Z` (Distraction-free environment)

---

## 🟠 Regular Expression Search & Replace

VS Code's search engine uses Rust-based regex.

### Case Modification Replacements
When doing a search and replace (toggle Regex mode with `Alt + R`), use capture groups `(...)` in search and modify their text case in the replacement line:

| Substitute Modifier | Action | Example (Replace box) |
|:---|:---|:---|
| `\U$1` | Convert first capture group to **UPPERCASE** | `\U$1_CONSTANT` |
| `\L$1` | Convert first capture group to **lowercase** | `\L$1` |
| `\u$1` | Uppercase the **first character** of group | `\u$1` |
| `\l$1` | Lowercase the **first character** of group | `\l$1` |

### Match Restructuring Example
*   **Search Target:** `const (\w+) = require\('(\w+)'\);`
*   **Replacement String:** `import { $1 } from '$2';`
*   *Result:* Restructures CommonJS imports to ES6 imports across multiple directories.

---

## 🟠 Tasks & Keybindings Config

### Automation with Tasks (`.vscode/tasks.json`)
Configure automated tasks that execute within VS Code (e.g., compile code, run tests, or run lint tools):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npm run test",
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```
*Run with:* `Ctrl + Shift + P` -> `Run Test Task` (or bind key in `keybindings.json`).

### Custom Keybindings (`keybindings.json`)
Access via `Ctrl + Shift + P` -> `Preferences: Open Keyboard Shortcuts (JSON)`:

```json
[
  {
    "key": "ctrl+alt+t",
    "command": "workbench.action.terminal.new"
  },
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.terminal.clear",
    "when": "terminalFocus"
  }
]
```

---

## 💡 Mnemonic Reference

*   `Ctrl + P` = Go to **P**ath (File locator)
*   `Ctrl + Shift + P` = **P**alette (Command Palette)
*   `Ctrl + Shift + O` = **O**utline (Search symbols in current file)
*   `Ctrl + T` = **T**ype / Symbol search globally
*   `Ctrl + G` = **G**o to line
*   `Ctrl + Shift + M` = View **M**essages / Problems panel
*   `Ctrl + B` = Toggle Sidebar **B**ar
*   `Ctrl + Shift + F` = **F**ind in files (Global search)
*   `Ctrl + Shift + X` = Show E**x**tensions
