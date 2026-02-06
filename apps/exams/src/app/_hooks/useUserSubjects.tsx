import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { SubjectWithUnits, UserSubject } from "@/app/types/types";
import axios from "axios";
import { UserSubjectsResponse } from "./sidebar/response-types";

/** @deprecated Use queryKeys.userSubjects from @/app/_lib/query-keys instead */
export const USER_SUBJECTS_QUERY_KEY = queryKeys.userSubjects;

// Fetch function extracted for React Query
async function fetchUserSubjects(): Promise<SubjectWithUnits[]> {
  try {
    const userSubjectResponse =
      await curriculumApiV2Client.get<UserSubjectsResponse>(
        "/users/me/subjects"
      );

    // Transform to internal format without fetching curriculum data
    // Curriculum data will be fetched on-demand by useSubject when needed
    const subjects: SubjectWithUnits[] = userSubjectResponse.data.data.map(
      (subjectData) => {
        return {
          id: 0, // Will be populated when curriculum is fetched
          legacyId: subjectData.legacy_id,
          title: subjectData.title,
          examBoard: subjectData.exam_board,
          course: subjectData.course,
          currentGrade: subjectData.current_grade ?? undefined,
          targetGrade: subjectData.target_grade ?? undefined,
          weakTopics: subjectData.weak_topics,
          gcseHigher: subjectData.gcse_higher ?? undefined,
          priorQualificationGrade:
            subjectData.prior_qualification_grade ?? undefined,
          units: [], // Empty until curriculum is fetched
          exams: [], // Empty until curriculum is fetched
          totalQuestions: 0,
          answeredQuestions: 0,
          totalMarksPossible: 0,
          totalMarksAwarded: 0,
          totalMarksMissed: 0,
        } as SubjectWithUnits;
      }
    );

    return subjects;
  } catch (err) {
    // If it's a 404, treat it as empty subjects list
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

export const useUserSubjects = (initialData?: SubjectWithUnits[]) => {
  const queryClient = useQueryClient();

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.userSubjects,
    queryFn: fetchUserSubjects,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData,
  });

  // Update subjects optimistically (for use after API updates)
  const updateSubjects = useCallback(
    (updatedSubjects: UserSubject[]) => {
      queryClient.setQueryData<SubjectWithUnits[]>(
        queryKeys.userSubjects,
        (currentSubjects) => {
          if (!currentSubjects) return [];

          return updatedSubjects.map((updated) => {
            // Try to find existing subject to preserve units/exams/progress data
            const existing = currentSubjects.find(
              (s) => s.legacyId === updated.legacyId
            );

            return {
              id: updated.id || existing?.id || 0,
              legacyId: updated.legacyId,
              title: updated.title,
              examBoard: updated.examBoard,
              course:
                ("course" in updated && updated.course) ||
                existing?.course ||
                "",
              currentGrade:
                updated.currentGrade === "0"
                  ? undefined
                  : updated.currentGrade || undefined,
              targetGrade:
                updated.targetGrade === "0"
                  ? undefined
                  : updated.targetGrade || undefined,
              weakTopics: updated.weakTopics || [],
              gcseHigher: updated.gcseHigher,
              priorQualificationGrade: updated.priorQualificationGrade,
              // Preserve existing curriculum/progress data
              units: existing?.units || [],
              exams: existing?.exams || [],
              totalQuestions: existing?.totalQuestions || 0,
              answeredQuestions: existing?.answeredQuestions || 0,
              totalMarksPossible: existing?.totalMarksPossible || 0,
              totalMarksAwarded: existing?.totalMarksAwarded || 0,
              totalMarksMissed: existing?.totalMarksMissed || 0,
            } as SubjectWithUnits;
          });
        }
      );
    },
    [queryClient]
  );

  // Update a single subject's grades (for grade updates)
  const updateSubjectGrades = useCallback(
    (
      subjectLegacyId: string,
      updates: {
        currentGrade?: string | null;
        targetGrade?: string | null;
        priorQualificationGrade?: string | null;
        gcseHigher?: boolean | null;
      }
    ) => {
      queryClient.setQueryData<SubjectWithUnits[]>(
        queryKeys.userSubjects,
        (currentSubjects) => {
          if (!currentSubjects) return [];

          return currentSubjects.map((subject) =>
            subject.legacyId === subjectLegacyId
              ? {
                  ...subject,
                  currentGrade: updates.currentGrade || undefined,
                  targetGrade: updates.targetGrade || undefined,
                  priorQualificationGrade:
                    updates.priorQualificationGrade || undefined,
                  gcseHigher: updates.gcseHigher ?? undefined,
                }
              : subject
          );
        }
      );
    },
    [queryClient]
  );

  return {
    isLoading,
    error: error ?? null,
    data: data ?? [],
    refetch,
    updateSubjects,
    updateSubjectGrades,
  };
};
