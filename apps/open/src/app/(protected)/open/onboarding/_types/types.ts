import type { ExtractedSyllabus } from "./syllabus";
import type { FlowType } from "../../_types/triggers";

export enum QuestionType {
  TEXT = "text",
  AVATAR = "avatar",
  MULTIPLE_CHOICE = "multiple-choice",
  SEARCHABLE_SELECT = "searchable-select",
  FLOW_SELECT = "flow-select",
}

export type Question = {
  fieldName: string;
  title?: string;
  type: QuestionType;
  options?: string[];
  values?: string[] | number[];
  placeholder?: string;
};

export enum StepType {
  QUESTION = "question",
  MOTIVATIONAL = "motivational",
  MOTIVATIONAL_FADED = "motivational-faded",
  MOTIVATIONAL_MEDLY = "motivational-medly",
  INFO = "info",
  INFO_DYNAMIC = "info-dynamic",
  MODULE_NAME_COLOR = "module-name-color",
  CAROUSEL = "carousel",
  LOADING_REDIRECT = "loading-redirect",
  // Legacy (kept for backwards compat)
  MODULE_SETUP = "module-setup",
  MODULE_LOADING = "module-loading",
  MODULE_RESULT = "module-result",
  COURSE_UPLOAD = "course-upload",
}

// Module color options
export const MODULE_COLORS = [
  { name: "lime", hex: "#B7F652" },
  { name: "teal", hex: "#46E790" },
  { name: "blue", hex: "#1FADFF" },
  { name: "purple", hex: "#AA64F5" },
  { name: "pink", hex: "#F6B0CE" },
] as const;

export type ModuleColorName = (typeof MODULE_COLORS)[number]["name"];

// Carousel slide for step 12
export interface CarouselSlide {
  title: string;
  description: string;
  imagePath?: string;
}

export type Step = {
  type?: StepType;
  title?: string;
  description?: string;
  hint?: string;
  questions?: Question[];
  primaryButtonText?: string;
  secondaryButtonText?: string; // For skip buttons
  shouldCountInProgressBar?: boolean;
  imagePlaceholder?: boolean; // For info pages (deprecated, use imagePath)
  imagePath?: string; // Path to image for info pages
  // For dynamic info steps
  dynamicContentKey?: "universityStudentCount";
  // For carousel steps
  carouselKey?: "intro" | "flowType";
};

export type OpenOnboardingData = {
  userName: string;
  avatar: string;
  focusArea: string;
  university: string;
  universityId: number | null;
  universityLogo: string | null;
  flowType: FlowType | "";
};

export type ModuleOnboardingData = {
  moduleName: string;
  moduleColor: string;
};

// Re-export FlowType for convenience
export type { FlowType };

// Legacy type (kept for backwards compat)
export type LegacyModuleOnboardingData = {
  moduleName?: string;
  syllabusFile?: File;
  extractedSyllabus?: ExtractedSyllabus;
  syllabusStoragePath?: string;
};
