// Extracted syllabus structure from AI parsing

export interface ExtractedSyllabus {
  moduleName: string;
  moduleCode?: string;
  description?: string;
  instructor?: string;
  weeks: ExtractedWeek[];
  assignments: ExtractedAssignment[];
  readings?: ExtractedReading[];
  gradingBreakdown?: GradingComponent[];
  learningOutcomes?: string[]; // Syllabus-level learning outcomes
}

export interface ExtractedWeek {
  weekNumber: number;
  title: string;
  description?: string;
  items?: WeekItem[];
  learningOutcomes?: string[]; // Week-level learning outcomes
}

export type WeekItemType = "lecture" | "seminar" | "lab" | "recitation" | "reading";

export interface WeekItem {
  title: string;
  type: WeekItemType;
}

export interface ExtractedAssignment {
  title: string;
  description?: string;
  dueDate?: string; // ISO date (YYYY-MM-DD) if provided
  weighting?: number; // percentage
  type?: "essay" | "exam" | "presentation" | "project" | "quiz";
}

export interface ExtractedReading {
  title: string;
  citation: string; // Raw citation string to preserve original format
  type?: "textbook" | "article" | "chapter";
  required?: boolean;
}

export interface GradingComponent {
  component: string;
  weight: number;
}

// API response types
export interface ExtractSyllabusResponse {
  status: "success" | "error";
  data?: ExtractedSyllabus;
  error?: string;
}

export interface CreateStructureRequest {
  syllabus: ExtractedSyllabus;
  syllabusStoragePath?: string;
}

export interface CreateStructureResponse {
  status: "success" | "error";
  collectionId?: string;
  error?: string;
}
