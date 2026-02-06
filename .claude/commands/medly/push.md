# Push

Push your committed changes to remote.

## Steps

1. **Linear MCP check**
   - Try calling a Linear MCP tool (e.g. `list_teams`)
   - If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

2. **Check state**
   - Run `git status`
   - If uncommitted changes: "You have uncommitted changes. Want to commit them first?" → run /commit flow
   - Run `git branch` to confirm current branch

3. **Detect ticket and get project context**
   - Parse ticket ID from branch name (e.g., `paul/open-184-...` → `OPEN-184`)
   - If found, fetch ticket details from Linear: `get_issue(id: "OPEN-184")`
   - Show: "Linked ticket: OPEN-184 - [ticket title] (Status: [current status])"
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

4. **Review what you're pushing**
   - Run `git log origin/<branch>..HEAD --oneline`
   - Show: "You're about to push X commit(s):"
   - List commit messages

5. **Check commit message format**
   - Expected format: `[TICKET][Platform][Type] Message`
   - If message doesn't match format:
     - "Your commit message doesn't follow the format. Want me to help fix it?"
     - If yes: suggest corrected message and amend

6. **Push**
   - Run `git push origin <branch>`
   - If rejected (remote has newer changes): "Remote has changes you don't have. Let me pull those first" → run /pull flow, then retry
   - On success: "Pushed! Your changes are now on [branch]"

7. **Update Linear issue status**
   - If ticket was detected, use AskUserQuestion:
     - "Update Linear issue status?"
       - **In Progress** - mark as actively being worked on
       - **In Review** - mark as ready for review
       - **No change** - keep current status
   - If user selects a status, call `update_issue(id, state: "<selected>")`

8. **Update project status**
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

## Message Format

```
[OPEN-123][Open][UI] Fix sidebar width
[Exams][FE] Update marking scheme
[Infra] Config changes
```

## Safety

- Never force push without asking
- Never push directly to main (use /pr instead)
