# AI Document Organization Spec

## Overview

Intelligent document organization when files are uploaded to the sidebar:
1. **Placeholder upload** - Upload into placeholder document (replaces it)
2. **Targeted drag-drop** - User drags to specific folder/position → respect that
3. **Generic drag-drop** - User drags to "drop zone" → AI suggests location

---

## Behavior Matrix

| Upload Method | AI Behavior |
|--------------|-------------|
| Click placeholder → upload | Upload into that placeholder doc (no AI needed) |
| Drag to specific folder/position | User showed intention → keep there, show suggestion badge ONLY if AI disagrees |
| Drag to generic drop zone | AI decides location → auto-move (no user intention expressed) |

**Note:** Behavior is determined by upload method, not confidence score. Confidence is used internally for evals only. 

---

## AI Context (sent to backend)

```typescript
interface FolderSuggestionContext {
  documentId: string;
  documentName: string;
  documentText: string;              // First page OCR/text
  collectionId: string;
  existingFolders: Array<{
    id: string;
    name: string;
    documentNames: string[];
    hasPlaceholder?: boolean;        // Has unfilled placeholder
  }>;
  placeholderDocuments: Array<{      // Placeholders that could match
    id: string;
    name: string;
    label: string;
    folderId: string | null;
  }>;
  rootDocumentNames: string[];
}
```

---

## File Structure

```
src/app/(protected)/open/
├── _types/
│   └── aiOrganization.ts           ← NEW
├── _utils/
│   └── documentHelpers.ts          ← MOVE from utils/
├── _hooks/
│   ├── useContentStructure.ts      ← MODIFY (add uploadIntoPlaceholder)
│   └── useAIOrganization.ts        ← NEW
├── _components/
│   ├── DocumentItem.tsx            ← MODIFY (add isLoading prop)
│   ├── MOSidebar.tsx               ← MODIFY (placeholder fix + optimistic UI + AI)
│   └── ai/                         ← NEW folder
│       └── FolderSuggestionBadge.tsx
└── utils/                          ← DELETE after move

src/app/api/open/documents/
├── upload-into-placeholder/route.ts  ← NEW (Phase 0)
└── suggest-folders/route.ts          ← NEW (Phase 2)
```

---

## Implementation Steps

### 1. Types (`_types/aiOrganization.ts`)

```typescript
export interface FolderSuggestion {
  documentId: string;
  documentName: string;
  suggestedFolderId: string | null;
  suggestedFolderName: string;
  replacePlaceholderId?: string;     // If should replace a placeholder
  confidence: number;
  reasoning?: string;
  previousFolderId: string | null;
  previousPosition: number;
}
```

### 2. Move utils (`utils/documentHelpers.ts` → `_utils/documentHelpers.ts`)

Add new functions:
- `suggestDocumentFolders(contexts[])` - API call
- `buildFolderSuggestionContext()` - Build context from current state

### 3. API Route (`/api/open/documents/suggest-folders/route.ts`)

- POST accepts `{ documents: FolderSuggestionContext[] }`
- Calls Python backend `/api/suggestDocumentFolders`
- Returns `{ suggestions: FolderSuggestion[] }`

### 4. Hook (`_hooks/useAIOrganization.ts`)

```typescript
interface UseAIOrganizationReturn {
  pendingSuggestions: FolderSuggestion[];
  isProcessing: boolean;
  processingDocIds: string[];

  // For targeted drag-drop: run AI, compare with user's choice
  requestSuggestionForTargetedDrop: (
    docId: string,
    collectionId: string,
    userChosenFolderId: string | null
  ) => Promise<void>;

  // For generic drop zone: AI decides and auto-moves
  requestAutoOrganize: (docId: string, collectionId: string) => Promise<void>;

  // User actions on suggestion badges
  acceptSuggestion: (docId: string) => Promise<void>;
  rejectSuggestion: (docId: string) => void;
}
```

### 5. UI Components

**FolderSuggestionBadge** - Shows on documents when AI suggests a different location

### 6. MOSidebar Integration

**Modify upload handling:**
- Placeholder click → upload into that placeholder
- Targeted drag-drop → upload to user's location, run AI in background
- Generic drop zone → upload, then auto-move to AI's suggestion

**Render changes:**
- Show `FolderSuggestionBadge` on docs with pending suggestions (targeted drag-drop only)

---

## Key Behaviors

### Placeholder Upload (click or single-file drag)
1. User clicks placeholder doc → file picker opens
2. **OR** User drags single file onto placeholder doc
3. Upload replaces placeholder (same doc ID, add storage/content)
4. No AI needed - location already determined by placeholder
5. **Note:** Multi-file drag onto placeholder treated as targeted drop to that folder instead

