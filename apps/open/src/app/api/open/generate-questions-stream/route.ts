import { NextRequest } from "next/server";
import { generateQuestionsStream } from "@/app/(protected)/open/_ai/generateQuestions";
import type { CollectionContext } from "@/app/(protected)/open/_ai/systemPrompt";

interface StreamRequestBody {
  documentIds: string[];
  count?: number;
  instructions?: string;
  collectionContext: CollectionContext;
}

/**
 * Resolve document content from collection context.
 * Mirrors the logic in chat/route.ts.
 */
function resolveDocumentContent(
  documentId: string,
  collectionContext: CollectionContext
): string | null {
  const doc = collectionContext.documents.find((d) => d.id === documentId);
  if (!doc || doc.isPlaceholder) return null;

  const docType = doc.type || "document";

  switch (docType) {
    case "notes": {
      return doc.pageNotes || null;
    }

    case "flashcards": {
      const deck = doc.flashcardDeck;
      if (!deck?.cards?.length) return null;
      return deck.cards
        .map((card, i) => `${i + 1}. **${card.term}**\n   ${card.definition}`)
        .join("\n\n");
    }

    case "practice": {
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
      if (!doc.allPagesText?.length) return null;
      return doc.allPagesText
        .sort((a, b) => a.page - b.page)
        .map((p) => p.text)
        .join("\n\n");
    }
  }
}

function resolveMultipleDocuments(
  documentIds: string[],
  collectionContext: CollectionContext
): string | null {
  const contents: string[] = [];

  for (const id of documentIds) {
    const content = resolveDocumentContent(id, collectionContext);
    if (content) {
      const doc = collectionContext.documents.find((d) => d.id === id);
      contents.push(`## ${doc?.name || id}\n\n${content}`);
    }
  }

  return contents.length > 0 ? contents.join("\n\n---\n\n") : null;
}

export async function POST(request: NextRequest) {
  try {
    const body: StreamRequestBody = await request.json();
    const { documentIds, count, instructions, collectionContext } = body;

    if (!documentIds?.length) {
      return new Response(
        JSON.stringify({ error: "No document IDs provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!collectionContext) {
      return new Response(
        JSON.stringify({ error: "Collection context required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sourceContent = resolveMultipleDocuments(documentIds, collectionContext);
    if (!sourceContent) {
      return new Response(
        JSON.stringify({ error: "Could not read source document content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = generateQuestionsStream(sourceContent, {
            count: count ?? 5,
            instructions,
          });

          for await (const questionGroup of generator) {
            const data = JSON.stringify({ type: "questionGroup", questionGroup });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`));
        } catch (error) {
          console.error("[generate-questions-stream] Error:", error);
          const errorMessage = error instanceof Error ? error.message : "Generation failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[generate-questions-stream] Request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
