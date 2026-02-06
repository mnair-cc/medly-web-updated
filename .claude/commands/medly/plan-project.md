# Plan Project

Set up a project branch and plan the work for a Linear project.

## Concept

- 1 project = 1 branch
- Iterate quickly on issues within that branch
- Can be solo or collaborative

## References

- See [linear-sizing.md](../docs/linear-sizing.md) for point scale

## Steps

### 1. Linear MCP check

- Try calling a Linear MCP tool (e.g. `list_teams`)
- If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

### 2. Select project

- Fetch projects: `list_projects(includeArchived: false, limit: 10)`
- Group by status: In Progress, Planned, Backlog (exclude Completed)
- Use AskUserQuestion: "Which project are you planning?"
  - List projects with their status and target dates
  - Show issue counts if available
- Fetch full project details: `get_project(query: projectId, includeMilestones: true)`

### 3. Show project context

- Display project info:
  ```
  📁 Project: Medly Open Improvements #3
     Status: In Progress | Target: 2026-02-01
     Lead: alex.d@medlyai.com
     Progress: 12/27 issues done
  ```
- Parse and show recent status updates from description
- List all issues grouped by status (Todo, In Progress, Done)

### 4. Analyze codebase impact

- For each Todo/In Progress issue, infer which files/modules it likely touches:
  - Keywords in title/description
  - Related past PRs if available
  - Architecture patterns (see below)
- Flag issues that touch the same areas
- Identify dependencies between issues

### 5. Size project issues

For each unestimated issue in the project, apply sizing using the linear-sizing.md scale:

| Points | Time | Example |
|--------|------|---------|
| 1 | ~1-2 hours | Quick fix, minor UI change |
| 2 | ~half day | Component work, integration |
| 3 | ~1 day | Full screen, complex implementation |
| 4 | ~1.5 days | Multi-component feature |
| 5 | ~2 days | Major feature, design + implementation |

**Sizing factors:**
- Scope clarity (vague = +1 buffer)
- Files touched (multiple components = higher)
- External dependencies (API/DB = higher)
- Testing complexity (+1 if needs extensive validation)
- AI-assist potential (clear specs + boilerplate = faster)

Present sizing summary:
```
📊 Project Sizing:
   Already sized: 8 issues (24 points)
   Newly sized: 4 issues (11 points)
   Total committed: 35 points
```

Save estimates to Linear: `update_issue(id, estimate: <points>)`

### 6. Calculate project capacity

Calculate available capacity for the project:

**Get duration:**
- Use project `startDate` and `targetDate` from Linear
- If no target date, use AskUserQuestion: "How long is this project?"
  - **1 day**
  - **2-3 days**
  - **1 week**
  - **2 weeks**
  - **Custom** (let me specify)

**Get participants:**
- Use AskUserQuestion: "Who's working on this project?"
  - **Just me**
  - **Me and [teammate]** - select from team members
  - **The whole team**

**Capacity formula:**
- 1 point ≈ 1-2 hours
- Working day ≈ 5-6 effective points per person (accounting for meetings, context switching)

Display:
```
📅 Project Duration: 5 days
👥 Participants: 2 people
📊 Total Capacity: ~50-60 points
   Committed: 35 points
   Available: 15-25 points
```

### 7. Find related triage bugs

Fetch triage bugs for the project's team and find related ones:

```
list_issues(
  teamId: "<team-id>",
  filter: { state: { name: { eq: "Triage" } } }
)
```

**Keyword matching:**
- Extract key terms from project issue titles/descriptions (e.g., "sidebar", "navigation", "auth", "payment")
- Match against triage bug titles/descriptions
- Score by number of matching terms

**Codebase analysis:**
- Use the codebase impact analysis from step 4 (files/modules each issue touches)
- Match triage bugs whose descriptions reference same areas:
  - Component names (Button, Modal, Sidebar)
  - Route paths (/dashboard, /settings, /open)
  - Module references (auth, payments, tutoring)

