# Awk Cheatsheet

A comprehensive guide to `awk`, a powerful data extraction and reporting tool. This guide is broken down into essentials you **must remember**, intermediate features that are **good to have**, and advanced **tricks** for power users.

---

## 🟢 Must Remember (Essentials)

The commands you'll use for 90% of your log parsing and data extraction.

### Basic Syntax
```bash
awk 'pattern { action }' file
# Example: Print the first word of every line
awk '{ print $1 }' file.txt
```

### Key Built-in Variables
| Variable | Description |
| :--- | :--- |
| **`$0`** | The **entire** current line. |
| **`$1`, `$2`...** | The **1st, 2nd... field** (column) of the current line. |
| **`NF`** | **Number of Fields** in the current line (e.g., number of words). |
| **`NR`** | **Number of Records** (current line number). |
| **`FS`** | **Field Separator** (default is whitespace). |

### Basic Printing
```bash
# Print the first and third column
awk '{ print $1, $3 }' file.txt

# Print the LAST column of every line
awk '{ print $NF }' file.txt

# Print the line number (NR) and the line itself ($0)
awk '{ print NR, $0 }' file.txt
```

### Specifying a Delimiter (`-F`)
Default is whitespace. Use `-F` for CSVs or logs.
```bash
# Parse /etc/passwd using ":" as delimiter
awk -F: '{ print $1 }' /etc/passwd
```

### Simple Filtering
Pattern matching before the `{}` block acts as a filter.
```bash
# Print lines where the 3rd column is greater than 100
awk '$3 > 100 { print $0 }' sales.txt

# Print lines containing "Error"
awk '/Error/ { print $0 }' app.log
```

---

## 🟡 Good to Have (Intermediate)

Add logic, math, and formatting to your scripts.

### BEGIN and END Blocks
Run code **before** processing the first line or **after** the last line.
```bash
# Sumulation: Header, Body, Footer
awk 'BEGIN { print "--- START ---" } 
     { print $2 } 
     END { print "--- END ---" }' file.txt
```

### Math & Statistics
Awk is great for quick sums and averages.
```bash
# Sum the 5th column
awk '{ sum += $5 } END { print sum }' file.txt

# Average of the 5th column
awk '{ sum += $5 } END { print sum/NR }' file.txt
```

### Formatted Printing (`printf`)
Works exactly like C/Bash printf.
```bash
# Format: Left align string (10 chars), integer
awk '{ printf "%-10s %d\n", $1, $2 }' file.txt
```

### Logic Control (`if/else`)
```bash
awk '{ 
    if ($3 > 50) 
        print $1, "High"
    else 
        print $1, "Low" 
}' file.txt
```

### String Functions
| Function | Description |
| :--- | :--- |
| `length($0)` | Length of the string. |
| `toupper($0)` | Convert to uppercase. |
| `tolower($0)` | Convert to lowercase. |
| `substr($0, 1, 5)` | Substring starting at 1, length 5. |

---

## 🔴 Advanced Tricks (Power User)

Using arrays and advanced variables for complex reports.

### Associative Arrays (Dictionaries)
Count occurrences or group data.
```bash
# Count how many times each IP address ($1) appears
awk '{ ips[$1]++ } END { for (ip in ips) print ip, ips[ip] }' access.log
```

### Changing Output Separators (`OFS`)
Change how `print` joins fields.
```bash
# Convert space-separated file to CSV
awk 'BEGIN { OFS="," } { print $1, $2, $3 }' input.txt
```

### Multi-File Processing
Awk can process multiple files and distinct them with `FNR` (File-specific Record Number).
```bash
# Print "Filename: Line Content" (FNR resets for each file, NR keeps counting)
awk '{ print FILENAME ": " $0 }' file1.txt file2.txt
```

### Complex One-Liners
| Task | Command |
| :--- | :--- |
| **Remove duplicate lines** (like `uniq`) | `awk '!seen[$0]++'` |
| **Print even-numbered lines** | `awk 'NR % 2 == 0'` |
| **Filter by string length** | `awk 'length($0) > 80'` |
| **Print lines 10 to 20** | `awk 'NR==10, NR==20'` |
