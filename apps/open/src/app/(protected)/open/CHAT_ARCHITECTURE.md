# AI Chat Architecture

Context-based chat system for `/open/*` routes. Chat persists across page navigation and enables bidirectional AI ↔ Page communication.

## Architecture

```
/open/layout.tsx
└── UserProvider
    └── PlanProvider
        └── MOSidebarLayoutClient
            └── MOChatLayoutClient (context + hooks + chat UI)
                └── children (page content)
```

## Key Files

| File | Purpose |
|------|---------|
| `_components/chat/MOChatLayoutClient.tsx` | Context provider, hooks, capability registry |
| `_components/chat/MOChat.tsx` | Chat UI (thread + input) |
| `_components/chat/MOChatInputBar.tsx` | Input with slash commands, selected text |

## Hooks

### `useAiChat()`
Main consumer hook. Returns all chat state and actions.

```tsx
const {
  // Chat state
  messages,
  isLoading,
  error,
  userInput,
  setUserInput,

  // Selected text (from document selection)
  selectedText,
  updateSelectedText,

  // Skills (slash commands)
  currentSkill,
  updateCurrentSkill,
  currentSkillPrompt,
  updateCurrentSkillPrompt,

  // Actions
  sendMessage,
  clearMessages,

  // Visibility
  isChatOpen,
  openChat,
  closeChat,
  toggleChat,

  // Page context
  currentPageType,
  setCurrentPageType,
  collectPageContext,

  // Capabilities
  registerCapability,
  executeCapability,
  hasCapability,
  getAvailableCapabilities,

  // Socket
  socket,
  socketError,
} = useAiChat();
```

### `useRegisterCapability(capability, handler, pageType, priority?)`
Register a function the AI can call. Auto-unregisters on unmount.

```tsx
// In FlashcardsPage.tsx
const handleCreateFlashcard = useCallback(
  async (params: { term: string; definition: string }) => {
    addFlashcard({ term: params.term, definition: params.definition, author: "ai" });
  },
  [addFlashcard]
);

useRegisterCapability("createFlashcard", handleCreateFlashcard, "flashcards");
```

**Available capabilities:**
- `createFlashcard` / `updateFlashcard` / `deleteFlashcard`
- `addNote` / `editNotes` / `rewriteNotes`
- `highlightText` / `highlightArea` / `addComment` / `navigateToPage`

### `useRegisterContextCollector(pageType, collector)`
Provide page-specific context when messages are sent.

```tsx
// In NotesPage.tsx
const collectContext = useCallback(async () => ({
  notesContent: editor?.getText() ?? "",
  headings: headings.map(h => h.text),
}), [editor, headings]);

useRegisterContextCollector("notes", collectContext);
```

## How It Works

### 1. Capability Registration
Pages register functions on mount:
```
FlashcardsPage mounts → registerCapability("createFlashcard", handler, "flashcards")
FlashcardsPage unmounts → auto-unregister
```

### 2. Context Collection
When user sends message:
```
sendMessage("Create a flashcard for mitochondria")
  → collectPageContext() gathers from all registered collectors
  → AI receives: { message, context, availableCapabilities }
```

### 3. AI Executes Actions
AI decides to call a capability:
```
executeCapability("createFlashcard", { term: "Mitochondria", definition: "..." })
  → finds handler registered by FlashcardsPage
  → executes handler → flashcard created
```

### 4. Priority Resolution
If same capability registered by multiple pages:
1. Prefer handler matching `currentPageType`
2. Then by `priority` (higher wins)

## Slash Commands (Skills)

Type `/` in input to see skills menu:

| Skill | Description | Auto-send |
|-------|-------------|-----------|
| Brief me | Pre-lecture summary | Yes |
| Define | Define selected term | No |
| Simplify | Simplify content | No |
| Add comment | Add annotation | Yes |
| What did I miss? | Recap recent transcript | Yes |

Skills with `autoSend: true` execute immediately on selection.

## Adding a New Page

1. Import hooks:
```tsx
import {
  useRegisterCapability,
  useRegisterContextCollector,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
```

2. Register capabilities:
```tsx
const handleMyAction = useCallback(async (params) => {
  // do something
}, [deps]);

useRegisterCapability("myAction", handleMyAction, "myPageType");
```

3. Register context collector:
```tsx
const collectContext = useCallback(async () => ({
  myData: someState,
}), [someState]);

useRegisterContextCollector("myPageType", collectContext);
```

## Adding a New Capability

1. Add to `PageCapability` type in `MOChatLayoutClient.tsx`:
```tsx
export type PageCapability =
  | "createFlashcard"
  | "myNewCapability"  // add here
  | ...
```

2. Register handler in relevant page component

## TODO

### Phase 1: Wire Up Existing Features

#### DocumentPage → Chat Context ✅
- [x] **Register document context collector**: `useRegisterContextCollector("document", collectDocumentContext)` provides:
  - `currentPage`, `totalPages`
  - `highlightedText` (quotes from highlights)
  - `documentNotes` (per-page notes)
