"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type GettingStartedStepId =
  | "select-subject-lesson"
  | "complete-question"
  | "send-message"
  | "switch-mode";

export const GETTING_STARTED_STEP_IDS: GettingStartedStepId[] = [
  "select-subject-lesson",
  "complete-question",
  "send-message",
  "switch-mode",
];

export interface GettingStartedStepConfigItem {
  id: GettingStartedStepId;
  text: string;
}

export const GETTING_STARTED_STEPS_CONFIG: GettingStartedStepConfigItem[] = [
  { id: "select-subject-lesson", text: "Select a subject lesson" },
  { id: "complete-question", text: "Complete your first question" },
  { id: "send-message", text: "Send a message to Medly" },
  { id: "switch-mode", text: "Open the textbook" },
];

type ProgressRecord = Partial<Record<GettingStartedStepId, boolean>>;

const STORAGE_KEY = "gettingStartedStepsProgress";

function readFromStorage(): ProgressRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressRecord;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeToStorage(record: ProgressRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore write errors
  }
}

// In-memory singleton store for same-tab synchronization without global events
let globalProgress: ProgressRecord | null = null;
const subscribers = new Set<(p: ProgressRecord) => void>();

function getProgress(): ProgressRecord {
  if (!globalProgress) {
    globalProgress = readFromStorage();
  }
  return globalProgress;
}

function updateProgress(updated: ProgressRecord) {
  globalProgress = updated;
  writeToStorage(updated);
  subscribers.forEach((notify) => {
    try {
      notify(updated);
    } catch {
      // ignore subscriber errors
    }
  });
}

export function useGettingStartedProgress() {
  const [progress, setProgress] = useState<ProgressRecord>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load once on mount
  useEffect(() => {
    setProgress(getProgress());
    setIsHydrated(true);
    const subscriber = (p: ProgressRecord) => setProgress(p);
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  const setStepCompletion = useCallback(
    (stepId: GettingStartedStepId, isCompleted: boolean) => {
      const current = getProgress();
      const updated = { ...current, [stepId]: isCompleted };
      updateProgress(updated);
    },
    []
  );

  const markComplete = useCallback(
    (stepId: GettingStartedStepId) => setStepCompletion(stepId, true),
    [setStepCompletion]
  );

  const reset = useCallback(() => {
    updateProgress({});
  }, []);

  const completedCount = useMemo(
    () => GETTING_STARTED_STEP_IDS.filter((id) => Boolean(progress[id])).length,
    [progress]
  );

  const totalCount = GETTING_STARTED_STEP_IDS.length;

  return {
    progress,
    completedCount,
    totalCount,
    markComplete,
    setStepCompletion,
    reset,
    isHydrated,
  };
}
