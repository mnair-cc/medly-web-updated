"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  curriculumApiClient,
  curriculumApiV2Client,
} from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";

export interface KnowledgeModelLessonData {
  lesson_id: string;
  mu: number;
  sigma: number;
  p_mastery: number;
  mastery_tier: number;
  rank: number;
}

export interface KnowledgeUpdateRequest {
  lesson_store: { [lesson_id: string]: KnowledgeModelLessonData };
  lesson_ids: string[];
  marks: number;
  max_marks: number;
  n_lessons?: number;
}

export interface KnowledgeUpdateResponse {
  lesson_store: { [lesson_id: string]: KnowledgeModelLessonData };
  next_n_lessons: KnowledgeModelLessonData[];
  error?: string;
}

interface UseKnowledgeModelProps {
  lessonId?: string;
  subjectId?: string;
  onUpdateComplete?: (result: KnowledgeUpdateResponse) => void;
  onUpdateError?: (error: string) => void;
}

export const useKnowledgeModel = ({
  lessonId,
  subjectId,
  onUpdateComplete,
  onUpdateError,
}: UseKnowledgeModelProps = {}) => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateResult, setLastUpdateResult] =
    useState<KnowledgeUpdateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateKnowledgeModel = useCallback(
    async (
      request: KnowledgeUpdateRequest,
      questionData?: {
        lessonId: string;
        questionId: string;
        userMark: number;
        maxMark: number;
      }
    ) => {
      if (
        !request.lesson_store ||
        !request.lesson_ids ||
        request.lesson_ids.length === 0
      ) {
        console.log("📋 Invalid knowledge model update request");
        return;
      }

      setIsUpdating(true);
      setError(null);

      try {
        // New single-call flow: compute + persist on the server
        if (!lessonId) {
          console.warn("Missing lessonId for KM update");
          return null;
        }

        const body = {
          lessonIds: request.lesson_ids,
          userMark: request.marks,
          markMax: request.max_marks,
          questionLegacyId: questionData?.questionId,
          activityHistory: questionData
            ? [
                {
                  questionLegacyId: questionData.questionId,
                  userMark: questionData.userMark,
                  markMax: questionData.maxMark,
                },
              ]
            : [],
        };

        const resp = await curriculumApiV2Client.post<{
          data: {
            knowledgeModel: {
              mu: number;
              sigma: number;
              pMastery: number;
              masteryTier: number;
              rank: number;
            };
            updatedLessons: string[];
          };
        }>(`/lessons/${lessonId}/knowledge-model`, body);

        // Convert to legacy KnowledgeUpdateResponse shape for compatibility
        const km = resp.data.data.knowledgeModel;
        const converted: KnowledgeUpdateResponse = {
          lesson_store: {
            [lessonId]: {
              lesson_id: lessonId,
              mu: km.mu,
              sigma: km.sigma,
              p_mastery: km.pMastery,
              mastery_tier: km.masteryTier,
              rank: km.rank,
            },
          },
          next_n_lessons: [],
        };

        setLastUpdateResult(converted);

        // Invalidate subject progress cache if subjectId is available
        if (subjectId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.subjectProgress(subjectId),
          });
        }

        if (onUpdateComplete) onUpdateComplete(converted);

        return converted;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Knowledge model update failed";
        setError(errorMessage);

        // Call the error callback if provided
        if (onUpdateError) {
          onUpdateError(errorMessage);
        }

        // Don't throw the error to prevent uncaught promise warnings
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [lessonId, subjectId, onUpdateComplete, onUpdateError, queryClient]
  );

  const clearUpdate = useCallback(() => {
    setLastUpdateResult(null);
    setError(null);
  }, []);

  return {
    updateKnowledgeModel,
    isUpdating,
    lastUpdateResult,
    error,
    clearUpdate,
  };
};
