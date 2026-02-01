# Sed Cheatsheet

A comprehensive guide to `sed`, the stream editor, including basic substitution, advanced pattern matching, and powerful text processing scripts.

---

## ⚡ Basic Syntax

```bash
sed [options] 'command' file(s)
sed [options] -f scriptfile file(s)
```

| Option | Description |
| :--- | :--- |
| `-n` | **Silent mode**. Suppresses automatic printing of pattern space. Use with `p` to print specific lines. |
| `-e script` | Add the script to the commands to be executed. |
| `-f script-file` | Add the contents of script-file to the commands to be executed. |
| `-i[SUFFIX]` | **In-place edit**. Edits files in place (makes backup if SUFFIX supplied). |
| `-r` / `-E` | Use **extended regular expressions** in the script (no need to escape `(`, `)`, `+`, `?`). |

---

## 🔄 Substitution (`s`)

The most common use of sed.

**Syntax:** `s/regexp/replacement/flags`

### Basic Replacement
```bash
# Replace "day" with "night" (first occurrence per line)
echo "day and night" | sed 's/day/night/'
# Output: night and night

# Global replacement (all occurrences per line) with 'g' flag
sed 's/day/night/g' file.txt
```

### Delimiters
You can use any character as a delimiter if your pattern contains slashes.
```bash
# Using colon ':' as delimiter
echo '/var/www' | sed 's:/var/www:/home/www:'
```

### Matched String (`&`)
Use `&` in the replacement string to refer to the **entire** matched pattern.
```bash
# Surround lowercase words with parentheses
echo "abc is abc" | sed 's/[a-z]*/(&)/g'
# Output: (abc) () (is) () (abc)
```

### Backreferences (`\1`, `\2`, ...)
Use `\1` through `\9` to refer to captured groups `(...)`.

> **Note:** Without `-r` or `-E`, you must escape parentheses `\(...\)`. With `-r` or `-E`, use plain `(...)`.

```bash
# Keep only the first word
echo "bcdef123" | sed 's/\([a-z]*\).*/\1/'

# Swap two words (Standard Regex)
echo "abc def" | sed 's/\([a-z]\+\) \([a-z]\+\)/\2 \1/'

# Swap two words (Extended Regex -r/-E)
echo "abc def" | sed -E 's/([a-z]+) ([a-z]+)/\2 \1/'
```

### Specific Occurrence
Replace only the Nth occurrence of a pattern.
```bash
# Replace the 2nd colon with a dash
echo "root:xyz123:0:0" | sed 's/:/-/2'
```

---

## 🎯 Addresses

Restrict commands to specific lines.

| Address | Description | Example |
| :--- | :--- | :--- |
| `n` | Line number `n`. | `sed '10d'` (delete line 10) |
| `$` | The last line. | `sed '$d'` (delete last line) |
| `/regexp/` | Lines matching regex. | `sed '/error/d'` (delete lines with "error") |
| `n, m` | Range from line `n` to `m`. | `sed '1,5p'` (print lines 1-5) |
| `/start/, /end/` | Range from start match to end match. | `sed '/begin/,/end/p'` |

---

## 🛠️ Basic Commands

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **d** | `[addr]d` | **Delete** pattern space. Start next cycle. |
| **p** | `[addr]p` | **Print** pattern space. (Use with `-n`). |
| **q** | `[addr]q` | **Quit** sed (stops processing). |
| **a** | `[addr]a text` | **Append** `text` after the line. |
| **i** | `[addr]i text` | **Insert** `text` before the line. |
| **c** | `[addr]c text` | **Change** (replace) the line with `text`. |
| **y** | `[addr]y/src/dst/` | **Transliterate** chars (like `tr`). |

### Examples
```bash
# Delete empty lines
sed '/^$/d' file.txt

# Print only lines containing "duplicate"
sed -n '/duplicate/p' file.txt

# Reverse first 3 characters in a line
echo "abcdef" | sed 's/\(.\)\(.\)\(.\)/\3\2\1/'
```

---

## 🧪 Advanced Patterns & Deduplication

Advanced usage often involves addressing duplicates or complex word boundaries.

### Word Boundaries
Use `\b` to match the empty string at the edge of a word.

```bash
# Parenthesize first word only
echo "hello there" | sed 's/[^ ]*/(&)/'
```

### Duplicate Removal
Techniques to find or remove duplicate patterns.

```bash
# Find lines with duplicate words (GNU sed)
echo "apple app" | sed -rn '/\b([a-z]+)\b.*\b\1\b/p'

# Remove duplicate word in a line
echo "abc def xyz abc" | sed -E 's/\b([a-z]+)\b(.*)\b\1\b/\1\2/'
```

---

## 📥 Hold Space vs Pattern Space

Sed maintains two data buffers:
1.  **Pattern Space**: The buffer where the current line is read and operations are performed.
2.  **Hold Space**: A secondary buffer for temporary storage.

| Command | Description |
| :--- | :--- |
| **h** | **Copy** Pattern -> Hold (overwrites Hold). |
| **H** | **Append** Pattern -> Hold. |
| **g** | **Copy** Hold -> Pattern (overwrites Pattern). |
| **G** | **Append** Hold -> Pattern. |
| **x** | **Exchange** Pattern and Hold spaces. |

### Example: Reverse Lines in a File (like `tac`)
```bash
sed -n '1!G;h;$p' file.txt
```
*   `1!G`: If not 1st line, append hold to pattern.
*   `h`: Copy pattern (so far reversed) to hold.
*   `$p`: If last line, print.

---

## 📜 Multiline Commands

Process multiple lines at once.

| Command | Description |
| :--- | :--- |
| **N** | Append next line to pattern space (separated by `\n`). |
| **D** | Delete first part of pattern space (up to `\n`), restart cycle. |
| **P** | Print first part of pattern space (up to `\n`). |

### Example: Join lines
```bash
# Join pair of lines side-by-side
sed 'N; s/\n/ /' file.txt
```

---

## 🔀 Flow Control (Branching)

Sed scripts can branch to labels, allowing for loops and conditional logic.

| Command | Description |
| :--- | :--- |
| **:label** | Define a **label** for branching. |
| **b [label]** | **Branch** (jump) unconditionally to `label`. If label is omitted, branch to end of script. |
| **t [label]** | **Test**. Branch to `label` only if a substitution (`s///`) has successfully changed the pattern space since the last input line or last reset. |

### Example: Loop to remove all HTML tags
```bash
sed ':start; s/<[^>]*>//g; t start' file.html
```
*   `:start`: Label.
*   `s/...`: Substitute command.
*   `t start`: If substitution happened, jump back to start.

---

## ⚡ Useful One-Liners

| Task | Command |
| :--- | :--- |
| **Double space a file** | `sed G` |
| **Number lines** | `sed '=' file \| sed 'N; s/\n/ /'` |
| **Count lines** (like `wc -l`) | `sed -n '$='` |
| **Print first 10 lines** (like `head`) | `sed 10q` |
| **Delete trailing whitespace** | `sed 's/[ \t]*$//'` |
| **Delete leading whitespace** | `sed 's/^[ \t]*//'` |
| **Dos2Unix** (CRLF -> LF) | `sed 's/\r$//'` |
