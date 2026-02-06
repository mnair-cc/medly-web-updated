import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";
import { InsightsData } from "../../_types/types";

// Response from the API (matches backend MockInsightsData)
interface MockInsightsResponse {
  data: {
    paperInsights: InsightsData["paperInsights"];
    subjectInsights: InsightsData["subjectInsights"];
    awards: string[];
    candidateId: string | null;
    timeSpentInMinutes: number | null;
    weakestTopics: InsightsData["weakestTopics"];
    strongestTopics: InsightsData["strongestTopics"];
  };
}

const TOTAL_STUDENTS = 2143; // Hardcoded as per requirements

export async function fetchMockInsights(): Promise<InsightsData | null> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      return null;
    }

    const response = await curriculumApiFetch<MockInsightsResponse>(
      "/api/v2/mocks/insights",
      {
        token: session.databaseApiAccessToken,
      }
    );

    const data = response.data;

    // Transform to InsightsData format
    return {
      paperInsights: data.paperInsights,
      subjectInsights: data.subjectInsights,
      awards: data.awards,
      candidateId: data.candidateId || "",
      timeSpentInMinutes: data.timeSpentInMinutes || 0,
      weakestTopics: data.weakestTopics,
      strongestTopics: data.strongestTopics,
      totalStudents: TOTAL_STUDENTS,
    };
  } catch (error) {
    console.error("Error fetching mock insights server-side:", error);
    return null;
  }
}
