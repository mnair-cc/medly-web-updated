# Medly Open TODO

## AI Architecture

Using **Vercel AI SDK** for standalone AI functions. Chat agent uses same SDK with tool calling.

### Two Types of AI

1. **Standalone AI Functions** - Direct calls triggered by user actions
   - `extractSyllabus()` - onboarding syllabus upload
   - `suggestFolders()` - file drop organization
   - `generateQuestions()` - practice test creation
   - `generateFlashcards()` - flashcard set creation
   - `generateNotes()` - notes from PDF (streaming)
   - `suggestTitle()` - document title suggestion

2. **Chat Agent** - Conversational AI with tool calling
   - Uses `streamText` with tools
   - Tools = registered capabilities (createFlashcard, highlightText, etc.)
   - Agent decides which tools to call based on user message

### File Structure

```
src/app/(protected)/open/
├── _ai/
│   ├── index.ts                    # Re-exports all functions
│   ├── client.ts                   # ✅ Google Vertex client setup
│   ├── extractSyllabus.ts          # ✅ Done
│   ├── suggestFolders.ts           # ✅ Done
│   ├── suggestTitle.ts             # ✅ Done
│   ├── generateQuestions.ts        # ✅ Done
│   ├── generateFlashcards.ts       # ✅ Done
│   ├── generateNotes.ts            # TODO (streaming)
│   ├── chat.ts                     # TODO (agent with tools)
│   └── utils/
│       └── extractPdfText.ts       # ✅ PDF text extraction
├── _components/
│   └── DebugAIModal.tsx            # ✅ Debug modal (NEXT_PUBLIC_DEBUG=true)
```

### Pattern

```typescript
// _ai/client.ts - Google Vertex with Gemini
import { createVertex } from "@ai-sdk/google-vertex";

const credentials = JSON.parse(process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY);
export const vertex = createVertex({
  project: credentials.project_id,
  location: "us-central1",
  googleAuthOptions: { credentials },
});
export const defaultModel = vertex("gemini-2.5-flash");

// _ai/extractSyllabus.ts
import { generateObject } from "ai";
import { defaultModel } from "./client";

export async function extractSyllabus(pdfText: string): Promise<ExtractedSyllabus> {
  const { object } = await generateObject({
    model: defaultModel,
    schema: ExtractedSyllabusSchema,
    prompt: buildPrompt(pdfText),
  });
  return object;
}

// API route becomes thin wrapper
import { extractSyllabus } from "@/app/(protected)/open/_ai/extractSyllabus";

export async function POST(request: NextRequest) {
  const pdfText = await extractPdfText(file);
  const syllabus = await extractSyllabus(pdfText);
  return NextResponse.json({ status: "success", data: syllabus });
}
```

### Environment Variables

```bash
# Required for AI functions
GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Optional
GOOGLE_VERTEX_PROJECT=your-project-id
GOOGLE_VERTEX_LOCATION=us-central1

# Debug modal (Ctrl+Shift+D)
NEXT_PUBLIC_DEBUG=true
```

---

## AI Functions Status

### Standalone Functions

| Function | Location | Status |
|----------|----------|--------|
| `extractSyllabus` | `_ai/extractSyllabus.ts` | ✅ Done |
| `suggestFolders` | `_ai/suggestFolders.ts` | ✅ Done |
| `suggestTitle` | `_ai/suggestTitle.ts` | ✅ Done |
| `generateQuestions` | `_ai/generateQuestions.ts` | ✅ Done |
| `generateFlashcards` | `_ai/generateFlashcards.ts` | ✅ Done |
| `generateNotes` | `_ai/generateNotes.ts` | ❌ TODO (streaming) |

### Chat Agent

| Component | Status |
|-----------|--------|
| `_ai/chat.ts` | ❌ TODO |
| Tool definitions | ❌ TODO |
| `MOChatLayoutClient` integration | ❌ TODO |

### Legacy (to migrate/remove)

| Location | Function | Current | Action |
|----------|----------|---------|--------|
| `/api/open/documents/suggest-title/route.ts` | Title suggestion | ✅ Uses `_ai/suggestTitle` | Done |

### Chat Backend (Placeholder)

| Location | Current | Needs |
|----------|---------|-------|
| `MOChatLayoutClient.tsx:449-451` | `socket.emit` commented out | Emit `ai_message` with context + capabilities |
| `MOChatLayoutClient.tsx:453-463` | Fake delay + placeholder response | Parse real AI responses |
| AI response parsing | N/A | Handle capability invocations from AI |
| `executeCapability()` | Implemented but unused | Wire to AI response handler |

### Notes Generation (UI exists, backend missing)

