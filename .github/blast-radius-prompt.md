# Blast Radius Analysis

You are analyzing PR #$PR_NUMBER titled "$PR_TITLE" to determine its blast radius - the potential impact of the changes on the application.

## Your Task

1. Read `changed_files.txt` to see which files were modified
2. Analyze the actual code changes using `gh pr diff $PR_NUMBER`
3. Determine the blast radius category
4. Update the PR with a label and analysis in the description

## Blast Radius Categories

### 🔴 NUCLEAR (`blast-radius/nuclear`)

Changes that could bring down the entire website or affect all users:

- `src/middleware.ts` - routing/auth middleware
- `src/auth.ts` or any auth-related files
- Token handling, session management
- Database connection/configuration
- Firebase configuration or admin SDK
- Environment variable handling
- `next.config.ts` changes
- Provider components that wrap the entire app (AuthProvider, UserProvider, etc.)
- Changes to `src/app/layout.tsx` or root layouts
- Axios instances or API client configuration (`axiosHelper.ts`)
- Any changes to error boundaries at app level

### 🟠 CONTROLLED BLAST (`blast-radius/controlled`)

Changes affecting multiple areas but not catastrophic:

- Shared components in `src/app/_components/`
- Shared hooks in `src/app/_hooks/`
- Utility functions in `src/app/_lib/`
- Changes to multiple routes simultaneously
- Backend API integration changes affecting multiple features
- Type definitions used across multiple files
- Context providers for specific features
- Database schema or Firestore rules
- Changes to 5+ files across different directories

### 🟢 SNAPPER (`blast-radius/snapper`)

Isolated, low-risk changes:

- Single route/page changes (e.g., only files in `src/app/(protected)/dashboard/`)
- Component changes used in only one place
- Visual/styling only changes
- Copy/text changes
- Single API endpoint modification
- Test files only
- Documentation only
- Adding new isolated features that don't touch existing code

## Decision Logic

1. If ANY file matches NUCLEAR criteria → Label as NUCLEAR
2. Else if changes match CONTROLLED criteria → Label as CONTROLLED
3. Else → Label as SNAPPER

## Instructions

### Step 1: Analyze the changes

```bash
# Read changed files
cat changed_files.txt

# Get the full diff for detailed analysis
gh pr diff $PR_NUMBER
```

### Step 2: Check current blast radius label

Before making any label changes, check what label is already on the PR:

```bash
# Get current blast radius label (if any)
CURRENT_LABEL=$(gh pr view $PR_NUMBER --json labels -q '.labels[].name | select(startswith("blast-radius/"))')
echo "Current label: $CURRENT_LABEL"
```

### Step 3: Update label only if different

Only modify labels if the new category is different from the current one. This avoids unnecessary label churn.

```bash
NEW_LABEL="blast-radius/<category>"

if [ "$CURRENT_LABEL" = "$NEW_LABEL" ]; then
  echo "Label unchanged, skipping label update"
else
  # Remove old label if present
  if [ -n "$CURRENT_LABEL" ]; then
    gh pr edit $PR_NUMBER --remove-label "$CURRENT_LABEL" 2>/dev/null || true
  fi
  # Add new label
  gh pr edit $PR_NUMBER --add-label "$NEW_LABEL"
fi
```

### Step 4: Update PR description with analysis

Get the current PR body, then update it. The analysis should be in a specific section that can be replaced on subsequent runs.

```bash
# Get current PR body
gh pr view $PR_NUMBER --json body -q '.body' > pr_body.txt
```

If the PR body contains `<!-- BLAST_RADIUS_START -->` and `<!-- BLAST_RADIUS_END -->`, replace that section. Otherwise, append the analysis at the end.

The analysis section format (keep it concise):

```
<!-- BLAST_RADIUS_START -->
---
## 💥 Blast Radius

**Category:** 🔴 NUCLEAR / 🟠 CONTROLLED BLAST / 🟢 SNAPPER

**Why:** [1-2 sentence explanation of the category choice]

**Key files:** [Only 2-4 files that most influenced the decision, not every file changed]
- `file.ts` - [brief note]

**Review focus:** [1 sentence on things reviewer should pay attention to]

### 🧪 Pre-merge Testing Checklist

**Manual Tests:**
- [ ] [Specific manual test 1 - e.g., "Sign up with a new user and verify email flow completes"]
- [ ] [Specific manual test 2 - e.g., "Navigate to /dashboard and verify data loads correctly"]
- [ ] [Additional manual tests as needed based on the changes]

**Automated Tests:**
- [ ] [Existing test to run - e.g., "Run `npm test -- auth.test.ts` to verify auth logic"]
- [ ] [New test to write if needed - e.g., "Add unit test for the new validation function in utils.ts"]

**Smoke Tests (if NUCLEAR/CONTROLLED):**
- [ ] [Critical path test - e.g., "Complete a full lesson flow from start to marking"]
- [ ] [Auth flow test - e.g., "Log out and log back in, verify session persists"]

<!-- BLAST_RADIUS_END -->
```

**Testing Checklist Guidelines:**

Generate specific, actionable tests based on the actual code changes. Consider:

1. **Manual Tests** - Be specific about user flows:
   - For auth changes: "Sign up with new email", "Log in with existing user", "Reset password flow"
   - For UI changes: "Navigate to [route] and verify [component] renders correctly"
   - For data changes: "Create a new [entity], edit it, delete it, verify persistence"
   - For lesson/session changes: "Start a lesson, answer questions, verify marking accuracy"

2. **Automated Tests** - Reference existing tests or suggest new ones:
   - Point to specific test files that cover the changed code
   - Suggest new unit tests for new functions/logic
   - Recommend integration tests for API changes

3. **Smoke Tests** - Critical paths that must work:
   - Full user journeys that touch the changed code
   - Auth flows if any auth-related code changed
   - Payment flows if billing code changed

**Important formatting rules:**

- Key files: List only the 2-4 most impactful files that determined the category (skip boilerplate, tests, minor changes)
- Review focus: One sentence highlighting the riskiest part
- Testing checklist: Generate 3-8 specific tests depending on blast radius (more tests for NUCLEAR, fewer for SNAPPER)

Use this command to update the PR body:

```bash
gh pr edit $PR_NUMBER --body "$(cat updated_body.txt)"
```

## Important Notes

- Be conservative: when in doubt, choose the higher-risk category
- Look at WHAT the code does, not just WHERE it is
- A small change to auth.ts is more impactful than a large change to a single page component
- Consider transitive dependencies - a shared hook change affects everywhere it's used