**Relevance scoring:**
- High: Both keyword AND codebase match
- Medium: Either keyword OR codebase match
- Low: Weak/partial matches (exclude from auto-fit)

### 8. Pull in related bugs

Size any unestimated related bugs using linear-sizing.md scale.

Auto-select bugs that fit within remaining capacity:
- Prioritize High relevance first
- Then Medium relevance
- Stop when capacity reached

Present the suggested additions:
```
🐛 Related bugs from Triage (12 points available):

Auto-selected (fits capacity):
| Issue | Title | Est | Relevance |
|-------|-------|-----|-----------|
| OPEN-201 | Sidebar scroll doesn't reset | 2 | High (touches same files) |
| OPEN-215 | Navigation breadcrumb missing | 1 | High (keyword: navigation) |
| OPEN-223 | Mobile nav z-index issue | 2 | Medium (keyword: nav) |

Not included (over capacity or low relevance):
| Issue | Title | Est | Reason |
|-------|-------|-----|--------|
| OPEN-230 | Refactor settings page | 5 | Over capacity |
| OPEN-241 | Fix tooltip delay | 1 | Low relevance |
```

Use AskUserQuestion: "Add these bugs to the project?"
- **Yes, add all selected** - add High + Medium bugs that fit
- **Only high relevance** - add only High relevance bugs
- **Let me choose** - show checkboxes for each
- **Skip** - don't add any bugs

If approved:
- Add to project: `update_issue(id, projectId: "<project-id>")`
- Move to Todo state: `update_issue(id, stateId: "<todo-state-id>")`
- Save any new estimates: `update_issue(id, estimate: <points>)`

### 9. Plan task distribution

Using the participants from step 6:
- Suggest issue distribution to minimize conflicts
- Recommend working order based on dependencies
- Output summary:
  ```
  📋 Suggested Plan:
     1. OPEN-146 (alex) - sidebar changes
     2. OPEN-184 (alex) - help menu (depends on sidebar)
     3. OPEN-185 (paul) - remove toast (independent)

  ⚠️ Potential conflicts:
     OPEN-146 and OPEN-162 both touch sidebar components
  ```
- Use AskUserQuestion: "Update Linear with these assignments?"
  - **Yes** - assign issues to team members as suggested
  - **Let me adjust first** - show editable list
  - **No** - skip assignments
- If yes, for each issue call: `update_issue(id, assignee: "<user>")`
- Optionally set priorities based on order: `update_issue(id, priority: <1-4>)`

### 10. Create project branch

- Generate branch name from project name and lead:
  - Get lead from project (e.g., `alex.d@medlyai.com` → `alex`)
  - Slugify project name: lowercase, replace spaces with `-`, remove special chars
  - Format: `<lead>/<project-slug>` e.g., `alex/medly-open-improvements-3`
- Use AskUserQuestion: "Create branch?"
  - Show suggested name
  - Allow custom name
- Run: `git checkout -b <branch-name>`
- Confirm: "Branch created and checked out"

### 11. Publish branch to remote

- Run: `git push -u origin <branch-name>`
- Confirm: "Branch published to remote"
- This allows team members to see and collaborate on the project branch

### 12. Update project status

- Append to project description:
  ```
  ---
  ## Status Updates

  ### YYYY-MM-DD
  - Branch created: `<branch-name>`
  - Planning complete, starting work
  - Team: [names]
  ```
- Call `update_project(id, description: updatedDescription)`

### 13. Next steps

- Show: "Project set up! Next steps:"
  - "Run `/plan-issue OPEN-XXX` to start on first issue"
  - "Run `/status` to see current state"
  - List recommended first issue based on analysis

## Architecture Reference

When analyzing, consider our structure:
- `/app` - Next.js pages and API routes
- `/components` - React components (check for shared vs feature-specific)
- `/lib` - Core utilities, API clients, hooks
- `/contexts` - React contexts (high conflict risk - shared state)
- `/firebase` - Database rules, functions
- Anything touching auth, payments, or core tutoring flow = high coordination needed
