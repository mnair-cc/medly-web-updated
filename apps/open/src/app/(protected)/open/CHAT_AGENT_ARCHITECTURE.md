# Chat Agent Architecture

AI agent for `/open/*` routes. Helps students study documents via conversation, with tools for flashcards, notes, and document analysis.

## Design Principles

1. **Selective depth over automatic continuity** - Agent fetches context on-demand rather than pre-injecting everything
2. **File-based external memory** - Virtual filesystem abstracts Firestore; agent reads/writes via tools
3. **Reversible compression** - Keep file paths when truncating, re-fetch content if needed
4. **Explicit memory updates** - Agent calls tools to update user profile/memories (Claude-style, not periodic refresh)
5. **Error retention** - Failed tool calls stay in context so agent learns from mistakes

---

## Context Structure

### Always Injected (Working Memory)

```xml
<system>
  <!-- Tool definitions, safety constraints, behavior instructions -->
</system>

<user_profile>
  <name>Paul</name>
  <current_goal>Preparing for A-Level Biology exam - May 2025</current_goal>
  <learning_preferences>
    <style>concise explanations with analogies</style>
    <detail_level>intermediate</detail_level>
  </learning_preferences>
  <recent_struggles>
    <topic last_seen="2025-01-02">Cell division - meiosis vs mitosis</topic>
    <topic last_seen="2024-12-28">Protein synthesis steps</topic>
  </recent_struggles>
  <strengths>
    <topic>Photosynthesis</topic>
    <topic>DNA structure</topic>
  </strengths>
</user_profile>

<current_session>
  <document id="doc_abc123" type="pdf">
    <title>Campbell Biology Chapter 12</title>
    <current_page>47</current_page>
    <total_pages>82</total_pages>
  </document>
  <page_context>
    <visible_text>The cell cycle consists of interphase and mitotic phase...</visible_text>
    <highlights count="3">
      <highlight color="yellow">interphase consists of G1, S, and G2</highlight>
      <highlight color="yellow">DNA replication occurs during S phase</highlight>
    </highlights>
    <notes_markdown>## Cell Cycle Notes\n\nNeed to memorize the phases...</notes_markdown>
  </page_context>
  <selected_text>mitotic spindle fibers attach to kinetochores</selected_text>
  <flashcard_deck cards="12" due_today="4"/>
</current_session>

<conversation_history>
  <!-- Recent messages, truncated old-first -->
</conversation_history>

<available_capabilities>
  <!-- Currently registered page capabilities -->
  createFlashcard, updateFlashcard, deleteFlashcard,
  addNote, editNotes, rewriteNotes,
  highlightText, highlightArea, navigateToPage
</available_capabilities>
```

### On-Demand (Via Tools)

- Full document text (any page)
- Other documents in user's library
- Complete flashcard deck contents
- Full notes content
- Search results across documents

---

## Virtual Filesystem

Maps to Firestore. Agent sees paths, tools handle the mapping.

```
/library/
  /{documentId}/
    metadata.json     → documents/{documentId} (title, type, createdAt, thumbnailUrl)
    content/
      page_{n}.txt    → Extracted PDF text per page
      full.txt        → Complete document text
    notes.md          → users/{userId}/subjectsWeb/.../notes
    flashcards.json   → users/{userId}/subjectsWeb/.../flashcardDeck
    highlights.json   → users/{userId}/subjectsWeb/.../highlights
    questions.json    → users/{userId}/subjectsWeb/.../questions

/profile/
  goals.json          → User learning goals
  memories.json       → Agent-maintained memories about user
  preferences.json    → Learning preferences
```

### Path Resolution

```typescript
// Agent calls: readFile("/library/doc_abc/notes.md")
// Tool resolves: users/{userId}/subjectsWeb/{subjectId}/lessons/{lessonId}/notes
```

---

## Tools

### Document Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `readPage` | Read specific page text | `{ documentId, pageNumber }` | Page text content |
| `readDocument` | Read full document or range | `{ documentId, startPage?, endPage? }` | Document text |
| `searchDocument` | Keyword search in document | `{ documentId, query }` | Matching snippets with page numbers |

### Flashcard Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `readFlashcards` | Get flashcard deck | `{ documentId }` | Array of flashcards |
| `createFlashcard` | Create new flashcard | `{ term, definition, sourcePageNumber? }` | Created flashcard |
| `updateFlashcard` | Edit existing flashcard | `{ cardId, term?, definition? }` | Updated flashcard |
| `deleteFlashcard` | Remove flashcard | `{ cardId }` | Success confirmation |

