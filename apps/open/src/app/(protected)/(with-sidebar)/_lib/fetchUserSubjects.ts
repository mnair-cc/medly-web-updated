import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";

interface UserSubject {
  id: number;
  legacyId: string;
  title: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  gcseHigher?: boolean;
  priorQualificationGrade?: string;
  weakTopics?: string[];
}

interface UserSubjectsResponse {
  data: UserSubject[];
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

    return response.data;
  } catch (error) {
    console.error("Error fetching user subjects server-side:", error);
    return [];
  }
}
