---
name: documenting-prs
description: Adds documentation to pull requests including implementation plans and labels. Use after creating or updating a PR, or when the user asks to add work info, document a PR, or attach a plan.
---

# Documenting PRs

Adds labels and attaches implementation plans to PR descriptions. When done, show the graphite PR link to user.

## Adding Labels

```bash
gh pr edit <pr-number> --add-label "<label>"
```

**Labels:** `fix` | `feature` | `docs` | `chore` | `test`

**Label Guidelines:**
- `fix` - Bug fixes, error corrections, issue resolutions
- `feature` - New functionality, enhancements to existing features
- `docs` - Documentation changes (README, comments, guides)
- `chore` - Maintenance tasks (dependencies, configs, tooling, refactoring)
- `test` - Adding or modifying tests

Update label if PR type changed:

```bash
gh pr edit <pr-number> --remove-label "chore" --add-label "fix"
```

---

## Attaching Plans

If you worked on a plan from `.cursor/plans/` or `.claude/plans/`, attach it to the PR description.

**Note:** Not all PRs have plans. Only attach plans if they exist and are relevant to the PR.

### Format

Add a `## Plans` section (if missing) with collapsible toggles:

```markdown
## Plans

<details>
<summary>📋 Plan: <plan-name></summary>

<plan-content>

</details>
```

### Workflow

```bash
# Get current description
gh pr view --json body -q '.body'

# Update with plan attached
gh pr edit --body-file /tmp/pr-body.md
```

### Rules

1. **Never delete existing plans** - only append new ones
2. **Keep existing content** - add Plans section at the top
3. **Use collapsible toggles** - keeps PR description clean

---

## Quick Reference

| Action                | Command                                     |
| --------------------- | ------------------------------------------- |
| Add label             | `gh pr edit <pr> --add-label "<label>"`     |
| Remove label          | `gh pr edit <pr> --remove-label "<label>"`  |
| View PR description   | `gh pr view <pr> --json body -q '.body'`    |
| Update PR description | `gh pr edit <pr> --body-file <file>`        |
| View PR details       | `gh pr view <pr> --json title,body,labels`  |
