# Beautify Your Terminal with Python Rich

*A guide to building beautiful command line interfaces with the Rich library.*

## Introduction
The [Rich](https://github.com/Textualize/rich) library in Python makes it easy to add color and style to terminal output. It can also render beautiful tables, progress bars, markdown, syntax highlighted source code, and tracebacks — out of the box.

## Installation
```bash
pip install rich
```

## Core Features

### 1. Rich Print
Replace the standard `print` with `rich.print` to get instant highlighting for data structures.

```python
from rich import print

data = {"id": 1, "items": ["apple", "banana"]}
print(data)
```

### 2. Console API
For more control, use the `Console` object. You can add a file called ```console.py``` in your project.
#### The properties console detects:
* size: Current dimension of the terminal
* encoding: default encoding
* is_terminal: if the console instance is writing to a terminal
* color_system: string containing the console color system. ```auto```, ```256```, ```true```, ```24bit```, ```truecolor```, ```windows```, ```standard```

##### Useful functions:
1. console.print()
2. console.print_json()
3. console.rule()
4. console.log()
5. rich.status
6. console.capture()
7. console.save_svg("filename", theme="dark")
8. console.pager()
9. New feature: Alternate screen. 

```python
from rich.console import Console
console = Console()

console.print("Hello", "World!", style="bold blue")
```

### 3. Tables
Rich makes creating tables incredibly easy.

```python
from rich.table import Table

table = Table(title="Star Wars Movies")
table.add_column("Released", justify="right", style="cyan", no_wrap=True)
table.add_column("Title", style="magenta")
table.add_column("Box Office", justify="right", style="green")

table.add_row("Dec 20, 2019", "Star Wars: The Rise of Skywalker", "$952,110,690")
console.print(table)
```
### 4. Console Markup
Links and other markups can be added to print:
```sh
# link 
from rich import print
print("[bold red]alert![/bold red] Something happened")
print("[link](https://github.com/Textualize/rich)")
```

### 5. Live Display
Rich can display live updating data in the terminal.

```python
import time
from rich.live import Live

with Live() as live:
    for i in range(10):
        live.update(f"Count: {i}")
        time.sleep(0.1)
```

Key features of `Live`:
* **Context Manager**: `Live` updates the terminal in real-time within the `with` block.
* **Update Method**: Call `live.update(renderable)` to update the display.
* **Alternate Screen**: Can render to a separate screen buffer.
* **Transient**: The display can disappear after the context manager exits if `transient=True`.
* **Auto Refresh**: Updates automatically at a set interval (default 4Hz).

#### Live Table Example
```python
import time
from rich.live import Live
from rich.table import Table

table = Table()
table.add_column("Row ID")
table.add_column("Description")
table.add_column("Level")

with Live(table, refresh_per_second=4) as live:
    for row in range(12):
        time.sleep(0.4)
        # Update the table data
        table.add_row(f"{row}", f"description {row}", "[red]ERROR")
```

### 6. Advanced Console Features
The `Console` object provides many methods for rich output.

```python
from rich.console import Console

console = Console()

# Printing complex objects
console.print([1, 2, 3])
console.print("[blue underline]Looks like a link")
console.print(locals())
console.print("FOO", style="yellow on black")

# JSON output
console.print_json('[false, true, null, "foo"]')

# Printing with a label
console.out("Locals", locals())

# Horizontal Rules
console.rule("[bold red]Chapter 2")
```

#### Capturing Output
You can capture console output to a string instead of printing to stdout.

```python
from rich.console import Console
console = Console()

with console.capture() as capture:
    console.print("[bold red]Hello[/] World")
    
str_output = capture.get()
```

### 7. Layouts and Panels
Align text and wrap content in panels for a polished look.

```python
from time import sleep
from rich.console import Console
from rich.align import Align
from rich.text import Text
from rich.panel import Panel

console = Console()

# Display content in a panel on a styled screen
with console.screen(style="bold white on red") as screen:
    for count in range(3, 0, -1):
        text = Align.center(
            Text.from_markup(f"[blink]Don't Panic![/blink]\n{count}", justify="center"),
            vertical="middle",
        )
        screen.update(Panel(text))
        sleep(1)
```

### 8. Better Tracebacks
Rich can replace standard Python tracebacks with colorful, easier-to-read versions.

```python
from rich.traceback import install
import click

# Install rich traceback handler (suppressing click internals)
install(suppress=[click])

@click.command()
@click.option("--count", default=1, help="Number of greetings.")
def hello(count):
    """Simple program that greets NAME for a total of COUNT times."""
    for x in range(count):
        click.echo(f"Hello TEST!")

if __name__ == "__main__":
    hello()
```

### 9. Building a TUI: Process Monitor
Rich is fast enough to build dynamic terminal applications, like this simple "top" clone.

```python
"""Lite simulation of the top linux command."""
import datetime
import random
import time
from dataclasses import dataclass
from typing import Literal

from rich import box
from rich.console import Console
from rich.live import Live
from rich.table import Table

@dataclass
class Process:
    pid: int
    command: str
    cpu_percent: float
    memory: int
    start_time: datetime.datetime
    thread_count: int
    state: Literal["running", "sleeping"]

    @property
    def memory_str(self) -> str:
        if self.memory > 1e6:
            return f"{int(self.memory/1e6)}M"
        if self.memory > 1e3:
            return f"{int(self.memory/1e3)}K"
        return str(self.memory)

    @property
    def time_str(self) -> str:
        return str(datetime.datetime.now() - self.start_time)

def generate_process(pid: int) -> Process:
    return Process(
        pid=pid,
        command=f"Process {pid}",
        cpu_percent=random.random() * 20,
        memory=random.randint(10, 200) ** 3,
        start_time=datetime.datetime.now()
        - datetime.timedelta(seconds=random.randint(0, 500) ** 2),
        thread_count=random.randint(1, 32),
        state="running" if random.randint(0, 10) < 8 else "sleeping",
    )

def create_process_table(height: int) -> Table:
    processes = sorted(
        [generate_process(pid) for pid in range(height)],
        key=lambda p: p.cpu_percent,
        reverse=True,
    )
    table = Table(
        "PID", "Command", "CPU %", "Memory", "Time", "Thread #", "State", box=box.SIMPLE
    )

    for process in processes:
        table.add_row(
            str(process.pid),
            process.command,
            f"{process.cpu_percent:.1f}",
            process.memory_str,
            process.time_str,
            str(process.thread_count),
            process.state,
        )

    return table

if __name__ == "__main__":
    console = Console()
    with Live(console=console, screen=True, auto_refresh=False) as live:
        while True:
            live.update(create_process_table(console.size.height - 4), refresh=True)
            time.sleep(1)
```
