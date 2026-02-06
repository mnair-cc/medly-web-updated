import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { SubjectWithUnits } from "@/app/types/types";
import {
  SubjectCurriculumResponse,
  SubjectProgressResponse,
  LessonProgressData,
} from "./useSubjectTypes";

// Fetch curriculum (structure only)
async function fetchSubjectCurriculum(
  subjectLegacyId: string,
  gcseHigher?: boolean
): Promise<SubjectWithUnits> {
  const curriculumResponse =
    await curriculumApiV2Client.get<SubjectCurriculumResponse>(
      `/subjects/${subjectLegacyId}?include_curriculum=true&include_question_data=true`
    );

  const curriculum = curriculumResponse.data.data;

  // Map structure only; progress fields will be filled later (or default to 0)
  const units = curriculum.units.map((unit) => ({
    id: unit.id,
    legacyId: unit.legacy_id,
    title: unit.title,
    topics: unit.topics.map((topic) => ({
      id: topic.id,
      legacyId: topic.legacy_id,
      title: topic.title,
      lessons: topic.lessons.map((lesson) => ({
        id: lesson.id,
        legacyId: lesson.legacy_id,
        title: lesson.title,
        totalQuestions: lesson.question_legacy_ids?.length ?? 0,
        questionLegacyIds: lesson.question_legacy_ids ?? [],
        // progress fields default to 0 until merged
        answeredQuestions: 0,
        answeredQuestionLegacyIds: [],
        totalMarksAwarded: 0,
        totalMarksPossible: 0,
        totalMarksMissed: 0,
      })),
      // aggregates default to 0; may remain unused by consumers
      totalQuestions: 0,
      answeredQuestions: 0,
      totalMarksAwarded: 0,
      totalMarksPossible: 0,
      totalMarksMissed: 0,
    })),
    // aggregates default to 0
    totalQuestions: 0,
    answeredQuestions: 0,
    totalMarksAwarded: 0,
    totalMarksPossible: 0,
    totalMarksMissed: 0,
  }));

  return {
    id: curriculum.id,
    legacyId: curriculum.legacy_id,
    title: curriculum.title,
    examBoard: curriculum.exam_board,
    course: curriculum.course,
    gcseHigher,
    exams: [],
    units,
    // subject-level aggregates default to 0
    totalQuestions: 0,
    answeredQuestions: 0,
    totalMarksAwarded: 0,
    totalMarksPossible: 0,
    totalMarksMissed: 0,
  } as SubjectWithUnits;
}

// Fetch progress map for lessons
async function fetchSubjectProgress(
  subjectLegacyId: string
): Promise<Record<string, LessonProgressData>> {
  const progressResponse =
    await curriculumApiV2Client.get<SubjectProgressResponse>(
      `/users/me/subjects/${subjectLegacyId}/progress`
    );

  return progressResponse.data.data.lessons || {};
}

// Merge curriculum with progress
function mergeCurriculumWithProgress(
  curriculum: SubjectWithUnits,
  progressLessons: Record<string, LessonProgressData> | null | undefined
): SubjectWithUnits {
  if (!progressLessons) return curriculum;

  const mergedUnits = curriculum.units.map((unit) => ({
    ...unit,
    topics: unit.topics.map((topic) => ({
      ...topic,
      lessons: topic.lessons.map((lesson) => {
        const p = progressLessons[lesson.legacyId];
        const answeredQuestionLegacyIds = p?.answered_question_legacy_ids ?? [];

        // Calculate totalQuestions as count of unique question IDs
        // from both curriculum questionLegacyIds and progress answeredQuestionLegacyIds
        const curriculumQuestions = lesson.questionLegacyIds ?? [];
        const allQuestionIds = new Set([
          ...curriculumQuestions,
          ...answeredQuestionLegacyIds,
        ]);
        const totalQuestions = allQuestionIds.size;

        if (!p) {
          return {
            ...lesson,
            totalQuestions,
          };
        }

        return {
          ...lesson,
          totalQuestions,
          answeredQuestions: p.answered_question_legacy_ids?.length ?? 0,
          answeredQuestionLegacyIds,
          masteryScore: p.mastery_score ?? 0,
        };
      }),
    })),
  }));

  return { ...curriculum, units: mergedUnits } as SubjectWithUnits;
}

export const useSubject = (subjectLegacyId: string, gcseHigher?: boolean) => {
  // Structure query (long-lived cache)
  const {
    data: curriculum,
    error: curriculumError,
    isLoading: isCurriculumLoading,
    refetch: refetchStructure,
  } = useQuery({
    queryKey: queryKeys.subjectCurriculum(subjectLegacyId, gcseHigher),
    queryFn: () => fetchSubjectCurriculum(subjectLegacyId, gcseHigher),
    enabled: !!subjectLegacyId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });

  // Progress query (fresh, independent)
  const {
    data: progressLessons,
    error: progressError,
    isLoading: isProgressLoading,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: queryKeys.subjectProgress(subjectLegacyId),
    queryFn: () => fetchSubjectProgress(subjectLegacyId),
    enabled: !!subjectLegacyId,
    staleTime: 10 * 60 * 1000, // 10 minutes in cache
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: true,
  });

  // Merge when either updates; structure renders immediately without waiting for progress
  const merged = useMemo(() => {
    if (!curriculum) return null;
    return mergeCurriculumWithProgress(curriculum, progressLessons);
  }, [curriculum, progressLessons]);

  // Only treat curriculum errors as blocking
  if (progressError) {
    // Non-blocking: surface in console for observability
    console.warn(
      "Progress load failed for subject:",
      subjectLegacyId,
      progressError
    );
  }

  return {
    data: merged,
    error: curriculumError ?? null,
    isLoading: isCurriculumLoading,
    // Keep existing refetch name; prefer to refresh progress quickly
    refetch: refetchProgress,
    // Expose additional controls without breaking existing callers
    refetchStructure,
    isProgressLoading,
    // Expose raw progress map so other hooks (e.g., Insights) can reuse it
    progressLessons,
  };
};
