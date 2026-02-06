export type AITaskStatus = "running" | "done" | "error";

export interface AITaskProgress {
  current: number;
  total: number;
}

export interface AITask {
  id: string;
  label: string;
  status: AITaskStatus;
  progress?: AITaskProgress;
  error?: string;
  undoCallback?: () => Promise<void> | void;
  createdAt: number;
}

export interface AITaskContextValue {
  activeTask: AITask | null;
  startTask: (config: {
    label: string;
    totalSteps?: number;
    undoCallback?: () => Promise<void> | void;
  }) => string;
  updateProgress: (taskId: string, current: number, total?: number) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, error: string) => void;
  dismissTask: (taskId: string) => void;
  undoTask: (taskId: string) => Promise<void>;
}
