# Sed Cheatsheet

A comprehensive guide to `sed`, the stream editor. This guide is broken down into essentials you **must remember**, intermediate patterns that are **good to have**, and advanced **tricks** for power users.

---

## 🟢 Must Remember (Essentials)

These are the commands you will use 90% of the time.

### Basic Syntax
```bash
sed [options] 'command' file(s)
# Example:
sed 's/foo/bar/' file.txt
```

### Key Options
| Option | Description |
| :--- | :--- |
| **`-n`** | **Silent mode**. Do not print anything by default. (Crucial when using `p`). |
| **`-i`** | **In-place**. Save changes directly to the file. |
| **`-E` / `-r`** | **Extended Regex**. Enables easier regex (no need to escape `+`, `?`, `(...)`). |

### Basic Substitution (`s///`)
The bread and butter of sed.
```bash
# Substitute the FIRST occurrence of "apple" with "mango" per line
sed 's/apple/mango/' file.txt

# Substitute ALL occurrences per line (Global flag 'g')
sed 's/apple/mango/g' file.txt
```

### Deleting Lines (`d`)
```bash
# Delete lines matching "error"
sed '/error/d' file.txt

# Delete lines 1 through 5
sed '1,5d' file.txt

# Delete multiple empty lines
sed '/^$/d' file.txt
```

### Printing Specific Lines (`p`)
Always use with `-n` (no print) to avoid duplicates.
```bash
# Print only lines containing "success"
sed -n '/success/p' file.txt

# Print first 10 lines (like head)
sed -n '1,10p' file.txt
```

---

## 🟡 Good to Have (Intermediate)

These features extend your ability to manipulate data precisely.

### Addresses (Selecting Lines)
Restrict where commands apply.
```bash
# Apply substitution only on lines 10 to 20
sed '10,20s/foo/bar/g' file.txt

# Apply only to lines starting with "Section"
sed '/^Section/s/foo/bar/g' file.txt
```

### Delimiters
If your text contains slashes (e.g., paths), use a different delimiter like `:` or `|`.
```bash
# Change /var/www to /home/www
sed 's:/var/www:/home/www:g' file.txt
```

### Captured Groups & Backreferences
Reuse parts of the matched pattern using `\1`, `\2`, etc.
*   **Without `-E`**: Parentheses must be escaped `\(...\)`.
*   **With `-E`**: Use plain parentheses `(...)`.

```bash
# Input: "Page 1 of 5" -> Output: "1 of 5"
# We capture "Page " as group 1, and the rest as group 2. We only want group 2.
echo "Page 1 of 5" | sed -E 's/(Page )(.*)/\2/'

# Swap words: "Hello World" -> "World Hello"
echo "Hello World" | sed -E 's/([a-z]+) ([a-z]+)/\2 \1/'
```

### Matched String (`&`)
Use `&` to refer to the **entire** text that was matched.
```bash
# Wrap every number in brackets: "123" -> "[123]"
echo "Item 123" | sed -E 's/[0-9]+/[&]/g'
```

### Useful One-Liners
| Task | Command |
| :--- | :--- |
| **Double space a file** | `sed G` |
| **Delete trailing whitespace** | `sed 's/[ \t]*$//'` |
| **Delete leading whitespace** | `sed 's/^[ \t]*//'` |
| **Dos2Unix** (Remove `\r`) | `sed 's/\r$//'` |

---

## 🔴 Advanced Tricks (Power User)

For complex multi-line processing and logic.

### Hold Space vs Pattern Space
Sed has a "clipboard" called the **Hold Space**.
*   **Pattern Space**: Current line being processed.
*   **Hold Space**: Hidden buffer.

| Cmd | Action | Description |
| :--- | :--- | :--- |
| `h` | Pattern → Hold | **Copy** current line to clipboard. |
| `g` | Hold → Pattern | **Paste** clipboard to current line (overwriting). |
| `G` | Hold → Pattern | **Append** clipboard to current line. |
| `x` | Exchange | Swap Pattern and Hold spaces. |

**Example: Reverse a file (tac)**
```bash
sed -n '1!G;h;$p' file.txt
```

### Multiline Commands (`N`, `D`, `P`)
Process input across line breaks.
*   **`N`**: Read next line and append to current pattern space (joined by `\n`).
*   **`D`**: Delete up to the first newline.
*   **`P`**: Print up to the first newline.

**Example: Join every 2 lines**
```bash
sed 'N; s/\n/ /' file.txt
```

### Duplicate Removal (Advanced)
```bash
# Remove duplicate words in a single line
echo "abc def xyz abc" | sed -E 's/\b([a-z]+)\b(.*)\b\1\b/\1\2/'
```

### Flow Control (Branching)
Think of this as `goto` for sed.
*   `:label` defines a marker.
*   `b label` jumps to matches unconditionally.
*   `t label` jumps **only if** the last substitution succeeded.

**Example: Recursive HTML tag removal**
```bash
# Keep removing <...> until none are left
sed ':start; s/<[^>]*>//g; t start' file.html
```
