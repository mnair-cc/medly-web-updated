"use client";

import { createContext, useContext } from "react";
import type { MedlyMondaysFeature } from "@/app/_lib/medlyMondays/utils";

/**
 * Context for Medly Mondays feature.
 * The feature value is fetched server-side and provided to all client components.
 */
const MedlyMondaysContext = createContext<MedlyMondaysFeature>("none");

export function MedlyMondaysProvider({
  feature,
  children,
}: {
  feature: MedlyMondaysFeature;
  children: React.ReactNode;
}) {
  return (
    <MedlyMondaysContext.Provider value={feature}>
      {children}
    </MedlyMondaysContext.Provider>
  );
}

/**
 * Get the current Medly Mondays feature from context.
 * Returns "none" if not within the provider (safe default).
 */
export function useMedlyMondaysFeature(): MedlyMondaysFeature {
  return useContext(MedlyMondaysContext);
}
