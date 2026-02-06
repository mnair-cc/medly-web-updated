"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { getAuth, User } from "firebase/auth";
import { auth as firebaseAuth } from "@/app/_lib/firebase/client";
import { identifyUser } from "../_lib/posthog/analytics";
import { AuthProviderOptions } from "../types/types";

declare global {
  interface Window {
    posthog?: any;
  }
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (provider: AuthProviderOptions, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const { data: session, status } = useSession(); // NextAuth session
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      setIsAuthenticated(!!token);
    };

    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });

    checkAuth();

    return () => unsubscribe();
  }, [session]);

  // Identify user in PostHog when they authenticate
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const deviceInfo = {
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        language: window.navigator.language,
        vendor: window.navigator.vendor,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        deviceType: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(
          window.navigator.userAgent
        )
          ? "mobile"
          : "desktop",
      };

      const userProperties = {
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        ...deviceInfo,
      };

      // Server-side identify for backend tracking
      identifyUser(session.user.id, userProperties);

      // Client-side identify for autocapture attribution
      if (typeof window !== "undefined" && window.posthog) {
        window.posthog.identify(session.user.id, userProperties);
      }
    }
  }, [status, session?.user?.id]);

  const login = async (provider: AuthProviderOptions, token: string) => {
    if (
      provider === AuthProviderOptions.GOOGLE ||
      provider === AuthProviderOptions.APPLE
    ) {
      await signIn(provider);
    } else if (provider === AuthProviderOptions.CREDENTIALS) {
      await signIn("credentials", {
        token,
        redirect: false,
      });
    }

    setIsAuthenticated(true);
    router.push("/dashboard");
  };

  const logout = async () => {
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
    await signOut({
      redirect: false,
    });
    await firebaseAuth.signOut();
    setFirebaseUser(null);

    // Reset PostHog to prevent attribution to previous user
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.reset();
    }

    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user: firebaseUser, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
