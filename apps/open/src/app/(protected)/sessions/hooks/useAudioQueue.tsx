import { useState, useCallback, useRef } from "react";
import { Message } from "@/app/types/types";

interface AudioCacheItem {
  messageId: string;
  textHash: string;
  audioUrl: string;
  isReady: boolean;
  isGenerating: boolean;
  error?: string;
}

interface UseAudioQueueOptions {
  onAudioReady?: (messageId: string) => void;
  onError?: (messageId: string, error: string) => void;
}

export const useAudioQueue = (options?: UseAudioQueueOptions) => {
  const [audioCache, setAudioCache] = useState<Map<string, AudioCacheItem>>(
    new Map()
  );
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Generate hash for text to enable caching
  const generateTextHash = useCallback((text: string): string => {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }, []);

  // Clean text by removing markdown formatting
  const cleanText = useCallback((text: string): string => {
    return (
      text
        // Remove markdown bold (**text** or __text__)
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        // Remove markdown italic (*text* or _text_)
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        // Remove markdown headers (# ## ###)
        .replace(/^#{1,6}\s+/gm, "")
        // Remove markdown strikethrough (~~text~~)
        .replace(/~~(.*?)~~/g, "$1")
        // Remove markdown code blocks (```code```)
        .replace(/```[\s\S]*?```/g, "[code block]")
        // Remove inline code (`code`)
        .replace(/`([^`]*)`/g, "$1")
        // Remove markdown links [text](url)
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        // Remove HTML tags
        .replace(/<[^>]*>/g, "")
        // Clean up multiple spaces and newlines
        .replace(/\s+/g, " ")
        .trim()
    );
  }, []);

  // Generate audio for a single message
  const generateAudioForMessage = useCallback(
    async (
      messageId: string,
      text: string,
      voice?: string,
      instructions?: string
    ): Promise<string | null> => {
      const cleanedText = cleanText(text);
      if (!cleanedText.trim()) {
        return null;
      }

      const textHash = generateTextHash(cleanedText);

      // Check if we already have this audio cached by text hash
      const existingItem = Array.from(audioCache.values()).find(
        (item) => item.textHash === textHash && item.isReady
      );

      if (existingItem) {
        // Create new cache entry for this message ID pointing to same audio
        setAudioCache(
          (prev) =>
            new Map(
              prev.set(messageId, {
                ...existingItem,
                messageId,
              })
            )
        );
        options?.onAudioReady?.(messageId);
        return existingItem.audioUrl;
      }

      // Create abort controller for this generation
      const abortController = new AbortController();
      abortControllersRef.current.set(messageId, abortController);

      // Update cache to show we're generating
      setAudioCache(
        (prev) =>
          new Map(
            prev.set(messageId, {
              messageId,
              textHash,
              audioUrl: "",
              isReady: false,
              isGenerating: true,
            })
          )
      );

      try {
        const response = await fetch("/api/tts/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: cleanedText,
            ...(voice && { voice }),
            ...(instructions && { instructions }),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const ttsResponse = await response.json();

        // Convert base64 to blob URL
        const binaryString = atob(ttsResponse.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: ttsResponse.content_type });
        const audioUrl = URL.createObjectURL(blob);

        // Update cache with ready audio
        setAudioCache(
          (prev) =>
            new Map(
              prev.set(messageId, {
                messageId,
                textHash,
                audioUrl,
                isReady: true,
                isGenerating: false,
              })
            )
        );

        options?.onAudioReady?.(messageId);
        return audioUrl;
      } catch (error: any) {
        if (error.name === "AbortError") {
          return null;
        }

        const errorMessage = `Audio generation failed: ${error.message}`;

        // Update cache with error
        setAudioCache(
          (prev) =>
            new Map(
              prev.set(messageId, {
                messageId,
                textHash,
                audioUrl: "",
                isReady: false,
                isGenerating: false,
                error: errorMessage,
              })
            )
        );

        options?.onError?.(messageId, errorMessage);
        return null;
      } finally {
        abortControllersRef.current.delete(messageId);
      }
    },
    [cleanText, generateTextHash, audioCache, options]
  );

  // Generate bulk audio for multiple messages as one continuous speech
  const generateBulkAudio = useCallback(
    async (
      messages: Message[],
      bulkId: string,
      voice?: string,
      instructions?: string
    ): Promise<string | null> => {
      const apiMessages = messages.filter(
        (msg) => msg.type === "apiMessage" && msg.message && msg.message.trim()
      );

      if (apiMessages.length === 0) {
        return null;
      }

      // Concatenate all message texts with spaces
      const combinedText = apiMessages
        .map((msg) => cleanText(msg.message))
        .filter((text) => text.trim())
        .join(" ");

      if (!combinedText.trim()) {
        return null;
      }

      console.log(
        "🔊 Generating bulk audio for",
        apiMessages.length,
        "messages:",
        combinedText.substring(0, 100) + "..."
      );

      return await generateAudioForMessage(
        bulkId,
        combinedText,
        voice,
        instructions
      );
    },
    [generateAudioForMessage, cleanText]
  );

  // Pre-generate audio for multiple messages (single mode)
  const preGenerateAudio = useCallback(
    async (messages: Message[], voice?: string, instructions?: string) => {
      const apiMessages = messages.filter(
        (msg) => msg.type === "apiMessage" && msg.message && msg.message.trim()
      );

      // Generate audio for all messages in parallel
      const promises = apiMessages.map((msg, index) => {
        const messageId = msg.id || `batch-${Date.now()}-${index}`;
        return generateAudioForMessage(
          messageId,
          msg.message,
          voice,
          instructions
        );
      });

      await Promise.allSettled(promises);
    },
    [generateAudioForMessage]
  );

  // Get cached audio URL for a message
  const getCachedAudioUrl = useCallback(
    (messageId: string): string | null => {
      const item = audioCache.get(messageId);
      return item && item.isReady ? item.audioUrl : null;
    },
    [audioCache]
  );

  // Check if audio is ready for a message
  const isAudioReady = useCallback(
    (messageId: string): boolean => {
      const item = audioCache.get(messageId);
      return item ? item.isReady : false;
    },
    [audioCache]
  );

  // Check if audio is generating for a message
  const isAudioGenerating = useCallback(
    (messageId: string): boolean => {
      const item = audioCache.get(messageId);
      return item ? item.isGenerating : false;
    },
    [audioCache]
  );

  // Cancel generation for a specific message
  const cancelGeneration = useCallback((messageId: string) => {
    const controller = abortControllersRef.current.get(messageId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(messageId);
    }
  }, []);

  // Cancel all ongoing generations
  const cancelAllGenerations = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  // Clean up audio URLs and cache
  const cleanup = useCallback(() => {
    // Cancel any ongoing generations
    cancelAllGenerations();

    // Revoke all object URLs from current cache
    setAudioCache((prevCache) => {
      prevCache.forEach((item) => {
        if (item.audioUrl) {
          URL.revokeObjectURL(item.audioUrl);
        }
      });
      return new Map();
    });
  }, [cancelAllGenerations]);

  return {
    preGenerateAudio,
    generateBulkAudio,
    generateAudioForMessage,
    getCachedAudioUrl,
    isAudioReady,
    isAudioGenerating,
    cancelGeneration,
    cancelAllGenerations,
    cleanup,
    audioCache: audioCache.size, // For debugging - return size instead of full map
  };
};
