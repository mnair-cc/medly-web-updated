# Deployment Awareness Report

You are generating a comprehensive deployment awareness report for the **$ENVIRONMENT** environment.

**IMPORTANT:** This report is filtered to only show changes that impact the **$APP_NAME** platform (`$APP_PATH/`). Changes to other apps that don't affect this environment have been excluded.

## Context

- **Environment:** $ENVIRONMENT
- **Target App:** $APP_NAME (`$APP_PATH/`)
- **Last Deployment SHA:** $DEPLOYMENT_SHA
- **Last Deployment Date:** $DEPLOYMENT_DATE
- **Commits Affecting This App:** $COMMIT_COUNT (out of $TOTAL_COMMIT_COUNT total)
- **PRs Affecting This App:** $PR_COUNT (out of $TOTAL_PR_COUNT total)

## Your Task

Generate a detailed deployment awareness report that helps the deployer understand what's being deployed and what needs to be tested.

### Step 1: Gather Information

Read the following files that have been prepared (already filtered for $APP_NAME):

```bash
# List of changed files affecting this app (app-specific + infrastructure)
cat all_changed_files.txt

# App-specific changes only
cat app_specific_changes.txt

# Infrastructure and shared code changes (affects all apps)
cat infra_changes.txt

# Route/page changes (user-facing paths for this app)
cat route_changes.txt

# DX/Test changes for this app
cat dx_changes.txt

# PR summary (only PRs affecting this app)
cat pr_summary.txt

# Full PR data with details (filtered for this app)
cat merged_prs.json

# Diff statistics
cat diff_stats.txt

# Full diff for detailed analysis (use head for large diffs)
head -500 full_diff.txt

# Reference: All platform changes (for context only)
cat exams_changes.txt
cat open_changes.txt
```

### Step 2: Analyze the Changes

For each merged PR that affects the **$APP_NAME** platform, understand:
1. What feature/fix it introduces
2. Whether it's an app-specific change or infrastructure change
3. The risk level of the changes
4. What user flows in $APP_NAME might be impacted

### Step 3: Generate the Report

Create a markdown report file called `deployment_report.md` with the following structure:

```markdown
# 🚀 Deployment Awareness Report

**Environment:** $ENVIRONMENT
**Target App:** $APP_NAME
**Report Generated:** $(date -u +"%Y-%m-%d %H:%M UTC")
**Changes Since:** $DEPLOYMENT_DATE

> ℹ️ This report is filtered to only show changes impacting the **$APP_NAME** platform.

---

## 📊 Summary

| Metric | Count |
|--------|-------|
| Commits (affecting $APP_NAME) | X of Y total |
| Merged PRs (affecting $APP_NAME) | X of Y total |
| Files Changed | X |
| App-Specific Changes | X |
| Infrastructure Changes | X |

---

## 📋 Merged Pull Requests

[List each PR affecting $APP_NAME with:]
- **PR #XXX:** Title
  - Author: @username
  - Risk: 🟢 Low / 🟡 Medium / 🔴 High
  - Type: App-Specific / Infrastructure / Both
  - Summary: Brief description of what this PR does

---

## 🎯 $APP_NAME Platform Changes

### New Features
- [Feature 1 description - from which PR]
- [Feature 2 description - from which PR]

### Bug Fixes
- [Fix 1 description - from which PR]

### UI/UX Changes
- [UI change 1 - from which PR]

---

## 🛤️ Routes Touched

List all user-facing routes in $APP_NAME that have changes:

- `/path/to/route` - [What changed]
- `/(protected)/dashboard` - [What changed]

---

## 🔧 Infrastructure & Shared Code

Changes outside `apps/` that could affect the $APP_NAME platform:

- [middleware.ts changes - if any]
- [auth changes - if any]
- [shared components - if any]
- [API clients - if any]
- [Database changes - if any]
- [CI/CD workflow changes - if any]

---

## 🛠️ DX & Reliability Improvements

- **Tests Added/Modified:**
  - [List test files changed]
  
- **Agent/Automation Changes:**
  - [List any agent-related changes]

- **Configuration Changes:**
  - [List any config file changes]

---

## ⚠️ Risk Assessment

### High Risk Areas
[List any changes to critical paths like auth, payments, middleware]

### Medium Risk Areas
[List changes to shared components or multiple routes]

### Low Risk Areas
[Isolated changes, styling, copy updates]

---

## 🧪 Post-Deployment Testing Checklist

### Critical Flows (Must Test)

These flows MUST be manually verified after deployment for **$APP_NAME**:

- [ ] **[Flow Name]** - [Specific test steps]
  - Navigate to X
  - Perform action Y
  - Verify result Z

### Happy Path Tests

Standard user journeys to verify for **$APP_NAME**:

- [ ] **User Authentication** - Sign in/out works correctly
- [ ] **[Feature-specific test]** - Based on changes in this deploy

### Regression Tests

Areas in $APP_NAME that might be affected by infrastructure changes:

- [ ] [Test 1 based on shared code changes]
- [ ] [Test 2 based on dependency changes]

### E2E Test Filters

Recommended E2E test suites to run post-deployment for $APP_NAME:

```
# Based on the changes, run these test suites in $APP_PATH/e2e/:
[List specific test file patterns or tags]
```

---

## 📝 Deployment Notes

[Any special instructions for the deployer, such as:]
- Environment variables that need to be set
- Database migrations to run
- Feature flags to enable/disable
- Rollback considerations
```

### Step 4: Output the Report

After creating the report, output it to the console so it's visible in the GitHub Actions log:

```bash
cat deployment_report.md
```

Also create a GitHub Actions summary:

```bash
cat deployment_report.md >> $GITHUB_STEP_SUMMARY
```

## Guidelines

### App Context

You are generating a report specifically for the **$APP_NAME** platform. Focus your analysis on changes that impact this app.

### Platform Classification

**Exams Platform (`apps/exams/`):**
- SAT/ACT test prep
- Lessons and practice sessions
- User progress and analytics
- Payment/subscription flows

**Open Platform (`apps/open/`):**
- Document management
- AI-powered study tools
- Collections and organization
- Chat/AI features

**Infrastructure (outside `apps/`):**
- Root configuration files
- CI/CD workflows
- Shared scripts
- Package management
- These changes could affect ALL platforms, so include them in the report

### Risk Classification

**🔴 High Risk:**
- Authentication/authorization changes
- Payment/billing changes
- Middleware modifications
- Database schema changes
- Environment configuration
- Core provider components

**🟡 Medium Risk:**
- Shared components used across multiple features
- API endpoint changes
- State management changes
- Multiple routes modified

**🟢 Low Risk:**
- Single route/page changes
- Styling/UI only changes
- Copy/text updates
- Test file changes
- Documentation

### Testing Checklist Guidelines

Generate SPECIFIC, ACTIONABLE test items based on actual changes:

1. **Be Specific:** Don't say "test authentication" - say "Sign in with email, verify redirect to dashboard"

2. **Cover Changed Areas:** Every significant code change should have at least one test item

3. **Include Edge Cases:** For complex changes, include edge case tests

4. **E2E Test Mapping:** Map changes to existing E2E test files for $APP_NAME:
   - `$APP_PATH/e2e/` - E2E tests for $APP_NAME

5. **Prioritize by Risk:** Order tests by importance - critical flows first

## Important

- Be thorough but concise
- Focus on actionable information specific to **$APP_NAME**
- Highlight anything unusual or risky
- Infrastructure changes affect all apps, so include them even though this is a filtered report
- The deployer should finish reading this report knowing exactly what's being deployed to **$ENVIRONMENT** and what to watch for in **$APP_NAME**