### Notes Tools

String-based editing tools for AI agents, similar to Claude Code's approach. AI reads/writes markdown, middleware handles Tiptap operations and animations.

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `readNotes` | Get notes content | `{ documentId }` | Notes markdown |
| `editNotes` | Replace text with animation | `{ textToReplace, newText }` | Animated replacement in editor |
| `rewriteNotes` | Rewrite entire document | `{ newContent }` | Full document replacement |

**Architecture:**
```
AI reads markdown → AI outputs { textToReplace, newText } → middleware finds position → applies animation → inserts parsed markdown
```

**Key principles:**
- AI never touches Tiptap directly - middleware translates commands
- Match against plain text (what user sees), not HTML/markdown syntax
- `textToReplace` must be unique in document (include context if needed)
- `newText` can include markdown formatting (bold, headings, lists)
- Animations preserved through ProseMirror decorations

**Edit patterns:**
```typescript
// Simple replace
{ textToReplace: "old text", newText: "new text" }

// Add formatting
{ textToReplace: "important concept", newText: "**important concept**" }

// Insert after (include anchor in newText)
{ textToReplace: "# Section", newText: "# Section\n\nNew paragraph here." }

// Delete (replace with context or empty)
{ textToReplace: "Keep this. Delete me. Keep that.", newText: "Keep this. Keep that." }
```

See `NOTES_SPEC.md` for full documentation.

### Navigation Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `navigateToPage` | Jump to page | `{ pageNumber }` | Confirmation |
| `highlightText` | Create highlight | `{ text, color?, comment? }` | Created highlight |
| `highlightArea` | Show bounding box | `{ pageNumber, bounds }` | Confirmation |

### Memory Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `readMemory` | Get user profile/memories | `{ type: "profile" \| "goals" \| "struggles" }` | Memory content |
| `updateMemory` | Update user memory | `{ type, operation: "add" \| "update" \| "remove", content }` | Confirmation |
| `forgetMemory` | Remove specific memory | `{ memoryId }` | Confirmation |

### Search Tools (Subagent-Based)

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `searchLibrary` | Search across all documents | `{ query, documentTypes?, limit? }` | Snippets with doc/page refs |
| `findRelatedContent` | Find content related to topic | `{ topic, currentDocumentId? }` | Related docs and snippets |

### Utility Tools (Always Available)

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `sendStatusMessage` | Send conversational status update to user | `{ message }` | Displayed immediately |

**Status Message Guidelines:**
- Be friendly and conversational, not robotic
- Good: "Sure, let me create those flashcards for you."
- Bad: "Creating flashcards now."
- Use alongside action tools to narrate what you're doing
- After the status message, don't repeat confirmation in your text response

---

## Subagent Architecture

For complex searches, main agent spawns lightweight subagents that run in parallel.

```
User: "What do my notes say about photosynthesis across all my bio docs?"

Main Agent
  ├─ spawns SearchSubagent(doc1, "photosynthesis")
  ├─ spawns SearchSubagent(doc2, "photosynthesis")
  ├─ spawns SearchSubagent(doc3, "photosynthesis")
  └─ waits for all, aggregates results

SearchSubagent:
  - Reads document content
  - Finds relevant sections
  - Returns: { documentId, snippets: [{ text, page, relevance }] }
```

### Subagent Implementation

```typescript
// Parallel execution with Promise.all
const searchLibrary = tool({
  description: "Search across user's document library",
  parameters: z.object({
    query: z.string(),
    limit: z.number().default(10),
  }),
  execute: async ({ query, limit }) => {
    const documents = await getUserDocuments(userId);

    // Spawn parallel search subagents
    const results = await Promise.all(
      documents.map(doc =>
        runSearchSubagent({ documentId: doc.id, query, model: fastModel })
      )
    );

    // Aggregate and rank results
    return aggregateSearchResults(results, limit);
  },
});
```

---

## Trigger Events

Frontend fires triggers that auto-send messages to agent.

### Trigger Types

| Trigger | Fires When | Payload |
|---------|------------|---------|
| `questionWrong` | User answers incorrectly | `{ questionId, userAnswer, correctAnswer, attemptCount, topic }` |
| `flashcardStruggle` | Card marked "again" 3+ times | `{ cardId, term, againCount, lastInterval }` |
| `sessionStart` | User opens document | `{ documentId, lastVisited, resumeContext }` |
| `pageChange` | User navigates pages | `{ fromPage, toPage, timeOnPage }` |
| `highlightCreated` | User highlights text | `{ text, pageNumber }` |

