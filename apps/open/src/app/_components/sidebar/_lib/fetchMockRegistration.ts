import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";

interface ApiSelectedExam {
  exam_id: string;
  board?: string;
  series?: string;
  subject: string;
  subject_id?: string;
}

interface ApiMockRegistrationData {
  is_registered: boolean;
  candidate_id?: string;
  registered_at?: string;
  selected_exams?: ApiSelectedExam[];
}

interface MockRegistrationResponse {
  data: ApiMockRegistrationData;
}

export async function fetchMockRegistration(): Promise<{
  isRegistered: boolean;
}> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      return { isRegistered: false };
    }

    const response = await curriculumApiFetch<MockRegistrationResponse>(
      "/api/v2/mocks/register",
      {
        token: session.databaseApiAccessToken,
      }
    );

    const reg = response.data;
    const isRegistered = Boolean(
      reg?.is_registered ||
        (reg?.selected_exams && reg.selected_exams.length > 0)
    );
    return { isRegistered };
  } catch {
    return { isRegistered: false };
  }
}
