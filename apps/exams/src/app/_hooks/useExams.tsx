import { useQuery } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { Exam } from "@/app/types/types";
import { SubjectPapersResponse } from "./sidebar/response-types";

export const useExams = (subjectId: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.subjectExams(subjectId),
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const response = await curriculumApiV2Client.get<SubjectPapersResponse>(
        `/subjects/${subjectId}/papers`
      );
      const exams: Exam[] = response.data.data.map((exam) => ({
        id: exam.id,
        legacyId: `exam-${exam.id}`,
        title: `Series ${exam.series}`,
        series: exam.series,
        examBoard: exam.papers[0]?.exam_board || "",
        course: "",
        papers: exam.papers.map((paper) => ({
          id: paper.id,
          legacyId: paper.legacy_id,
          title: `Paper ${paper.number}`,
          date: paper.date || "",
          number: paper.number,
          examBoard: paper.exam_board,
          course: "",
          questionGroups: [],
        })),
      }));
      return exams;
    },
    staleTime: 30 * 60 * 1000, // 30m
    gcTime: 6 * 60 * 60 * 1000,
  });

  return {
    isLoading,
    error: (error as Error) || null,
    data: data ?? null,
    refetch,
  };
};
