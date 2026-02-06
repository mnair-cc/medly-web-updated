import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";
import type {
  MocksData,
  MockExam,
  MockPaper,
  CohortDistribution,
} from "./mocks.types";

// Re-export types for backward compatibility with server-side imports
export type { MocksData, MockExam, MockPaper, CohortDistribution };

interface MocksResponse {
  data: MocksData;
}

export async function fetchMocksData(): Promise<MocksData | null> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      return null;
    }

    const response = await curriculumApiFetch<MocksResponse>("/api/v2/mocks", {
      token: session.databaseApiAccessToken,
    });

    // API already returns camelCase (Pydantic uses aliases)
    return response.data;
  } catch (error) {
    console.error("Error fetching mocks data server-side:", error);
    return null;
  }
}
