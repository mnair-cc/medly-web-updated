import { SourceReference } from "@/app/(protected)/open/_types/content";
import { generateFlashcards, toFlashcardFormat } from "@/app/(protected)/open/_ai/generateFlashcards";
import { NextRequest, NextResponse } from "next/server";

interface GenerateFlashcardsRequest {
  sourceReferences: SourceReference[];
  sourceContent: string;
  options?: {
    count?: number;
    difficulty?: "basic" | "intermediate" | "advanced" | "mixed";
  };
}

/**
 * POST /api/open/documents/generate-flashcards
 * Generates flashcards from source content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateFlashcardsRequest = await request.json();

    if (!body.sourceReferences?.length || !body.sourceContent) {
      return NextResponse.json(
        { error: "sourceReferences and sourceContent are required", status: "error" },
        { status: 400 }
      );
    }

    // Use AI to generate flashcards
    const generatedFlashcards = await generateFlashcards(
      body.sourceContent,
      body.sourceReferences,
      body.options
    );

    // Convert to expected format
    const flashcards = toFlashcardFormat(generatedFlashcards, body.sourceReferences);

    return NextResponse.json(
      {
        status: "success",
        flashcards,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in generate-flashcards API route:", error);
    return NextResponse.json(
      { status: "error", error: "Failed to generate flashcards", flashcards: [] },
      { status: 500 }
    );
  }
}
