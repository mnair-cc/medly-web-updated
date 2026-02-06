import { useQuery } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { LessonData } from "@/app/types/types";

interface LessonApiResponse {
  data: {
    id: number;
    legacy_id: string;
    title: string;
    textbook_content: string | null;
  };
}

export const useLesson = (lessonId?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.lesson(lessonId!),
    queryFn: async () => {
      const response = await curriculumApiV2Client.get<LessonApiResponse>(
        `/lessons/${lessonId}`
      );

      return {
        id: response.data.data.id,
        legacyId: response.data.data.legacy_id,
        title: response.data.data.title,
        textbookContent: response.data.data.textbook_content || "",
      } as LessonData;
    },
    enabled: !!lessonId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - lesson content rarely changes
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  });

  return {
    isLoading,
    error: error as Error | null,
    data: data ?? null,
  };
};
