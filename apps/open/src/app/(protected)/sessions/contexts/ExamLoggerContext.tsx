"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/app/_lib/firebase/client";
import { examLogger } from "../services/exam-logger";
import { SessionType } from "@/app/(protected)/sessions/types";
import { nextApiClient } from "@/app/_lib/utils/axiosHelper";

interface ExamLoggerContextType {
  logEnterQuestion: (questionLegacyId: string) => Promise<void>;
  logExitQuestion: (questionLegacyId: string) => Promise<void>;
  logMarkForReview: (questionLegacyId: string) => Promise<void>;
  logUnmarkForReview: (questionLegacyId: string) => Promise<void>;
  logSetAnswer: (questionLegacyId: string, answer: string) => Promise<void>;
  logRuleOutOption: (questionLegacyId: string, option: string) => Promise<void>;
  logUndoRuleOutOption: (
    questionLegacyId: string,
    option: string
  ) => Promise<void>;
  logAddDecoration: (
    questionLegacyId: string,
    selectedText: string,
    decorationProperties?: Record<string, unknown>
  ) => Promise<void>;
  logDeleteDecoration: (
    questionLegacyId: string,
    selectedText: string,
    decorationProperties?: Record<string, unknown>
  ) => Promise<void>;
  flush: () => Promise<void>;
  isMockSession: boolean;
}

const ExamLoggerContext = createContext<ExamLoggerContextType | null>(null);

interface ExamLoggerProviderProps {
  children: ReactNode;
  subjectId: string;
  paperId: string;
  sessionType: SessionType;
}

export function ExamLoggerProvider({
  children,
  subjectId,
  paperId,
  sessionType,
}: ExamLoggerProviderProps) {
  const { data: session } = useSession();
  const isMockSession = sessionType === SessionType.MockSession;

  // Sign in to Firebase Auth client-side when session is available
  useEffect(() => {
    const signInToFirebase = async () => {
      if (session?.user?.id) {
        try {
          // Check if already signed in to Firebase
          if (auth.currentUser?.uid === session.user.providerUserId) {
            return; // Already signed in
          }

          // Fetch custom token from our API
          const response = await nextApiClient.get("/auth/firebase-token");
          if (response.status !== 200) {
            throw new Error("Failed to get Firebase token");
          }

          const { customToken } = response.data;

          // Sign in to Firebase with the custom token
          await signInWithCustomToken(auth, customToken);
        } catch (error) {
          console.error("Failed to sign in to Firebase client:", error);
        }
      }
    };

    signInToFirebase();
  }, [session?.user?.id, session?.user?.providerUserId]);

  // Initialize the logger with user ID and paper ID when session is available
  useEffect(() => {
    if (session?.user?.id && subjectId && paperId) {
      examLogger.setContext(session.user.id, subjectId, paperId);
    }
  }, [session?.user?.id, subjectId, paperId]);

  // Cleanup effect to flush remaining logs on unmount
  useEffect(() => {
    return () => {
      // Flush any remaining logs when component unmounts
      examLogger.cleanup().catch(console.error);
    };
  }, []);

  const contextValue: ExamLoggerContextType = {
    logEnterQuestion: (questionLegacyId: string) => {
      if (isMockSession) {
        return examLogger.logEnterQuestion(questionLegacyId);
      }
      return Promise.resolve();
    },
    logExitQuestion: (questionLegacyId: string) => {
      if (isMockSession) {
        return examLogger.logExitQuestion(questionLegacyId);
      }
      return Promise.resolve();
    },
    logMarkForReview: (questionLegacyId: string) => {
      if (isMockSession) {
        return examLogger.logMarkForReview(questionLegacyId);
      }
      return Promise.resolve();
    },
    logUnmarkForReview: (questionLegacyId: string) => {
      if (isMockSession) {
        return examLogger.logUnmarkForReview(questionLegacyId);
      }
      return Promise.resolve();
    },
    logSetAnswer: (questionLegacyId: string, answer: string) => {
      if (isMockSession) {
        return examLogger.logSetAnswer(questionLegacyId, answer);
      }
      return Promise.resolve();
    },
    logRuleOutOption: (questionLegacyId: string, option: string) => {
      if (isMockSession) {
        return examLogger.logRuleOutOption(questionLegacyId, option);
      }
      return Promise.resolve();
    },
    logUndoRuleOutOption: (questionLegacyId: string, option: string) => {
      if (isMockSession) {
        return examLogger.logUndoRuleOutOption(questionLegacyId, option);
      }
      return Promise.resolve();
    },
    logAddDecoration: (
      questionLegacyId: string,
      selectedText: string,
      decorationProperties?: Record<string, unknown>
    ) => {
      if (isMockSession) {
        return examLogger.logAddDecoration(
          questionLegacyId,
          selectedText,
          decorationProperties
        );
      }
      return Promise.resolve();
    },
    logDeleteDecoration: (
      questionLegacyId: string,
      selectedText: string,
      decorationProperties?: Record<string, unknown>
    ) => {
      if (isMockSession) {
        return examLogger.logDeleteDecoration(
          questionLegacyId,
          selectedText,
          decorationProperties
        );
      }
      return Promise.resolve();
    },
    flush: () => examLogger.flush(),
    isMockSession,
  };

  return (
    <ExamLoggerContext.Provider value={contextValue}>
      {children}
    </ExamLoggerContext.Provider>
  );
}

export function useExamLoggerContext(): ExamLoggerContextType {
  const context = useContext(ExamLoggerContext);
  if (!context) {
    // Return no-op functions if context is not available (outside provider)
    return {
      logEnterQuestion: () => Promise.resolve(),
      logExitQuestion: () => Promise.resolve(),
      logMarkForReview: () => Promise.resolve(),
      logUnmarkForReview: () => Promise.resolve(),
      logSetAnswer: () => Promise.resolve(),
      logRuleOutOption: () => Promise.resolve(),
      logUndoRuleOutOption: () => Promise.resolve(),
      logAddDecoration: () => Promise.resolve(),
      logDeleteDecoration: () => Promise.resolve(),
      flush: () => Promise.resolve(),
      isMockSession: false,
    };
  }
  return context;
}
