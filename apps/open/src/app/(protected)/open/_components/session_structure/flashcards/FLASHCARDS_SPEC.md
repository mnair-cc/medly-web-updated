# Flashcards AI Capability Spec

## Implementation Status

| Feature | Status |
|---------|--------|
| Single-card operations | Done |
| Batch operations | Done |
| Debug UI | Done |
| Animations | Deferred |
| Sidebar Generation | TODO |

---

## Sidebar Generation Architecture

### High-Level Goal
Auto-generate flashcards when user creates a flashcard set from source documents.

### Decisions Made

| Question | Decision |
|----------|----------|
| Entry points | Sidebar context menu (three-dot menu on DocumentItem/FolderItem) |
| Generation | Batch (multiple cards), can regenerate/append more |
| Display | `FlashcardsPage.tsx` (existing) |
| Persistence | New document created with `sourceReferences` reference |
| Storage | `flashcardDeck` in `useSessionOpen.tsx` |

### Architecture

#### File Structure
```
/api/open/documents/generate-flashcards/route.ts  → API route (calls backend AI)
/open/_hooks/useContentStructure.ts               → createFlashcardDocument()
/open/_hooks/useSessionOpen.tsx                   → Storage + auto-generation trigger
/open/_components/session_structure/flashcards/   → This spec
```

#### Data Flow
```
1. User clicks "Generate Flashcards" on source doc/folder (three-dot menu)
2. MOSidebar.handleGenerateFlashcards() calls createFlashcardDocument()
3. Creates new document with { type: "flashcards", sourceReferences: [...] }
4. Navigates to /open/doc/{flashcardDocId}
5. doc/[documentId]/page.tsx fetches document, passes documentType to MOSessionStructure
6. MOSessionStructure detects isFlashcardDocument → sets pageType to Flashcards
7. useSessionOpen detects flashcard doc → calls generateFlashcards() (dummy initially)
8. PageRenderer shows FlashcardsPage with generated cards
```

### Data Model

**Two types of source references:**

1. **Document-level** (`SourceReference` in `_types/content.ts`) - which docs/folders were used to generate:
```ts
interface SourceReference {
  type: "document" | "folder" | "collection";
  id: string;
}
```

2. **Per-card citations** (`FlashcardSourceReference` in `_types/flashcardTypes.ts`) - specific page/segment for inline `[n]` refs:
```ts
interface FlashcardSourceReference {
  documentId: string;
  pageIndex: number;
  sourceSegment: string;
}
```

Flashcard document extends base document with:
```ts
// Document type extended
type: "document" | "practice" | "flashcards"
sourceReferences?: SourceReference[];  // Document-level (shared with practice)
```

### API Route: `/api/open/documents/generate-flashcards/route.ts`
```ts
// POST body
{
  sourceDocumentId: string;
  sourceContent: string;      // Text from source doc
  options?: {
    count?: number;           // Default 10
    difficulty?: "basic" | "intermediate" | "advanced" | "mixed";
  }
}

// Response
{
  status: "success" | "error";
  flashcards: Array<{
    term: string;
    definition: string;
    sourceReferences?: FlashcardSourceReference[];
  }>;
}
```

---

## Sidebar Generation TODO

### Phase 1: Infrastructure ✅
- [x] Add `"flashcards"` to Document type union in `_types/content.ts`
- [x] Create `/api/open/documents/generate-flashcards/route.ts` (dummy response)
- [x] Add `createFlashcardDocument()` in `useContentStructure.ts`

### Phase 2: Entry Points ✅
- [x] Add `onGenerateFlashcards` prop to `DocumentItem.tsx`
- [x] Add `onGenerateFlashcards` prop to `FolderItem.tsx`
- [x] Add "Generate Flashcards" button to three-dot context menu
- [x] Add `handleGenerateFlashcards()` in `MOSidebar.tsx`
- [x] Create flashcard document at same level as source
- [x] Navigate to new flashcard document

### Phase 3: Auto-Detection ✅
- [x] In `MOSessionStructure.tsx`, detect `doc.type === "flashcards"` → set pageType to Flashcards
- [x] In `useSessionOpen.tsx`, detect flashcard doc and trigger generation
- [x] Add `isGeneratingFlashcards` state for loading UI
- [x] API routes already return `type` and `sourceReferences` (from Practice implementation)

### Phase 4: AI Generation
- [ ] Replace dummy response with actual AI call
- [ ] Fetch source content from `sourceReferences` before calling API
- [ ] Add loading skeleton while generating

### Phase 5: Generate More
- [ ] Add "Generate More" button in FlashcardsPage
- [ ] Register `generateMoreFlashcards` AI capability for chat

---

## Files Modified (Sidebar Generation)

| File | Changes | Status |
|------|---------|--------|
| `_types/content.ts` | Add `"flashcards"` to Document type union | ✅ |
| `_hooks/useContentStructure.ts` | Add `createFlashcardDocument()` function | ✅ |
| `sidebar/MOSidebarLayoutClient.tsx` | Expose `createFlashcardDocument` in context | ✅ |
| `DocumentItem.tsx` | Add `onGenerateFlashcards` prop, handler, menu button | ✅ |
| `FolderItem.tsx` | Add `onGenerateFlashcards` prop, handler, menu button | ✅ |
| `MOSidebar.tsx` | Add `handleGenerateFlashcards` handler and wrappers | ✅ |
| `_hooks/useSessionOpen.tsx` | Detect flashcard doc, generate initial cards, `isGeneratingFlashcards` state | ✅ |
| `MOSessionStructure.tsx` | Detect flashcard doc → set pageType to Flashcards | ✅ |
| `doc/[documentId]/page.tsx` | Already passes `documentType` to session (from Practice) | ✅ |

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `/api/open/documents/generate-flashcards/route.ts` | API route (dummy then AI) | ✅ |