| Feature | UI Location | Current State | Needs |
|---------|-------------|---------------|-------|
| Generate notes from PDF | `NotesPage.handleCreateNotes` | Shows loading, no AI call | Socket emit `create_notes` + stream handler |
| Rewrite/stream notes | `NotesPage.rewriteStreamRef` | Queue + animation ready | Socket emit + listen for `notes_chunk` events |
| "Brief me" skill | `MOChatInputBar.tsx:82` | Sends message, placeholder response | Real AI call via socket |
| "Simplify" skill | `MOChatInputBar.tsx:87` | Sends message, placeholder response | Real AI call via socket |
| "Define" skill | `MOChatInputBar.tsx:83` | Sends message, placeholder response | Real AI call via socket |

### Helper Functions Ready (need backend wiring)

| Function | Location | Description |
|----------|----------|-------------|
| `suggestDocumentTitle()` | `_utils/documentHelpers.ts:18` | ✅ Working - calls real backend |
| `suggestDocumentFolders()` | `_utils/documentHelpers.ts:139` | Calls dummy route |
| `buildFolderSuggestionContext()` | `_utils/documentHelpers.ts:87` | Builds context for AI |
| `generatePracticeQuestions()` | `_utils/practiceHelpers.ts:24` | Calls dummy route |
| `useTranscription` | `_hooks/useTranscription.tsx` | ✅ Working - WebSocket |
| `rewriteStreamRef.addChunk/end` | `NotesPage.tsx:1223-1269` | Queue + animation ready |
| `createPracticeDocument()` | `useContentStructure.ts` | Creates doc, needs AI gen |
| `createFlashcardDocument()` | `useContentStructure.ts` | Creates doc, needs AI gen |
| `createNotesDocument()` | `useContentStructure.ts` | Creates blank notes doc |

---

## Chat Agent Tools

### Registered Capabilities (handlers exist)

| Capability | Page | Handler | Status |
|------------|------|---------|--------|
| `createFlashcard` | flashcards | `handleAiCreateFlashcard` | ✅ Works |
| `createFlashcards` | flashcards | `handleAiCreateFlashcards` | ✅ Works (batch) |
| `updateFlashcard` | flashcards | `handleAiUpdateFlashcard` | ✅ Works |
| `updateFlashcards` | flashcards | `handleAiUpdateFlashcards` | ✅ Works (batch) |
| `deleteFlashcard` | flashcards | `handleAiDeleteFlashcard` | ✅ Works |
| `deleteFlashcards` | flashcards | `handleAiDeleteFlashcards` | ✅ Works (batch) |
| `addNote` | notes | `handleAiAddNote` | ✅ Works |
| `editNotes` | notes | `handleAiEditNotes` | ✅ Works (batch) |
| `rewriteNotes` | notes | `handleAiRewriteNotes` | ✅ Works |
| `highlightText` | document | `handleAiHighlightText` | ✅ Works |
| `highlightArea` | document | `handleAiHighlightArea` | ✅ Works |
| `addComment` | document | `handleAiAddComment` | ✅ Works |
| `navigateToPage` | document | `handleAiNavigateToPage` | ✅ Works |

### Missing Capabilities (need to add)

| Capability | Page | Description | Priority |
|------------|------|-------------|----------|
| `createNotesDocument` | global | Create new notes page in sidebar | High |
| `createFlashcardDocument` | global | Create new flashcard set from source | High |
| `createPracticeDocument` | global | Create new practice test from source | High |
| `createQuestion` | practice | Add question to practice test | Medium |
| `updateQuestion` | practice | Edit existing question | Medium |
| `deleteQuestion` | practice | Remove question | Medium |
| `generateMoreQuestions` | practice | Generate additional questions | Medium |
| `generateMoreFlashcards` | flashcards | Generate additional cards | Medium |
| `askUser` | global | Ask user clarifying question | Low |
| `readDocument` | global | Read content from another doc | Low |
| `linkDocument` | notes | Insert link to another document | Low |

### Context Collectors (registered)

| Page | Data Provided |
|------|---------------|
| `document` | currentPage, totalPages, highlightedText, documentNotes, pageScreenshot |
| `flashcards` | flashcardCount, deckTitle, viewMode, selectedCardIndex, cards[] |
| `notes` | pageNotes, documentName, notesContent, notesHtml, headings[] |
| `practice` | (TODO) sourceReferences, questionCount, answeredCount, score |

---

## Features by Area

### AI Syllabus Extraction
- [x] PDF text extraction (pdfjs server-side) - `_ai/utils/extractPdfText.ts`
- [ ] Copy paste any text in (some syllabus may not be in a single pdf)
- [x] AI prompt for syllabus parsing - `_ai/extractSyllabus.ts`
- [ ] Stream responses and show streamed in the front-end 
- [ ] Handle edge cases (non-standard formats, wrong syllabus uploaded) 
- [ ] Re-extract syllabus feature (sidebar)
- [ ] "Add Module" from sidebar with same flow for a new module 


