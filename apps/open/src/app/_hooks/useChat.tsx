import { useQuery } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { UserLessonData } from "@/app/types/types";

export const useChat = (lessonId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.lessonChat(lessonId),
    queryFn: async () => {
      const response = await curriculumApiV2Client.get(
        `/lessons/${lessonId}/chat`
      );
      return response.data.data as UserLessonData;
    },
    enabled: !!lessonId,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
  };
};
