# Vim for Principal Engineers

A high-density, advanced Vim reference for masters of the command line. Focuses on speed, composition, automation, macro refactoring, and registers.

---

## 🟢 Quick Navigation

| Section | Level | Focus |
|:---|:---|:---|
| [Visual Block & Multi-line Edit](#visual-block--multi-line-edit) | 🟢 Basic | Columns, visual selections |
| [Text Objects & Composition](#text-objects--composition) | 🟡 Intermediate | Structural editing, syntax targets |
| [Jump List & Change List](#jump-list--change-list) | 🟡 Intermediate | Navigation history, change tracking |
| [Advanced Registers](#advanced-registers) | 🟠 Advanced | Clipboard, calculation, patterns |
| [Macros & Automation](#macros--automation) | 🟠 Advanced | Mass editing, macro refactoring |
| [Search, Replace & Regex](#search-replace--regex) | 🟠 Advanced | Backreferences, visual limits, global command |
| [Vim Config (.vimrc)](#vim-config-vimrc) | ⚙️ Setup | Optimized settings |

---

## 🟢 Visual Block & Multi-line Edit

Visual Block mode (`Ctrl + v`) is Vim's native multi-cursor.

### Multi-line Operations
*   **Column Insert (Prepending):**
    1. Press `Ctrl + v` and select vertical lines.
    2. Press `I` (capital `i`).
    3. Type your text (e.g., `# ` or `// `).
    4. Press `Esc` (text will appear on all lines after a split-second delay).
*   **Column Append:** Press `Ctrl + v`, select lines, press `$` (to go to end of varying line lengths), press `A`, type, press `Esc`.
*   **Column Replace/Change:** Press `Ctrl + v`, select block, press `c`, type new text, press `Esc`.
*   **Visual Selection Command execution:**
    Select lines visually and press `:`. Vim prepends `:'<,'>` (current selection). Run shell filter commands:
    *   `:'<,'>!sort` — Sort selected lines.
    *   `:'<,'>!jq .` — Format selected JSON block.

---

## 🟡 Text Objects & Composition

Compose edits using `[operator] [count] [text-object]`.

### Mnemonic Text Objects
| Object | Key | Inner (`i`) | Around (`a`) | Mnemonic |
|:---|:---|:---|:---|:---|
| **Word** | `w` / `W` | `iw` | `aw` | **W**ord / **W**ord (whitespace inclusive) |
| **Sentence** | `s` | `is` | `as` | **S**entence |
| **Paragraph** | `p` | `ip` | `ap` | **P**aragraph |
| **Quotes** | `"`, `'`, `` ` `` | `i"` | `a"` | Double / Single / Backtick quotes |
| **Braces** | `B` or `{` | `i{` or `iB` | `a{` or `aB` | **B**races / Curly Brackets |
| **Parentheses** | `b` or `(` | `i(` or `ib` | `a(` or `ab` | **b**races / Parentheses |
| **Brackets** | `[` | `i[` | `a[` | Square brackets |
| **HTML/XML Tags** | `t` | `it` | `at` | **T**ag (e.g., `<div>...</div>`) |

### Example Combinations
*   `ci"` — **C**hange **I**nner **"** (Delete inside quotes, enter insert mode)
*   `da{` — **D**elete **A**round **{** (Delete curly braces and their contents)
*   `yt=` — **Y**ank **T**il **=** (Copy everything up to the equals sign)
*   `gUit` — Make **I**nner **T**ag uppercase

---

## 🟡 Jump List & Change List

Tracks your movement and edit coordinates across buffers.

### Jumps vs. Changes
| Command | Action | Mnemonic |
|:---|:---|:---|
| `Ctrl + o` | Jump to **older** cursor position | **O**lder |
| `Ctrl + i` | Jump to **newer** cursor position (Tab key) | **I**nner / Newer |
| `g;` | Go to older change in change list | Go to semicolon (historical change) |
| `g,` | Go to newer change in change list | Go to comma (forward in changes) |
| `''` (two single quotes) | Jump back to line before last jump | Previous line |
| `` `` `` (two backticks) | Jump back to exact coordinates before last jump | Previous point |
| `:jumps` | View the jump list hierarchy | View jumps |
| `:changes` | View the edit change list | View changes |

---

## 🟠 Advanced Registers

Vim has 9 classes of registers. View registers with `:reg`.

### Essential Registers
| Register | Purpose | Usage / Mnemonic |
|:---|:---|:---|
| `""` | Unnamed register | Default target for `d`, `c`, `y`, `x` |
| `"0` | **Yank** register | Holds last yanked text (prevents delete/cut from overwriting it) |
| `"+` or `"*` | System clipboard | Interaction with external apps (`"+y` to copy, `"+p` to paste) |
| `"_` | **Black hole** register | Discard deleted text completely (`"_dd` avoids overwriting paste memory) |
| `"/` | Search pattern | Holds the string from last `/` search |
| `".` | Last inserted text | Read-only memory of what you typed |
| `":` | Last executed command line | Read-only |
| `"= ` | **Expression** register | Math or function evaluator. In insert mode, `Ctrl+r =5*20` inserts `100`. |

---

## 🟠 Macros & Automation

Record a sequence of keystrokes to a register and repeat or edit it.

### Basic Workflow
*   `q` + `[register]` — Start recording (e.g., `qa` to record into `a`).
*   `q` — Stop recording.
*   `@a` — Play macro `a`.
*   `@@` — Replay last macro.
*   `100@a` — Play macro 100 times.

### Advanced: Edit a Macro in-place
If you made a typo in macro `a`, don't re-record. Edit it as text:
1. Open a new line.
2. Paste the macro contents: `"ap`
3. Edit the keystrokes (e.g., fix a typo, add a missing keystroke).
4. Select the edited text and yank it back to `a`: `"ay$`
5. Run the corrected macro: `@a`

### Run Macro on Visual Selection
Run macro `a` on all selected lines simultaneously:
`:'<,'>normal @a`

---

## 🟠 Search, Replace & Regex

Master Vim’s regular expression engine.

### Search and Replace CLI
*   **Syntax:** `:[range]s/[pattern]/[replacement]/[flags]`
*   **Flags:** `g` (global/all line matches), `c` (confirm matches), `i` (ignore case).
*   **Visual Line Search Limit:** `:%s/\%Vold/new/g` (only replaces 'old' inside visual selection boundaries).

### Pattern Matches & Backreferences
*   **Search for word duplicates:** `/\(\w\+\)\s\+\1`
*   **Swap order of two strings separated by a comma:**
    `:%s/\(\w\+\),\s*\(\w\+\)/\2, \1/g`
*   **Very Magic mode (`\v`):** Prevents backslash escapes for operators:
    `:%s/\v(foo|bar)/baz/g` (equivalent to standard `:%s/\(foo\|bar\)/baz/g`)

### The Global Command (`:g`)
Perform commands on all lines matching a pattern.
*   `:g/TODO/d` — Delete all lines containing "TODO".
*   `:g!/Pattern/d` or `:v/Pattern/d` — Delete all lines *not* matching "Pattern".
*   `:g/DEBUG/normal @a` — Run macro `a` on all lines containing "DEBUG".

---

## ⚙️ Vim Config (.vimrc)

High performance plugin-free setup. Paste into `~/.vimrc`:

```vim
set nocompatible
filetype plugin indent on
syntax enable
set encoding=utf-8

" ── Interface & UX ──────────────────────────
set number relativenumber " Hybrid line numbers for easy counts
set scrolloff=8           " Keep cursor centered
set cursorline            " Highlight current line
set showmode showcmd      " Show mode and commands
set hidden                " Switch buffers without saving
set splitbelow splitright " Natural splits

" ── Indents & Tabs ──────────────────────────
set autoindent smartindent
set expandtab
set shiftwidth=4 tabstop=4 softtabstop=4

" ── Advanced Search & Redo ──────────────────
set hlsearch incsearch
set ignorecase smartcase
set undofile              " Persistent undo across close/reopen
set undodir=~/.vim/undodir

" ── Clipboard integration ────────────────────
set clipboard=unnamedplus " Sync with system clipboard

" ── Mappings ────────────────────────────────
let mapleader = " "

" Quick Esc and Save
inoremap jk <Esc>
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>

" Toggle Search Highlights
nnoremap <leader><space> :nohlsearch<CR>

" Seamless Window Navigation
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Quickfix navigation
nnoremap <leader>co :copen<CR>
nnoremap <leader>cn :cnext<CR>
nnoremap <leader>cp :cprevious<CR>

" Visual mode: indent keeping selection
vnoremap < <gv
vnoremap > >gv
```
