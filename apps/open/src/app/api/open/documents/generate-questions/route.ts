import { SourceReference } from "@/app/(protected)/open/_types/content";
import { generateQuestions } from "@/app/(protected)/open/_ai/generateQuestions";
import { NextRequest, NextResponse } from "next/server";

interface GenerateQuestionsRequest {
  sourceReferences: SourceReference[];
  sourceContent: string;
  options?: {
    count?: number;
    difficulty?: "easy" | "medium" | "hard" | "mixed";
    types?: ("mcq" | "short_answer" | "long_answer")[];
  };
}

/**
 * POST /api/open/documents/generate-questions
 * Generates practice questions from source content using AI
 * Returns QuestionGroup[] with stems and parts
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await request.json();

    if (!body.sourceReferences?.length || !body.sourceContent) {
      return NextResponse.json(
        { error: "sourceReferences and sourceContent are required", status: "error" },
        { status: 400 }
      );
    }

    // Generate QuestionGroup[] directly
    const questionGroups = await generateQuestions(
      body.sourceContent,
      body.sourceReferences,
      body.options
    );

    return NextResponse.json(
      {
        status: "success",
        questionGroups,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in generate-questions API route:", error);
    return NextResponse.json(
      { status: "error", error: "Failed to generate questions", questionGroups: [] },
      { status: 500 }
    );
  }
}
