import { useState, useEffect, useRef } from "react";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import type {
  University,
  UniversityListResponse,
} from "../_types/universityApi";

interface UseUniversitySearchOptions {
  debounceMs?: number;
  limit?: number;
}

export function useUniversitySearch(
  searchTerm: string,
  options: UseUniversitySearchOptions = {}
) {
  const { debounceMs = 80, limit = 20 } = options;
  const trimmedSearch = searchTerm.trim();

  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);

    const fetchUniversities = async () => {
      abortControllerRef.current = new AbortController();

      try {
        const params: Record<string, string | number> = { limit };
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await curriculumApiV2Client.get<UniversityListResponse>(
          "/universities",
          {
            params,
            signal: abortControllerRef.current.signal,
          }
        );

        setUniversities(response.data.data);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "CanceledError") {
          return; // Ignore cancelled requests
        }
        setError(err instanceof Error ? err : new Error("Failed to search universities"));
        setUniversities([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Skip debounce for empty search (initial load)
    if (!trimmedSearch) {
      fetchUniversities();
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    const timeoutId = setTimeout(fetchUniversities, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [trimmedSearch, debounceMs, limit]);

  return { universities, isLoading, error };
}
