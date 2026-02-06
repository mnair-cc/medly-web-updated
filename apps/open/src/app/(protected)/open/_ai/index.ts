// AI Functions - Vercel AI SDK
// Each function is a standalone AI call triggered by user actions

export { extractSyllabus } from "./extractSyllabus";
export { suggestFolders } from "./suggestFolders";
export { suggestTitle } from "./suggestTitle";
export {
  generateQuestions,
  type GenerateQuestionsOptions,
} from "./generateQuestions";
export {
  generateFlashcards,
  toFlashcardFormat,
  type GeneratedFlashcard,
  type GenerateFlashcardsOptions,
} from "./generateFlashcards";
export {
  generateSummary,
  type GenerateSummaryOptions,
} from "./generateSummary";
