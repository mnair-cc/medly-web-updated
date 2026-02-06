---
name: source-control
description: Manages source control with Graphite CLI (gt) for stacked PRs. Use when creating branches, committing changes, submitting PRs, syncing, or when the user mentions git operations, stacks, PR, commits or source control.
---

# Source Control

Graphite replaces standard git commands for branch and PR management with stacked PRs.

## Documentation

**Official Graphite Docs:** https://graphite.com/docs/command-reference

If a command or workflow is not covered in this skill, refer to the official documentation or guide the user there to learn more.

## Essential Commands

```bash
# Create branch with commit
gt create <branch-name> -m "commit message"
# Never include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"` in commit message or similar.

# Create branch from existing commit
gt create <branch-name>

# Amend current branch (preferred over multiple commits)
gt modify -m "updated message"
gt modify  # amend without changing message

# Submit PRs for the stack
# When done, show the graphite PR link to user.
gt submit --publish —no-interactive

# Sync with remote and restack
gt sync

# Navigate
gt co <branch>   # checkout
gt up            # go up in stack
gt down          # go down in stack
gt trunk         # go to main

# View stack
gt log short
gt ls

# Restack after conflicts
gt restack
gt continue      # after resolving conflicts
gt abort         # cancel operation
```

## Stack Manipulation

```bash
# Move current branch to a different parent (change its position in stack)
gt move --onto <parent-branch>
# Example: Move current branch to be directly off main
gt move --onto main

# Interactively reorder branches in the stack
gt reorder

# Delete a branch
gt branch delete <branch-name>
```

**Use cases:**

- Move a PR out of a stack: `gt move --onto main`
- Reorganize stack order: `gt reorder` (opens editor)
- Remove branch from middle of stack: Delete it, children will restack onto its parent

## Branch Naming

- `fix/<description>` - bug fixes
- `feature/<description>` - new features
- `docs/<description>` - documentation
- `chore/<description>` - maintenance

## Conflict Resolution

```bash
# When conflicts occur:
# 1. Resolve in editor
# 2. Stage files
git add <files>
# 3. Continue
gt continue
```

---

## After Creating or Updating a PR

**Required:** Use the `documenting-prs` skill to:

1. Add the appropriate label (`fix`, `feature`, `docs`, `chore`, `test`)
2. Attach any implementation plans from `.cursor/plans/` or `.claude/plans/`

---

## Quick Reference

| Command                     | Description                     |
| --------------------------- | ------------------------------- |
| `gt create <name> -m "msg"` | Create branch with commit       |
| `gt modify`                 | Amend current branch            |
| `gt submit`                 | Submit stack as PRs             |
| `gt sync`                   | Sync with remote                |
| `gt co <branch>`            | Checkout branch                 |
| `gt up` / `gt down`         | Navigate stack                  |
| `gt log short`              | View stack                      |
| `gt restack`                | Rebase onto parent              |
| `gt continue`               | Continue after conflict         |
| `gt abort`                  | Abort current operation         |
| `gt move --onto <branch>`   | Change parent of current branch |
| `gt reorder`                | Interactively reorder stack     |
| `gt branch delete <branch>` | Delete branch                   |