### Trigger Flow

```typescript
// Frontend detects event
onQuestionWrong(question, userAnswer) {
  sendTriggerMessage({
    type: "trigger",
    trigger: "questionWrong",
    payload: {
      questionId: question.id,
      userAnswer,
      correctAnswer: question.answer,
      attemptCount: question.attempts,
      topic: question.topic,
    },
    // Optional: suppress if user is mid-conversation
    priority: "low",
  });
}

// Agent receives as special message type
// Can respond immediately or note for context
```

---

## Architecture

Hook-based pattern using Server Actions. No API routes needed.

```
┌─────────────────────────────────────────────────────────────┐
│  useChatAgent() hook                                        │
│    ├─► collectPageContext()      ← existing useAiChat      │
│    ├─► getAvailableCapabilities() ← existing useAiChat     │
│    │                                                        │
│    ├─► runAgent(...)             ← Server Action           │
│    │       └─► streamText + tools (runs on server)         │
│    │                                                        │
│    └─► executeCapability(...)    ← existing useAiChat      │
│            └─► registered handlers (FlashcardsPage, etc.)  │
└─────────────────────────────────────────────────────────────┘
```

### Tool Execution Split

| Tool Type | Executes On | Returns |
|-----------|-------------|---------|
| **Read** (readPage, readNotes, searchDocument) | Server | Data directly |
| **Write** (createFlashcard, addNote) | Server → Frontend | `{ action, params }` for frontend to execute |
| **Navigate** (navigateToPage, highlightText) | Server → Frontend | `{ action, params }` for frontend to execute |

### Server Action

```typescript
// src/app/(protected)/open/_ai/agent.ts
"use server";

import { streamText, tool } from "ai";
import { createStreamableValue } from "ai/rsc";
import { defaultModel } from "./client";
import { z } from "zod";

interface RunAgentParams {
  messages: Message[];
  context: PageContext;
  capabilities: string[];
  userProfile?: UserProfile;
}

export async function runAgent({ messages, context, capabilities, userProfile }: RunAgentParams) {
  const stream = createStreamableValue();

  (async () => {
    const result = await streamText({
      model: defaultModel,
      system: buildSystemPrompt({ context, capabilities, userProfile }),
      messages,
      tools: {
        // ─────────────────────────────────────────────
        // READ TOOLS - execute fully on server
        // ─────────────────────────────────────────────
        readPage: tool({
          description: "Read text content from a specific page",
          parameters: z.object({ pageNumber: z.number() }),
          execute: async ({ pageNumber }) => {
            const text = await getPageText(context.documentId, pageNumber);
            return { text };
          },
        }),

        readNotes: tool({
          description: "Read the user's notes for this document",
          parameters: z.object({}),
          execute: async () => {
            const notes = await getNotes(context.documentId);
            return { notes };
          },
        }),

        readFlashcards: tool({
          description: "Read all flashcards for this document",
          parameters: z.object({}),
          execute: async () => {
            const cards = await getFlashcards(context.documentId);
            return { cards };
          },
        }),

        // ─────────────────────────────────────────────
        // WRITE TOOLS - return action for frontend
        // ─────────────────────────────────────────────
        createFlashcard: tool({
          description: "Create a new flashcard",
          parameters: z.object({
            term: z.string(),
            definition: z.string(),
            sourcePageNumber: z.number().optional(),
          }),
          execute: async (params) => ({
            action: "createFlashcard",
            params,
          }),
        }),

        addNote: tool({
          description: "Add content to the user's notes",
          parameters: z.object({
            content: z.string(),
            sourcePageNumber: z.number().optional(),
          }),
          execute: async (params) => ({
            action: "addNote",
            params,
          }),
        }),

        highlightText: tool({
          description: "Highlight text in the document",
          parameters: z.object({
            text: z.string(),
            color: z.enum(["yellow", "green", "blue", "pink"]).optional(),
            comment: z.string().optional(),
          }),
          execute: async (params) => ({
            action: "highlightText",
            params,
          }),
        }),

        navigateToPage: tool({
          description: "Navigate to a specific page in the document",
          parameters: z.object({ pageNumber: z.number() }),
          execute: async (params) => ({
            action: "navigateToPage",
            params,
          }),
        }),
      },
      maxSteps: 10,

      onStepFinish({ toolResults }) {
        // Stream actions to frontend as they complete
        for (const result of toolResults ?? []) {
          if (result.result?.action) {
            stream.update({
              type: "action",
              name: result.result.action,
              params: result.result.params,
            });
          }
        }
      },
    });

    // Stream text chunks
    for await (const chunk of result.textStream) {
      stream.update({ type: "text", content: chunk });
    }

    stream.done();
  })();

  return stream.value;
}
```

