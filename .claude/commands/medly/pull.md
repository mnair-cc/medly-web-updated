# Pull

Get the latest changes from remote.

## Steps

1. **Linear MCP check**
   - Try calling a Linear MCP tool (e.g. `list_teams`)
   - If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

2. **Detect ticket and get project context**
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

3. **Check for uncommitted work**
   - Run `git status`
   - If you have uncommitted changes: "You have unsaved changes. Want to save them first?"
     - Yes → stash them, pull, then restore
     - No → abort

4. **Fetch and pull**
   - Run `git fetch origin`
   - Show incoming commits: "There are X new commits to pull"
   - If nothing new: "Already up to date!"
   - Pull with rebase: `git pull --rebase origin <branch>`

5. **Handle conflicts**
   - If conflicts occur, for each conflicted file ask:
     - "There's a conflict in [filename]. What do you want to do?"
       - **Keep your version** - discard their changes to this file
       - **Keep their version** - discard your changes to this file
       - **Help me merge** - I'll walk you through combining both
   - Resolve one file at a time
   - After all resolved: `git rebase --continue`

6. **Check main too** (if on a feature branch)
   - "Main branch has X new commits. Want to include those?"
   - If yes: `git rebase origin/main`

## Safety

- Never force anything
- If things get confusing: "Want to undo and start fresh?" → `git rebase --abort`
- Always explain what's happening in simple terms
