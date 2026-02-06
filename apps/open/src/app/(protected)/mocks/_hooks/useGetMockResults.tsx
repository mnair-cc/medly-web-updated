import { useQuery } from "@tanstack/react-query";
import { InsightsData, PaperInsight, SubjectInsight } from "../_types/types";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { MockInsightsResponse } from "@/app/types/responseTypes";
import { queryKeys } from "@/app/_lib/query-keys";

interface MocksResponse {
  isRegistered: boolean;
  candidateId?: string;
}

const useGetMockResults = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.mockResults,
    queryFn: async () => {
      // Fetch registration data (for candidateId) and insights in parallel
      const [mocksResponse, insightsResponse] = await Promise.all([
        curriculumApiV2Client.get<{ data: MocksResponse }>(`/mocks`),
        curriculumApiV2Client.get<{ data: MockInsightsResponse }>(
          `/mocks/insights`
        ),
      ]);

      const candidateId = mocksResponse.data.data.candidateId || "";
      const {
        paperInsights,
        subjectInsights,
        awards,
      }: {
        paperInsights: PaperInsight[];
        subjectInsights: SubjectInsight[];
        awards: string[];
      } = insightsResponse.data.data;

      const timeSpentInMinutes = paperInsights.reduce(
        (acc: number, paperInsight: PaperInsight) =>
          acc + paperInsight.timeSpentInMinutes,
        0
      );

      paperInsights.sort((a: PaperInsight, b: PaperInsight) => b.mark - a.mark);
      subjectInsights.sort(
        (a: SubjectInsight, b: SubjectInsight) => b.totalMark - a.totalMark
      );
      const weakestTopics = subjectInsights
        .flatMap((subjectInsight) => subjectInsight.weakestTopics)
        .sort((a, b) => {
          const scoreA = parseInt(a.score);
          const scoreB = parseInt(b.score);
          return scoreA - scoreB;
        });
      const strongestTopics = subjectInsights
        .flatMap((subjectInsight) => subjectInsight.strongestTopics)
        .sort((a, b) => {
          const scoreA = parseInt(a.score);
          const scoreB = parseInt(b.score);
          return scoreB - scoreA;
        });

      const insightsData: InsightsData = {
        paperInsights,
        totalStudents: 2143,
        timeSpentInMinutes,
        weakestTopics,
        strongestTopics,
        subjectInsights,
        candidateId,
        awards,
      };

      return insightsData;
    },
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
  };
};

export default useGetMockResults;
