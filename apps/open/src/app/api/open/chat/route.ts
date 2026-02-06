import { defaultModel } from "@/app/(protected)/open/_ai/client";
import { generateSummary } from "@/app/(protected)/open/_ai/generateSummary";
import {
  buildSystemPrompt,
  type CollectionContext,
} from "@/app/(protected)/open/_ai/systemPrompt";
import type {
  PageContext,
  SelectedScreenshot,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import type { ChatIntent } from "@/app/(protected)/open/_types/chat";
import type { SourceReference } from "@/app/(protected)/open/_types/content";
import { auth } from "@/auth";
import { chatThreadRepo } from "@/db/repositories";
import {
  createAgentUIStreamResponse,
  Output,
  stepCountIs,
  tool,
  ToolLoopAgent,
} from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

interface ChatRequestBody {
  threadId: string; // Required - messages are persisted to this thread
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: PageContext;
  selectedText: string | null;
  selectedScreenshot: SelectedScreenshot | null;
  collectionContext?: CollectionContext;
  attachedDocumentIds?: string[];
  sourceReferences?: SourceReference[];
  intent?: ChatIntent;
}

// Schema for structured final output
const FinalResponseSchema = z.object({
  message: z.string().describe("Your response text to the user"),
  threadTitle: z
    .string()
    .optional()
    .describe(
      "Brief title (3-6 words) summarizing the conversation topic. Only generate on the first message of a new thread.",
    ),
  quickReplies: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional()
    .describe("Clickable quick reply options for the user"),
  uploadRequest: z
    .object({
      label: z
        .string()
        .describe("Button text for the upload button (e.g., 'Upload lecture slides')"),
    })
    .optional()
    .describe("Shows an upload button to the user. Use this when asking the user to upload a file."),
  unlockNextUpload: z
    .boolean()
    .optional()
    .describe("Set to true ONLY when responding to a fileUploaded intent event"),
  awaitUserResponse: z
    .object({
      message: z
        .string()
        .describe(
          "Status message to display while waiting (e.g., 'Waiting for selection')",
        ),
    })
    .optional()
    .describe(
      "Show persistent status chip until next user action. Do NOT use for file uploads - use uploadRequest instead.",
    ),
});

// Helper to resolve document content from collection context
function resolveDocumentContent(
  documentId: string,
  collectionContext?: CollectionContext,
): string | null {
  if (!collectionContext) return null;
  const doc = collectionContext.documents.find((d) => d.id === documentId);
  if (!doc || doc.isPlaceholder) return null;

  const docType = doc.type || "document";

  switch (docType) {
    case "notes": {
      // Notes use pageNotes field
      return doc.pageNotes || null;
    }

    case "flashcards": {
      // Format flashcards as readable text
      const deck = doc.flashcardDeck;
      if (!deck?.cards?.length) return null;
      return deck.cards
        .map((card, i) => `${i + 1}. **${card.term}**\n   ${card.definition}`)
        .join("\n\n");
    }

    case "practice": {
      // Format questions as readable text
      const questions = doc.questions;
      if (!questions?.length) return null;
      return questions
        .map((q, i) => {
          let text = `Q${i + 1}: ${q.questionText || ""}`;
          if (q.correctAnswer) {
            text += `\nAnswer: ${typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer)}`;
          }
          return text;
        })
        .join("\n\n");
    }

    case "document":
    default: {
      // PDFs use allPagesText
      if (!doc.allPagesText?.length) return null;
      return doc.allPagesText
        .sort((a, b) => a.page - b.page)
        .map((p) => p.text)
        .join("\n\n");
    }
  }
}

// Helper to resolve multiple documents
function resolveMultipleDocuments(
  documentIds: string | string[],
  collectionContext?: CollectionContext,
): string | null {
  const ids = Array.isArray(documentIds) ? documentIds : [documentIds];
  const contents: string[] = [];

  for (const id of ids) {
    const content = resolveDocumentContent(id, collectionContext);
    if (content) {
      const doc = collectionContext?.documents.find((d) => d.id === id);
      contents.push(`## ${doc?.name || id}\n\n${content}`);
    }
  }

  return contents.length > 0 ? contents.join("\n\n---\n\n") : null;
}

// Build tools dynamically based on page context and collection
function buildTools(
  context: PageContext,
  collectionContext?: CollectionContext,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  // Status message tool - always available
  tools.sendStatusMessage = tool({
    description:
      "Send a conversational status message to the user. Be friendly and natural.",
    inputSchema: z.object({
      message: z
        .string()
        .describe(
          "Friendly, conversational status message. E.g., 'Sure, let me create those flashcards for you.', 'Let me highlight that section.'",
        ),
    }),
    execute: async ({ message }: { message: string }) => ({
      _statusMessage: message,
    }),
  });

  // Document page tools
  if (context.pageType === "document") {
    tools.highlightText = tool({
      description:
        "Highlight specific text in the document. Use when pointing out important text to the student.",
      inputSchema: z.object({
        text: z.string().describe("The exact text to highlight"),
        pageNumber: z.number().optional().describe("Page number (1-indexed)"),
      }),
      execute: async ({
        text,
        pageNumber,
      }: {
        text: string;
        pageNumber?: number;
      }) => ({
        _action: "highlightText",
        params: { text, page: pageNumber },
      }),
    });
  }

  // Flashcard tools (all array-based for consistency)
  if (context.pageType === "flashcards") {
    tools.createFlashcards = tool({
      description: "Create one or more flashcards",
      inputSchema: z.object({
        cards: z
          .array(
            z.object({
              term: z.string().describe("The term/question"),
              definition: z.string().describe("The definition/answer"),
            }),
          )
          .describe("Array of flashcards to create"),
      }),
      execute: async ({
        cards,
      }: {
        cards: Array<{ term: string; definition: string }>;
      }) => ({
        _action: "createFlashcards",
        params: { cards },
      }),
    });

    tools.updateFlashcards = tool({
      description: "Update one or more existing flashcards",
      inputSchema: z.object({
        cards: z
          .array(
            z.object({
              id: z.string().describe("The ID of the flashcard to update"),
              term: z.string().optional().describe("New term (if changing)"),
              definition: z
                .string()
                .optional()
                .describe("New definition (if changing)"),
            }),
          )
          .describe("Array of flashcard updates"),
      }),
      execute: async ({
        cards,
      }: {
        cards: Array<{ id: string; term?: string; definition?: string }>;
      }) => ({
        _action: "updateFlashcards",
        params: { cards },
      }),
    });

    tools.deleteFlashcards = tool({
      description: "Delete one or more flashcards",
      inputSchema: z.object({
        cardIds: z
          .array(z.string())
          .describe("Array of flashcard IDs to delete"),
      }),
      execute: async ({ cardIds }: { cardIds: string[] }) => ({
        _action: "deleteFlashcards",
        params: { cardIds },
      }),
    });
  }

  // Flashcard generation (available from any page when collection context exists)
  if (collectionContext) {
    tools.generateFlashcardsFromSource = tool({
      description:
        "Generate flashcards from source document(s). Use after creating a flashcard deck with createFlashcardsDocument, or when on a flashcards page.",
      inputSchema: z.object({
        documentIds: z
          .union([z.string(), z.array(z.string())])
          .describe("Document ID(s) from the collection to use as source"),
        count: z
          .number()
          .optional()
          .describe("Number of flashcards to generate (default: 10)"),
        instructions: z
          .string()
          .optional()
          .describe(
            "Additional instructions (focus topic, difficulty, style, etc.)",
          ),
      }),
      execute: async ({
        documentIds,
        count,
        instructions,
      }: {
        documentIds: string | string[];
        count?: number;
        instructions?: string;
      }) => {
        // Return params for client-side streaming instead of generating all at once
        const ids = Array.isArray(documentIds) ? documentIds : [documentIds];
        return {
          _action: "streamFlashcardsFromSource",
          params: {
            documentIds: ids,
            count: count ?? 10,
            instructions,
          },
        };
      },
    });
  }

  // Questions generation (available from any page when collection context exists)
  if (collectionContext) {
    tools.generateQuestionsFromSource = tool({
      description:
        "Generate practice questions from source document(s). Use after creating a practice document with createPracticeDocument, or when on a questions page.",
      inputSchema: z.object({
        documentIds: z
          .union([z.string(), z.array(z.string())])
          .describe("Document ID(s) from the collection to use as source"),
        count: z
          .number()
          .optional()
          .describe("Number of questions to generate (default: 5)"),
        instructions: z
          .string()
          .optional()
          .describe(
            "Additional instructions (difficulty, question types, focus topic, etc.)",
          ),
      }),
      execute: async ({
        documentIds,
        count,
        instructions,
      }: {
        documentIds: string | string[];
        count?: number;
        instructions?: string;
      }) => {
        // Return streaming action - client will handle the actual streaming
        const ids = Array.isArray(documentIds) ? documentIds : [documentIds];
        return {
          _action: "streamQuestionsFromSource",
          params: { documentIds: ids, count: count ?? 5, instructions },
        };
      },
    });
  }

  // Notes page editing tools
  if (context.pageType === "notes") {
    tools.editNotes = tool({
      description:
        "Edit notes by replacing specific text. The textToReplace must be unique in the document. newText can include markdown formatting.",
      inputSchema: z.object({
        textToReplace: z
          .string()
          .describe(
            "The exact plain text to find and replace (must be unique in the document)",
          ),
        newText: z
          .string()
          .describe(
            "The replacement text (can include markdown: **bold**, *italic*, ## headings, - lists)",
          ),
      }),
      execute: async ({
        textToReplace,
        newText,
      }: {
        textToReplace: string;
        newText: string;
      }) => ({
        _action: "editNotes",
        params: { textToReplace, newText },
      }),
    });

    tools.rewriteNotes = tool({
      description:
        "Rewrite the entire notes document with new content. Use when making major changes or writing notes from scratch.",
      inputSchema: z.object({
        newContent: z
          .string()
          .describe("The full new content for the notes (markdown format)"),
      }),
      execute: async ({ newContent }: { newContent: string }) => ({
        _action: "rewriteNotes",
        params: { newContent },
      }),
    });
  }

  // Notes/Document page tools - summary generation
  if (
    (context.pageType === "notes" || context.pageType === "document") &&
    collectionContext
  ) {
    tools.generateSummaryFromSource = tool({
      description:
        context.pageType === "notes"
          ? "Generate a summary from source document(s) and write it to the notes. Automatically updates the notes with the generated content."
          : "Generate a summary from source document(s). Returns markdown text.",
      inputSchema: z.object({
        documentIds: z
          .union([z.string(), z.array(z.string())])
          .describe("Document ID(s) from the collection to use as source"),
        instructions: z
          .string()
          .optional()
          .describe("Additional instructions (format, focus, length, etc.)"),
      }),
      execute: async ({
        documentIds,
        instructions,
      }: {
        documentIds: string | string[];
        instructions?: string;
      }) => {
        const sourceContent = resolveMultipleDocuments(
          documentIds,
          collectionContext,
        );
        if (!sourceContent) {
          return { error: "Could not read source document content" };
        }

        const summary = await generateSummary(sourceContent, { instructions });

        // On notes page, automatically write the summary to notes
        if (context.pageType === "notes") {
          return {
            _action: "rewriteNotes",
            params: { newContent: summary },
            generatedLength: summary.length,
          };
        }

        return {
          summary,
          generatedLength: summary.length,
        };
      },
    });
  }

  // tools.highlightArea = tool({
  //   description: "Show bounding box on visual element (diagram, chart, image, equation). Use for visual content that can't be highlighted as text.",
  //   inputSchema: z.object({
  //     label: z.string().describe("What to find and highlight (e.g., 'the diagram', 'the graph', 'the equation')"),
  //   }),
  //   execute: async ({ label }: { label: string }) => {
  //     if (!context.pageScreenshot) {
  //       return { error: "No page screenshot available for detection" };
  //     }

  //     // Gemini Flash for bbox detection (using Vertex AI)
  //     const flashModel = vertex("gemini-2.5-flash");
  //     const detection = await generateObject({
  //       model: flashModel,
  //       schema: z.object({
  //         y1: z.number().describe("Top y coordinate (0-1000)"),
  //         x1: z.number().describe("Left x coordinate (0-1000)"),
  //         y2: z.number().describe("Bottom y coordinate (0-1000)"),
  //         x2: z.number().describe("Right x coordinate (0-1000)"),
  //         label: z.string().describe("Label for the detected element"),
  //       }),
  //       messages: [{
  //         role: "user",
  //         content: [
  //           { type: "text", text: `Detect "${label}" in this image. Output the bounding box coordinates (y1, x1, y2, x2) in 0-1000 range where (0,0) is top-left.` },
  //           { type: "image", image: context.pageScreenshot },
  //         ],
  //       }],
  //     });

  //     const { y1, x1, y2, x2 } = detection.object;
  //     // Convert 0-1000 range to 0-100 percentage
  //     const box_2d: [number, number, number, number] = [x1 / 10, y1 / 10, x2 / 10, y2 / 10];

  //     return {
  //       _action: "highlightArea",
  //       params: { label: detection.object.label, box_2d, page: context.currentPage },
  //     };
  //   },
  // });

  // Library tool - readDocument (always available when collection context exists)
  if (collectionContext) {
    tools.readDocument = tool({
      description:
        "Read content from any document in the current collection (PDFs, notes, flashcards, practice tests). Use when you need to reference or compare content from other documents.",
      inputSchema: z.object({
        documentId: z
          .string()
          .describe("The document ID from the <collection> context"),
      }),
      execute: async ({ documentId }: { documentId: string }) => {
        // Find document in collection context
        const doc = collectionContext.documents.find(
          (d) => d.id === documentId,
        );

        if (!doc) {
          return { error: "Document not found in current collection" };
        }

        if (doc.isPlaceholder) {
          return {
            error: `Document "${doc.name}" is a placeholder - no content uploaded yet`,
          };
        }

        const docType = doc.type || "document";

        // Handle different document types
        switch (docType) {
          case "notes": {
            if (!doc.pageNotes) {
              return { error: `Notes "${doc.name}" has no content yet` };
            }
            return {
              title: doc.name,
              type: "notes",
              content: doc.pageNotes,
            };
          }

          case "flashcards": {
            const deck = doc.flashcardDeck;
            if (!deck?.cards || deck.cards.length === 0) {
              return { error: `Flashcard deck "${doc.name}" has no cards yet` };
            }
            // Format flashcards as readable text
            const cardsText = deck.cards
              .map(
                (card, i) =>
                  `${i + 1}. **${card.term}**\n   ${card.definition}`,
              )
              .join("\n\n");
            return {
              title: doc.name,
              type: "flashcards",
              cardCount: deck.cards.length,
              content: cardsText,
            };
          }

          case "practice": {
            const questions = doc.questions;
            if (!questions || questions.length === 0) {
              return {
                error: `Practice test "${doc.name}" has no questions yet`,
              };
            }
            // Format questions as readable text
            const questionsText = questions
              .map((q, i) => {
                let text = `Q${i + 1}: ${q.questionText || ""}`;
                if (q.correctAnswer) {
                  text += `\nAnswer: ${typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer)}`;
                }
                return text;
              })
              .join("\n\n");
            return {
              title: doc.name,
              type: "practice",
              questionCount: questions.length,
              content: questionsText,
            };
          }

          case "document":
          default: {
            // PDF/document - use extracted text
            if (!doc.allPagesText || doc.allPagesText.length === 0) {
              return {
                error: `Document "${doc.name}" has no extracted text available`,
              };
            }
            const fullText = doc.allPagesText
              .sort((a, b) => a.page - b.page)
              .map((p) => p.text)
              .join("\n\n");
            return {
              title: doc.name,
              type: "document",
              content: fullText,
            };
          }
        }
      },
    });

    // Document creation tools
    tools.createNotesDocument = tool({
      description:
        "Create a new blank notes page in the collection. Use when the student needs a place to take notes or you want to help them organize their learning.",
      inputSchema: z.object({
        name: z.string().describe("Title for the notes page"),
        navigate: z
          .boolean()
          .optional()
          .describe("Whether to navigate to the new document (default: true)"),
      }),
      execute: async ({
        name,
        navigate = true,
      }: {
        name: string;
        navigate?: boolean;
      }) => {
        const position = collectionContext.documents.filter(
          (d) =>
            d.collectionId === collectionContext.collection?.id && !d.folderId,
        ).length;

        return {
          _action: "createNotesDocument",
          params: {
            collectionId: collectionContext.collection?.id,
            folderId: null,
            position,
            name,
            navigate,
          },
        };
      },
    });

    tools.createFlashcardsDocument = tool({
      description:
        "Create a new blank flashcard deck in the collection. Use when the student wants to create flashcards for studying.",
      inputSchema: z.object({
        name: z.string().describe("Title for the flashcard deck"),
        navigate: z
          .boolean()
          .optional()
          .describe("Whether to navigate to the new document (default: true)"),
      }),
      execute: async ({
        name,
        navigate = true,
      }: {
        name: string;
        navigate?: boolean;
      }) => {
        const position = collectionContext.documents.filter(
          (d) =>
            d.collectionId === collectionContext.collection?.id && !d.folderId,
        ).length;

        return {
          _action: "createFlashcardsDocument",
          params: {
            collectionId: collectionContext.collection?.id,
            folderId: null,
            position,
            name,
            navigate,
          },
        };
      },
    });

    tools.createPracticeDocument = tool({
      description:
        "Create a new blank practice test in the collection. Use when the student wants to create a practice exam or quiz.",
      inputSchema: z.object({
        name: z.string().describe("Title for the practice test"),
        navigate: z
          .boolean()
          .optional()
          .describe("Whether to navigate to the new document (default: true)"),
      }),
      execute: async ({
        name,
        navigate = true,
      }: {
        name: string;
        navigate?: boolean;
      }) => {
        const position = collectionContext.documents.filter(
          (d) =>
            d.collectionId === collectionContext.collection?.id && !d.folderId,
        ).length;

        return {
          _action: "createPracticeDocument",
          params: {
            collectionId: collectionContext.collection?.id,
            folderId: null,
            position,
            name,
            navigate,
          },
        };
      },
    });

    tools.navigateToDocument = tool({
      description:
        "Navigate the student to a different document in the collection. Use when they need to look at another document or when you've created a new document for them.",
      inputSchema: z.object({
        documentId: z
          .string()
          .describe(
            "The document ID to navigate to (from the <collection> context)",
          ),
      }),
      execute: async ({ documentId }: { documentId: string }) => {
        const doc = collectionContext.documents.find(
          (d) => d.id === documentId,
        );
        if (!doc) {
          return { error: "Document not found in current collection" };
        }

        return {
          _action: "navigateToDocument",
          params: {
            documentId,
            documentName: doc.name,
            documentType: doc.type,
          },
        };
      },
    });
  }

  return tools;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const {
      threadId,
      messages,
      context,
      selectedText,
      selectedScreenshot,
      collectionContext,
      attachedDocumentIds,
      sourceReferences,
      intent,
    } = body;

    console.log("[chat] Request received:", {
      messageCount: messages.length,
      pageType: context.pageType,
      hasScreenshot: !!selectedScreenshot,
      hasAttachments: !!attachedDocumentIds?.length,
      intentType: intent?.type ?? "userMessage",
      threadId,
      collectionId: collectionContext?.collection?.id ?? "(none)",
    });

    // Get session for thread persistence
    const session = await auth();
    const authProviderId = session?.user?.id;
    console.log("[chat] Auth:", { authenticated: !!authProviderId });

    // Authentication is required since threadId is mandatory
    if (!authProviderId) {
      return new Response(
        JSON.stringify({
          error: "Authentication required for chat",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify thread ownership before processing
    const thread = await chatThreadRepo.findById(authProviderId, threadId);
    if (!thread) {
      return new Response(
        JSON.stringify({ error: "Invalid or unauthorized thread" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Save user message to thread
    // This is synchronous to validate the thread before calling the AI
    {
      const userMessage = messages[messages.length - 1];
      if (userMessage && userMessage.role === "user") {
        console.log("[chat] DB: Saving user message to thread:", threadId);
        const saved = await chatThreadRepo.appendMessage(
          authProviderId,
          threadId,
          {
            id: `msg-${Date.now()}`,
            role: "user",
            content: userMessage.content,
            createdAt: Date.now(),
          },
        );

        if (!saved) {
          console.log(
            "[chat] DB: Failed to save - invalid/unauthorized thread",
          );
          return new Response(
            JSON.stringify({ error: "Invalid or unauthorized thread" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        console.log("[chat] DB: User message saved");
      }
    }

    const systemPrompt = buildSystemPrompt({
      context,
      selectedText,
      collectionContext,
      attachedDocumentIds,
      sourceReferences,
      intent,
    });
    const tools = buildTools(context, collectionContext);

    // Track final AI response for persistence
    let finalAiResponse = "";
    let stepCount = 0;
    const aiMessageId = `msg-ai-${Date.now()}`; // Stable ID to prevent duplicate saves

    console.log(
      "[chat] AI: Creating agent with",
      Object.keys(tools).length,
      "tools",
    );

    // Create agent with dynamic tools and structured final output
    const agent = new ToolLoopAgent({
      model: defaultModel,
      instructions: systemPrompt,
      tools,
      stopWhen: stepCountIs(5),
      output: Output.object({ schema: FinalResponseSchema }),
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
          },
        },
      },
      onStepFinish: async ({ text, toolCalls }) => {
        stepCount++;
        const toolNames = toolCalls?.map((tc) => tc.toolName) ?? [];
        console.log("[chat] AI: Step", stepCount, "finished", {
          hasText: !!text,
          textLength: text?.length ?? 0,
          toolCalls: toolNames.length > 0 ? toolNames : "(none)",
        });
        // When we get text output (final response), save it to the thread
        if (text) {
          finalAiResponse = text;
          console.log("[chat] DB: Saving AI response to thread:", threadId);
          try {
            // Parse structured response to extract message text and metadata
            // The AI returns JSON like {"message":"Hello","threadTitle":"Chat",...}
            // We save only the message text to content, and handle metadata separately
            let contentToSave = text;
            let threadTitle: string | undefined;

            try {
              const parsed = JSON.parse(text);
              if (typeof parsed.message === "string") {
                contentToSave = parsed.message;
                threadTitle = parsed.threadTitle;
              }
            } catch {
              // Not JSON, keep original text
            }

            await chatThreadRepo.appendMessage(authProviderId, threadId, {
              id: aiMessageId,
              role: "assistant",
              content: contentToSave,
              createdAt: Date.now(),
            });
            console.log("[chat] DB: AI message saved");

            // Save thread title if generated (only on first message)
            if (threadTitle) {
              await chatThreadRepo.update(authProviderId, threadId, {
                title: threadTitle,
              });
            }
          } catch (err) {
            console.error("[chat] DB: Failed to save AI message:", err);
          }
        }
      },
    });

    // Build UI messages format (UIMessage requires id, role, parts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let uiMessages: any[];

    if (intent && intent.type !== "userMessage") {
      // System intents: send synthetic marker, instructions in system prompt
      uiMessages = [
        {
          id: `msg-intent-${Date.now()}`,
          role: "user" as const,
          parts: [{ type: "text" as const, text: `[INTENT:${intent.type}]` }],
        },
      ];
    } else {
      const lastUserMessage = messages[messages.length - 1];

      // Build user content parts for the last message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userParts: any[] = [];
      if (context.pageScreenshot) {
        userParts.push({
          type: "file",
          mediaType: "image/png",
          url: context.pageScreenshot,
        });
      }
      if (selectedScreenshot) {
        userParts.push({
          type: "file",
          mediaType: "image/png",
          url: selectedScreenshot.dataUrl,
        });
      }
      userParts.push({ type: "text", text: lastUserMessage.content });

      // Build full message history in UIMessage format
      uiMessages = [
        ...messages.slice(0, -1).map((m, idx) => ({
          id: `msg-history-${idx}`,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        })),
        {
          id: `msg-current-${Date.now()}`,
          role: "user" as const,
          parts: userParts,
        },
      ];
    }

    console.log(
      "[chat] AI: Starting stream with",
      uiMessages.length,
      "messages",
    );

    // Create the streaming response (returns Promise<Response>)
    // Return directly without await - Next.js handles the Promise and streams to client
    const responsePromise = createAgentUIStreamResponse({
      agent,
      uiMessages,
    });

    console.log("[chat] Stream: Created, threadId:", threadId);

    // Return the Promise<Response> directly - Next.js streams it to client
    // AI response is saved in onStepFinish callback when final text is received
    return responsePromise;
  } catch (error) {
    console.error("[chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
