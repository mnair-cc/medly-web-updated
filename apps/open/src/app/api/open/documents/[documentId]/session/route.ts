import { auth } from "@/auth";
import { documentRepo } from "@/db/repositories";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = (await params).documentId;
    const sessionData = await request.json();

    // 1. Log params received
    console.log("[session/route] PUT request received:", {
      documentId,
      userId: session.user.id,
      fieldsProvided: Object.keys(sessionData),
      hasFlashcardDeck: !!sessionData.flashcardDeck,
      flashcardCount: sessionData.flashcardDeck?.cards?.length ?? 0,
    });

    // Note: pageNotes is no longer saved here - use /api/open/documents/{id}/notes endpoint instead
    const success = await documentRepo.updateSession(session.user.id, documentId, {
      notes: sessionData.notes,
      canvases: sessionData.canvases,
      highlights: sessionData.highlights,
      documentTranscription: sessionData.documentTranscription,
      allPagesText: sessionData.allPagesText,
      questions: sessionData.questions,
      questionGroups: sessionData.questionGroups,
      flashcardDeck: sessionData.flashcardDeck,
    });

    // 2. Log repo result
    console.log("[session/route] Repo updateSession result:", {
      documentId,
      success,
    });

    if (!success) {
      console.log("[session/route] Document not found, returning 404");
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 3. Log response being sent
    console.log("[session/route] Sending success response");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[session/route] Error updating document session data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
