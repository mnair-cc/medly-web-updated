import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import type {
  MocksData,
  MockExam,
  MockPaper,
} from "@/app/_components/sidebar/_lib/mocks.types";

// Re-export types for convenience
export type { MocksData, MockExam, MockPaper };

/** @deprecated Use queryKeys.mocksData from @/app/_lib/query-keys instead */
export const MOCKS_DATA_QUERY_KEY = queryKeys.mocksData;

// Response type from API
interface MocksResponse {
  data: MocksData;
}

// Client-side fetch function for React Query
async function fetchMocksData(): Promise<MocksData | null> {
  try {
    const response = await curriculumApiV2Client.get<MocksResponse>("/mocks");
    return response.data.data;
  } catch (error) {
    console.warn("Failed to fetch mocks data:", error);
    return null;
  }
}

export const useMocksData = (initialData?: MocksData | null) => {
  const queryClient = useQueryClient();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.mocksData,
    queryFn: fetchMocksData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: initialData ?? undefined,
  });

  // Invalidate the cache (e.g., after completing a mock paper)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mocksData });
  };

  return {
    mocksData: data ?? null,
    isLoading,
    error: error ?? null,
    refetch,
    invalidate,
  };
};
