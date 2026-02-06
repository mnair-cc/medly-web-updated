export enum QuestionType {
  TEXT = "text",
  AVATAR = "avatar",
  MULTIPLE_CHOICE = "multiple-choice",
}

export type Question = {
  fieldName: string;
  title?: string;
  type: QuestionType;
  options?: string[];
  values?: string[] | number[];
  placeholder?: string;
  min?: number;
  max?: number;
  note?: string;
};

export enum StepType {
  QUESTION = "question",
  EXAM_DATES = "exam-dates",
  SUBJECTS = "subjects",
  SECRETS = "secrets",
  SECRETS_FADED = "secrets-faded",
  SECRETS_MEDLY = "secrets-medly",
}

export type Step = {
  type?: StepType;
  title?: string;
  subtitle?: string;
  description?: string;
  hint?: string;
  questions?: Question[];
  primaryButtonText?: string;
  secondaryButtonText?: string;
  shouldCountInProgressBar?: boolean;
};

export type OnboardingSubject = {
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  gcseHigher?: boolean; // For GCSE science subjects only
};

export type OnboardingData = {
  userName: string;
  avatar: string;
  focusArea: string;
  source: string;
  year: number;
  parentEmail: string;
  parentEmailMarketingOptOut: boolean;
  selectedSubjects: OnboardingSubject[];
  hasCompletedOnboarding: boolean;
};
