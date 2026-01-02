# Vim Cheatsheet

A practical Vim reference organized from basics to advanced.

---

## Quick Navigation

| Section | Level |
|---------|-------|
| [Modes](#modes) | 🟢 Basic |
| [Movement](#movement) | 🟢 Basic |
| [Editing](#editing) | 🟢 Basic |
| [Search & Replace](#search--replace) | 🟡 Intermediate |
| [File Explorer](#file-explorer-netrw) | 🟡 Intermediate |
| [Definition Jump](#definition-jump-ctags) | 🟡 Intermediate |
| [Text Objects](#text-objects) | 🟡 Intermediate |
| [Splits & Buffers](#splits--buffers) | 🟡 Intermediate |
| [Registers](#registers) | 🟠 Advanced |
| [Macros](#macros) | 🟠 Advanced |
| [Marks](#marks) | 🟠 Advanced |
| [My Config](#my-vim-config) | ⚙️ Setup |

---

## 🟢 BASIC

### Modes

| Mode | Enter | Exit | Purpose |
|------|-------|------|---------|
| **Normal** | `Esc` | - | Commands & navigation |
| **Insert** | `i` | `Esc` | Typing text |
| **Visual** | `v` | `Esc` | Select text |
| **Command** | `:` | `Enter` | Run commands |

**Insert mode entry points:**

| Key | Action |
|-----|--------|
| `i` / `a` | Insert before / append after cursor |
| `I` / `A` | Insert at line start / end |
| `o` / `O` | Open line below / above |

---

### Movement

**Character & Line:**

| Key | Action |
|-----|--------|
| `h j k l` | ← ↓ ↑ → |
| `w` / `b` | Next / previous word |
| `e` | End of word |
| `0` / `$` | Start / end of line |
| `^` | First non-blank character |

**Screen & File:**

| Key | Action |
|-----|--------|
| `gg` / `G` | First / last line |
| `Ctrl+d` | Half page down |
| `Ctrl+u` | Half page up |
| `{` / `}` | Previous / next paragraph |
| `%` | Jump to matching bracket |
| `:42` | Go to line 42 |

---

### Editing

**Basic Operations:**

| Key | Action |
|-----|--------|
| `x` | Delete character |
| `dd` | Delete line |
| `yy` | Yank (copy) line |
| `p` / `P` | Paste after / before |
| `u` | Undo |
| `Ctrl+r` | Redo |
| `.` | Repeat last change |

**Save & Quit:**

| Key | Action |
|-----|--------|
| `:w` | Save |
| `:w filename` | Save as filename |
| `:saveas filename` | Save as and switch to new file |
| `:wq` | Save and quit |
| `:q` | Quit |
| `:q!` | Quit without saving |

**Insert & Change:**

| Key | Action |
|-----|--------|
| `r{char}` | Replace single character |
| `R` | Replace mode |
| `cc` | Change entire line |
| `C` | Change to end of line |
| `s` | Substitute character |
| `S` | Substitute line |

**Operator + Motion:**

```
d + motion = delete    y + motion = yank    c + motion = change

dw  → delete word          yw  → yank word
d$  → delete to line end   y$  → yank to line end
dG  → delete to file end   cw  → change word
```

---

## 🟡 INTERMEDIATE

### Search & Replace

**Search:**

| Key | Action |
|-----|--------|
| `/pattern` | Search forward |
| `?pattern` | Search backward |
| `n` / `N` | Next / previous match |
| `*` / `#` | Search word under cursor |

**Replace:**

```vim
:s/old/new/       " Replace first on line
:s/old/new/g      " Replace all on line
:%s/old/new/g     " Replace all in file
:%s/old/new/gc    " Replace with confirmation
```

**Jump to Search Results:**

| Key | Action |
|-----|--------|
| `n` | Jump to next match |
| `N` | Jump to previous match |
| `gn` | Select next match (visual) |
| `cgn` | Change next match (repeatable with `.`) |

---

### File Explorer (netrw)

**Open Directory:**

| Key | Action |
|-----|--------|
| `:Ex` | Open explorer in current window |
| `:Vex` | Open explorer in vertical split |
| `:Sex` | Open explorer in horizontal split |
| `:Lex` | Open explorer in left sidebar |
| `vim .` | Open vim in current directory |

**Navigate in Explorer:**

| Key | Action |
|-----|--------|
| `Enter` | Open file/directory |
| `-` | Go up one directory |
| `%` | Create new file |
| `d` | Create new directory |
| `D` | Delete file/directory |
| `R` | Rename file |
| `i` | Toggle view style |

---

### Definition Jump (ctags)

**Setup (run once in project root):**

```bash
# Install ctags
sudo apt install universal-ctags    # Debian/Ubuntu
brew install ctags                  # macOS

# Generate tags file
ctags -R .
```

**Jump Commands:**

| Key | Action |
|-----|--------|
| `Ctrl+]` | Jump to definition |
| `Ctrl+t` | Jump back |
| `g]` | List all definitions |
| `:tag name` | Jump to tag by name |
| `:ts` | List matching tags |
| `:tn` / `:tp` | Next / previous tag |

**Built-in (no ctags):**

| Key | Action |
|-----|--------|
| `gd` | Go to local definition |
| `gD` | Go to global definition |
| `gf` | Go to file under cursor |
| `Ctrl+o` | Jump back |
| `Ctrl+i` | Jump forward |

---

### Text Objects

Use with operators: `d` (delete), `c` (change), `y` (yank), `v` (select)

| Object | Inner (`i`) | Around (`a`) |
|--------|-------------|--------------|
| Word | `diw` | `daw` |
| Sentence | `dis` | `das` |
| Paragraph | `dip` | `dap` |
| Quotes `"` | `di"` | `da"` |
| Parens `()` | `di(` | `da(` |
| Braces `{}` | `di{` | `da{` |
| Brackets `[]` | `di[` | `da[` |
| Tags `<>` | `dit` | `dat` |

**Examples:**

```
ciw  → change inner word (replace word, keep spaces)
ci"  → change inside quotes
dap  → delete around paragraph (include blank lines)
yi(  → yank inside parentheses
```

---

### Splits & Buffers

**Splits (Windows):**

| Key | Action |
|-----|--------|
| `:vs` / `:vs file` | Vertical split (current/new file) |
| `:sp` / `:sp file` | Horizontal split (current/new file) |
| `Ctrl+w w` | Cycle between windows |
| `Ctrl+w h/j/k/l` | Navigate to left/down/up/right split |
| `Ctrl+w c` / `:q` | Close current window |
| `Ctrl+w o` | Close all *other* windows (keep focus only) |

**Window Manipulation:**

| Key | Action |
|-----|--------|
| `Ctrl+w =` | Equalize size of all splits |
| `Ctrl+w _` | Maximize height of current split |
| `Ctrl+w \|` | Maximize width of current split |
| `Ctrl+w +` / `-` | Increase / decrease height |
| `Ctrl+w >` / `<` | Increase / decrease width |
| `Ctrl+w H/J/K/L` | Move split (far left/bottom/top/right) |

**Buffers:**

| Key | Action |
|-----|--------|
| `:e file` | Edit file |
| `:ls` | List buffers |
| `:bn` / `:bp` | Next / previous buffer |
| `:b#` | Alternate buffer |
| `:bd` | Close buffer |

---

## 🟠 ADVANCED

### Registers

| Register | Description |
|----------|-------------|
| `""` | Default (unnamed) |
| `"0` | Last yank |
| `"a-z` | Named registers |
| `"+` | System clipboard |
| `"_` | Black hole (discard) |

**Usage:**

```vim
"ayy    " Yank line to register a
"ap     " Paste from register a
"+y     " Yank to clipboard
"+p     " Paste from clipboard
"_dd    " Delete without saving
:reg    " View registers
```

---

### Macros

| Key | Action |
|-----|--------|
| `qa` | Start recording to register `a` |
| `q` | Stop recording |
| `@a` | Play macro `a` |
| `@@` | Replay last macro |
| `5@a` | Play macro 5 times |

**Example workflow:**

```vim
qa          " Start recording
0           " Go to line start
i- [ ] Esc  " Add checkbox
j           " Next line
q           " Stop recording
10@a        " Apply to 10 lines
```

---

### Marks

| Key | Action |
|-----|--------|
| `ma` | Set mark `a` |
| `'a` | Jump to line of mark |
| `` `a `` | Jump to exact position |
| `'.` | Last change location |
| `''` | Previous jump location |
| `:marks` | List all marks |

---

## ⚙️ MY VIM CONFIG

A clean, plugin-free setup optimized for Python & Bash. Copy to `~/.vimrc`:

```vim
" ── Basics ──────────────────────────────────
set nocompatible
filetype plugin indent on
syntax enable
set encoding=utf-8

" ── Display ─────────────────────────────────
set number
set showmatch
set scrolloff=8
set colorcolumn=80,120
set termguicolors
set background=dark

" ── Indentation (Python default: 4 spaces) ──
set autoindent smartindent
set expandtab
set shiftwidth=4 tabstop=4 softtabstop=4

" ── Search ──────────────────────────────────
set hlsearch incsearch
set ignorecase smartcase

" ── Editing ─────────────────────────────────
set clipboard=unnamedplus
set hidden
set undofile
set undodir=~/.vim/undodir

" ── Splits ──────────────────────────────────
set splitbelow splitright

" ── Leader ──────────────────────────────────
let mapleader = " "

" ── Key Mappings ────────────────────────────
" Quick escape
inoremap jk <Esc>

" Save & quit
nnoremap <leader>w :w<CR>
nnoremap <leader>q :q<CR>

" Clear search
nnoremap <leader><space> :nohlsearch<CR>

" Window navigation
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Buffer navigation
nnoremap <leader>bn :bnext<CR>
nnoremap <leader>bp :bprevious<CR>

" Keep selection when indenting
vnoremap < <gv
vnoremap > >gv

" Center after jumps
nnoremap n nzzzv
nnoremap N Nzzzv

" File explorer
nnoremap <leader>e :Explore<CR>
let g:netrw_banner = 0
let g:netrw_liststyle = 3

" ── Python & Bash Settings ──────────────────
augroup LangSettings
  autocmd!
  " Python: 4 spaces, run with F5
  autocmd FileType python setlocal shiftwidth=4 tabstop=4 softtabstop=4
  autocmd FileType python setlocal colorcolumn=80,120
  autocmd FileType python nnoremap <buffer> <F5> :w<CR>:!python3 %<CR>
  autocmd FileType python nnoremap <buffer> <leader>r :w<CR>:!python3 %<CR>
  
  " Bash: 2 spaces, run with F5
  autocmd FileType sh setlocal shiftwidth=2 tabstop=2 softtabstop=2
  autocmd FileType sh nnoremap <buffer> <F5> :w<CR>:!bash %<CR>
  autocmd FileType sh nnoremap <buffer> <leader>r :w<CR>:!bash %<CR>
  
  " Bash shebang auto-insert for new .sh files
  autocmd BufNewFile *.sh 0put =\"#!/bin/bash\n\"|$
augroup END

" ── Handy Commands ──────────────────────────
" Make file executable
nnoremap <leader>x :!chmod +x %<CR>

" ── Create undo directory ───────────────────
if !isdirectory(expand('~/.vim/undodir'))
  call mkdir(expand('~/.vim/undodir'), 'p')
endif
```

---

## 💡 Tips

1. **Master the basics first** — `hjkl`, `w/b`, `i/a`, `d/y/c` + motions
2. **Use text objects** — `ciw` is faster than finding word boundaries
3. **Repeat with `.`** — Make changes repeatable
4. **Think operator + motion** — `d` + `w` = delete word
5. **Use counts** — `5j` moves 5 lines, `3dw` deletes 3 words

**Python/Bash shortcuts:**
- `F5` or `Space+r` — Run current file
- `Space+x` — Make file executable

---

> Start simple. Add complexity only when you need it.
