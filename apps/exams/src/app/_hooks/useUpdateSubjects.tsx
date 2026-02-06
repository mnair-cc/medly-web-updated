import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserSubject } from "../types/types";
import { toast } from "sonner";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import {
  UpdateUserSubjectsRequest,
  UpdateUserSubjectPartialRequest,
} from "./sidebar/request-types";
import { queryKeys } from "../_lib/query-keys";

export const useUpdateSubjects = () => {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const updateSubjects = async (subjects: UserSubject[]) => {
    try {
      setIsSaving(true);

      // Transform to API request format (snake_case)
      const requestBody: UpdateUserSubjectsRequest = {
        subjects: subjects.map((subject) => ({
          subject_legacy_id: subject.legacyId,
          current_grade: subject.currentGrade || null,
          target_grade: subject.targetGrade || null,
          weak_topics: subject.weakTopics,
          gcse_higher: subject.gcseHigher ?? null,
          prior_qualification_grade: subject.priorQualificationGrade || null,
        })),
      };

      await curriculumApiV2Client.put("/users/me/subjects", requestBody);

      // Invalidate user subjects cache
      queryClient.invalidateQueries({ queryKey: queryKeys.userSubjects });

      return true;
    } catch (error) {
      console.error("Error updating subjects:", error);
      toast.error("Failed to update subjects");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSubjectGrades = async (
    subjectLegacyId: string,
    data: {
      currentGrade?: string | null;
      targetGrade?: string | null;
      priorQualificationGrade?: string | null;
      gcseHigher?: boolean | null;
    }
  ) => {
    try {
      setIsSaving(true);

      const requestBody: UpdateUserSubjectPartialRequest = {
        current_grade: data.currentGrade ?? null,
        target_grade: data.targetGrade ?? null,
        prior_qualification_grade: data.priorQualificationGrade ?? null,
        gcse_higher: data.gcseHigher ?? null,
      };

      await curriculumApiV2Client.patch(
        `/users/me/subjects/${subjectLegacyId}`,
        requestBody
      );

      // Invalidate user subjects cache
      queryClient.invalidateQueries({ queryKey: queryKeys.userSubjects });

      return true;
    } catch (error) {
      console.error("Error updating subject grades:", error);
      toast.error("Failed to update subject grades");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    updateSubjects,
    updateSubjectGrades,
    isSaving,
  };
};
