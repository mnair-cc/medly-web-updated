"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { AITask, AITaskContextValue } from "../_types/aiTask";
import AITaskLoader from "../_components/AITaskLoader";

const AITaskContext = createContext<AITaskContextValue | null>(null);

export function useAITask(): AITaskContextValue {
  const context = useContext(AITaskContext);
  if (!context) {
    throw new Error("useAITask must be used within AITaskProvider");
  }
  return context;
}

export function useAITaskSafe(): AITaskContextValue | null {
  return useContext(AITaskContext);
}

interface AITaskProviderProps {
  children: React.ReactNode;
}

export function AITaskProvider({ children }: AITaskProviderProps) {
  const [activeTask, setActiveTask] = useState<AITask | null>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state for portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Clear auto-dismiss timer
  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  // Start auto-dismiss timer (10 seconds for done/error states)
  const startAutoDismissTimer = useCallback(() => {
    clearAutoDismissTimer();
    autoDismissTimerRef.current = setTimeout(() => {
      setActiveTask(null);
    }, 10000);
  }, [clearAutoDismissTimer]);

  // Start a new task
  const startTask = useCallback(
    (config: {
      label: string;
      totalSteps?: number;
      undoCallback?: () => Promise<void> | void;
    }): string => {
      clearAutoDismissTimer();

      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newTask: AITask = {
        id: taskId,
        label: config.label,
        status: "running",
        progress: config.totalSteps
          ? { current: 0, total: config.totalSteps }
          : undefined,
        undoCallback: config.undoCallback,
        createdAt: Date.now(),
      };

      setActiveTask(newTask);
      return taskId;
    },
    [clearAutoDismissTimer]
  );

  // Update progress
  const updateProgress = useCallback(
    (taskId: string, current: number, total?: number) => {
      setActiveTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        return {
          ...prev,
          progress: {
            current,
            total: total ?? prev.progress?.total ?? current,
          },
        };
      });
    },
    []
  );

  // Complete a task
  const completeTask = useCallback(
    (taskId: string) => {
      setActiveTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        return { ...prev, status: "done" };
      });
      startAutoDismissTimer();
    },
    [startAutoDismissTimer]
  );

  // Fail a task
  const failTask = useCallback(
    (taskId: string, error: string) => {
      setActiveTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        return { ...prev, status: "error", error };
      });
      startAutoDismissTimer();
    },
    [startAutoDismissTimer]
  );

  // Dismiss a task
  const dismissTask = useCallback(
    (taskId: string) => {
      clearAutoDismissTimer();
      setActiveTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        return null;
      });
    },
    [clearAutoDismissTimer]
  );

  // Undo a task
  const undoTask = useCallback(
    async (taskId: string) => {
      const task = activeTask;
      if (!task || task.id !== taskId || !task.undoCallback) return;

      clearAutoDismissTimer();

      try {
        await task.undoCallback();
      } finally {
        setActiveTask(null);
      }
    },
    [activeTask, clearAutoDismissTimer]
  );

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    if (activeTask) {
      dismissTask(activeTask.id);
    }
  }, [activeTask, dismissTask]);

  // Handle undo
  const handleUndo = useCallback(async () => {
    if (activeTask) {
      await undoTask(activeTask.id);
    }
  }, [activeTask, undoTask]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearAutoDismissTimer();
    };
  }, [clearAutoDismissTimer]);

  const contextValue = useMemo<AITaskContextValue>(
    () => ({
      activeTask,
      startTask,
      updateProgress,
      completeTask,
      failTask,
      dismissTask,
      undoTask,
    }),
    [
      activeTask,
      startTask,
      updateProgress,
      completeTask,
      failTask,
      dismissTask,
      undoTask,
    ]
  );

  return (
    <AITaskContext.Provider value={contextValue}>
      {children}
      {isMounted &&
        activeTask &&
        createPortal(
          <AITaskLoader
            task={activeTask}
            onDismiss={handleDismiss}
            onUndo={handleUndo}
          />,
          document.body
        )}
    </AITaskContext.Provider>
  );
}