#### BUG: Current Implementation Broken

**Current behavior (wrong):**
```
Click placeholder "Week 1 Slides" (id: "placeholder-123")
    ↓
fileInputRef.current?.click()  // Opens file picker, loses placeholder context
    ↓
handleFileSelect() runs
    ↓
uploadDocument(file, selectedCollection)  // Creates NEW doc at root!
```

**Required behavior:**
```
Click placeholder "Week 1 Slides" (id: "placeholder-123")
    ↓
Store: pendingPlaceholderId = "placeholder-123"
    ↓
fileInputRef.current?.click()
    ↓
handleFileSelect() checks pendingPlaceholderId
    ↓
uploadIntoPlaceholder(file, "placeholder-123")  // Replace placeholder
```

**Fix required in MOSidebar.tsx:**

```typescript
// NEW: Track which placeholder triggered the upload
const [pendingPlaceholderId, setPendingPlaceholderId] = useState<string | null>(null);

const handleDocumentClick = useCallback(
  (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);

    if (doc?.isPlaceholder) {
      setPendingPlaceholderId(documentId);  // Remember which placeholder
      fileInputRef.current?.click();
      return;
    }
    // ... navigate
  }
);

const handleFileSelect = useCallback(
  async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (pendingPlaceholderId) {
      // Upload into placeholder (needs new API/hook function)
      await uploadIntoPlaceholder(file, pendingPlaceholderId);
      setPendingPlaceholderId(null);
      return;
    }

    // Existing: normal upload flow
    uploadDocument(file, selectedCollection);
  },
  [pendingPlaceholderId, uploadIntoPlaceholder, ...],
);
```

**Also needs:** `uploadIntoPlaceholder()` function in `useContentStructure.ts` that:
1. Uploads file to storage
2. Updates existing placeholder doc (same ID) with `storageUrl`, `isPlaceholder: false`

### Targeted Drag-Drop (user showed intention)
1. User drags file to specific folder/position
2. **Optimistic:** Immediately show faded document at user's chosen location
3. **Background:** Upload file + AI runs in parallel
4. **On complete:**
   - If AI agrees → unfade document, done
   - If AI disagrees → unfade document + show suggestion badge ("Move to X?")
5. User can accept (move) or dismiss (keep in place)

### Generic Drop Zone (no user intention)
1. User drags file to "Click or drag and drop..." area
2. **Optimistic:** Immediately show faded document at root
3. **Background:** Upload file + AI runs
4. **On complete:**
   - If AI suggests location → move document there + unfade
   - If AI has no suggestion → unfade in place

---

## Loading State

Documents in loading state (upload + AI processing) should:
- Appear immediately at their optimistic position
- Show faded/dimmed appearance (e.g., `opacity-50`)
- Optionally show a subtle loading indicator
- Not be draggable until processing completes

