/**
 * Event system for knowledge model updates
 * Enables optimistic updates in the sidebar when questions are marked
 */

export interface KnowledgeModelUpdateEvent {
  lessonId: string;
  updates: {
    mu: number;
    sigma: number;
    p_mastery: number;
    mastery_tier: number;
    rank: number;
  };
  sessionInfo?: {
    title: string;
    subtitle: string;
    questionCount: number;
    timeStarted: string;
  };
}

type KnowledgeModelEventCallback = (event: KnowledgeModelUpdateEvent) => void;

class KnowledgeModelEventEmitter {
  private subscribers: Set<KnowledgeModelEventCallback> = new Set();

  /**
   * Subscribe to knowledge model update events
   * @param callback Function to call when an update occurs
   * @returns Unsubscribe function
   */
  subscribe(callback: KnowledgeModelEventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribe from knowledge model update events
   * @param callback The callback to remove
   */
  unsubscribe(callback: KnowledgeModelEventCallback): void {
    this.subscribers.delete(callback);
  }

  /**
   * Emit a knowledge model update event
   * @param event The update event with lesson data
   */
  emit(event: KnowledgeModelUpdateEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in knowledge model event callback:', error);
      }
    });
  }

  /**
   * Get the current number of subscribers (for debugging)
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Export singleton instance
export const knowledgeModelEvents = new KnowledgeModelEventEmitter();
