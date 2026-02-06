# Open Onboarding Spec

## Status: Phase 2 Complete (Extended Flow UI)

---

## High-Level Goal

Standalone onboarding flow for Medly Open platform. Users on `/open/*` routes must complete this before accessing the platform.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Separate from main onboarding? | Yes - standalone, skips main onboarding entirely |
| Storage | Firestore `/users/{userId}` with `hasCompletedOpenOnboarding` field |
| API | Internal `/api/open/profile` route (not curriculum API) |
| Component sharing | Self-contained - duplicated from main onboarding |
| Entry point | Middleware redirects `/open/*` → `/open/onboarding` if incomplete |
| University source | CSV at `/public/assets/universities/uni_uk_us.csv` (TODO: move to DB API) |
| Degree source | CSV at `/public/assets/universities/degree_list.csv` using `major` column |

---

## Architecture

### File Structure
```
/api/open/profile/route.ts                    → GET/PUT user profile (Firestore)
/open/onboarding/
  page.tsx                                    → Main orchestrator (handles all step types)
  ONBOARDING_SPEC.md                          → This file
  _types/types.ts                             → OpenOnboardingData, Step, Question, enums
  _config/steps.ts                            → Step definitions
  _hooks/useOpenOnboardingAnswers.ts          → Profile + module state, API submission
  _utils/validation.ts                        → Step validation logic
  _components/
    GridSelect.tsx                            → Avatar picker grid
    ProgressBarSet.tsx                        → Progress indicator
    QuestionRenderer.tsx                      → Routes question types to components
    QuestionSection.tsx                       → Question section wrapper
    MotivationalStep.tsx                      → Animated secrets screens
    SearchableSelect.tsx                      → University autocomplete (fixed positioning)
    InfoPage.tsx                              → Static info pages with image placeholders
```

### Data Flow
```
1. User visits /open/* route
2. Middleware fetches /api/open/profile → checks hasCompletedOpenOnboarding
3. If false → redirects to /open/onboarding
4. User completes steps → PUT /api/open/profile sets hasCompletedOpenOnboarding: true
5. Redirects to /open
6. Middleware allows access (hasCompletedOpenOnboarding = true)
```

---

## Data Model

### Profile Storage (Firestore /users/{userId})
```ts
// /users/{userId} document - profile data only
{
  userName: string;
  avatar: string;
  focusArea: string;
  university: string;
  hasCompletedOpenOnboarding: boolean;
  // ... other existing user fields
}
```

### Module Storage
Module data stored separately (not in profile) - user may have multiple modules.
Location TBD.

### Client State Types
```ts
// Profile data (saved to Firestore)
interface OpenOnboardingData {
  userName: string;
  avatar: string;
  focusArea: string;
  university: string;
}

// Module data (client-only during onboarding)
interface ModuleOnboardingData {
  moduleName?: string;
  curriculumFile?: File;
  moduleInfo?: ExtractedModuleInfo;
}

interface ExtractedModuleInfo {
  name: string;
  topics?: string[];
  description?: string;
}
```

### Question Types
```ts
enum QuestionType {
  TEXT = "text",
  AVATAR = "avatar",
  MULTIPLE_CHOICE = "multiple-choice",
  SEARCHABLE_SELECT = "searchable-select",      // University
  FLOW_SELECT = "flow-select",
}
```

### Step Types
```ts
enum StepType {
  QUESTION = "question",
  MOTIVATIONAL = "motivational",
  MOTIVATIONAL_FADED = "motivational-faded",
  MOTIVATIONAL_MEDLY = "motivational-medly",
  INFO = "info",                    // Info pages with image placeholders
  MODULE_SETUP = "module-setup",    // Upload curriculum or skip
  MODULE_LOADING = "module-loading", // AI processing
  MODULE_RESULT = "module-result",  // Display extracted or manual input
  COURSE_UPLOAD = "course-upload",  // Course materials upload
}
```

---

## Steps Configuration

| # | Type | Content | Progress Bar |
|---|------|---------|--------------|
| 0 | Info | Welcome | Yes |
| 1 | Question | Focus area ("What brings you to Medly?") | Yes |
| 2 | Carousel | Intro carousel (3 slides) | Yes |
| 3 | Question | Name + Avatar ("Let's get you set up") | Yes |
| 4 | Question | University (searchable autocomplete) | Yes |
| 5 | Info Dynamic | "You're in!" with university student count | Yes |
| 6 | Loading | "Setting up your workspace..." → redirect to /open | No |

