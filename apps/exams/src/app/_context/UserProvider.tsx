"use client";

import React, { createContext, useContext, ReactNode, SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApiV2Client } from "../_lib/utils/axiosHelper";
import { queryKeys } from "../_lib/query-keys";
import { UserDetails } from "../types/types";
import { PlanProvider } from "./PlanProvider";

// Define types for user context
interface UserContextType {
  user: UserDetails | null;
  setUser: React.Dispatch<SetStateAction<UserDetails | null>>;
  loading: boolean;
  error?: string;
  refetchUser: () => Promise<void>;
  updateUser: (data: { userName?: string; year?: number }) => Promise<boolean>;
}

// Create a Context for user data
const UserContext = createContext<UserContextType | null>(null);

// Provider component props
interface UserProviderProps {
  children: ReactNode;
  initialUser?: UserDetails | null;
}

// Provider component
export const UserProvider: React.FC<UserProviderProps> = ({
  children,
  initialUser,
}) => {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const response = await curriculumApiV2Client.get("/users/me");
      return response.data.data as UserDetails;
    },
    enabled: !initialUser, // Skip fetch if server-provided
    initialData: initialUser ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const error = queryError ? "Failed to fetch user" : undefined;

  const refetchUser = async () => {
    await refetch();
  };

  const setUser: React.Dispatch<SetStateAction<UserDetails | null>> = (
    updater
  ) => {
    queryClient.setQueryData<UserDetails | null>(queryKeys.user, (prev) =>
      typeof updater === "function" ? updater(prev ?? null) : updater
    );
  };

  const updateUser = async (data: { userName?: string; year?: number }) => {
    try {
      const response = await curriculumApiV2Client.put("/users/me", {
        userName: data.userName,
        year: data.year,
      });

      // Update cache with the full response data
      if (response.data.data) {
        queryClient.setQueryData(queryKeys.user, response.data.data);
      }

      return true;
    } catch (error: unknown) {
      console.error("Failed to update user:", error);

      // Extract error message from API response
      let errorMessage = "Failed to update user";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      // Re-throw the error so the component can handle it
      throw new Error(errorMessage);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: user ?? null,
        setUser,
        loading,
        error,
        refetchUser,
        updateUser,
      }}
    >
      <PlanProvider>{children}</PlanProvider>
    </UserContext.Provider>
  );
};

// Custom hook to use user data
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
