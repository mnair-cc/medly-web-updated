# Practice Questions AI Capability Spec

## Status: Phase 3 Complete (Entry Points + Auto-Detection)

---

## High-Level Goal

Auto-generate practice questions when user creates a practice paper from sources.

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Entry points | Sidebar context menu (three-dot menu on DocumentItem/FolderItem) |
| Generation | Batch (multiple questions), can regenerate/append more |
| Display | `OpenQuestionPage.tsx` (existing) |
| Marking | AI-marked (existing infrastructure) |
| Persistence | New document created with `sourceDocumentId` reference |
| Storage | `documentQuestions` in `useSessionOpen.tsx` |

---

## Architecture

### File Structure
```
/api/open/documents/generate-questions/route.ts  → API route (calls backend AI)
/open/_utils/practiceHelpers.ts                   → Client helper (or add to documentHelpers.ts)
/open/_hooks/useSessionOpen.tsx                   → Storage (documentQuestions already exists)
/open/_components/session_structure/practice/     → This spec
```

### Data Flow (Current Implementation)
```
1. User clicks "Generate Practice Test" on source doc/folder (three-dot menu)
2. MOSidebar.handleGeneratePractice() calls createPracticeDocument()
3. Creates new document with { type: "practice", sourceReferences: [...] }
4. Navigates to /open/doc/{practiceDocId}
5. doc/[documentId]/page.tsx fetches document, passes documentType to MOSessionStructure
6. MOSessionStructure detects isPracticeDocument → sets pageType to Practice
7. useSessionOpen detects practice doc → uses dummy questions (TODO: call generatePracticeQuestions)
8. PageRenderer shows OpenQuestionPage for pageType=Practice
```

### API Route: `/api/open/documents/generate-questions/route.ts`
```ts
// POST body
{
  sourceDocumentId: string;
  sourceContent: string;      // Text from source doc
  options?: {
    count?: number;           // Default 5
    difficulty?: "easy" | "medium" | "hard" | "mixed";
    types?: ("mcq" | "short_answer" | "long_answer")[];
  }
}

// Response
{
  status: "success" | "error";
  questions: QuestionWithMarkingResult[];
}
```

### Helper: `open/utils/practiceHelpers.ts`
```ts
export async function generatePracticeQuestions(
  sourceReferences: SourceReference[],
  sourceContent: string,
  options?: GenerateQuestionsOptions
): Promise<QuestionWithMarkingResult[]>

export async function createPracticeDocument(
  sourceReferences: SourceReference[],
  collectionId: string,
  folderId?: string | null
): Promise<string | null>  // Returns practice doc ID
```

---

## Data Model

Uses existing `QuestionWithMarkingResult` from `@/app/types/types`.

Practice document extends base document with:
```ts
// Shared type - see _types/content.ts
interface SourceReference {
  type: "document" | "folder" | "collection";
  id: string;
}

interface PracticeDocument extends Document {
  type: "practice";
  sourceReferences: SourceReference[];  // Multi-select sources
  // questions stored in documentQuestions (existing)
}
```

---

## AI Capabilities (Chat-Initiated)

Register in `OpenQuestionPage.tsx` or parent:

### `generateMoreQuestions`
For chat: "Generate 5 more questions"
```ts
{
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
}
```

### Marking
Already exists in OpenQuestionPage via `handleMarkAnswer`.

---

## Context Collector

```ts
{
  pageType: "practice",
  sourceReferences: SourceReference[],
  questionCount: number,
  answeredCount: number,
  currentScore: { earned: number, max: number },
  questions: Array<{ id, questionText, questionType, userMark?, maxMark }>
}
```

---

## Implementation TODO

### Phase 1: Infrastructure ✅
- [x] Create `/api/open/documents/generate-questions/route.ts` (dummy response)
- [x] Create `utils/practiceHelpers.ts` with `generatePracticeQuestions()`
- [x] Add `sourceReferences` and `type` fields to Document type
- [x] Update document creation flow to support practice type (`createPracticeDocument` in useContentStructure)