### Client Hook

```typescript
// src/app/(protected)/open/_hooks/useChatAgent.ts
"use client";

import { useState, useCallback } from "react";
import { readStreamableValue } from "ai/rsc";
import { useAiChat } from "../_components/chat/MOChatLayoutClient";
import { runAgent } from "../_ai/agent";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useChatAgent() {
  const {
    executeCapability,
    collectPageContext,
    getAvailableCapabilities,
  } = useAiChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setIsStreaming(true);

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages(prev => [...prev, userMessage]);

    // Collect context from registered collectors
    const context = await collectPageContext();
    const capabilities = getAvailableCapabilities();

    // Add placeholder assistant message
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      // Call server action
      const stream = await runAgent({
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content,
        })),
        context,
        capabilities,
      });

      // Process stream
      let assistantContent = "";
      for await (const chunk of readStreamableValue(stream)) {
        if (chunk.type === "text") {
          assistantContent += chunk.content;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        } else if (chunk.type === "action") {
          // Execute capability on frontend via existing registry
          await executeCapability(chunk.name, chunk.params);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      // Remove failed assistant message
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  }, [messages, collectPageContext, getAvailableCapabilities, executeCapability]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isStreaming,
    error,
  };
}
```

### Usage

```tsx
// Any component in /open/* routes
function MyChatComponent() {
  const { messages, sendMessage, isStreaming, error } = useChatAgent();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.role}>
          {m.content}
        </div>
      ))}

      {error && <div className="error">{error.message}</div>}

      <input
        disabled={isStreaming}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.currentTarget.value.trim()) {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
}
```

### Integration with Existing System

The hook integrates with the existing capability registry in `MOChatLayoutClient`:

1. **Context collection**: `collectPageContext()` gathers from all registered collectors (DocumentPage, NotesPage, FlashcardsPage)
2. **Capability discovery**: `getAvailableCapabilities()` tells the agent what actions are available
3. **Action execution**: `executeCapability()` calls the registered handler for each action

Pages continue to register capabilities as before:

```tsx
// FlashcardsPage.tsx (unchanged)
useRegisterCapability("createFlashcard", handleAiCreateFlashcard, "flashcards");
useRegisterCapability("updateFlashcard", handleAiUpdateFlashcard, "flashcards");
```

---

## Memory System

Claude-style explicit updates, not periodic refresh.

### Memory Types

```typescript
type UserMemory = {
  id: string;
  type: "goal" | "preference" | "struggle" | "strength" | "fact";
  content: string;
  source: "explicit" | "inferred"; // User said vs agent observed
  confidence: number; // 0-1 for inferred memories
  createdAt: Date;
  updatedAt: Date;
  sourceMessageId?: string; // Which conversation this came from
};
```

### Update Patterns

**Explicit (user-initiated):**
```
User: "Remember that I'm taking AP Biology, not A-Level"
Agent: [calls updateMemory({ type: "goal", operation: "update", ... })]
Agent: "Got it! I've updated your goal to AP Biology preparation."
```

**Inferred (agent-initiated, with confirmation):**
```
Agent: "I noticed you've struggled with meiosis questions 3 times now.
        Should I add this to your focus areas?"
User: "Yes"
Agent: [calls updateMemory({ type: "struggle", content: "meiosis", ... })]
```

### Conflict Resolution

- Explicit updates always win over inferred
- Recent updates win over older (with timestamp)
- Agent can ask for clarification on conflicts

---

## Context Compression

When conversation gets long, compress old messages.

### Strategy

1. Keep last N messages in full (e.g., 10)
2. Summarize older messages into bullets
3. Preserve all file paths and tool results (can re-fetch)
4. Keep error messages (agent learns from mistakes)