- [x] **Connect `updateSelectedText`**: DocumentPage uses `useAiChat()` context directly
- [x] **Connect `sendMessage`**: DocumentPage uses `useAiChat()` context directly
  - Used by: Ask, Define, Explain, Simplify buttons in selection menu
- [x] **`addComment` capability**: Registered in DocumentPage
- [x] **`navigateToPage` capability**: Registered in DocumentPage

#### MOSessionStructure → Chat Context ✅
- [x] **Move screenshot logic**: Extracted to `_utils/captureHybridScreenshot.ts` utility
  - DocumentPage's `collectDocumentContext` now captures hybrid screenshots (PDF + overlay composite)
  - Deleted ~545 lines of dead code from MOSessionStructure
- [x] **Wire `handleSendMessageRef`**: Connected to chat context's `sendMessage`
- [x] **Sync `isLoading`**: Use chat context's state instead of local state
- [x] **Sync skills state**: Removed unused skills destructuring from `useSessionOpen` (skills already managed in chat context)

#### Register Missing Capabilities
- [x] **`highlightText`**: Register capability to create yellow highlights
- [x] **`highlightArea`**: Register capability to show AI bounding box overlays

#### Page Type Tracking
- [x] **Set `currentPageType`**: MOSessionStructure syncs `pageType` to chat context via `setCurrentPageType()`

### Phase 2: AI Backend Integration

- [ ] **Connect socket to AI backend**: Wire `sendMessage` to emit via socket with:
  - User message
  - Collected page context (from all registered collectors)
  - Available capabilities list
  - Skill prompt (if skill selected)
- [ ] **Parse AI responses**: Handle capability invocations in AI responses
- [ ] **Execute capabilities**: Call `executeCapability()` when AI requests actions
- [ ] **Streaming responses**: Support streamed AI text (for notes rewriting, etc.)
  - Wire up `rewriteStreamRef` for streaming note updates

### Phase 3: Polish & Persistence

- [ ] Persist chat history across sessions (Firebase?)
- [ ] Handle socket reconnection gracefully
- [ ] Add error states for failed capability executions
- [ ] Add loading states per-capability (e.g., "Creating flashcard...")

---

## Already Connected ✅

### DocumentPage
- `useAiChat()` for `sendMessage`, `updateSelectedText`, `isLoading`
- `useRegisterCapability("addComment", handleAiAddComment, "document")`
- `useRegisterCapability("navigateToPage", handleAiNavigateToPage, "document")`
- `useRegisterCapability("highlightText", handleAiHighlightText, "document")`
- `useRegisterCapability("highlightArea", handleAiHighlightArea, "document")`
- `useRegisterContextCollector("document", collectDocumentContext)`

### FlashcardsPage
- `useRegisterCapability("createFlashcard", handleAiCreateFlashcard, "flashcards")`
- `useRegisterCapability("updateFlashcard", handleAiUpdateFlashcard, "flashcards")`
- `useRegisterCapability("deleteFlashcard", handleAiDeleteFlashcard, "flashcards")`
- `useRegisterContextCollector("flashcards", collectFlashcardsContext)`

### NotesPage
- `useRegisterCapability("addNote", handleAiAddNote, "notes")`
- `useRegisterCapability("editNotes", handleAiEditNotes, "notes")`
- `useRegisterCapability("rewriteNotes", handleAiRewriteNotes, "notes")`
- `useRegisterContextCollector("notes", collectNotesContext)`

### OpenQuestionPage
- `useRegisterContextCollector("questions", collectQuestionsContext)` provides:
  - `questions` - formatted question data (text, type, correctAnswer, maxMark, markScheme)
  - `studentWork` - user answers, canvas text, marking results (userMark, annotatedAnswer, markingTable, isMarked)
  - `canvasLatexSummary` - LaTeX expressions from Desmos/SketchCanvas
  - `canvasStrokesPng` - base64 PNG of handwritten strokes

### MOChatLayoutClient
- Selected text state: `selectedText` / `updateSelectedText`
- Skills state: `currentSkill` / `currentSkillPrompt` + UI in InputBar
- Chat state: `messages` / `sendMessage` / `isLoading` / `error`
- AI integration: `runAgent()` server action for AI responses

---

## Data Flow Reference

### When User Selects Text in PDF (DocumentPage)
```
1. User selects text
2. HighlightTargetTooltip appears
3. User clicks "Ask" → updateSelectedText(text) + focus input
4. User clicks "Define" → onSendMessage("/Define {text}")
```

### When User Sends Message
```
1. User types in InputBar, presses Enter
2. sendMessage(text) called
3. collectPageContext() gathers from all registered collectors
4. Message + context + capabilities sent to AI backend
5. AI responds with text and/or capability calls
6. executeCapability() runs for each AI action
```

### When AI Wants to Create Flashcard
```
1. AI response includes: { capability: "createFlashcard", params: { term, definition } }
2. executeCapability("createFlashcard", params)
3. Finds handler registered by FlashcardsPage
4. Calls handleAiCreateFlashcard({ term, definition })
5. Flashcard appears in UI
```
