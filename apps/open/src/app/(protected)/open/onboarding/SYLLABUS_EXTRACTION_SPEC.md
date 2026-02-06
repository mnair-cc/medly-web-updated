# Syllabus Extraction AI Capability Spec

## Status: Phase 4 (Polish) - Core Complete

---

## High-Level Goal

Auto-extract course structure from uploaded syllabus PDF and create pre-populated module (collection) with weeks (folders) and placeholder documents.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Entry points | Onboarding Step 9 (MODULE_SETUP), later: sidebar "Add Module" |
| Syllabus storage | Firebase Storage (same as other docs) |
| Edit after creation | Manual edit only (TODO: re-extract feature) |
| Multiple syllabi | One per module |

---

## Architecture

### File Structure
```
/api/open/syllabus/extract/route.ts        → AI extraction endpoint
/api/open/syllabus/create-structure/route.ts → Create collection/folders/docs
/open/onboarding/_types/syllabus.ts         → Extraction types
/open/onboarding/_components/SyllabusPreview.tsx → Preview UI
```

### Data Flow
```
1. User uploads syllabus PDF (Step 9 MODULE_SETUP)
2. Client calls POST /api/open/syllabus/extract
3. API extracts PDF text → sends to Claude → returns ExtractedSyllabus
4. Step 10 shows loading animation
5. Step 11 shows SyllabusPreview (editable module name, weeks, assignments)
6. User confirms → client calls POST /api/open/syllabus/create-structure
7. API creates collection + folders + placeholder docs in Firestore
8. Redirect to /open with new module selected
```

---

## Data Model

### Collection `syllabus` Field (NEW)
Add to `_types/content.ts`:

```typescript
interface Collection {
  id: string;
  name: string;
  position: number;
  primaryColor?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  syllabus?: ExtractedSyllabus;  // Extracted syllabus data for this module
}
```

**Firestore path:** `/users/{userId}/content/collections/items/{collectionId}`

### Document Fields (NEW)
Add to `_types/content.ts`:

```typescript
interface Document {
  // ... existing fields

  // Document type - what kind of document this is
  type?: "document" | "practice" | "flashcards" | "notes" | "canvas";

  // Content label - describes the course material type
  label?: "slides" | "syllabus" | "assignment" | "notes" | "reading" | "practice" | "flashcards";

  // Whether this is a placeholder awaiting user upload
  isPlaceholder?: boolean;
}
```

| Type | Description |
|------|-------------|
| `document` | PDF or uploaded file |
| `practice` | Generated practice test |
| `flashcards` | Generated flashcard deck |
| `notes` | Empty markdown document |
| `canvas` | Empty canvas (future) |

### Extracted Syllabus Types

```typescript
// /open/onboarding/_types/syllabus.ts

interface ExtractedSyllabus {
  moduleName: string;
  moduleCode?: string;
  description?: string;
  instructor?: string;
  weeks: ExtractedWeek[];
  assignments: ExtractedAssignment[];
  readings?: ExtractedReading[];
  gradingBreakdown?: { component: string; weight: number }[];
  learningOutcomes?: string[];  // Syllabus-level learning outcomes
}

interface ExtractedWeek {
  weekNumber: number;
  title: string;
  description?: string;
  items?: WeekItem[];
  learningOutcomes?: string[];  // Week-level learning outcomes
}

type WeekItemType = "lecture" | "seminar" | "lab" | "recitation" | "reading";

interface WeekItem {
  title: string;
  type: WeekItemType;
}

interface ExtractedAssignment {
  title: string;
  description?: string;
  dueDate?: string;      // ISO date (YYYY-MM-DD) if provided
  weighting?: number;    // percentage
  type?: "essay" | "exam" | "presentation" | "project" | "quiz";
}

interface ExtractedReading {
  title: string;
  citation: string;      // Raw citation string to preserve original format
  type?: "textbook" | "article" | "chapter";
  required?: boolean;
}
```

---

## API Routes

### POST `/api/open/syllabus/extract`

```typescript
// Request: FormData { file: File (PDF) }

// Response
{
  status: "success" | "error";
  data?: ExtractedSyllabus;
  error?: string;
}
```

### POST `/api/open/syllabus/create-structure`

```typescript
// Request
{
  syllabus: ExtractedSyllabus;
  syllabusStoragePath?: string;  // Firebase Storage path if uploaded
}

// Response
{
  status: "success" | "error";
  collectionId?: string;
  error?: string;
}
```

**Creates:**
- 1 Collection (module name + syllabus data stored in `syllabus` field)
  - `syllabus` field stores all extracted metadata (instructor, description, gradingBreakdown, etc.) - not displayed for now
- N Folders ("Week 1: {title}", "Week 2: {title}", ...)
- Docs per folder (from week items):
  - Lecture → `{ name, type: "document", label: "slides", isPlaceholder: true }`
  - Seminar → `{ name, type: "notes", label: "notes", isPlaceholder: false }`
  - Lab → `{ name, type: "notes", label: "notes", isPlaceholder: false }`
  - Recitation → `{ name, type: "notes", label: "notes", isPlaceholder: false }`
  - Reading (week item) → `{ name, type: "document", label: "reading", isPlaceholder: true }`
- Root docs:
  - Syllabus PDF → `{ name: "Syllabus", type: "document", label: "syllabus", storagePath }`
  - Assignment per extracted → `{ name: title, type: "notes", label: "assignment" }`
  - Reading per syllabus-level reading → `{ name: title, type: "document", label: "reading", isPlaceholder: true }`

---

## Implementation TODO

### Phase 1: Data Model ✅
- [x] Add `syllabus` field to Collection type in `_types/content.ts`
- [x] Update `type` field on Document to include "notes", "canvas"
- [x] Add `label` field to Document type
- [x] Add `isPlaceholder` field to Document type
- [x] Create `_types/syllabus.ts` with extraction types

### Phase 2: API Routes ✅
- [x] Create `/api/open/syllabus/extract/route.ts` (dummy response)
- [x] Create `/api/open/syllabus/create-structure/route.ts`
- [ ] Implement AI extraction prompt (TODO: replace dummy with Claude)

### Phase 3: Onboarding Integration ✅
- [x] Wire MODULE_SETUP (Step 9) to upload + extract
- [x] Wire MODULE_LOADING (Step 10) to show progress
- [x] Create SyllabusPreview component for Step 11
- [x] Handle skip flow (manual module name)
- [x] Call create-structure on confirm (in handleSubmit)

### Phase 4: Polish
- [ ] Loading states
- [ ] Error handling
- [ ] Edit items before confirming

### Future TODO
- [ ] Re-extract syllabus feature
- [ ] "Add Module" from sidebar with same flow
- [ ] Placeholder upload flow: clicking placeholder doc opens upload dialog
- [ ] AI auto-assign uploads to matching placeholders based on content
- [ ] Update the sidebar with the labels instead of dates, and update cosmetics 

---

## Files to Modify

| File | Changes |
|------|---------|
| `_types/content.ts` | Add `syllabus` to Collection; add `type` ("notes", "canvas"), `label`, `isPlaceholder` to Document |
| `onboarding/page.tsx` | Wire upload/extract/create flow |
| `onboarding/_hooks/useOpenOnboardingAnswers.ts` | Add syllabus state |

## Files to Create

| File | Purpose |
|------|---------|
| `/api/open/syllabus/extract/route.ts` | AI extraction |
| `/api/open/syllabus/create-structure/route.ts` | Create structure |
| `onboarding/_types/syllabus.ts` | Types |
| `onboarding/_components/SyllabusPreview.tsx` | Preview UI |
