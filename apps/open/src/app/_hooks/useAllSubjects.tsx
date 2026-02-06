import {
  CourseType,
  CourseWithExamBoards,
  ExamBoardWithSubjects,
  Subject,
} from "@/app/types/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";

export interface GetSubjectsResponse {
  id: number;
  legacy_id: string;
  title: string;
  exam_board: string;
  course: string;
}
interface ApiSubjectsResponse {
  data: GetSubjectsResponse[];
}

function processSubjectData(
  data: GetSubjectsResponse[],
): CourseWithExamBoards[] {
  const courseMap = new Map<string, Map<string, Subject[]>>();

  data.forEach((subject) => {
    if (!courseMap.has(subject.course)) {
      courseMap.set(subject.course, new Map());
    }
    const examBoardMap = courseMap.get(subject.course)!;

    if (!examBoardMap.has(subject.exam_board)) {
      examBoardMap.set(subject.exam_board, []);
    }

    examBoardMap.get(subject.exam_board)!.push({
      id: subject.id,
      legacyId: subject.legacy_id,
      title: subject.title,
    });
  });

  // Convert to Course[] structure
  const courses: CourseWithExamBoards[] = [];
  courseMap.forEach((examBoardMap, courseName) => {
    const examBoards: ExamBoardWithSubjects[] = [];
    examBoardMap.forEach((subjects, examBoardName) => {
      examBoards.push({
        name: examBoardName,
        subjects: subjects,
      });
    });

    courses.push({
      name: courseName,
      examBoards,
    });
  });

  return courses;
}

export const useAllSubjects = (course?: CourseType) => {
  const query = useMemo(
    () => (course ? `?course=${course}&is_web=true` : `?is_web=true`),
    [course],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.allSubjects(course),
    queryFn: async () => {
      try {
        const response = await curriculumApiV2Client.get<ApiSubjectsResponse>(
          `/subjects${query}`,
        );
        const processedData = processSubjectData(response.data.data);
        return processedData
          .filter((c) => c.name !== "AP (Advanced Placement)")
          .map((courseData) => ({
            ...courseData,
            examBoards: courseData.examBoards.map((examBoard) => ({
              ...examBoard,
              subjects: examBoard.subjects,
            })),
          }));
      } catch (err) {
        toast.error("Error fetching subjects");
        throw err;
      }
    },
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 6 * 60 * 60 * 1000, // 6h
    retry: 1,
  });

  return { isLoading, error: (error as Error) || null, data: data ?? null };
};
