# Plan Bug Bash

Size and plan triage bugs for a team bug bash session.

## Prerequisites

- Verify Linear MCP: try `list_teams()`
- If unavailable: `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

## Workflow

### 1. Select team

- Fetch teams: `list_teams()`
- Use AskUserQuestion: "Which team's triage bugs should we size?"
- Store team ID and team key (e.g., "OPEN") for later

### 2. Gather bug bash parameters

#### Duration
Use AskUserQuestion: "How long is this bug bash?"
- 1 hour
- 2 hours
- Half day (4 hours)
- Full day (8 hours)

#### Start date
Use AskUserQuestion: "When does the bug bash start?"
- Today
- Tomorrow
- Next week (show date)
- Custom date (let me specify)

If custom, ask for the specific date.

#### Participants
- Fetch team members: `list_users()` or get from team details
- Use AskUserQuestion: "Who is participating in this bug bash?"
  - Show team members as multi-select options
  - Include "Select all" option
- Store selected participants for assignments

Calculate total capacity:
- 1 point ≈ 1-2 hours
- Capacity = (hours × participant count) / 1.5 (buffer for context switching)

### 3. Create bug bash project

#### Find next sequential number
- Fetch existing projects: `list_projects(teamId: "<team-id>", includeArchived: true)`
- Search for projects matching pattern "Bug Bash #N"
- Determine next number (e.g., if "Bug Bash #4" exists, next is #5)
- If no bug bash projects exist, start at #1

#### Calculate end date
Based on duration and start date:
- 1-2 hours: same day
- Half day: same day
- Full day: same day (or next day if starting afternoon)

#### Create project
```
create_project(
  teamIds: ["<team-id>"],
  name: "Bug Bash #<next-number>",
  description: "Bug bash session\n\nParticipants: <list names>\nCapacity: <X> points",
  startDate: "<start-date>",
  targetDate: "<end-date>",
  state: "planned"
)
```

Confirm to user:
```
📁 Created: Bug Bash #5
   Team: Open Platform
   Date: Feb 7, 2026 (2 hours)
   Participants: Alex, Sarah, Mike
   Capacity: ~8 points
```

### 4. Fetch triage bugs

Fetch ALL bugs in Triage (both estimated and unestimated):
```
list_issues(
  teamId: "<selected-team-id>",
  filter: { state: { name: { eq: "Triage" } } }
)
```

Separate into two groups:
- **Needs sizing:** bugs with no estimate (`estimate: null`)
- **Already sized:** bugs with existing estimates (from previous bug bashes)

### 5. Size unestimated bugs

**CRITICAL: Do NOT cap estimates at 5 points.**

Estimate the TRUE effort for each bug. If a bug would take 8 points, write down 8 — not 5. You MUST identify oversized bugs so they can be broken down in step 7.

**Point scale reference:**

| Points | Time | Example |
|--------|------|---------|
| 1 | ~1-2 hours | Quick fix, minor UI change |
| 2 | ~half day | Component work, integration |
| 3 | ~1 day | Full screen, complex implementation |
| 4 | ~1.5 days | Multi-component feature |
| 5 | ~2 days | Major feature, design + implementation |
| 6+ | >2 days | **⚠️ OVERSIZED — must be broken down before saving** |

If you find yourself wanting to assign "5 points" to multiple bugs, stop and ask: is this truly 5, or is it 6-8+ that needs breakdown?

**Context: AI-assisted development**
The team works primarily in Cursor and Claude Code. Factor this into estimates:
- Well-defined, code-heavy tasks are faster with AI assistance
- Tasks requiring human judgment (design decisions, UX, architecture) take normal time
- Novel/unfamiliar codebases still need exploration time
- Testing and validation time remains similar

**Sizing factors:**
- Scope clarity (vague = +1 buffer)
- Files touched (multiple components = higher)
- External dependencies (API/DB = higher)
- Testing complexity (+1 if needs extensive validation)
- AI-assist potential (clear specs + boilerplate = faster, ambiguous requirements = normal time)

### 6. Handle unclear bugs

If a bug's scope is unclear from the Linear description:

1. Flag it with ❓
2. Ask the user clarifying questions:
   ```
   ❓ OPEN-123: "Fix the navigation issue"
   
   I need more context to size this:
   - Which navigation? (sidebar, header, mobile nav)
   - What's the specific issue? (styling, behavior, performance)
   - Are there related bugs or is this standalone?
   ```
3. Re-estimate after getting answers
4. If still unclear, mark as "Needs refinement" (skip for bug bash)

### 7. Handle oversized bugs (>5 points)

Any bug estimated at 6+ points MUST be broken down. Do not save estimates >5 — break them into smaller pieces first.

**Self-check:** If you estimated many bugs at exactly 5 points, revisit them. Some are likely 6-8+ and should be broken down here.

For each oversized bug:

1. Flag with ⚠️ and show the original estimate (e.g., "Estimated 8 points")
2. Suggest 2-3 natural split points based on:
   - Distinct UI vs backend work
   - Independent functional pieces
   - Phases (setup → core → polish)
3. Estimate each sub-task (each must be ≤5 points)
4. Present the breakdown:

```
⚠️ OPEN-456: "Refactor authentication flow" - Estimated 8 points