### Focus Area Options
- Stay organized across my modules → `stay_organised`
- Keep up with lectures → `keep_up_lectures`
- Get help with assignments → `help_assignments`
- Prepare for exams → `prepare_exams`

---

## Data Sources

### Universities
- **Source:** External API `/api/v2/universities`
- **UI:** Searchable autocomplete with fixed-position dropdown

---

## Module Setup Flow

### Path A: Upload Curriculum
1. User clicks "Upload curriculum" on step 9
2. Show loading screen (step 10) - currently placeholder
3. AI extracts module info (TODO: implement API)
4. Display extracted info (step 11)
5. Continue to course materials upload

### Path B: Skip Upload
1. User clicks "Skip for now" on step 9
2. Jump directly to step 11 (skips loading)
3. Shows text input for manual module name entry
4. Continue to course materials upload

---

## API Routes

### GET /api/open/profile
Returns user's open profile status.
```ts
// Response
{
  hasCompletedOpenOnboarding: boolean;
  userName?: string;
  avatar?: string;
}
```

### PUT /api/open/profile
Saves profile and marks onboarding complete.
```ts
// Request body (profile data only, no module data)
{
  userName: string;
  avatar: string;
  focusArea: string;
  university: string;
}

// Response
{ success: true }
```

---

## Middleware Logic

Location: `src/middleware.ts` (lines 56-90)

```ts
// Open onboarding gate (BEFORE main onboarding check)
if (isOpenPageRoute) {
  // Fetch profile from /api/open/profile
  // If hasCompletedOpenOnboarding && on /open/onboarding → redirect to /open
  // If !hasCompletedOpenOnboarding && not on /open/onboarding → redirect to /open/onboarding
  // Otherwise allow access
}
```

---

## Layout Handling

Location: `src/app/(protected)/open/layout.tsx`

- Onboarding route (`/open/onboarding`) renders minimal layout (no sidebar/chat)
- Other `/open/*` routes render full layout with sidebar + chat

---

## Implementation Notes

### Dropdown Positioning
- `SearchableSelect` uses **fixed positioning** for dropdowns
- Position calculated dynamically from input element's `getBoundingClientRect()`
- Uses `z-[9999]` to ensure dropdown appears above all content
- Handles scroll and resize events to reposition

---

## Files Summary

### Created
| File | Purpose |
|------|---------|
| `/api/open/profile/route.ts` | GET/PUT Firestore profile |
| `page.tsx` | Main orchestrator with all step type handling |
| `_types/types.ts` | Type definitions + enums |
| `_config/steps.ts` | Step configurations |
| `_hooks/useOpenOnboardingAnswers.ts` | Profile + module state management |
| `_utils/validation.ts` | Step validation for all question types |
| `_components/GridSelect.tsx` | Avatar grid picker |
| `_components/ProgressBarSet.tsx` | Progress indicator |
| `_components/QuestionRenderer.tsx` | Question type router |
| `_components/QuestionSection.tsx` | Question section wrapper |
| `_components/MotivationalStep.tsx` | Animated motivational screens |
| `_components/SearchableSelect.tsx` | University autocomplete |
| `_components/InfoPage.tsx` | Info pages with placeholders |

### Modified
| File | Changes |
|------|---------|
| `src/middleware.ts` | Added open onboarding gate (lines 56-90) |
| `src/app/(protected)/open/layout.tsx` | Conditional layout for onboarding |

---

## TODO

### Phase 3: Backend Integration
- [ ] Move university list to database API
- [ ] Add curriculum extraction API endpoint
- [ ] Add course materials upload endpoint
- [ ] Implement actual file upload UI for module setup (step 9)
- [ ] Implement actual file upload UI for course materials (step 12)
- [ ] Store module data to appropriate location after extraction

### Phase 4: Polish
- [ ] Add actual images for info pages (steps 3-5)
- [ ] Analytics tracking (PostHog events)
- [ ] Error handling improvements
- [ ] Loading states refinement
- [ ] Keyboard navigation for dropdowns
