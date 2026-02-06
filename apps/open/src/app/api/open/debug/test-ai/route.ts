import { NextRequest, NextResponse } from "next/server";
import { suggestTitle } from "@/app/(protected)/open/_ai/suggestTitle";
import { suggestFolders } from "@/app/(protected)/open/_ai/suggestFolders";
import { generateQuestions } from "@/app/(protected)/open/_ai/generateQuestions";
import { generateFlashcards, toFlashcardFormat } from "@/app/(protected)/open/_ai/generateFlashcards";

/**
 * Debug endpoint to test AI functions without auth
 * POST /api/open/debug/test-ai?fn=suggestTitle
 */
export async function POST(request: NextRequest) {
  const fn = request.nextUrl.searchParams.get("fn");

  try {
    switch (fn) {
      case "suggestTitle": {
        const title = await suggestTitle(
          "Chapter 1: Introduction to Psychology\n\nPsychology is the scientific study of behavior and mental processes."
        );
        return NextResponse.json({ status: "success", title });
      }

      case "suggestFolders": {
        const suggestions = await suggestFolders([
          {
            documentId: "test-doc-1",
            documentName: "Week 3 Lecture Notes",
            documentText: "Lecture notes covering cellular biology...",
            collectionId: "test-collection",
            existingFolders: [
              { id: "folder-1", name: "Week 1", documentNames: ["Intro"] },
              { id: "folder-2", name: "Week 2", documentNames: [] },
              { id: "folder-3", name: "Week 3", documentNames: [] },
            ],
            placeholderDocuments: [],
            rootDocumentNames: [],
          },
        ]);
        return NextResponse.json({ status: "success", suggestions });
      }

      case "generateQuestions": {
        const questionGroups = await generateQuestions(
          "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.",
          [{ type: "document", id: "test" }],
          { count: 2 }
        );
        return NextResponse.json({
          status: "success",
          questionGroups,
        });
      }

      case "generateFlashcards": {
        const flashcards = await generateFlashcards(
          "Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.",
          [{ type: "document", id: "test" }],
          { count: 3 }
        );
        return NextResponse.json({
          status: "success",
          flashcards: toFlashcardFormat(flashcards, [{ type: "document", id: "test" }]),
        });
      }

      default:
        return NextResponse.json(
          { status: "error", error: "Invalid fn param. Use: suggestTitle, suggestFolders, generateQuestions, generateFlashcards" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`Debug AI test error (${fn}):`, error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