This is too large for a single bug bash task. Suggested breakdown:

| Sub-task | Description | Est |
|----------|-------------|-----|
| 456-a | Update login form validation | 2 |
| 456-b | Refactor token refresh logic | 3 |
| 456-c | Add error handling + tests | 2 |
| **Total** | | **7** |

Create these as sub-issues in Linear?
- Yes, create all
- Let me adjust first
- Skip, I'll handle manually
```

5. If approved, create sub-issues:
   ```
   create_issue(
     teamId: "<team-id>",
     title: "[456-a] Update login form validation",
     description: "Sub-task of OPEN-456\n\n<original description excerpt>",
     parentId: "<original-issue-id>",
     estimate: 2
   )
   ```
6. Update original issue:
   ```
   update_issue(
     id: "<original-id>",
     state: "Backlog",  // or appropriate "needs breakdown" state
     description: "<original>\n\n---\nBroken into sub-issues: OPEN-457, OPEN-458, OPEN-459"
   )
   ```

### 8. Present sizing summary

Output format:
```
## Bug Bash Plan

📁 Project: Bug Bash #5
📅 Date: Feb 7, 2026 (2 hours)
👥 Participants: Alex, Sarah, Mike
📊 Capacity: ~4 points per person (12 total)

### For this bug bash (11 points) — will be added to project
| Issue | Title | Est | Source | Assignee |
|-------|-------|-----|--------|----------|
| OPEN-101 | Fix button alignment | 1 | new | - |
| OPEN-102 | Update error messages | 2 | new | - |
| OPEN-103 | Sidebar scroll fix | 3 | prev | - |
| OPEN-104 | Form validation | 2 | new | - |
| OPEN-105 | Mobile nav tweaks | 3 | prev | - |

(Source: "new" = sized this session, "prev" = already had estimate)

### Over capacity (7 points) — stays in Triage
| Issue | Title | Est | Source |
|-------|-------|-----|--------|
| OPEN-107 | Refactor utils | 3 | new |
| OPEN-108 | Add loading states | 2 | prev |
| OPEN-109 | Fix mobile layout | 2 | new |

### Needs refinement (skipped)
- OPEN-106: "Fix the thing" - unclear scope

### Broken down
- OPEN-456 → OPEN-457, OPEN-458, OPEN-459

### Capacity check
✅ 11 points fits within 12 point capacity
```

### 9. Assign bugs to participants

Distribute bugs among the selected participants:
- Balance total points per person
- Keep related bugs together when possible
- Consider complexity mix (don't give one person all hard bugs)

Present suggested assignments:
```
### Suggested Assignments

**Alex** (4 points)
- OPEN-101: Fix button alignment (1)
- OPEN-103: Sidebar scroll fix (3)

**Sarah** (4 points)
- OPEN-102: Update error messages (2)
- OPEN-104: Form validation (2)

**Mike** (3 points)
- OPEN-105: Mobile nav tweaks (3)
```

Use AskUserQuestion: "Apply these assignments?"
- **Yes, assign all**
- **Let me adjust** - show editable list
- **No** - skip assignments

### 10. Apply to Linear

#### Phase 1: Save all estimates
For ALL sized triage bugs (regardless of capacity):
- Update estimate: `update_issue(id, estimate: <points>)`

This ensures future bug bashes benefit from the sizing work done today.

#### Phase 2: Add bugs to project
For bugs within capacity that were assigned:
1. Assign to participant: `update_issue(id, assigneeId: "<user-id>")`
2. Add to project: `update_issue(id, projectId: "<bug-bash-project-id>")`
3. Move to ready state: `update_issue(id, stateId: "<todo-state-id>")`

Bugs that didn't fit remain in Triage with their new estimates.

Confirm completion:
```
✅ Bug Bash #5 is ready!

Triage assessed: 12 bugs
- Newly sized: 8 (estimates saved)
- Already sized: 4 (from previous sessions)

Added to project: 5 bugs (within capacity)
Remaining in Triage: 7 bugs

View project: <linear-project-url>
```

## Quick Reference

| Capacity | Solo | 2 people | 3-4 people |
|----------|------|----------|------------|
| 1 hour | 1 pt | 1-2 pts | 2-3 pts |
| 2 hours | 1-2 pts | 2-3 pts | 4-5 pts |
| Half day | 2-3 pts | 4-5 pts | 8-10 pts |
| Full day | 4-5 pts | 8-10 pts | 16-20 pts |
