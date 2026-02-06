"use client";

import type { OpenPlatformUser } from "@/db";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ProfileUpdateData {
  userName?: string;
  avatar?: string;
}

interface MOUserContextValue {
  user: OpenPlatformUser;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
}

const MOUserContext = createContext<MOUserContextValue | null>(null);

interface MOUserProviderProps {
  children: ReactNode;
  user: OpenPlatformUser;
}

export function MOUserProvider({
  children,
  user: initialUser,
}: MOUserProviderProps) {
  const [user, setUser] = useState<OpenPlatformUser>(initialUser);

  const updateProfile = useCallback(
    async (data: ProfileUpdateData) => {
      const response = await fetch("/api/open/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      // Optimistically update local state
      setUser((prev) => ({
        ...prev,
        data: {
          ...(prev.data as Record<string, unknown>),
          ...data,
        },
      }));
    },
    []
  );

  return (
    <MOUserContext.Provider value={{ user, updateProfile }}>
      {children}
    </MOUserContext.Provider>
  );
}

export function useMOUser(): OpenPlatformUser {
  const context = useContext(MOUserContext);
  if (!context) {
    throw new Error("useMOUser must be used within a MOUserProvider");
  }
  return context.user;
}

export function useMOUserContext(): MOUserContextValue {
  const context = useContext(MOUserContext);
  if (!context) {
    throw new Error("useMOUserContext must be used within a MOUserProvider");
  }
  return context;
}
