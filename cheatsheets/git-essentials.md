# Git Essentials Cheatsheet

A practical Git reference for version control mastery, from basics to advanced workflows.

---

## Quick Navigation

| Section | Level |
|---------|-------|
| [Setup](#setup) | 🟢 Basic |
| [Stage & Snapshot](#stage--snapshot) | 🟢 Basic |
| [Branching & Merging](#branching--merging) | 🟢 Basic |
| [Inspection](#inspection) | 🟡 Intermediate |
| [Sharing & Updating](#sharing--updating) | 🟡 Intermediate |
| [Stashing](#stashing) | 🟡 Intermediate |
| [Rewriting History](#rewriting-history) | 🟠 Advanced |
| [Merge, Rebase & Conflicts](#merge-rebase--conflicts) | 🟠 Advanced |
| [Debugging](#debugging) | 🟠 Advanced |
| [Must Knows](#15-must-knows) | 🚀 Essentials |

---

## 🟢 BASIC

### Setup

| Command | Description |
|---------|-------------|
| `git config --global user.name "Name"` | Set global username |
| `git config --global user.email "email"` | Set global email |
| `git config --list` | List all configuration settings |
| `git config --global color.ui auto` | Enable helpful color output |
| `git init` | Initialize a new local repository |
| `git clone <url>` | Clone a remote repository |

### Stage & Snapshot

| Command | Description |
|---------|-------------|
| `git status` | Check status of working directory |
| `git add <file>` | Stage a specific file |
| `git add .` | Stage all changes |
| `git commit -m "Message"` | Commit staged changes |
| `git commit --amend` | Combine staged changes with last commit |

### Branching & Merging

| Command | Description |
|---------|-------------|
| `git branch` | List local branches |
| `git branch <name>` | Create a new branch |
| `git checkout <name>` | Switch to a branch |
| `git switch <name>` | Switch to a branch (modern alternative) |
| `git checkout -b <name>` | Create and switch to a new branch |
| `git merge <branch>` | Merge specified branch into current |
| `git rebase <branch>` | Rebase current branch onto another |
| `git branch -d <name>` | Delete a local branch (safe) |

---

## 🟡 INTERMEDIATE

### Inspection

| Command | Description |
|---------|-------------|
| `git log` | Show commit history |
| `git log --oneline` | Show condensed commit history |
| `git log --graph` | Show history as a graph |
| `git log --oneline --graph` | Show condensed history as a graph |
| `git show <commit>` | Show changes in a specific commit |
| `git diff` | Show unstaged changes |
| `git diff --staged` | Show staged changes |

### Sharing & Updating

| Command | Description |
|---------|-------------|
| `git remote add origin <url>` | Add a remote repository |
| `git remote -v` | List remote repositories |
| `git push origin <branch>` | Push changes to remote |
| `git push origin main` | Push main branch to remote |
| `git push -u origin <branch>` | Push and set upstream tracking |
| `git pull` | Fetch and merge from remote |
| `git pull origin main` | Pull and merge main from remote |
| `git fetch` | Download objects from remote (no merge) |

### Stashing

| Command | Description |
|---------|-------------|
| `git stash` | Stash modified & staged changes |
| `git stash pop` | Restore most recent stash and remove from stash list |
| `git stash list` | List stack-order of stashed changes |
| `git stash drop` | Discard most recent stash |

---

## 🟠 ADVANCED

### Rewriting History

| Command | Description |
|---------|-------------|
| `git rebase <branch>` | Reapply commits on top of another branch |
| `git rebase HEAD~n` | Rebase last _n_ commits |
| `git rebase -i HEAD~n` | Interactive rebase last _n_ commits |
| `git reset --hard HEAD~1` | Undo last commit & discard changes |
| `git reset --soft HEAD~1` | Undo last commit but keep changes staged |
| `git reset --mixed HEAD~1` | Undo last commit, keep changes unstaged |
| `git restore <file>` | Restore file to last committed state |
| `git cherry-pick <commit>` | Apply changes from a specific commit |
| `git revert <commit>` | Create a new commit undoing changes |
| `git tag <tagname>` | Create a lightweight tag |
| `git tag v1.0` | Create a tag named v1.0 |
| `git push origin <tagname>` | Push a specific tag to remote |
| `git push origin v1.0` | Push v1.0 tag to remote |

### Merge, Rebase & Conflicts

#### Merge Workflow (Preserve History)
Merges `feature` branch into `main`, creating a merge commit.

1. **Switch**: `git checkout main`
2. **Update**: `git pull origin main`
3. **Merge**: `git merge feature`
4. **Resolve**: Handle conflicts if any.
5. **Push**: `git push origin main`

#### Rebase Workflow (Linear History)
Reapplies `feature` commits on top of `main` for a clean history.

1. **Switch**: `git checkout feature`
2. **Update**: `git fetch origin`
3. **Rebase**: `git rebase origin/main`
4. **Resolve**: Handle conflicts if any.
5. **Push**: `git push origin feature --force` (Force push required)

#### Conflict Resolution
When a merge or rebase stops due to conflicts:

1. **Identify**: `git status` shows conflicted files.
2. **Inspect**: Open file and look for markers:
   ```text
   <<<<<<< HEAD
   Your Current Changes
   =======
   Incoming Changes to Apply
   >>>>>>> branch-name
   ```
3. **Decide**: Edit the file to keep desired code and remove markers.
4. **Stage**: `git add <file>` to mark as resolved.
5. **Continue**:
   - Merge: `git commit` (Finish merge commit)
   - Rebase: `git rebase --continue`
6. **Abort**: `git merge --abort` or `git rebase --abort` (If you want to stop)

### Debugging

| Command | Description |
|---------|-------------|
| `git bisect start` | Start binary search for a bad commit |
| `git blame <file>` | Show who changed what and when |
| `git grep "term"` | Search for term in files |
| `git reflog` | Show log of all ref updates |

---

## 15 Must Knows

1.  **Check Status** (`git status`): Always check state before committing.
2.  **Stage All** (`git add .`): Stage all current changes.
3.  **Commit** (`git commit -m "msg"`): Save your snapshot.
4.  **Create Branch** (`git checkout -b feature`): Isolate new work.
5.  **Switch Branch** (`git checkout main`): Move between lines of work.
6.  **Update** (`git pull`): Get latest changes from remote.
7.  **Upload** (`git push`): Send your changes to remote.
8.  **Undo Local** (`git checkout -- <file>`): Discard changes in a file (pre-stage).
9.  **Unstage** (`git reset HEAD <file>`): Remove file from staging area.
10. **View History** (`git log --oneline`): Quick view of previous commits.
11. **Stash** (`git stash`): Temporarily save work to switch contexts.
12. **Diff** (`git diff`): See exactly what you changed.
13. **Merge** (`git merge feature`): Combine feature branch into main.
14. **Amend** (`git commit --amend`): Fix the previous commit message/content.
15. **Reflog** (`git reflog`): Your safety net for recovering "lost" commits.
