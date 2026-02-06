import { useState, useEffect, useCallback, useRef } from "react";
import { curriculumApiClient } from "../_lib/utils/axiosHelper";
import { toast } from "sonner";
import { GetSubjectWithCurriculumResponse } from "../types/responseTypes";
import { SubjectWithUnits, Exam, Paper } from "../types/types";

export const useExamDatesForSubjects = (subjectLegacyIds: string[]) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SubjectWithUnits[]>([]);
  const previousIdsRef = useRef<string>("");

  const fetchExamDates = useCallback(async (ids: string[]) => {
    // Only fetch if we have valid subject IDs
    if (!ids || ids.length === 0) {
      setIsLoading(false);
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create query params for the subject legacy IDs
      const params = new URLSearchParams();
      ids.forEach((id) => {
        params.append("subject_legacy_ids", id);
      });

      const response = await curriculumApiClient.get<
        GetSubjectWithCurriculumResponse[]
      >(`/curriculum/exam-dates?${params.toString()}`);

      // Transform the response data to match the expected format
      const transformedData: SubjectWithUnits[] = response.data.map(
        (subject) => ({
          id: subject.id,
          legacyId: subject.legacy_id,
          title: subject.title,
          examBoard: subject.exam_board,
          course: subject.course,
          exams: subject.exams.map(
            (exam): Exam => ({
              id: exam.id,
              legacyId: `exam-${exam.id}`, // API doesn't provide legacy_id for exams
              title: exam.exam_type,
              series: exam.exam_type,
              papers: exam.papers.map(
                (paper): Paper => ({
                  id: paper.id,
                  legacyId: paper.legacy_id,
                  number: paper.number,
                  date: paper.date,
                  questionGroups: [], // Not needed for exam dates display
                  duration: undefined, // Not provided by this API
                })
              ),
            })
          ),
          units: [], // No units expected in the response
          totalQuestions: 0, // Not needed for exam dates
          answeredQuestions: 0, // Not needed for exam dates
          totalMarksAwarded: 0, // Not needed for exam dates
          totalMarksPossible: 0, // Not needed for exam dates
          totalMarksMissed: 0, // Not needed for exam dates
        })
      );

      setData(transformedData);
    } catch (error) {
      toast.error("Error fetching exam dates");
      setError(error as Error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentIds = subjectLegacyIds.join(",");

    // Only fetch if the IDs have actually changed
    if (currentIds !== previousIdsRef.current) {
      previousIdsRef.current = currentIds;
      fetchExamDates(subjectLegacyIds);
    }
  }, [subjectLegacyIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoading, error, data };
};