```typescript
function compressHistory(messages: Message[], maxTokens: number): Message[] {
  const recent = messages.slice(-10);
  const older = messages.slice(0, -10);

  if (estimateTokens(recent) < maxTokens) {
    return recent;
  }

  // Summarize older messages
  const summary = await summarizeMessages(older);

  return [
    { role: "system", content: `Previous conversation summary:\n${summary}` },
    ...recent,
  ];
}
```

---

## Implementation Phases

### Phase 1: Basic Chat with Context (No Tools) ✅

Get conversational chat working with full page context. Agent can read and respond but not take actions.

- [x] Create chat agent logic (moved into MOChatLayoutClient - `sendMessage` calls `runAgent` directly)
- [x] Create `runAgent` server action (no tools yet) - `_ai/agent.ts`
- [x] Build `buildSystemPrompt()` with context injection - `_ai/systemPrompt.ts`
- [x] Inject from `collectPageContext()`:
  - [x] Current page text (`localCurrentPageText`, `allPagesText`)
  - [x] Selected/highlighted text (`selectedText`, `highlightedText`)
  - [x] Document metadata (`documentName`, `currentPage`, `totalPages`)
  - [x] Notes snippet (`pageNotes`, `documentNotes`, `notesContent`)
  - [x] Flashcard count (`flashcardCount`, `cards`)
- [x] Wire to existing chat UI (MOChat)
- [x] Message attachments display (selectedText, screenshot cards above user messages)
- [x] Auto-scroll to bottom on new messages
- [x] Citation rendering with hover preview (fixed quote escaping)
- [x] Test: highlight text → ask question → get contextual response

**Success criteria:** User can highlight text, ask "explain this", and get a good answer. ✅

### Phase 2: Page Tools + Triggers

Add tools for each page type. Test each tool individually.

#### Document Tools
- [x] `highlightText` - create highlight (action → frontend) ✅
<!-- - [x] `highlightArea` - show bounding box via Gemini Flash bbox detection (action → frontend) ✅ -->
- [ ] `readPage` - read specific page text (skipped for now)
- [ ] `navigateToPage` - jump to page (skipped for now)

#### Flashcard Tools
- [x] `createFlashcard` - create card (action → frontend)
- [x] `updateFlashcard` - edit card (action → frontend)
- [x] `deleteFlashcard` - remove card (action → frontend)

#### Utility Tools
- [x] `sendStatusMessage` - conversational status updates (e.g., "Sure, let me create those flashcards for you.")

#### Notes Tools
- [ ] `readNotes` - get notes content
- [x] `editNotes` - replace text with animation (plain text match → markdown insert)
- [x] `rewriteNotes` - rewrite entire document (markdown content)

*Note: Notes tools use string-based editing (like Claude Code). AI outputs `{ textToReplace, newText }`, middleware handles Tiptap operations. See `NOTES_SPEC.md`.*

#### Triggers
- [ ] Define trigger message format
- [ ] `useTrigger` hook for components
- [ ] `questionWrong` trigger
- [ ] `flashcardStruggle` trigger
- [ ] Debouncing logic (30s cooldown?)

**Success criteria:** "Make flashcards from this page" → agent reads page → creates 5 flashcards → they appear in UI.

### Phase 3: Document Library Access

Tools for reading documents in the current collection.

#### Context Injection (System Prompt)

Agent always receives the current collection's structure:

```xml
<collection id="col_abc123" name="Biology Module 1">
  <folders>
    <folder id="folder_1" name="Cell Biology">
      <document id="doc_1" title="Chapter 12 - Cell Cycle" type="document" current="true" />
      <document id="doc_2" title="Mitosis Notes" type="notes" />
      <document id="doc_3" title="Cell Cycle Flashcards" type="flashcards" />
    </folder>
  </folders>
  <documents>
    <document id="doc_4" title="Exam Review Guide" type="document" />
    <document id="doc_5" title="Practice Test 1" type="practice" />
  </documents>
</collection>
```

**Fields:** `id`, `title`/`name`, `type` (document/notes/flashcards/practice), `isPlaceholder`, `current`

#### Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `readDocument` | Read content from any document type | `{ documentId }` | `{ title, type, content }` or error |

**Supported Document Types:**

| Type | Content Returned |
|------|------------------|
| `document` | Full extracted PDF text |
| `notes` | Rich text markdown content |
| `flashcards` | Formatted list: "1. **term**\n   definition" |
| `practice` | Questions with answers: "Q1: ...\nAnswer: ..." |