```typescript
// Document type extension
interface Document {
  // ... existing fields
  isLoading?: boolean;  // True during upload + AI processing
}

// In DocumentItem.tsx
const isLoading = doc.isLoading;
<div className={`${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
  {isLoading && <LoadingSpinner />}  // Optional
  ...
</div>
```

### State Transitions

```
TARGETED DRAG:
[faded, position=user's choice]
    → upload complete
    → AI complete
    → [unfaded] + optional badge

GENERIC DROP:
[faded, position=root]
    → upload complete
    → AI complete
    → [unfaded, position=AI's choice]
```

---

## Bulk Uploads

### Multiple Files
- Each file processed independently in parallel
- Max 10 concurrent uploads at a time (queue the rest)
- Each file gets its own AI suggestion
- Files unfade individually as each completes

**Multiple files to drop zone:**
```
User drags 5 PDFs to drop zone
    ↓
All 5 appear faded at root (optimistic)
    ↓
Each uploads + AI runs in parallel (max 10 concurrent)
    ↓
As each completes: move to AI's location + unfade (staggered)
```

**Multiple files to specific folder:**
```
User drags 5 PDFs to "Week 2" folder
    ↓
All 5 appear faded in Week 2 (optimistic)
    ↓
Each uploads + AI runs in parallel
    ↓
As each completes: unfade + show badge IF AI disagrees
```

### Folder Drag
- Flatten folder structure - extract all PDFs
- Treat each PDF as separate file
- Ignore folder hierarchy (don't create nested folders)

```
User drags folder containing 8 PDFs
    ↓
Extract all PDFs from folder (recursive)
    ↓
Treat as 8 individual file uploads
    ↓
Same flow as multiple files above
```

### Concurrency

```typescript
const MAX_CONCURRENT_UPLOADS = 10;

// Queue implementation in useContentStructure or useAIOrganization
interface UploadQueue {
  pending: File[];
  inProgress: Set<string>;  // docIds currently uploading
  completed: Set<string>;
}
```

---

## Error Handling

| Error | Behavior |
|-------|----------|
| Upload fails (network/server) | Show error state on document (red border), allow retry button |
| AI API fails | Keep document where it is, unfade, no badge (fail silently) |
| Document move fails | Keep in original position, show error toast |

---

## Badge Lifecycle

- **Accept** → Badge removed, document moved to suggested location
- **Dismiss** → Badge removed, document stays in current location
- **Page refresh** → All badges cleared (not persisted)
- **No timeout** → Badges persist until user action or refresh

---

## Navigation Rules

**BUG: Current behavior navigates to `/open/doc/${tempId}` on upload - should stay on sidebar instead.**

| Upload Type | Navigation |
|-------------|------------|
| Single file (any method) | Stay on sidebar |
| Multiple files | Stay on sidebar |
| Placeholder upload | Stay on sidebar |

Remove the `router.push()` call from upload handlers.

---

## Edge Cases

- **Duplicate files**: Allowed (append timestamp to filename if collision)
- **AI confidence**: Ignored - always use AI's suggestion regardless of confidence
- **Page refresh during upload**: Cancels pending uploads (local state lost)
- **File types**: Currently PDF only, other types show error message

---

## Clarified Decisions

- **Placeholder matching**: Yes, AI should match uploads to unfilled placeholders
- **Document text**: Quick title extraction from document name + metadata (can enhance later)
- **Backend**: Create dummy route following existing pattern (like generate-flashcards)
- **Drag to placeholder**: Single file = replace placeholder, multi-file = targeted drop to folder

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `/api/open/documents/upload-into-placeholder/route.ts` | CREATE - Placeholder upload endpoint |
| `_hooks/useContentStructure.ts` | MODIFY - Add `uploadIntoPlaceholder()` |
| `_types/aiOrganization.ts` | CREATE - Types for suggestions |
| `utils/documentHelpers.ts` → `_utils/documentHelpers.ts` | MOVE + ADD new functions |
| `_hooks/useAIOrganization.ts` | CREATE - State management hook |
| `/api/open/documents/suggest-folders/route.ts` | CREATE - Dummy AI endpoint |
| `_components/ai/FolderSuggestionBadge.tsx` | CREATE - Suggestion badge UI |
| `_components/DocumentItem.tsx` | MODIFY - Add `isLoading` prop for faded state |
| `MOSidebar.tsx` | MODIFY - Fix placeholder click + optimistic UI + AI hook + badge |

---

## API Route Pattern (from codebase)

```typescript
// /api/open/documents/suggest-folders/route.ts
import { NextRequest, NextResponse } from "next/server";

interface SuggestFoldersRequest {
  documents: Array<{
    documentId: string;
    documentName: string;
    collectionId: string;
    existingFolders: Array<{ id: string; name: string; documentNames: string[] }>;
    placeholderDocuments: Array<{ id: string; name: string; label: string; folderId: string | null }>;
    rootDocumentNames: string[];
  }>;
}

export async function POST(request: NextRequest) {
  // TODO: Replace with actual backend call
  // Return dummy suggestions for now
  const { documents } = await request.json();

  const suggestions = documents.map(doc => ({
    documentId: doc.documentId,
    documentName: doc.documentName,
    suggestedFolderId: null,
    suggestedFolderName: "",
    replacePlaceholderId: undefined,
    confidence: 0, // No suggestion in dummy mode
    previousFolderId: null,
    previousPosition: 0,
  }));

  return NextResponse.json({ status: "success", suggestions });
}
```

---

## Execution Order

**Phase 0 (Bug Fix):**
1. Create `/api/open/documents/upload-into-placeholder/route.ts`
2. Add `uploadIntoPlaceholder()` to `useContentStructure.ts`
3. Fix `MOSidebar.tsx` placeholder click flow (`pendingPlaceholderId` state)

**Phase 1-5 (AI Organization):**
4. Create `_types/aiOrganization.ts`
5. Move `utils/documentHelpers.ts` → `_utils/documentHelpers.ts`, update imports
6. Add new helper functions to `documentHelpers.ts`
7. Create `/api/open/documents/suggest-folders/route.ts`
8. Create `_hooks/useAIOrganization.ts`
9. Create `_components/ai/FolderSuggestionBadge.tsx`
10. Integrate AI hook into `MOSidebar.tsx`
11. Delete empty `utils/` folder

---

## TODO

### Phase 0: Fix Upload Bugs ✅
- [x] Add `pendingPlaceholderId` state to MOSidebar.tsx
- [x] Update `handleDocumentClick` to set `pendingPlaceholderId` before opening file picker
- [x] Create `uploadIntoPlaceholder()` function in `useContentStructure.ts`
- [x] Create `/api/open/documents/upload-into-placeholder/route.ts` API endpoint
- [x] Update `handleFileSelect` to check `pendingPlaceholderId` and call `uploadIntoPlaceholder()`
- [x] Handle single-file drag onto placeholder (same as click)
- [x] **FIX:** Remove `router.push()` from upload handlers - stay on sidebar instead

### Phase 1: Foundation ✅
- [x] Create `_types/aiOrganization.ts` with `FolderSuggestion` and `FolderSuggestionContext` types
- [x] Move `utils/documentHelpers.ts` → `_utils/documentHelpers.ts`
- [x] Update all imports referencing old utils path
- [x] Delete empty `utils/` folder

### Phase 2: API Layer ✅
- [x] Create `/api/open/documents/suggest-folders/route.ts` (dummy endpoint)
- [x] Add `suggestDocumentFolders()` API call function to `_utils/documentHelpers.ts`
- [x] Add `buildFolderSuggestionContext()` helper to `_utils/documentHelpers.ts`

### Phase 3: State Management ✅
- [x] Create `_hooks/useAIOrganization.ts` hook
- [x] Implement `pendingSuggestions` state
- [x] Implement `requestSuggestionForTargetedDrop()` for targeted drops
- [x] Implement `requestAutoOrganize()` for generic drop zone
- [x] Implement `acceptSuggestion()` and `rejectSuggestion()` actions

### Phase 4: UI Components ✅
- [x] Create `_components/ai/` folder
- [x] Create `FolderSuggestionBadge.tsx` component
- [x] Style badge with folder name + accept/dismiss actions
- [x] Add `isLoading` prop to `DocumentItem.tsx` for faded/disabled state

### Phase 5: MOSidebar Integration (Core Complete)
- [x] Add `useAIOrganization` hook to MOSidebar
- [x] Modify upload handling to detect upload method (placeholder vs targeted vs drop zone)
- [x] Track `isLoading` state per document during upload + AI processing
- [x] Call `requestSuggestionForTargetedDrop()` on targeted drag-drop
- [x] Call `requestAutoOrganize()` on generic drop zone uploads
- [x] On generic drop complete: move document to AI's suggested location + unfade
- [x] On targeted drop complete: unfade document + show badge if AI disagrees
- [x] Render `FolderSuggestionBadge` on documents with pending suggestions
- [ ] Handle multiple file drops (all files faded, process in parallel)
- [ ] Implement upload queue with max 10 concurrent uploads
- [ ] Handle folder drag: extract PDFs recursively, flatten structure
- [ ] Unfade files individually as each completes (staggered)

### Phase 6: Backend Integration (Future)
- [ ] Replace dummy route with actual Python backend call
- [ ] Add document text extraction (OCR/first page)
- [ ] Tune AI prompt for folder matching

### Phase 7: Polish (Future)
- [ ] Add `beforeunload` warning when uploads are in progress
- [ ] Support other file types (images, docs) - convert to PDF or handle separately
- [ ] Add retry mechanism for failed uploads
- [ ] Consider upload progress indicator for large files

---

## Folder Types

Folders can have a `type` field to indicate special folder types with additional metadata.

### Assignment Folders

Assignment folders (`type: 'assignment'`) display deadline and weighting metadata in the sidebar.

```typescript
interface AssignmentFolder extends Folder {
  type: 'assignment';
  deadline?: string;   // ISO date (YYYY-MM-DD)
  weighting?: number;  // Percentage (e.g., 20 for 20%)
}
```

**UI Display:**
- Subtitle shown below folder name: "Due Jan 15 · 20%"
- Date format: Short (Jan 15) when >7 days away, relative (tomorrow, 3 days) when ≤7 days

**Sidebar Filtering:**
- "All" tab shows all folders and root documents
- "Assignments" tab shows only assignment-type folders

**Created from:**
- Syllabus extraction creates assignment folders automatically from `ExtractedAssignment[]`
- Each assignment folder contains a notes document ("Assignment Brief") with assignment details

**Files:**
- `_types/content.ts` - Folder interface with type/deadline/weighting fields
- `_utils/dateHelpers.ts` - formatDeadline() utility for relative date display
- `FolderItem.tsx` - Renders subtitle for assignment folders
- `MOSidebar.tsx` - Filter tabs (All/Assignments) and passes folder metadata to FolderItem
- `api/open/syllabus/create-structure/route.ts` - Creates assignment folders from syllabus
