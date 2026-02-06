import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = "medlyChatTutorialCompleted";

function readFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

function writeToStorage(completed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, completed.toString());
  } catch {
    // ignore write errors
  }
}

// In-memory singleton store for same-tab synchronization
let globalHasCompleted: boolean | null = null;

export const useMedlyChatTutorial = () => {
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    // Use global state if available, otherwise read from storage
    if (globalHasCompleted !== null) {
      return globalHasCompleted;
    }
    const fromStorage = readFromStorage();
    globalHasCompleted = fromStorage;
    return fromStorage;
  });

  // Sync with storage on mount
  useEffect(() => {
    const fromStorage = readFromStorage();
    if (fromStorage !== hasCompleted) {
      setHasCompleted(fromStorage);
      globalHasCompleted = fromStorage;
    }
  }, [hasCompleted]);

  const markTutorialComplete = useCallback(() => {
    setHasCompleted(true);
    globalHasCompleted = true;
    writeToStorage(true);
  }, []);

  const resetTutorial = useCallback(() => {
    setHasCompleted(false);
    globalHasCompleted = false;
    writeToStorage(false);
  }, []);

  // isTutorial should be true if the tutorial has NOT been completed yet
  const isTutorial = !hasCompleted;

  return {
    hasCompleted,
    isTutorial,
    markTutorialComplete,
    resetTutorial,
  };
};