### Phase 2: Entry Points ✅
- [x] Add `onGeneratePractice` prop to `DocumentItem.tsx`
- [x] Add `onGeneratePractice` prop to `FolderItem.tsx`
- [x] Add "Generate Practice Test" button to existing three-dot context menu
- [x] Add `handleGeneratePractice` in `MOSidebar.tsx`
- [x] Create practice document at same level as source
- [x] Navigate to new practice document

### Phase 3: Auto-Detection ✅
- [x] In `MOSessionStructure.tsx`, detect `doc.type === "practice"` → set pageType to Practice
- [x] In `useSessionOpen.tsx`, detect practice doc and log where generation should happen
- [x] Add `isGeneratingQuestions` state for loading UI
- [x] Update `OpenSessionData` type with `documentType` and `sourceReferences`
- [x] Update API routes to return `type` and `sourceReferences`

### Phase 4: AI Question Generation
- [ ] Replace `createDummyQuestions()` with actual `generatePracticeQuestions()` call
- [ ] Fetch source content from `sourceReferences` before calling API
- [ ] Add loading skeleton while generating

### Phase 5: Generate More Questions
- [ ] Add "Generate Next" button in practice UI (OpenQuestionPage or parent)
- [ ] Register `generateMoreQuestions` AI capability for chat
- [ ] Add context collector for practice state
- [ ] Both button and chat use same `generatePracticeQuestions()` helper

### Phase 6: Marking Integration
- [ ] Verify marking flow works with AI-generated questions
- [ ] Add explanation display after marking
- [ ] Add retry mechanism

### Phase 7: Polish
- [ ] Error handling (generation failed)
- [ ] "Regenerate" button
- [ ] Progress indicator

---

## Files Created ✅

| File | Purpose |
|------|---------|
| `/api/open/documents/generate-questions/route.ts` | API route (dummy response) |
| `open/utils/practiceHelpers.ts` | Client helpers |

## Files Modified ✅

| File | Changes |
|------|---------|
| `_types/content.ts` | Added `SourceReference`, `type`, `sourceReferences` to Document |
| `_types/sessionTypes.ts` | Added `documentType`, `sourceReferences` to OpenSessionData |
| `DocumentItem.tsx` | Added `onGeneratePractice` prop, handler, menu button |
| `FolderItem.tsx` | Added `onGeneratePractice` prop, handler, menu button |
| `MOSidebar.tsx` | Added `handleGeneratePractice`, `createPracticeDocument` usage |
| `MOSidebarLayoutClient.tsx` | Exposed `createPracticeDocument` in context |
| `_hooks/useContentStructure.ts` | Added `createPracticeDocument()` function |
| `_hooks/useSessionOpen.tsx` | Detects practice docs, `isGeneratingQuestions` state |
| `MOSessionStructure.tsx` | Detects practice doc → sets pageType to Practice |
| `doc/[documentId]/page.tsx` | Passes `documentType`, `sourceReferences` to session |
| `/api/open/documents/route.ts` | Returns `type`, `sourceReferences` |
| `/api/open/documents/[documentId]/route.ts` | Returns `type`, `sourceReferences` |

## Files to Modify (Future)

| File | Changes |
|------|---------|
| `useSessionOpen.tsx` | Replace dummy questions with actual AI call |
| `OpenQuestionPage.tsx` | Add "Generate Next" button, register AI capability |

---

## Dummy Response Format

For initial implementation, API returns:
```ts
{
  status: "success",
  questions: [
    {
      id: 1,
      legacyId: "practice-q-1",
      questionText: "Based on the source material, what is...?",
      questionType: "mcq",
      options: ["A", "B", "C", "D"],
      correctAnswer: "B",
      maxMark: 1,
      difficulty: "medium",
      // ... other QuestionWithMarkingResult fields
    },
    // ... more questions
  ]
}
```
