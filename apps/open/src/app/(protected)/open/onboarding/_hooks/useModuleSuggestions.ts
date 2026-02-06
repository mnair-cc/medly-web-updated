import { useState, useEffect, useRef } from "react";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import type { Module, ModuleListResponse } from "../_types/universityApi";

interface UseModuleSuggestionsOptions {
  debounceMs?: number;
  limit?: number;
}

export function useModuleSuggestions(
  searchTerm: string,
  filters: {
    universityId: number | null;
    courseId: number | null;
    year: number | null;
  },
  options: UseModuleSuggestionsOptions = {}
) {
  const { debounceMs = 80, limit = 50 } = options;
  const trimmedSearch = searchTerm.trim();

  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Need at least some filter to search
    const hasFilters = filters.universityId || filters.courseId || filters.year;
    if (!hasFilters && !trimmedSearch) {
      setModules([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      abortControllerRef.current = new AbortController();

      try {
        const params: Record<string, string | number> = { limit };

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }
        if (filters.courseId) {
          params.course_id = filters.courseId;
        }
        if (filters.year) {
          params.year = filters.year;
        }

        const response = await curriculumApiV2Client.get<ModuleListResponse>(
          "/modules",
          {
            params,
            signal: abortControllerRef.current.signal,
          }
        );

        setModules(response.data.data);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "CanceledError") {
          return; // Ignore cancelled requests
        }
        setError(err instanceof Error ? err : new Error("Failed to search modules"));
        setModules([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [trimmedSearch, filters.universityId, filters.courseId, filters.year, debounceMs, limit]);

  return { modules, isLoading, error };
}