**Behavior:**
- Returns `title`, `type`, and `content` (plus `cardCount`/`questionCount` where applicable)
- Errors if document is a placeholder (no content)
- Errors if document not in current collection
- Errors if document type has no content yet

#### Checklist

- [x] Add `buildCollectionContext()` to systemPrompt.ts
- [x] Pass `folders` and `documents` from sidebar context to `runAgent`
- [x] Implement `readDocument` tool in route.ts
- [x] Handle placeholder documents (return helpful error)

**Success criteria:** "Compare this page with my DNA notes" → agent reads both → provides comparison.

### Phase 3.5: Drag-to-Chat Document Context ✅

Users can drag documents or folders from the sidebar directly into the chat as context attachments.

#### Flow

1. User starts dragging a document/folder in sidebar
2. Drop zone overlay appears when hovering over chat area (MOChat)
3. On drop: item added to `draggedContexts` state (folders internally expand to document IDs)
4. Visual cards shown in input bar (removable with X button)
5. On send: `attachedDocumentIds` included in API request
6. System prompt instructs agent to read all attached documents first
7. Agent calls `readDocument` for each (can parallelize multiple calls)
8. In thread: attachment cards displayed above user message bubble

#### Type Definition

```typescript
interface DraggedContextItem {
  id: string;
  name: string;
  type: "document" | "folder";
  documentType?: "document" | "practice" | "flashcards" | "notes" | "canvas";
  documentIds: string[]; // For folders: all docs inside
}
```

#### System Prompt Injection

When `attachedDocumentIds` is present:

```xml
<attached_documents>
  <instruction>The user has attached N document(s) to this message. You MUST read ALL of these documents using the readDocument tool BEFORE responding. Call readDocument for each document ID. You can call multiple in parallel.</instruction>
  <document_ids>
    <id>doc_abc123</id>
    <id>doc_def456</id>
  </document_ids>
</attached_documents>
```

#### Checklist

- [x] Add `DraggedContextItem` type to MOChatLayoutClient
- [x] Add `draggedContexts` state and methods (`add`, `remove`)
- [x] Listen for `medly:addChatContext` custom event from sidebar
- [x] Add `data-chat-drop-zone` attribute and overlay to MOChat
- [x] Render dragged context cards in MOChatInputBar
- [x] Detect chat drop zone in MOSidebar drag handlers (mouse + touch)
- [x] Dispatch custom event on drop with document/folder data
- [x] Render dragged context attachments in MOChatThread
- [x] Add `attachedDocumentIds` to API request body
- [x] Add `buildAttachedDocumentsXml()` to systemPrompt.ts
- [x] Update `MessageAttachments` type in types/types.ts

**Success criteria:** Drag "Chapter 12" doc into chat → ask "summarize this" → agent reads doc → provides summary.

### Phase 4: Memory System

User profile and persistent memory.

- [ ] Define memory schema in Firestore
- [ ] `readMemory` tool
- [ ] `updateMemory` tool (explicit updates)
- [ ] `forgetMemory` tool
- [ ] Inferred memory (agent asks, user confirms)
- [ ] User profile injection into system prompt:
  - [ ] Learning goals
  - [ ] Preferences
  - [ ] Strengths/struggles
- [ ] Conflict resolution (recent wins)

**Success criteria:** "Remember I'm preparing for AP Bio" → stored → appears in future conversations.

### Phase 5: Search & Subagents

Cross-document search capabilities.

- [ ] `searchDocument` - keyword/semantic search in current doc
- [ ] `searchLibrary` - search across all user documents
- [ ] Subagent architecture for parallel search
- [ ] Result aggregation and ranking
- [ ] `findRelatedContent` - find related material

**Success criteria:** "What did my other notes say about mitosis?" → searches library → returns relevant snippets.

### Phase 6: Polish

- [ ] Context compression (summarize old messages)
- [ ] Error handling and retries
- [ ] Loading states per-action ("Creating flashcard...")
- [ ] Rate limiting
- [ ] Analytics/logging
- [ ] Conversation persistence to Firestore

### Phase 7: Response Tools (Structured Output)

Structured output at the final step for rich UI rendering. Unlike action tools (which trigger frontend callbacks), response tools produce data that renders inline in the chat thread.

#### Concept

After the agent finishes its tool loop, it produces a final structured response with optional UI fields. These render as distinct visual elements in MOChatThread.

