"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser } from "./UserProvider";

interface PlanContextType {
  hasActivePlan: boolean;
  isLoading: boolean;
  error: string | null;
  refetchPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, refetchUser } = useUser();

  // Plan is active if it's not expired and has one of the valid statuses
  const subscription = user?.subscription;
  const validStatuses = [
    "active",
    "monthly",
    "block",
    "blockAnnual",
    "blockAnnual2027",
    "complete",
    "$rc_monthly",
  ];
  const isNotExpired =
    !subscription?.end || subscription.end * 1000 > Date.now();
  const hasActivePlan =
    isNotExpired && validStatuses.includes(subscription?.status || "");

  return (
    <PlanContext.Provider
      value={{
        hasActivePlan,
        isLoading: loading,
        error: error || null,
        refetchPlan: refetchUser,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function useHasActivePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("useHasActivePlan must be used within a PlanProvider");
  }
  return context;
}
