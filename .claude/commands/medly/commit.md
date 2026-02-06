# Commit

Stage and commit your changes with a properly formatted message.

## Steps

1. **Linear MCP check**
   - Try calling a Linear MCP tool (e.g. `list_teams`)
   - If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

2. **Check what's changed**
   - Run `git status`
   - If nothing to commit: "No changes to commit!"
   - Show list of changed files

3. **Stage files**
   - If nothing staged: ask "Stage all changes?" then `git add -A`
   - Or ask which files to include

4. **Detect ticket from branch**
   - Run `git branch --show-current`
   - Parse ticket ID from branch name (e.g., `paul/open-184-...` → `OPEN-184`)
   - If found, fetch ticket details from Linear: `get_issue(id: "OPEN-184")`
   - Show: "Detected ticket: OPEN-184 - [ticket title]"
   - If not found in branch, ask: "What's the ticket ID? (e.g., OPEN-123, or 'none')"

5. **Build commit message**
   - Look at the changes and suggest a message
   - Infer platform from file paths:
     - Files in `/open` or `/app/open` → `[Open]`
     - Files in `/exams` or `/app/exams` → `[Exams]`
     - Changes in both → `[All]`
     - Config/infra files → `[Infra]`
     - API changes → `[API]`
   - Ask: "What type of change?"
     - **UI** - visual/styling changes
     - **FE** - frontend logic
     - **BE** - backend/API changes
     - **Infra** - config, CI, tooling
   - Format: `[TICKET][Platform][Type] Message`

6. **Confirm and commit**
   - Show the formatted message
   - Ask: "Commit with this message? (or type a different one)"
   - Run `git commit -m "[message]"`

## Message Format

```
[OPEN-123][Open][UI] Fix sidebar width
[MED-456][Exams][FE] Update marking scheme
[All][UI] New button styles across platforms
[Infra] Update turborepo config
```

## Quick mode

`/commit OPEN-123 fix sidebar` → parses and commits with confirmation
