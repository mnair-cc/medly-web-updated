import { generateText } from "ai";
import { defaultModel } from "./client";

export interface GenerateSummaryOptions {
  instructions?: string; // Additional instructions (focus, format, length, etc.)
}

const SYSTEM_PROMPT = `You are an expert at creating clear, structured summaries of academic content.

Your task is to generate helpful summaries that aid learning and retention.

Guidelines:
1. Identify the main topics and key concepts
2. Organize information logically with clear structure
3. Use markdown formatting (headers, lists, bold for key terms)
4. Keep summaries focused and informative
5. Include key definitions and relationships between concepts
6. Highlight important facts, formulas, or processes
7. Use bullet points for lists of related items`;

/**
 * Generate a summary from source content using AI
 */
export async function generateSummary(
  sourceContent: string,
  options?: GenerateSummaryOptions
): Promise<string> {
  const instructions = options?.instructions;

  const instructionsBlock = instructions
    ? `\nAdditional instructions: ${instructions}`
    : "";

  const { text } = await generateText({
    model: defaultModel,
    system: SYSTEM_PROMPT,
    prompt: `Create a comprehensive summary of the following content.
${instructionsBlock}

Source content:
${sourceContent.slice(0, 8000)}`,
  });

  return text;
}
