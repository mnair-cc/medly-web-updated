# Help

Show available Medly commands and what they do.

## Commands

| Command | Description |
|---------|-------------|
| `/medly:status` | Overview of git state, Linear project/tickets, team activity, and conflicts |
| `/medly:pull` | Pull latest changes from remote with conflict resolution |
| `/medly:push` | Push commits and optionally update Linear status (In Progress/In Review) |
| `/medly:commit` | Stage and commit with auto-detected ticket ID and formatted message |
| `/medly:sync` | Pull, commit, push — all in one flow |
| `/medly:plan-project` | Set up a project branch, plan task distribution, update Linear assignments |
| `/medly:plan-issue` | Plan implementation of a specific issue with clarifying questions |

## Workflows

### Starting a new project
```
/medly:plan-project   # Select project, create branch, plan distribution
/medly:plan-issue     # Start on first issue
```

### Daily workflow
```
/medly:status         # Check state and conflicts
/medly:sync           # Pull, commit, push in one go
```

### Individual operations
```
/medly:pull           # Just get latest
/medly:commit         # Just commit
/medly:push           # Just push
```

## Linear Integration

All commands connect to Linear MCP for:
- Auto-detecting ticket from branch name
- Showing ticket details and status
- Updating issue status after push
- Viewing team activity and available work

If Linear MCP isn't set up, commands will prompt to add it:
```
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```