### AI File Organizing
- [x] Replace dummy route with AI backend call - `_ai/suggestFolders.ts`
- [x] AI prompt for folder matching - `_ai/suggestFolders.ts`
- [ ] Document text extraction (OCR/first page)
- [ ] Multiple file drops (parallel processing)
- [ ] Upload queue (max 10 concurrent)
- [ ] Folder drag: extract PDFs recursively

### Document Conversion (non-PDF → PDF) - CloudConvert Integration

Convert `.docx` and other formats to PDF before uploading using CloudConvert API v2.

**Status:** Backend integrated with CloudConvert API (`_utils/convertDocument.ts`), supporting multi-step job workflow.

**Env:**
- `CLOUDCONVERT_API_KEY` - CloudConvert API key (get from https://cloudconvert.com/dashboard/api/v2/keys)

**CloudConvert Workflow:**
1. Create job with 3 tasks: upload → convert → export
2. Upload file to provided URL
3. Wait for job completion (5 min timeout)
4. Download converted PDF from export URL

**Supported formats:** PDF, Word (.docx), PowerPoint (.pptx), OpenDocument Text (.odt), Rich Text (.rtf), Plain Text (.txt), HTML (.html), Markdown (.md), LaTeX (.tex), EPUB (.epub)

- [x] Create `_utils/convertDocument.ts` helper
- [x] Detect non-PDF uploads (.docx, .doc, .pptx, etc.)
- [x] Convert to PDF before storage upload
- [x] Handle conversion errors gracefully
- [x] Support: `.docx`, `.doc`, `.pptx`, `.odt`, `.rtf`
- [ ] Enable in frontend (currently PDF-only)

### AI Title Suggestion
- [x] Replace Flask backend with AI SDK - `_ai/suggestTitle.ts`

### Chat / AI Agent
- [ ] Implement chat agent with tools - `_ai/chat.ts`
- [ ] Context collection from all page types
- [ ] Capability execution from AI responses
- [ ] Streaming responses for notes rewriting
- [ ] `isAwaitingResponse` sync with context
- [ ] `currentPageType` tracking across views

### Practice Tests
- [x] Replace dummy questions with AI generation - `_ai/generateQuestions.ts`
- [ ] Fetch source content from `sourceReferences`
- [ ] "Generate More" button + AI capability
- [ ] Marking integration verification
- [ ] Explanation display after marking

### Flashcards
- [x] Replace dummy flashcards with AI generation - `_ai/generateFlashcards.ts`
- [ ] Fetch source content from `sourceReferences`
- [ ] "Generate More" button + AI capability
- [ ] Card animations (fade-in/out, highlight)

### Notes
- [ ] AI notes generation from PDF (streaming) - `_ai/generateNotes.ts`
- [ ] Table support (`@tiptap/extension-table`)
- [ ] Image support (upload, drag-drop, paste)
- [ ] Math/LaTeX support

### Decorations
- [ ] AI highlight text (yellow highlights)
- [ ] AI highlight area (bounding box overlays)
- [ ] AI add comment capability

### Debug Tools
- [x] Debug modal for testing AI endpoints - `_components/DebugAIModal.tsx`
- [x] Feature flagged via `NEXT_PUBLIC_DEBUG=true`

### Bugs 
- [ ] Deleting a document that a user is currently opened on gives error

---

## Sidebar / Organization

- [ ] Show file type icon (doc, note, flash, practice)
- [ ] Create blank document
- [ ] Create blank canvas
- [ ] Update sidebar cosmetics (labels vs dates)

---

## Onboarding

- [ ] Actual images for info pages (steps 3-5)
- [ ] Course materials upload (step 12)
- [ ] Move university list to database API
- [ ] Analytics tracking (PostHog)

---

## Polish / Infrastructure

- [ ] `beforeunload` warning during uploads
- [ ] Retry mechanism for failed uploads
- [ ] Upload progress indicator
- [ ] Persist chat history (Firebase)
- [ ] Socket reconnection handling
- [ ] Error states per-capability
- [ ] Loading states per-capability

---

## Detailed Specs

- [AI_ORGANISATION_SPEC.md](./AI_ORGANISATION_SPEC.md) - File organization
- [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md) - Chat system
- [PRACTICE_SPEC.md](./_components/session_structure/practice/PRACTICE_SPEC.md) - Practice tests
- [FLASHCARDS_SPEC.md](./_components/session_structure/flashcards/FLASHCARDS_SPEC.md) - Flashcards
- [SYLLABUS_EXTRACTION_SPEC.md](./onboarding/SYLLABUS_EXTRACTION_SPEC.md) - Syllabus extraction
- [ONBOARDING_SPEC.md](./onboarding/ONBOARDING_SPEC.md) - Onboarding flow
- [NOTES_SPEC.md](./_components/session_structure/notes/NOTES_SPEC.md) - Notes editor