```typescript
// Final step schema
const responseSchema = z.object({
  message: z.string().describe("Main text response to the user"),
  summary: z.string().optional().describe("Key takeaway shown as a white card"),
  links: z.array(z.object({
    label: z.string(),
    url: z.string(),
    type: z.enum(["page", "document", "external"]).optional(),
  })).optional().describe("Link badges"),
  suggestions: z.array(z.string()).optional().describe("Follow-up question chips"),
});
```

#### Response Tool Types

| Field | UI Rendering | Use Case |
|-------|--------------|----------|
| `message` | Standard chat bubble | Primary response text |
| `summary` | White card with text | Key takeaways, TL;DR, important facts |
| `links` | Badge/pill components | Page refs, doc links, external resources |
| `suggestions` | Tappable chips below message | Suggested follow-up questions |
| `steps` | Numbered list card | Step-by-step instructions |
| `comparison` | Side-by-side card | Comparing two concepts |

#### UI Components (MOChatThread)

```tsx
// Summary card
{response.summary && (
  <div className="bg-white rounded-[16px] shadow-sm p-4 mt-2">
    <p className="text-[14px] text-gray-800">{response.summary}</p>
  </div>
)}

// Link badges
{response.links?.map(link => (
  <button
    key={link.url}
    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-[12px]"
    onClick={() => handleLinkClick(link)}
  >
    <LinkIcon className="w-3 h-3" />
    {link.label}
  </button>
))}

// Suggestion chips
{response.suggestions?.map(suggestion => (
  <button
    key={suggestion}
    className="px-3 py-1.5 border border-gray-200 rounded-full text-[13px] hover:bg-gray-50"
    onClick={() => sendMessage(suggestion)}
  >
    {suggestion}
  </button>
))}
```

#### Implementation

```typescript
// route.ts - Final step with structured output
const agent = new ToolLoopAgent({
  model: defaultModel,
  instructions: systemPrompt,
  tools,
  stopWhen: stepCountIs(5),
  structuredOutput: {
    schema: responseSchema,
    // Only on final step
  },
});
```

#### Checklist

- [ ] Define `ResponseSchema` in types
- [ ] Add `structuredOutput` to agent config
- [ ] Parse structured response in MOChatLayoutClient
- [ ] Create `SummaryCard` component
- [ ] Create `LinkBadge` component
- [ ] Create `SuggestionChips` component
- [ ] Update MOChatThread to render response tools
- [ ] Add system prompt instructions for when to use each field

**Success criteria:** Agent responds with summary card + suggestion chips after explaining a concept.

---

## File Structure

### Phase 1 (current)
```
src/app/(protected)/open/
├── _ai/
│   ├── agent.ts              # runAgent server action
│   ├── systemPrompt.ts       # buildSystemPrompt()
│   └── client.ts             # (existing) model config
└── _components/chat/
    ├── MOChatLayoutClient.tsx # context provider + sendMessage (calls runAgent)
    ├── MOChat.tsx             # chat UI (thread + input)
    └── MOChatThread.tsx       # message rendering + citations
```

### Full Structure (all phases)
```
src/app/(protected)/open/
├── _ai/
│   ├── agent.ts              # runAgent server action
│   ├── systemPrompt.ts       # buildSystemPrompt()
│   ├── client.ts             # (existing) model config
│   └── tools/
│       ├── documentTools.ts  # readPage, navigateToPage, highlight*
│       ├── flashcardTools.ts # read/create/update/deleteFlashcard
│       ├── notesTools.ts     # readNotes, addNote, editNotes
│       ├── searchTools.ts    # searchDocument, searchLibrary
│       └── memoryTools.ts    # readMemory, updateMemory, forgetMemory
├── _hooks/
│   └── useTrigger.ts         # trigger firing hook (Phase 2)
└── _components/chat/
    ├── MOChatLayoutClient.tsx # context provider + sendMessage + capability registry
    ├── MOChat.tsx             # chat UI (thread + input)
    └── MOChatThread.tsx       # message rendering + citations
```

---

## Open Questions

1. **Model selection**: Stick with Gemini Flash, or switch to Claude for better tool-use?
2. **Context size**: How much page text to inject? Full page vs. truncated?
3. **Memory cap**: Max memories before pruning? (50 per type?)
4. **Subagent limits**: Max parallel searches? (5 concurrent?)
5. **Trigger debouncing**: Cooldown period between auto-triggers? (30s?)
