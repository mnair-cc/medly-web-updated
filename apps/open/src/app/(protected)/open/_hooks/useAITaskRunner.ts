"use client";

import { useCallback } from "react";
import { useAITask } from "../_context/AITaskProvider";

interface TaskConfig {
  label: string;
  totalSteps?: number;
  undoCallback?: () => Promise<void> | void;
}

type UpdateProgressFn = (current: number, total?: number) => void;
type TaskExecutor<T> = (updateProgress: UpdateProgressFn) => Promise<T>;

interface UseAITaskRunnerReturn {
  runTask: <T>(
    config: TaskConfig,
    executor: TaskExecutor<T>
  ) => Promise<T | undefined>;
}

export function useAITaskRunner(): UseAITaskRunnerReturn {
  const { startTask, updateProgress, completeTask, failTask } = useAITask();

  const runTask = useCallback(
    async <T>(
      config: TaskConfig,
      executor: TaskExecutor<T>
    ): Promise<T | undefined> => {
      const taskId = startTask({
        label: config.label,
        totalSteps: config.totalSteps,
        undoCallback: config.undoCallback,
      });

      const progressUpdater: UpdateProgressFn = (current, total) => {
        updateProgress(taskId, current, total);
      };

      try {
        const result = await executor(progressUpdater);
        completeTask(taskId);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        failTask(taskId, errorMessage);
        return undefined;
      }
    },
    [startTask, updateProgress, completeTask, failTask]
  );

  return { runTask };
}
