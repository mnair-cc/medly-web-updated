import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "@/app/_lib/firebase/client";

export interface ExamLog {
  paperId: string;
  eventName:
    | "enter_question"
    | "exit_question"
    | "mark_for_review"
    | "unmark_for_review"
    | "set_answer"
    | "rule_out_option"
    | "undo_rule_out_option"
    | "add_decoration"
    | "delete_decoration";
  timestamp: Date;
  properties: Record<string, unknown>;
}

class ExamLogger {
  private userId: string | null = null;
  private subjectId: string | null = null;
  private paperId: string | null = null;
  private logQueue: ExamLog[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10; // Flush when queue reaches this size
  private readonly BATCH_INTERVAL = 3000; // Flush every 3 seconds

  setContext(userId: string, subjectId: string, paperId: string) {
    this.userId = userId;
    this.subjectId = subjectId;
    this.paperId = paperId;
  }

  async logEnterQuestion(questionId: string): Promise<void> {
    await this.queueLogAction("enter_question", {
      questionId,
    });
  }

  async logExitQuestion(questionId: string): Promise<void> {
    await this.queueLogAction("exit_question", {
      questionId,
    });
  }

  async logMarkForReview(questionId: string): Promise<void> {
    await this.queueLogAction("mark_for_review", {
      questionId,
    });
  }

  async logUnmarkForReview(questionId: string): Promise<void> {
    await this.queueLogAction("unmark_for_review", {
      questionId,
    });
  }

  async logSetAnswer(questionId: string, answer: string): Promise<void> {
    await this.queueLogAction("set_answer", {
      questionId,
      answer,
    });
  }

  async logRuleOutOption(questionId: string, option: string): Promise<void> {
    await this.queueLogAction("rule_out_option", {
      questionId,
      option,
    });
  }

  async logUndoRuleOutOption(
    questionId: string,
    option: string
  ): Promise<void> {
    await this.queueLogAction("undo_rule_out_option", {
      questionId,
      option,
    });
  }

  async logAddDecoration(
    questionId: string,
    selectedText: string,
    decorationProperties?: Record<string, unknown>
  ): Promise<void> {
    await this.queueLogAction("add_decoration", {
      questionId,
      selectedText,
      ...decorationProperties,
    });
  }

  async logDeleteDecoration(
    questionId: string,
    selectedText: string,
    decorationProperties?: Record<string, unknown>
  ): Promise<void> {
    await this.queueLogAction("delete_decoration", {
      questionId,
      selectedText,
      ...decorationProperties,
    });
  }

  // Public method to manually flush the queue
  async flush(): Promise<void> {
    await this.flushQueue();
  }

  private async queueLogAction(
    eventName: ExamLog["eventName"],
    properties: ExamLog["properties"]
  ): Promise<void> {
    if (!this.userId || !this.paperId) {
      console.warn("ExamLogger: userId or paperId not set, skipping log");
      return;
    }

    const logData: ExamLog = {
      paperId: this.paperId,
      eventName,
      timestamp: new Date(),
      properties,
    };

    // Add to queue instead of immediately writing
    this.logQueue.push(logData);

    // Start batch timer if not already running
    this.startBatchTimer();

    // Flush immediately if batch size reached
    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.flushQueue();
    }
  }

  private startBatchTimer(): void {
    // Clear existing timer if running (this resets the cooldown)
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(async () => {
      await this.flushQueue();
    }, this.BATCH_INTERVAL);
  }

  private async flushQueue(): Promise<void> {
    if (this.logQueue.length === 0) return;

    // Clear the timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get the current queue and clear it
    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      // Use Firestore batch for efficient writes
      const batch = writeBatch(db);
      const logsRef = collection(
        db,
        "users",
        this.userId!,
        "subjectsWeb",
        this.subjectId!,
        "papers",
        this.paperId!,
        "logs"
      );

      logsToFlush.forEach((logData) => {
        const docRef = doc(logsRef); // Generate new doc reference
        batch.set(docRef, logData);
      });

      await batch.commit();
    } catch (error) {
      console.error("ExamLogger: Failed to flush logs:", error);
      // Re-add failed logs to the front of the queue for retry
      this.logQueue.unshift(...logsToFlush);
    }
  }

  // Clean up method to flush remaining logs (call on component unmount)
  async cleanup(): Promise<void> {
    await this.flushQueue();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// Export a singleton instance
export const examLogger = new ExamLogger();
