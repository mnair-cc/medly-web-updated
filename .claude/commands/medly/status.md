# Status

Overview of current work state — git, Linear, conflicts, and what to work on next.

## Steps

### 1. Linear MCP check

- Try calling a Linear MCP tool (e.g. `list_teams`)
- If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

### 2. Local git state

- Run `git branch --show-current` - current branch
- Parse ticket ID from branch name (e.g., `paul/open-184-...` → `OPEN-184`)
- Run `git status` - uncommitted changes?
- Run `git log origin/main..HEAD --oneline` - your unpushed commits

### 3. Current ticket and project

- If ticket detected from branch, fetch from Linear: `get_issue(id)`
- Show: ticket title, status, assignee
- Check for blockers or related issues
- Get the issue's project via `projectId`
- If no ticket/project detected, or issue has no project:
  - Fetch recent projects: `list_projects(limit: 5)`
  - Use AskUserQuestion: "Which project are you working on?"
    - List recent projects as options
    - Include "Other" for manual entry
- Fetch project: `get_project(query: projectId)`
- Show project info:
  ```
  📁 Project: Medly Open Improvements #3
     Status: In Progress | Target: 2026-02-01
     Progress: 12/27 issues done
  ```
- Parse description for "## Status Updates" section (used later)

### 4. Remote git state

- Run `git fetch origin`
- Run `git branch -r` - list remote branches
- For each active branch (recently updated):
  - Who's working on it (from branch name or last commit author)
  - How far ahead/behind main
  - Last commit date

### 5. Linear team overview

- Fetch issues with `list_issues(state: "In Progress")`
- Show who's working on what:
  - Group by assignee
  - Show ticket ID, title, project
- Fetch issues with `list_issues(state: "Todo", limit: 10)` for available work

### 6. Check for potential conflicts

- Your changed files vs files changed on other active branches
- Cross-reference with Linear: if two people have tickets touching same area, flag it
- Flag: "⚠️ You and [person] may conflict — both touching [area]"
- Note which conflicts are likely vs certain

### 7. Deployments

- What's on main? `git log origin/main -1 --oneline`
- What's on beta? (check heroku or last deploy)
- Any drift between them?

### 8. Project status updates

- If ticket detected, get the issue's project
- Fetch project: `get_project(query: projectId)`
- Parse the description for "## Status Updates" section
- Show recent status updates (last 3) if they exist:
  ```
  📝 Recent Project Updates:
     2026-01-30: Started planning OPEN-184
     2026-01-29: Completed UI polish tasks
  ```

### 9. Next task suggestions

- If user asks "what can I work on next?" or "what's available?":
  - Show unassigned Todo issues from current project/sprint
  - Show issues assigned to user that aren't started
  - Highlight issues that won't conflict with current active work
  - Consider priority and dependencies

## Output Format

```
📍 You: paul/open-184-add-help-menu (3 commits ahead of main)
   Ticket: OPEN-184 - Add help menu item to user profile button
   Status: In Progress
   Changed: components/UserMenu.tsx, lib/help.ts

📁 Project: Medly Open Improvements #3
   Status: In Progress | Target: 2026-02-01
   Progress: 12/27 issues done

👥 Team Activity:
   alex.d - OPEN-146 Add "Module" heading in sidebar (In Progress)
   lauren - OPEN-150 Create intent-specific docs (In Progress)

🌿 Active branches:
   alex/open-146-add-module-heading - 2 hours old
   lauren/open-150-intent-docs - 5 hours old

⚠️  Potential conflicts:
   None detected — you're clear to sync

🚀 Deployments:
   main: abc123 "fix: auth redirect" (2 days ago)
   beta: def456 "feat: voice notes wip" (5 hours ago)

📝 Recent Project Updates:
   2026-01-30: Started planning OPEN-184
   2026-01-29: Completed UI polish tasks

📋 Available to pick up:
   OPEN-185 - Remove toast promoting drag to ask (Todo, assigned to you)
   OPEN-179 - Update icons to SF Symbols 3 (Todo)
```

## No Action

This command is read-only. Suggest next steps but don't execute.
- "Run /pull to get latest"
- "Run /sync to pull and push"
- "Run /plan-issue OPEN-185 to start on that ticket"
- "Heads up: talk to Lauren before touching Onboarding"
