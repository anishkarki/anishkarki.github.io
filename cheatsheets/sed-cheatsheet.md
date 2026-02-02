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

These features transform `sed` from a simple replacer into a Turing-complete text processor.

### 📥 1. Hold Space vs Pattern Space
Sed doesn't just process one line at a time; it has a secondary memory buffer.

*   **Pattern Space**: The visible work area. This is where `sed` puts the current line it's reading.
*   **Hold Space**: A hidden clipboard. It starts empty. You can move data back and forth.

| Command | Action | visual/Mnemonic |
| :--- | :--- | :--- |
| **`h`** | Pattern ➔ Hold | **Copy** (Overwrite Hold space with Pattern). |
| **`H`** | Pattern ➔ Hold | **Append** (Add Pattern to Hold space, separated by `\n`). |
| **`g`** | Hold ➔ Pattern | **Paste** (Overwrite Pattern space with Hold). |
| **`G`** | Hold ➔ Pattern | **Paste Append** (Add Hold to Pattern space, separated by `\n`). |
| **`x`** | Exchange | **Swap** contents of Pattern and Hold spaces. |

#### 🧠 Deep Dive: How `tac` (Reverse File) works
Command: `sed -n '1!G;h;$p' file.txt`

Let's trace it with a file containing lines: `A`, `B`, `C`.

1.  **Line A**:
    *   `1!G`: Is this NOT line 1? False. (Skip `G`).
    *   `h`: Copy Pattern ("A") to Hold. (Hold = "A").
    *   `$p`: Is it last line? No.
2.  **Line B**:
    *   `1!G`: NOT line 1? True. Append Hold ("A") to Pattern ("B"). Pattern is now "B\nA".
    *   `h`: Copy Pattern ("B\nA") to Hold. (Hold = "B\nA").
    *   `$p`: Last line? No.
3.  **Line C**:
    *   `1!G`: True. Append Hold ("B\nA") to Pattern ("C"). Pattern matches "C\nB\nA".
    *   `h`: Copy to Hold.
    *   `$p`: Last line? Yes! Print Pattern: "**C**, **B**, **A**".

---

### 📜 2. Multiline Commands (`N`, `D`, `P`)
By default, `sed` clears the Pattern space after every line. These commands let you accumulate multiple lines to match patterns *across* newlines.

| Command | Description |
| :--- | :--- |
| **`N`** | **Next**. Read the *next* line and append it to the current Pattern space (separated by `\n`). |
| **`D`** | **Delete First**. Delete text up to the first `\n`. Restart the cycle with the remaining text. |
| **`P`** | **Print First**. Print text up to the first `\n`. |

#### Example: Joining Lines
Command: `sed 'N; s/\n/ /'`
*   **Action**: Reads line 1. `N` reads line 2 and appends it. Buffer: "Line1\nLine2".
*   **Sub**: Replaces `\n` with space. Buffer: "Line1 Line2".
*   **Result**: Joins every pair of lines.

---

### ✂️ 3. Regex Deep Dive: Duplicate Removal
Command: `echo "abc def xyz abc" | sed -E 's/\b([a-z]+)\b(.*)\b\1\b/\1\2/'`

This removes the *second* occurrence of a word.

*   `\b`: **Word Boundary**. Ensures we match "abc" but not "abc" inside "dabc".
*   `([a-z]+)`: **Capture Group 1**. Matches the first word ("abc") and saves it.
*   `(.*)`: **Capture Group 2**. Matches everything in between (spaces, other words).
*   `\1`: **Backreference**. Matches the *exact same text* found in Group 1 ("abc").
*   **Replace**: `\1\2`. We keep the first word (`\1`) and the middle content (`\2`), effectively deleting the second instance of `\1`.

---

### 🔀 4. Flow Control (Branching)
Sed scripts can loop and jump, acting like a real programming language.

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **`:label`** | `:start` | Defines a bookmark in the script. |
| **`b`** | `b start` | **Branch**. Unconditional Jump ("GoTo") to the label. |
| **`t`** | `t start` | **Test**. Jump to label **ONLY IF** the last `s///` substitution actually changed something. |

#### Example: Recursive HTML Tag Removal
Command: `sed ':start; s/<[^>]*>//g; t start'`

1.  **:start**: Set a marker.
2.  **s/...**: Try to remove one set of HTML tags (`<...>`).
3.  **t start**:
    *   *Did we find and remove a tag?* **Yes** -> Jump back to `:start` and try again (in case of nested tags like `<<p>>`).
    *   *Did we find nothing?* **No** -> Continue and print the clean line.


---

## 🐚 Expert Examples & Shell Integration

How to mix `sed` with bash scripts, variables, and complex streams.

### 1. Variables & Shell Arguments
Sed treats single quotes `'...'` as literal strings. Specialized quoting is needed to pass shell variables.

