# Chat API Specification

## Overview

OpenAI-style API for the AI chat agent. Two methods: `sendMessage` for user chat, `sendSystemEvent` for system events.

```typescript
const { sendMessage, sendSystemEvent } = useAiChat();

// User-initiated chat
sendMessage("Explain this", { selectedText: "..." })

// System-initiated events
sendSystemEvent("fileUploaded", { uploadedDocuments: [...] })
sendSystemEvent("documentCreated", { documentType: "practice", ... })
```

---

## Types

```typescript
// _types/chat.ts

// Flat discriminated union - all intent types are peers
export type ChatIntent =
  | { type: "userMessage"; content: string; attachments?: ChatAttachments }
  | { type: "fileUploaded"; context: FileUploadedContext }
  | { type: "documentCreated"; context: DocumentCreatedContext }
  | { type: "questionWrong"; context: QuestionWrongContext }
  | { type: "flashcardStruggle"; context: FlashcardStruggleContext }
  | { type: "sessionStart"; context: SessionStartContext };

// Context types
export interface FileUploadedContext {
  uploadedDocuments: Array<{
    documentId: string;
    documentName: string;
    extractedTextPreview: string;
  }>;
  setupContext?: SetupContext;
}

export interface DocumentCreatedContext {
  documentType: "practice" | "flashcards" | "notes";
  documentName: string;
  sourceDocumentIds?: string[];
  sourceDocumentNames?: string[];
}

export interface QuestionWrongContext {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  attemptCount: number;
  topic?: string;
}

export interface FlashcardStruggleContext {
  cardId: string;
  term: string;
  againCount: number;
  lastInterval?: number;
}

export interface SessionStartContext {
  documentId: string;
  lastVisited?: string;
  resumeContext?: string;
}

export interface SetupContext {
  isFirstEverUpload: boolean;
  isSetupModeActive: boolean;
  flowType?: "organize" | "exam" | "assignment" | "lecture";
  collectionId: string;
}

export interface ChatAttachments {
  selectedText?: string;
  screenshot?: { dataUrl: string };
  draggedContexts?: DraggedContextItem[];
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MOChatLayoutClient (ChatContext Provider)                       │
│                                                                  │
│  Public API:                                                     │
│    sendMessage(content, attachments?)   ← user chat              │
│    sendSystemEvent(type, context)       ← system events          │
│                                                                  │
│  Internal:                                                       │
│    invokeInternal(intent)               ← shared request logic   │
│    processAgentStream(response)         ← shared streaming       │
│                                                                  │
│  Rate Limiting (fileUploaded only):                              │
│    useTriggerProcessor({ rateLimitMs: 30000, debounceMs: 2000 }) │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow

```
User types message:
  sendMessage("...", { selectedText })
    → Add user message to thread
    → invokeInternal({ type: "userMessage", ... })
    → POST /api/open/chat { intent }
    → processAgentStream(response)

File uploaded (rate limited):
  sendTriggerEvent(payload)
    → processTrigger() [rate limit + debounce]
    → After debounce: invokeInternal({ type: "fileUploaded", ... })
    → POST /api/open/chat { intent }
    → processAgentStream(response)
    → AI response shows (no user message)

Document created:
  sendSystemEvent("documentCreated", context)
    → Auto-open chat
    → invokeInternal({ type: "documentCreated", ... })
    → POST /api/open/chat { intent }
    → processAgentStream(response)
    → AI provides initial guidance
```

---

## Implementation

### MOChatLayoutClient.tsx

```typescript
// Shared streaming processor (extracted from duplicated code)
const processAgentStream = useCallback(async (response: Response) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = JSON.parse(line.slice(6));
      // Handle: step-start, finish-step, text-delta, tool-*, etc.
      // Execute capabilities, update messages state
    }
  }
}, [executeCapability]);

// Unified invoke function
const invoke = useCallback(async (intent: ChatIntent) => {
  if (isLoading) return;
  setIsLoading(true);
  setError(null);

  // Intent-specific pre-processing
  if (intent.type === "userMessage") {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: intent.content,
      timestamp: Date.now(),
      attachments: intent.attachments,
    };
    setMessages(prev => [...prev, userMessage]);
    clearAttachments();
  } else {
    // Non-user intents: auto-open chat
    openChat();
  }

  // Rate limit fileUploaded only
  if (intent.type === "fileUploaded") {
    processTrigger(intent);
    setIsLoading(false);
    return;
  }

  try {
    const pageContext = await collectPageContext();
    const collectionCtx = buildCollectionContext();

    const response = await fetch("/api/open/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        context: pageContext,
        collectionContext: collectionCtx,
      }),
    });

    if (!response.ok) throw new Error("Failed to get response");
    await processAgentStream(response);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to send");
  } finally {
    setIsLoading(false);
  }
}, [/* deps */]);

