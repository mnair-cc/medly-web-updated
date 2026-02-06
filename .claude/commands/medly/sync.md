# Sync

Pull latest changes, commit your work, and push — all in one guided flow.

## Steps

### 0. Linear MCP check

- Try calling a Linear MCP tool (e.g. `list_teams`)
- If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

### 1. Detect ticket and get project context

- Run `git branch --show-current`
- Parse ticket ID from branch name (e.g., `paul/open-184-...` → `OPEN-184`)
- If found, fetch ticket details from Linear: `get_issue(id: "OPEN-184")`
- Show: "Working on: OPEN-184 - [ticket title]"
- If ticket has a project, fetch it: `get_project(query: projectId)`
- If no ticket/project detected:
  - Fetch recent projects: `list_projects(limit: 5)`
  - Use AskUserQuestion: "Which project are you working on?"
    - List recent projects as options
    - Include "None / Skip"
- Parse description for "## Status Updates" section
- Show recent updates for context:
  ```
  📝 Recent Project Updates:
     2026-01-30: Completed OPEN-175 deselect docs
     2026-01-29: Started sprint
  ```
- Note any updates mentioning files you're touching (potential conflicts)

### 2. Pull latest changes

- Run `git fetch origin`
- Check if there are incoming changes on your branch or main
- If incoming changes exist:
  - Try to pull with rebase: `git pull --rebase origin <branch>`
  - If conflicts occur, ask human: "There's a conflict in [file]. What do you want to do?"
    - **Keep your version** - use your local changes
    - **Keep their version** - use the remote changes
    - **Help me merge** - walk through combining both
  - Resolve each conflict one at a time
- Also check main: "Main has new changes. Want to include those too?"

### 3. Commit your changes

- Run `git status` to see what's changed
- If there are uncommitted changes:
  - Look at the diff and suggest a commit message
  - Infer platform from file paths:
    - Files in `/open` or `/app/open` → `[Open]`
    - Files in `/exams` or `/app/exams` → `[Exams]`
    - Changes in both → `[All]`
    - Config/infra files → `[Infra]`
  - Use detected ticket ID from step 1 (or ask if none detected)
  - Ask: "What type of change?" (UI, FE, BE, etc.)
  - Format message: `[TICKET][Platform][Type] Message`
  - Show suggested message and ask to confirm or edit
  - Stage all changes and commit

### 4. Push

- Run `git push origin <branch>`
- If rejected: "Remote has newer changes, let me pull those first" → go back to step 2
- On success: "Done! Your changes are now on [branch]"

### 5. Update Linear issue status

- If ticket was detected, use AskUserQuestion:
  - "Update Linear issue status?"
    - **In Progress** - mark as actively being worked on
    - **In Review** - mark as ready for review
    - **No change** - keep current status
- If user selects a status, call `update_issue(id, state: "<selected>")`

### 6. Update project status

- Get the issue's project via the `projectId` field
- Fetch current project: `get_project(query: projectId)`
- Ask: "Add a status update to the project?"
  - **Yes** - prompt for update text or auto-generate from commits
  - **No** - skip
- If yes:
  - Get current description
  - Append status update in format:
    ```
    ---
    ## Status Updates

    ### YYYY-MM-DD (ticket)
    - [commit summary or user-provided update]
    ```
  - Call `update_project(id, description: updatedDescription)`

## Commit Message Format

```
[OPEN-123][Open][UI] Fix sidebar width
[Exams][FE] Update marking scheme display
[Infra] Add turborepo config
```

## Safety

- Never force push
- Always ask before resolving conflicts
- If things get messy: offer to abort and start fresh