| Method | Example | Description |
| :--- | :--- | :--- |
| **Double Quotes** | `sed "s/User/$USER/"` | Allows shell expansion (vars like `$USER` work). |
| **Concat** | `sed 's/User/'"$VAR"'/'` | Safer. Closes single quote, injects var, re-opens quote. |

#### Example: Passing a Script Argument
```bash
# Replace occurrences of Arg1 with itself (print only matches)
sed -n 's/'"$1"'/&/p' file.txt
```

#### Example: Interactive "Here-doc"
```bash
#!/bin/sh
echo -n "What is the value? "
read value
# Use the input variable inside sed
sed 's/XYZ/'"$value"'/' <<EOF
The value is XYZ
EOF
```

---

### 2. Flags & IO Redirection
| Pattern | Command | Description |
| :--- | :--- | :--- |
| **Write to File** | `sed -n 's/.../&/w out.txt' input.txt` | Writes **only the matching lines** to `out.txt`. |
| **Ignore Case** | `sed 's/foo/bar/I'` | Case insensitive match (`/I`). |
| **Pipeline** | `sed 's/A/a/' \| sed 's/B/b/'` | Chain multiple sed commands (same as `-e`). |
| **Cat vs Sed** | `sed 's/foo/bar/' f1 f2` | Sed can read multiple files natively. No need for `cat f1 f2 | sed`. |

---

### 3. Advanced Addressing & Ranges
Apply commands to very specific slices of a file.

| Address | Command | Description |
| :--- | :--- | :--- |
| **Line Number** | `sed '3 s/[0-9]//'` | delete first number on **Line 3 only**. |
| **Pattern Match** | `sed '/^#/ s/[0-9]//'` | Delete number only on **lines starting with #**. |
| **Line Range** | `sed '1,3 s/[0-9]//'` | Apply to lines **1 through 3**. |
| **Context Range** | `sed '\_/usr/bin_,/^$/ d'` | Delete from line matching path up to next empty line. |

#### Weird Delimiters
If your pattern has slashes, use underscores `_` or pipes `|` as delimiters to avoid leaning toothpick syndrome `\/`.
```bash
# Match /usr/local/bin and replace separator
sed '\_/usr/local/bin_s_/usr/local/common/all_'
```

---

### 4. Running Scripts (`-f`)
For complex logic, save commands in a file ("sedscript") to reuse them.
`sed -f sedscript <oldfile >newfile`

**`sedscript` contents:**
```sed
# Scripts don't need quotes around commands
s/a/A/g
s/e/E/g
# ...
```

### 5. Multi-line Input (Bourne Shell)
You can break standard commands across lines for readability without `-f`.
```bash
sed '
s/one/1/
s/two/2/
' < input.txt > output.txt
```

### 6. Inverse Matching (`!`)
Apply a command to lines that DO NOT match.
```bash
# Print lines that DO NOT match "error" (equivalent to grep -v)
sed -n '/error/ !p' log.txt
```

### 7. Early Exit (`q`)
Stop processing the file once a condition is met. Highly efficient for large files.
```bash
# Print the first 11 lines and then quit (faster than processing the whole file)
sed '11 q' huge_file.log
```

---

## 📜 5. Logic Blocks & Scripting
For complex logic, group commands with `{}`.

### Block Example: Comment & Whitespace Cleanup
This script processes lines *outside* of `begin/end` blocks.
```bash
#!/bin/sh
# ^I represents a literal TAB character.
sed '
    /begin/,/end/ !{   # If NOT between "begin" and "end"...
         s/#.*//       # Delete comments
         s/[ ^I]*$//   # Delete trailing usage/tabs
         /^$/ d        # Delete empty lines
         p             # Print result
    }
' file.txt
```

### Reading Files (`r`)
Inject content from external files. This is perfect for macros or templating.

#### Case 1: Append a Footer
Insert the contents of `footer.txt` at the very end (`$`) of the stream.
```bash
sed '$r footer.txt' < input.txt > output.txt
```

#### Case 2: The "Include" Pattern
Search for a placeholder (e.g., `INCLUDE`) and replace it with the actual file content.
```bash
#!/bin/sh
sed '/INCLUDE/ {
    r included_file.txt   # Read file content into pattern space
    d                     # Delete the line containing the word "INCLUDE"
}' template.txt > final.txt
```

### Append a line with a, insert with i and change a line with c
```bash
#!/bin/sh
sed '
/WORD/ {
i\
Add this line before
a\
Add this line after
c\
Change the line to this one
}'
```

### print line number with =
```bash
sed -n '/pattern/ =' file
```

```bash
#!/bin/sh
lines=$(sed -n '$=' file )
```

### transform with y
```bash
# Replace all a with A, b with B, c with C
echo "abc" | sed 'y/abc/ABC/'
```

---