---

## Dummy Response Format

```ts
{
  status: "success",
  flashcards: [
    {
      term: "Key concept from source",
      definition: "Definition extracted from source material",
      sourceReferences: [{ type: "document", id: "...", pageIndex: 1 }]
    },
    // ... more cards (default 10)
  ]
}
```

---

## Current State

### Registered Capabilities (FlashcardsPage.tsx:234-242)
```tsx
// Single operations
useRegisterCapability("createFlashcard", handleAiCreateFlashcard, "flashcards");
useRegisterCapability("updateFlashcard", handleAiUpdateFlashcard, "flashcards");
useRegisterCapability("deleteFlashcard", handleAiDeleteFlashcard, "flashcards");

// Batch operations
useRegisterCapability("createFlashcards", handleAiCreateFlashcards, "flashcards");
useRegisterCapability("updateFlashcards", handleAiUpdateFlashcards, "flashcards");
useRegisterCapability("deleteFlashcards", handleAiDeleteFlashcards, "flashcards");
```

### Handlers

**Single-Card:**
- `handleAiCreateFlashcard({ term, definition })` - creates 1 card
- `handleAiUpdateFlashcard({ cardId, term?, definition? })` - updates 1 card
- `handleAiDeleteFlashcard({ cardId })` - deletes 1 card

**Batch:**
- `handleAiCreateFlashcards({ cards: [{term, definition}, ...] })` - creates multiple cards
- `handleAiUpdateFlashcards({ updates: [{cardId, term?, definition?}, ...] })` - updates multiple cards
- `handleAiDeleteFlashcards({ cardIds: string[] })` - deletes multiple cards (min 1 must remain)

### Context Collector
```tsx
{
  flashcardCount: number,
  flashcardDeckTitle: string,
  currentViewMode: "edit" | "study",
  selectedCardIndex: number,
  cards: Array<{ id, term, definition }>
}
```

---

## Batch Operations (Implemented)

### 1. `createFlashcards` (Batch Create)
**Params:**
```ts
{
  cards: Array<{
    term: string;
    definition: string;
    sourceReferences?: FlashcardSourceReference[];
  }>
}
```
**Implementation:**
- Loop through cards, call `addFlashcard()` for each
- Mark all as `author: "ai"`
- Return array of created card IDs

### 2. `updateFlashcards` (Batch Update)
**Params:**
```ts
{
  updates: Array<{
    cardId: string;
    term?: string;
    definition?: string;
  }>
}
```
**Implementation:**
- Loop through updates, call `updateFlashcard()` for each
- Return array of results `{ cardId, success, error? }`

### 3. `deleteFlashcards` (Batch Delete)
**Params:**
```ts
{
  cardIds: string[]
}
```
**Implementation:**
- Loop through IDs, call `deleteFlashcard()` for each
- Validate at least 1 card remains after deletion
- Return array of results `{ cardId, success, error? }`

---

## Animation Strategy

Reference: NotesPage.tsx uses `isProgrammaticUpdateRef` to distinguish AI vs user edits.

### For Flashcards:
1. **New Card Animation**: Fade-in + slide-up when AI adds card
2. **Update Animation**: Highlight row briefly, fade old text out, fade new text in
3. **Delete Animation**: Fade-out + collapse

### Key Pattern from NotesPage:
```tsx
// Guard for programmatic updates
const isProgrammaticUpdateRef = useRef(false);

// Before AI operation:
isProgrammaticUpdateRef.current = true;
// ... do operation ...
isProgrammaticUpdateRef.current = false;
```

### Suggested Implementation:
1. Add `animatingCardIds: Set<string>` state
2. Wrap cards in animation container with CSS transitions
3. For batch ops, stagger animations (e.g., 100ms delay between cards)

---

## Tool Definitions for AI Backend

```ts
// Single operations (keep for backwards compat)
createFlashcard: {
  params: { term: string, definition: string }
}
updateFlashcard: {
  params: { cardId: string, term?: string, definition?: string }
}
deleteFlashcard: {
  params: { cardId: string }
}

// Batch operations (new)
createFlashcards: {
  params: { cards: Array<{ term: string, definition: string }> }
}
updateFlashcards: {
  params: { updates: Array<{ cardId: string, term?: string, definition?: string }> }
}
deleteFlashcards: {
  params: { cardIds: string[] }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `FlashcardsPage.tsx` | Add batch handlers, register new capabilities |
| `FlashcardRow.tsx` | Add animation props (`isAnimating`, `animationType`) |
| `MOChatLayoutClient.tsx` | Add new capability types to `PageCapability` union |

---

## Data Flow

```
1. User: "Create flashcards for chapter 3"
2. Chat sends message + context (existing cards, deck title)
3. AI responds with capability call:
   { capability: "createFlashcards", params: { cards: [...] } }
4. executeCapability("createFlashcards", params)
5. Handler loops, creates cards with animations
6. UI updates, cards fade in one by one
```

---

## Edge Cases

- **Empty deck**: Auto-create first card (already handled)
- **Duplicate terms**: Allow (user can merge manually)
- **Delete all cards**: Prevent - must keep at least 1 card
- **Update non-existent card**: Return error in result array
- **Study mode active**: Queue operations until study ends, or switch to edit mode

---

## CSS Animation Classes (to add)

```css
.flashcard-fade-in {
  animation: flashcardFadeIn 300ms ease-out;
}
.flashcard-fade-out {
  animation: flashcardFadeOut 300ms ease-out;
}
.flashcard-highlight {
  background-color: rgba(203, 236, 150, 0.3); /* CARD_COLOR with alpha */
  transition: background-color 300ms ease-out;
}

@keyframes flashcardFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes flashcardFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(8px); }
}
```
