import { auth } from "@/auth";
import { curriculumApiFetch, CurriculumApiError } from "@/app/_lib/server/curriculum-api";
import { MockRegistrationData } from "@/app/types/types";

interface MockRegistrationResponse {
  data: MockRegistrationData;
}

export async function fetchMockRegistration(): Promise<MockRegistrationData | null> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      return null;
    }

    const response = await curriculumApiFetch<MockRegistrationResponse>(
      "/api/v2/mocks/register",
      {
        token: session.databaseApiAccessToken,
      }
    );

    return response.data;
  } catch (error) {
    if (error instanceof CurriculumApiError && error.statusCode === 404) {
      return null;
    }
    console.error("Error fetching mock registration server-side:", error);
    return null;
  }
}
