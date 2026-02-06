import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";

interface UserSubject {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  gcseHigher?: boolean;
  priorQualificationGrade?: string;
  weakTopics?: string[];
}

interface ApiUserSubject {
  id: number;
  legacy_id: string;
  title: string;
  course: string;
  exam_board: string;
  current_grade?: string;
  target_grade?: string;
  gcse_higher?: boolean;
  prior_qualification_grade?: string;
  weak_topics?: string[];
}

interface UserSubjectsResponse {
  data: ApiUserSubject[];
}

export async function fetchUserSubjects(): Promise<UserSubject[]> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      return [];
    }

    const response = await curriculumApiFetch<UserSubjectsResponse>(
      "/api/v2/users/me/subjects",
      {
        token: session.databaseApiAccessToken,
      }
    );

    // Transform snake_case API response to camelCase for client
    const transformedData: UserSubject[] = response.data.map((subject) => ({
      id: subject.id,
      legacyId: subject.legacy_id,
      title: subject.title,
      course: subject.course,
      examBoard: subject.exam_board,
      currentGrade: subject.current_grade,
      targetGrade: subject.target_grade,
      gcseHigher: subject.gcse_higher,
      priorQualificationGrade: subject.prior_qualification_grade,
      weakTopics: subject.weak_topics,
    }));

    return transformedData;
  } catch (error) {
    console.error("Error fetching user subjects server-side:", error);
    return [];
  }
}
