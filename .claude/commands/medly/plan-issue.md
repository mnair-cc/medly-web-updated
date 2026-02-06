# Plan Issue

Plan the implementation of a Linear issue by gathering context and asking clarifying questions.

## Usage

`/plan-issue [TICKET-ID]` or just `/plan-issue` to be prompted

## Steps

### 1. Linear MCP check

- Try calling a Linear MCP tool (e.g. `list_teams`)
- If unavailable: run `claude mcp add --transport http linear-server https://mcp.linear.app/mcp`

### 2. Select project

- Use AskUserQuestion: "Which Linear project?"
- Fetch projects with `list_projects` and show options
- Common projects to suggest first if available

### 3. Check current branch matches project

- Run `git branch --show-current` to get the current branch
- Parse the branch name to identify which project it belongs to (e.g., `alex/medly-open-improvements-3`)
- Compare with the selected project:
  - If on the correct project branch: "You're on the correct branch for this project."
  - If on `main`: "You're on main. You may want to run `/plan-project` first to create a project branch."
  - If on a different project's branch:
    - Use AskUserQuestion: "You're on branch `[current-branch]` which appears to be for a different project. What would you like to do?"
      - **Switch to the correct project branch** - checkout to the matching project branch
      - **Stay on this branch anyway** - continue (user knows what they're doing)
      - **Create a new branch for this project** - create and checkout a new project branch

### 4. Get the issue

- If ticket ID provided as argument, use it
- If not, use AskUserQuestion: "What issue should I plan?"
  - **Enter ticket ID** (e.g., OPEN-123)
  - **Pick from my assigned issues** - list issues assigned to "me" in selected project
  - **Pick from current sprint** - list issues in current cycle for selected project
- Fetch issue details from Linear: `get_issue(id, includeRelations: true)`
- Display: title, description, status, assignee, related issues

### 5. Understand the context

- Search codebase for related code based on keywords in title/description
- Identify affected files and modules
- Check for similar past implementations if relevant

### 6. Ask clarifying questions

Use AskUserQuestion to gather requirements. Ask about:

- **Scope**: "What's the expected scope?"
  - Minimal - just the core requirement
  - Standard - core + reasonable polish
  - Comprehensive - all edge cases handled

- **Constraints**: "Any constraints I should know about?"
  - Must match existing patterns
  - Can introduce new patterns if better
  - Must be backwards compatible
  - Other (let user specify)

- **UI specifics** (if UI-related):
  - "Is there a design/mockup?"
  - "Should I match an existing component's style?"

- **Technical decisions** (if ambiguous):
  - Where should this live? (suggest options based on codebase)
  - Should this be a new component or extend existing?
  - Any specific libraries/patterns to use or avoid?

### 7. Write the plan

Create a plan that includes:

1. **Summary**: One-line description of what we're building
2. **Affected files**: List files to create/modify
3. **Implementation steps**: Numbered steps in order
4. **Open questions**: Anything still unclear
5. **Risks**: Potential issues or edge cases

### 8. Confirm and save

- Show the plan to the user
- Ask: "Does this plan look good?"
  - **Yes, let's start** - proceed to implementation
  - **Needs changes** - revise based on feedback
  - **Save for later** - write plan to Linear issue as comment

### 9. Update project status

- Get the issue's project via the `projectId` field
- Fetch current project: `get_project(query: projectId)`
- Ask: "Add a status update to the project?"
  - **Yes** - add "Started planning [ticket]"
  - **No** - skip
- If yes:
  - Get current description
  - Append status update in format:
    ```
    ---
    ## Status Updates

    ### YYYY-MM-DD
    - Started planning OPEN-XXX: [ticket title]
    ```
  - Call `update_project(id, description: updatedDescription)`

## Output

After user approves:
1. Add plan as a comment on the Linear issue
2. Update issue status to "In Progress"
3. Optionally add project status update
4. Start implementing the code on the current project branch
