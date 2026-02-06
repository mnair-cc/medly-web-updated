'use client'

import { useRef, useEffect } from 'react';
import { useUser } from '@/app/_context/UserProvider';
import { useSession } from 'next-auth/react';
import Raindrop from 'raindrop-ai';

// Generate browser-compatible UUID
const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for browsers that don't support crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function useRaindropTracking() {
  const { user } = useUser();
  const { data: session } = useSession();
  const raindrop = useRef<Raindrop | null>(null);
  const currentInteraction = useRef<any>(null);
  const currentEventId = useRef<string | null>(null);

  // Initialize Raindrop SDK
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const apiKey = process.env.NEXT_PUBLIC_RAINDROP_API_KEY;
        if (!apiKey) {
          raindrop.current = null;
          return;
        }
        
        raindrop.current = new Raindrop({ 
          writeKey: apiKey
        });
        
        // Set user identification when user data is available
        if (user && raindrop.current) {
          const userEmail = session?.user?.email;
          try {
            raindrop.current.setUserDetails({
              userId: userEmail || user.userName || 'unknown',
              traits: {
                name: user.userName,
                email: userEmail,
                source: user.source,
                year: user.year?.toString(),
                subscription_status: user.subscription?.status,
              },
            });
          } catch {
            // Silent failure for setUserDetails
          }
        }
      } catch {
        raindrop.current = null;
      }
    }
  }, [user, session]);

  const beginInteraction = (
    event: string,
    input: string,
    model: string = 'medly-ai',
    convoId?: string,
    properties: Record<string, string> = {},
    questionId?: string // Add question ID parameter
  ) => {
    if (!raindrop.current) return null;

    try {
      // Use questionId as eventId directly! No mapping needed.
      const eventId = questionId || generateUUID();
      const userEmail = session?.user?.email;
      currentInteraction.current = raindrop.current.begin({
        eventId,
        event,
        userId: userEmail || user?.userName || 'unknown',
        input,
        model,
        convoId,
        properties,
      });

      // Store the current event ID for signal tracking
      currentEventId.current = eventId;

      return currentInteraction.current;
    } catch {
      return null;
    }
  };


  const finishInteraction = (
    output: string,
    properties: Record<string, string> = {}
  ) => {
    if (currentInteraction.current) {
      try {
        currentInteraction.current.finish({
          output,
          properties,
        });
      } catch {
        // Silent failure
      }
      currentInteraction.current = null;
    }
  };

  const finishInteractionWithError = (
    errorMessage: string,
    properties: Record<string, string> = {}
  ) => {
    if (currentInteraction.current) {
      try {
        currentInteraction.current.finish({
          output: `Error: ${errorMessage}`,
          properties: {
            error: 'true',
            error_message: errorMessage,
            ...properties,
          },
        });
      } catch {
        // Silent failure
      }
      currentInteraction.current = null;
      currentEventId.current = null;
    }
  };

  const trackSignal = async (
    name: "thumbs_up" | "thumbs_down" | string,
    comment?: string,
    type: "default" | "feedback" | "edit" = "feedback",
    questionId?: string // Use question ID directly as event ID
  ) => {
    if (!raindrop.current) {
      return;
    }

    // Use questionId directly as eventId! No mapping needed.
    const targetEventId = questionId || currentEventId.current;

    if (!targetEventId) {
      return;
    }

    try {
      await raindrop.current.trackSignal({
        eventId: targetEventId,
        name,
        type,
        comment,
        sentiment: name === "thumbs_up" ? "POSITIVE" : "NEGATIVE",
      });
    } catch {
      // Silent failure
    }
  };

  const hasActiveInteraction = () => {
    return currentInteraction.current !== null;
  };

  const clearInteraction = () => {
    currentInteraction.current = null;
    currentEventId.current = null;
  };

  const clearAllHistory = () => {
    currentInteraction.current = null;
    currentEventId.current = null;
  };

  return {
    beginInteraction,
    finishInteraction,
    finishInteractionWithError,
    trackSignal,
    hasActiveInteraction,
    clearInteraction,
    clearAllHistory,
  };
}
