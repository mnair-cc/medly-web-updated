import { generateObject, streamObject } from "ai";
import { z } from "zod";
import { fastModel } from "./client";
import { QuestionDifficulty, QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";
import type { SourceReference } from "../_types/content";

export interface GenerateQuestionsOptions {
  count?: number;
  instructions?: string;
  baseId?: string;
}

// Schema for a question part (a), (b), (c), etc.
const QuestionPartSchema = z.object({
  questionText: z.string().describe("The question part text"),
  questionType: z
    .enum(["mcq", "short_answer", "long_answer"])
    .describe("Type of question"),
  options: z
    .array(z.string())
    .optional()
    .describe("Answer options for MCQ (exactly 4 options)"),
  correctAnswer: z
    .string()
    .describe("Correct answer: index for MCQ (0/1/2/3 as string), or full answer for short/long"),
  explanation: z
    .string()
    .describe("Explanation of why this answer is correct"),
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .describe("Question difficulty level"),
  markScheme: z
    .array(z.string())
    .describe("Mark scheme points for grading"),
  maxMark: z.number().describe("Maximum marks for this part"),
});

// Schema for a full question (stem + parts)
const QuestionGroupSchema = z.object({
  questionStem: z
    .string()
    .describe("Shared context, scenario, or passage for all parts of this question"),
  questions: z
    .array(QuestionPartSchema)
    .min(1)
    .max(4)
    .describe("Question parts (a), (b), etc. Most questions have 1-2 parts."),
});

const GenerateQuestionsResponseSchema = z.object({
  questionGroups: z.array(QuestionGroupSchema),
});

const SYSTEM_PROMPT = `You are an expert academic question writer who creates high-quality practice questions.

Your task is to generate practice questions based on provided source materials and instructions.

## INSTRUCTION HIERARCHY

Follow this priority order when determining how to generate questions:

1. **Agent instructions** (highest priority): Follow any specific instructions given about question types, quantity, difficulty, topics to focus on, or generation approach. These override default behaviours.

2. **Style reference questions** (if provided): When example questions are provided as a style reference, treat them as ground truth for:
   - Question structure and phrasing patterns
   - Mark allocations and distributions
   - Difficulty calibration
   - Types of questions to generate
   - Number of questions (match the reference set size unless agent instructions specify otherwise)
   - Mark scheme format and detail level

3. **Base instructions** (fallback): When no agent instructions or style references address a particular aspect, follow the guidelines below.

## UNDERSTANDING SOURCE MATERIALS

Source materials may serve different purposes:
- **Content source**: Material containing the knowledge to be tested (e.g., notes, textbook chapters, lectures)
- **Style reference**: Existing questions demonstrating the desired format, difficulty, and question styles to emulate

When both are provided, generate questions that test the content source while matching the style and format of the reference questions. Do not test content from style reference materials unless explicitly instructed.

## LATEX FORMATTING

For mathematics, chemistry, and physics questions, use LaTeX formatting for proper rendering of:
- Mathematical expressions and equations
- Chemical formulas and equations
- Physical quantities with units
- Fractions, exponents, subscripts, and special symbols

Surround LaTeX expressions with single dollar signs: $expression$

Examples:
- Quadratic formula: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
- Chemical equation: $2H_2 + O_2 \rightarrow 2H_2O$
- Physics notation: $F = ma$, $E = mc^2$, $v = \frac{d}{t}$
- Units: $9.8 \, m/s^2$, $6.02 \times 10^{23} \, mol^{-1}$

Use LaTeX whenever mathematical or scientific notation would improve clarity. Apply this formatting consistently in question text, options, correct answers, and mark schemes.

## BASE QUESTION GUIDELINES

Apply these when not overridden by agent instructions or style references:

### General Principles
- Questions should test understanding, not just memorization
- Ensure questions are unambiguous with clear correct answers
- Include sufficient context for students to understand what is being asked
- Vary question styles: definition, application, comparison, analysis, evaluation

### Difficulty Levels
- **Easy**: Direct recall, definitions, identification of key terms or concepts
- **Medium**: Application to scenarios, explanation of relationships, comparing concepts
- **Hard**: Analysis of complex situations, evaluation with justification, synthesis of multiple concepts

### Mark-to-Depth Calibration
- **1 mark**: Single fact, term, or brief identification
- **2 marks**: Brief explanation or two distinct points
- **3-4 marks**: Developed explanation with multiple points (approximately one point per mark)
- **5+ marks**: Comprehensive response requiring multiple developed points with elaboration, examples, or evaluation as appropriate

Mark schemes must have points totaling exactly the mark allocation.

## MATHEMATICAL AND SCIENTIFIC QUESTION VALIDATION

For mathematics, physics, and other quantitative questions, perform the following validation before finalising each question:

### Solvability Check
Verify the question is mathematically or scientifically solvable:
- Work through the problem yourself to confirm a solution exists
- Ensure integrals, derivatives, and equations can be evaluated using methods appropriate to the expected level
- Check that systems of equations are consistent and have solutions
- Verify physical scenarios obey relevant laws and constraints

### Common Issues to Detect and Avoid
- **Non-elementary solutions**: Integrals or equations requiring special functions, infinite series, or numerical methods when standard techniques are expected (e.g., $\int x e^{x^3} dx$ has no elementary antiderivative)
- **Typographical patterns that break solvability**: Mismatched exponents or coefficients that prevent standard substitutions (e.g., $x e^{x^3}$ instead of $x^2 e^{x^3}$ or $x e^{x^2}$)
- **Missing constraints**: Optimisation problems without bounded regions, or boundary conditions that allow unbounded solutions
- **Ill-posed problems**: Ambiguous variable ranges, undefined boundaries, or incomplete information required for a unique answer
- **Physical impossibilities**: Scenarios violating conservation laws, requiring negative masses, or producing imaginary results for real-world quantities
- **Dimensional inconsistencies**: Equations where units do not balance correctly

### If an Issue is Detected
- Reformulate the question to make it solvable
- Adjust coefficients, exponents, or constraints as needed
- Ensure the reformulated question still tests the intended concept
- Verify the corrected question has a clean, obtainable answer appropriate to the level

## BASE MCQ SPECIFICATIONS

Apply these when not overridden by agent instructions or style references:

- Provide exactly 4 options
- Do NOT include letters (A, B, C, D) in the option text
- **CRITICAL**: For MCQ questions, correctAnswer MUST be the index (0, 1, 2, or 3) of the correct option in the options array, NOT a letter
  - Example: If the second option is correct, correctAnswer should be "1" (not "B")
  - Example: If the first option is correct, correctAnswer should be "0" (not "A")
- All MCQ questions are worth 1 mark
- All options must be plausible and related to the topic being tested
- Distractors should represent common misconceptions or related concepts
- Avoid "all of the above," "none of the above," or combined options
- Avoid negative phrasing unless specifically testing exceptions
- Options should be similar in length and grammatical structure

### MCQ Example Format
Example:
  questionText: "What is the capital of France?"
  options: ["London", "Paris", "Berlin", "Madrid"]
  correctAnswer: "1"  // Index 1 because Paris is at position 1 in the array

## BASE WRITTEN QUESTION SPECIFICATIONS

Apply these when not overridden by agent instructions or style references:

- Use command words appropriate to the expected depth:
  - Define, State, Identify, List → lower-order thinking, fewer marks
  - Explain, Describe, Compare, Distinguish → mid-level thinking
  - Analyse, Evaluate, Discuss, Justify → higher-order thinking, more marks
- Mark schemes should list acceptable answers with mark allocation for each point
## MATHEMATICAL AND SCIENTIFIC QUESTION VALIDATION

For mathematics, physics, and other quantitative questions, perform the following validation before finalising each question:

### Solvability Check
Verify the question is mathematically or scientifically solvable:
- Work through the problem yourself to confirm a solution exists
- Ensure integrals, derivatives, and equations can be evaluated using methods appropriate to the expected level
- Check that systems of equations are consistent and have solutions
- Verify physical scenarios obey relevant laws and constraints

### Common Issues to Detect and Avoid
- **Non-elementary solutions**: Integrals or equations requiring special functions, infinite series, or numerical methods when standard techniques are expected (e.g., $\int x e^{x^3} dx$ has no elementary antiderivative)
- **Typographical patterns that break solvability**: Mismatched exponents or coefficients that prevent standard substitutions (e.g., $x e^{x^3}$ instead of $x^2 e^{x^3}$ or $x e^{x^2}$)
- **Missing constraints**: Optimisation problems without bounded regions, or boundary conditions that allow unbounded solutions
- **Ill-posed problems**: Ambiguous variable ranges, undefined boundaries, or incomplete information required for a unique answer
- **Physical impossibilities**: Scenarios violating conservation laws, requiring negative masses, or producing imaginary results for real-world quantities
- **Dimensional inconsistencies**: Equations where units do not balance correctly

### If an Issue is Detected
- Reformulate the question to make it solvable
- Adjust coefficients, exponents, or constraints as needed
- Ensure the reformulated question still tests the intended concept
- Verify the corrected question has a clean, obtainable answer appropriate to the level`;

/**
 * Generate practice questions from source content using AI
 * Returns QuestionGroup[] ready for storage and rendering
 */
export async function generateQuestions(
  sourceContent: string,
  sourceReferences: SourceReference[],
  options?: GenerateQuestionsOptions
): Promise<QuestionGroup[]> {
  const count = options?.count ?? 5;
  const instructions = options?.instructions;
  const baseId = options?.baseId ?? `practice-${Date.now()}`;

  const instructionsBlock = instructions
    ? `\nAdditional instructions: ${instructions}`
    : "";

  const { object } = await generateObject({
    model: fastModel,
    schema: GenerateQuestionsResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: `Generate ${count} practice questions (each with stem and 1-2 parts) based on the following content.
${instructionsBlock}

Source content:
${sourceContent.slice(0, 8000)}`,
  });

  // Convert AI output to QuestionGroup[] format
  const now = new Date().toISOString();

  return object.questionGroups.map((group, groupIdx) => {
    const groupId = groupIdx + 1;
    const groupLegacyId = `${baseId}-g${groupId}`;

    const questions: QuestionWithMarkingResult[] = group.questions.map((part, partIdx) => {
      const difficultyEnum =
        part.difficulty === "easy"
          ? QuestionDifficulty.EASY
          : part.difficulty === "hard"
            ? QuestionDifficulty.HARD
            : QuestionDifficulty.MEDIUM;

      return {
        id: partIdx + 1,
        legacyId: `${groupLegacyId}-${String.fromCharCode(97 + partIdx)}`,
        subLessonId: `${baseId}-sub-${groupId}`,
        correctAnswer: part.correctAnswer,
        createdAt: now,
        maxMark: part.maxMark,
        options: part.options || [],
        order: partIdx + 1,
        difficulty: difficultyEnum,
        markScheme: part.markScheme,
        questionGroupId: groupId,
        irtParameters: { a: 1, b: 0, c: 0.25 },
        strategy: {
          steps: [],
          feedback: part.explanation,
        },
        questionText: part.questionText,
        questionType: part.questionType,
        diagram: "",
        questionStem: group.questionStem,
        questionStemDiagram: "",
        updatedAt: now,
        lessonLegacyIds: [],
        isMarked: false,
        questionLegacyId: `${groupLegacyId}-${String.fromCharCode(97 + partIdx)}`,
      };
    });

    return {
      id: groupId,
      order: groupId,
      legacyId: groupLegacyId,
      questionStem: group.questionStem,
      questions,
    };
  });
}

// ============================================
// STREAMING IMPLEMENTATION
// ============================================

// Type for raw AI response group (before conversion)
interface RawQuestionGroup {
  questionStem?: string;
  questions?: Array<{
    questionText?: string;
    questionType?: "mcq" | "short_answer" | "long_answer";
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    difficulty?: "easy" | "medium" | "hard";
    markScheme?: string[];
    maxMark?: number;
  }>;
}

/**
 * Check if a raw question group has all required fields complete
 */
function isGroupComplete(group: RawQuestionGroup): boolean {
  if (!group?.questionStem || !group?.questions?.length) return false;
  return group.questions.every(
    (q) => q?.questionText && q?.correctAnswer && q?.questionType && q?.maxMark !== undefined
  );
}

/**
 * Convert raw AI output to QuestionGroup format
 */
function convertToQuestionGroup(
  group: RawQuestionGroup,
  groupIdx: number,
  baseId: string,
  now: string
): QuestionGroup {
  const groupId = groupIdx + 1;
  const groupLegacyId = `${baseId}-g${groupId}`;

  const questions: QuestionWithMarkingResult[] = (group.questions || []).map((part, partIdx) => {
    const difficultyEnum =
      part.difficulty === "easy"
        ? QuestionDifficulty.EASY
        : part.difficulty === "hard"
          ? QuestionDifficulty.HARD
          : QuestionDifficulty.MEDIUM;

    return {
      id: partIdx + 1,
      legacyId: `${groupLegacyId}-${String.fromCharCode(97 + partIdx)}`,
      subLessonId: `${baseId}-sub-${groupId}`,
      correctAnswer: part.correctAnswer || "",
      createdAt: now,
      maxMark: part.maxMark || 1,
      options: part.options || [],
      order: partIdx + 1,
      difficulty: difficultyEnum,
      markScheme: part.markScheme || [],
      questionGroupId: groupId,
      irtParameters: { a: 1, b: 0, c: 0.25 },
      strategy: {
        steps: [],
        feedback: part.explanation || "",
      },
      questionText: part.questionText || "",
      questionType: part.questionType || "short_answer",
      diagram: "",
      questionStem: group.questionStem || "",
      questionStemDiagram: "",
      updatedAt: now,
      lessonLegacyIds: [],
      isMarked: false,
      questionLegacyId: `${groupLegacyId}-${String.fromCharCode(97 + partIdx)}`,
    };
  });

  return {
    id: groupId,
    order: groupId,
    legacyId: groupLegacyId,
    questionStem: group.questionStem || "",
    questions,
  };
}

/**
 * Stream practice questions from source content using AI.
 * Yields individual QuestionGroup objects as they become complete during generation.
 */
export async function* generateQuestionsStream(
  sourceContent: string,
  options?: GenerateQuestionsOptions
): AsyncGenerator<QuestionGroup, void, unknown> {
  const count = options?.count ?? 5;
  const instructions = options?.instructions;
  const baseId = options?.baseId ?? `practice-${Date.now()}`;

  const instructionsBlock = instructions
    ? `\nAdditional instructions: ${instructions}`
    : "";

  const { partialObjectStream } = streamObject({
    model: fastModel,
    schema: GenerateQuestionsResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: `Generate ${count} practice questions (each with stem and 1-2 parts) based on the following content.
${instructionsBlock}

Source content:
${sourceContent.slice(0, 8000)}`,
  });

  let yieldedCount = 0;
  let lastGroups: RawQuestionGroup[] = [];
  const now = new Date().toISOString();

  for await (const partial of partialObjectStream) {
    const groups = (partial.questionGroups || []) as RawQuestionGroup[];

    // Only yield when NEXT group has started (model moved on)
    // This ensures we don't yield partial/incomplete content
    for (let i = yieldedCount; i < groups.length - 1; i++) {
      const group = groups[i];
      if (isGroupComplete(group)) {
        yield convertToQuestionGroup(group, i, baseId, now);
        yieldedCount++;
      }
    }

    lastGroups = groups;
  }

  // After stream ends, yield any remaining complete groups
  for (let i = yieldedCount; i < lastGroups.length; i++) {
    const group = lastGroups[i];
    if (isGroupComplete(group)) {
      yield convertToQuestionGroup(group, i, baseId, now);
    }
  }
}