// Trigger processor for rate-limited intents
const { processTrigger } = useTriggerProcessor({
  rateLimitMs: 30000,
  debounceMs: 2000,
  enabled: true,
  onTriggerReady: async (triggers) => {
    // Build batched intent and invoke directly (bypass rate limiter)
    await invokeInternal({
      type: "fileUploaded",
      context: {
        uploadedDocuments: triggers.map(t => ({
          documentId: t.context.uploadedDocuments[0].documentId,
          documentName: t.context.uploadedDocuments[0].documentName,
          extractedTextPreview: t.context.uploadedDocuments[0].extractedTextPreview,
        })),
        setupContext: buildSetupContext(),
      },
    });
  },
});
```

### Context Value

```typescript
interface ChatContextValue {
  // Public API
  invoke: (intent: ChatIntent) => void;

  // State
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isChatOpen: boolean;

  // UI controls
  openChat: () => void;
  closeChat: () => void;
  clearMessages: () => void;

  // ... other existing fields
}
```

---

## API Route

### /api/open/chat/route.ts

```typescript
interface ChatRequestBody {
  intent: ChatIntent;
  messages: AgentMessage[];
  context: PageContext;
  collectionContext?: CollectionContext;
}

// In handler:
const { intent, messages, context, collectionContext } = body;

// Build synthetic message based on intent type
let uiMessages: UIMessage[];
if (intent.type === "userMessage") {
  uiMessages = buildUserMessages(messages, intent.content, context);
} else {
  // System intents use synthetic marker
  uiMessages = [{
    id: `msg-intent-${Date.now()}`,
    role: "user",
    parts: [{ type: "text", text: `[INTENT:${intent.type}]` }],
  }];
}

// Build system prompt with intent context
const systemPrompt = buildSystemPrompt({
  context,
  collectionContext,
  intent,
});
```

### _ai/systemPrompt.ts

```typescript
export function buildSystemPrompt({ intent, ...rest }: BuildSystemPromptParams): string {
  let prompt = basePrompt;

  if (intent && intent.type !== "userMessage") {
    prompt += buildIntentInstructions(intent);
  }

  return prompt;
}

function buildIntentInstructions(intent: ChatIntent): string {
  switch (intent.type) {
    case "fileUploaded":
      return buildFileUploadedPrompt(intent.context);
    case "documentCreated":
      return buildDocumentCreatedPrompt(intent.context);
    case "questionWrong":
      return buildQuestionWrongPrompt(intent.context);
    case "flashcardStruggle":
      return buildFlashcardStrugglePrompt(intent.context);
    case "sessionStart":
      return buildSessionStartPrompt(intent.context);
    default:
      return "";
  }
}
```

---

## Usage Examples

```typescript
// User sends chat message
sendMessage("Explain photosynthesis")
sendMessage("Define this", { selectedText: "mitochondria" })

// File uploaded in sidebar (uses sendTriggerEvent for rate limiting)
sendTriggerEvent({
  documentId: "doc_123",
  documentName: "Biology Chapter 5.pdf",
  extractedText: "Photosynthesis is the process...",
})

// New practice document created
sendSystemEvent("documentCreated", {
  documentType: "practice",
  documentName: "Cell Biology Practice",
  sourceDocumentIds: ["doc_123", "doc_456"],
  sourceDocumentNames: ["Chapter 5", "Chapter 6"],
})

// User answered question wrong (future)
sendSystemEvent("questionWrong", {
  questionId: "q_789",
  userAnswer: "mitochondria",
  correctAnswer: "chloroplast",
  attemptCount: 2,
  topic: "Cell organelles",
})
```

---

## File Changes

| File | Action |
|------|--------|
| `_types/chat.ts` | CREATE - ChatIntent, context interfaces |
| `MOChatLayoutClient.tsx` | MODIFY - Extract processAgentStream, create sendMessage/sendSystemEvent |
| `/api/open/chat/route.ts` | MODIFY - Handle intent field |
| `_ai/systemPrompt.ts` | MODIFY - buildIntentInstructions() |

---

## Migration

```typescript
// BEFORE (old API)
sendMessage("hello")
sendInitMessage({ documentType: "practice", ... })

// AFTER (new API)
sendMessage("hello")
sendSystemEvent("documentCreated", { documentType: "practice", ... })
```
