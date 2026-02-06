# Medly Claude Skills

Custom Claude Code skills for the Medly development workflow, integrating with Linear for project management.

## Setup

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Or follow the official installation guide at [claude.ai/claude-code](https://claude.ai/claude-code).

### 2. Install Linear MCP

The Medly skills require the Linear MCP (Model Context Protocol) server to interact with Linear issues and projects.

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

### 3. Authenticate Linear MCP

Run the `/mcp` command in Claude Code to authenticate:

```
/mcp
```

This will prompt you to authenticate with Linear. Follow the OAuth flow to grant access.

---

## Core Workflow

### Starting a New Project

```
/medly:plan-project   # Select project, create branch, plan task distribution, push branch
/medly:plan-issue     # Pick an issue from the project and start planning
```

### Daily Development Workflow

```
/medly:status         # Check git state, Linear status, team activity, conflicts
/medly:sync           # Pull, commit, push — all in one guided flow
```

Use `/medly:sync` when:
- You've finished working on an issue and tested it locally
- You want to save your progress and sync with the remote
- Before switching to a different task or ending your session

The sync command will pull latest changes, help you commit your work with a properly formatted message, and push to remote.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/medly:plan-project` | Set up a project branch, analyze issues, plan task distribution, assign in Linear, and publish branch |
| `/medly:plan-issue` | Plan implementation of an issue — asks which project, checks your branch matches, gathers requirements |
| `/medly:sync` | Pull, commit, push in one flow. Use after completing and testing an issue. Pushes changes to remote. |
| `/medly:status` | Read-only overview of git state, Linear project/tickets, team activity, and potential conflicts |
| `/medly:pull` | Pull latest changes from remote with guided conflict resolution |
| `/medly:push` | Push commits to remote and optionally update Linear status |
| `/medly:commit` | Stage and commit with auto-detected ticket ID and formatted message |
| `/medly:help` | Show all available commands and workflows |

---

## Detailed Command Descriptions

### `/medly:plan-project`

Use this when starting work on a Linear project. It will:
1. Show your available projects (In Progress, Planned, Backlog)
2. Display project details and all issues
3. Analyze which issues touch the same code areas
4. Help distribute tasks if working with a team
5. Create a project branch (e.g., `alex/medly-open-improvements-3`)
6. Publish the branch to remote
7. Update the project description in Linear with a status entry

### `/medly:plan-issue`

Use this when starting work on a specific issue. It will:
1. Ask which Linear project you're working on
2. Check if your current branch matches that project — warns if you're on a different project's branch
3. Let you pick an issue (by ID, from your assigned issues, or from the sprint)
4. Search the codebase for related code
5. Ask clarifying questions about scope and constraints
6. Write an implementation plan
7. Update Linear with the plan
8. Start implementing on your current project branch (no new branch per issue)

### `/medly:sync`

The all-in-one command for saving and sharing your work. Use after you've:
- Completed work on an issue
- Tested your changes locally
- Want to push to remote

It will:
1. Pull latest changes (with conflict resolution if needed)
2. Help you commit with a properly formatted message
3. Push to remote
4. Optionally update Linear issue status
5. Optionally add a project status update

### `/medly:status`

Read-only command to see the current state of everything:
- Your branch and uncommitted changes
- Current ticket from branch name
- Project progress
- Team activity (who's working on what)
- Active branches
- Potential merge conflicts
- Deployment status
- Suggestions for what to work on next

### `/medly:pull`

Just pull latest changes:
- Stashes uncommitted work if needed
- Pulls with rebase
- Guides you through any conflicts
- Optionally rebases on main

### `/medly:push`

Just push your commits:
- Reviews what you're pushing
- Checks commit message format
- Handles rejected pushes (pulls first)
- Updates Linear issue status
- Adds project status update

### `/medly:commit`

Just commit your changes:
- Shows what's changed
- Stages files
- Auto-detects ticket from branch name
- Infers platform (`[Open]`, `[Exams]`, etc.)
- Formats message: `[TICKET][Platform][Type] Message`

---

## Commit Message Format

All commits should follow this format:

```
[OPEN-123][Open][UI] Fix sidebar width
[MED-456][Exams][FE] Update marking scheme
[All][UI] New button styles across platforms
[Infra] Update turborepo config
```

Components:
- **Ticket ID**: `[OPEN-123]` — from Linear
- **Platform**: `[Open]`, `[Exams]`, `[All]`, `[Infra]`, `[API]`
- **Type**: `[UI]`, `[FE]`, `[BE]`, `[Infra]`
- **Message**: Brief description of the change

---

## Tips

- Run `/medly:status` at the start of each session to see what's happening
- Use `/medly:sync` frequently to stay in sync with the team
- The skills auto-detect your ticket from the branch name, so use the suggested branch names
- All commands will prompt to set up Linear MCP if it's not configured
