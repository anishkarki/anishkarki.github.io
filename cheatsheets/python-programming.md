# Python Programming Cheatsheet

## Basic Types & Operations

### Numbers
```python
x = 1       # int
y = 1.0     # float
z = 1 + 2j  # complex

# Operations
x + y   # Addition
x - y   # Subtraction
x * y   # Multiplication
x / y   # Division (float)
x // y  # Floor division
x % y   # Modulo
x ** y  # Exponentiation
```

### Strings
```python
s = "Hello"
s = 'World'
s = f"Val: {x}"  # f-string formatting
s.upper()        # "VAL: 1"
s.lower()        # "val: 1"
s.strip()        # Remove whitespace
s.split(",")     # Split into list
", ".join(list)  # Join list into string
s.find("val")    # Find substring index
s.replace("a", "b") # Replace substring
len(s)           # Length
s[0]             # First char
s[-1]            # Last char
s[1:4]           # Slicing
```

### Booleans
```python
True, False
not, and, or
x is None        # Check for None
x is not None
```

## Data Structures

### Lists (Mutable Sequence)
```python
nums = [1, 2, 3]
nums.append(4)      # Add to end
nums.insert(0, 0)   # Insert at index
nums.pop()          # Remove & return last
nums.remove(2)      # Remove specific value
nums[0]             # Access
nums[1:]            # Slice
len(nums)           # Length
3 in nums           # Existence check
nums.sort()         # Sort in-place
sorted(nums)        # Return sorted copy
```

### Tuples (Immutable Sequence)
```python
point = (1, 2)
x, y = point        # Unpacking
```

### Dictionaries (Key-Value)
```python
d = {"a": 1, "b": 2}
d["c"] = 3          # Set value
d["a"]              # Get value (error if missing)
d.get("x", 0)       # Get with default
d.keys()            # Keys view
d.values()          # Values view
d.items()           # Key-value pairs
del d["b"]          # Delete key
```

### Sets (Unique, Unordered)
```python
s = {1, 2, 3}
s.add(4)
s.remove(2)
s1 | s2   # Union
s1 & s2   # Intersection
s1 - s2   # Difference
```

## Control Flow

### If/Else
```python
if x > 0:
    print("Positive")
elif x < 0:
    print("Negative")
else:
    print("Zero")
```

### Loops
```python
# For loop
for i in range(5):        # 0 to 4
    print(i)

for item in list:
    print(item)

for i, val in enumerate(list):
    print(i, val)

# While loop
while x > 0:
    x -= 1

# Control
break       # Exit loop
continue    # Skip iteration
pass        # Do nothing (placeholder)
```

### List Comprehensions
```python
squares = [x**2 for x in range(10)]
evens = [x for x in range(10) if x % 2 == 0]
```

## Functions

```python
def add(a, b=0):
    """Docstring explaining function"""
    return a + b

# Lambda (Anonymous)
mul = lambda x, y: x * y

# Args & Kwargs
def func(*args, **kwargs):
    print(args)   # Tuple of positional args
    print(kwargs) # Dictionary of keyword args
```

## Error Handling

```python
try:
    res = 1 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except Exception:
    print("Unknown error")
finally:
    print("Always runs")
```

## Classes (OOP)

```python
class Dog:
    species = "Canis"  # Class variable

    def __init__(self, name):
        self.name = name  # Instance variable

    def bark(self):
        return f"{self.name} says Woof!"

    @classmethod
    def info(cls):
        return cls.species

d = Dog("Buddy")
print(d.bark())
```

## File I/O

```python
# Reading
with open("file.txt", "r") as f:
    content = f.read()       # All content
    lines = f.readlines()    # List of lines

# Writing
with open("file.txt", "w") as f:
    f.write("Hello")
```

## Virtual Environments
```bash
python -m venv venv        # Create
source venv/bin/activate   # Activate (Linux/Mac)
venv\Scripts\activate      # Activate (Windows)
pip install requests       # Install package
pip freeze > requirements.txt
pip install -r requirements.txt
```
