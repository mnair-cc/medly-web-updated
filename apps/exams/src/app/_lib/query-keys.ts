/**
 * Centralized query key definitions for React Query.
 * All query keys should be defined here to ensure consistency
 * and make cache invalidation straightforward.
 */
export const queryKeys = {
  // User
  user: ["user"] as const,
  userSubjects: ["user-subjects"] as const,

  // Mocks
  mocksData: ["mocks-data"] as const,
  mockResults: ["mock-results"] as const,

  // Lessons
  lessonChat: (lessonId: string) => ["lesson-chat", lessonId] as const,
  lesson: (lessonId: string) => ["lesson", lessonId] as const,

  // Subjects
  subjectCurriculum: (subjectId: string, gcseHigher?: boolean) =>
    ["subject-curriculum", subjectId, gcseHigher] as const,
  subjectProgress: (subjectId: string) =>
    ["subject-progress", subjectId] as const,
  subjectInsights: (subjectId: string) =>
    ["subject-insights", subjectId] as const,
  allSubjects: (course?: string) => ["subjects", course ?? "all"] as const,

  // Exams
  subjectExams: (subjectId: string) => ["exams", subjectId] as const,
} as const;
