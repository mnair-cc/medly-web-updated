import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkGemoji from "remark-gemoji";
import supersub from "remark-supersub";
import { Message, StrategyStep, QuestionDifficulty } from "@/app/types/types";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useTextToSpeech } from "@/app/(protected)/sessions/hooks/useTextToSpeech";
import { useAudioQueue } from "@/app/(protected)/sessions/hooks/useAudioQueue";
import {
  isAudioGloballyUnlocked,
  getGlobalAudioContext,
} from "@/app/(protected)/sessions/hooks/useAudioUnlock";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { preprocessLaTeX } from "@/app/_hooks/useLatexPreprocessing";
import MarkschemeCard from "./answer-components/MarkschemeCard";
import FeedbackCard from "./answer-components/FeedbackCard";
import StrategyCard from "./answer-components/StrategyCard";
import TimingCard from "./answer-components/TimingCard";

// Helper to get AO card groups - returns map of first card index to array of grouped cards
const getAoCardGroups = (messages: Message[]): Map<number, Message[]> => {
  const groups = new Map<number, Message[]>();
  let i = 0;

  while (i < messages.length) {
    if (messages[i].type === "aoAnalysisCard") {
      const currentIndex = messages[i].cardData?.index;
      const group: Message[] = [messages[i]];
      const groupStartIdx = i;
      i++;

      // Collect consecutive aoAnalysisCards with same index
      while (
        i < messages.length &&
        messages[i].type === "aoAnalysisCard" &&
        messages[i].cardData?.index === currentIndex
      ) {
        group.push(messages[i]);
        i++;
      }

      groups.set(groupStartIdx, group);
    } else {
      i++;
    }
  }

  return groups;
};

// Reorder consecutive markscheme cards by part (a, b, c...) based on cardData.index
// Also handles "marking_updated" system messages - they stay in the group but move to the end
const reorderConsecutiveMarkschemeCards = (messages: Message[]): Message[] => {
  const result: Message[] = [];
  let i = 0;

  const isMarkingUpdated = (msg: Message) =>
    msg.type === "systemMessage" && msg.message === "marking_updated";

  while (i < messages.length) {
    if (
      messages[i].type === "markschemeCard" ||
      isMarkingUpdated(messages[i])
    ) {
      // Collect markscheme cards and marking_updated messages
      const markschemeCards: Message[] = [];
      const markingUpdatedMsgs: Message[] = [];

      while (
        i < messages.length &&
        (messages[i].type === "markschemeCard" || isMarkingUpdated(messages[i]))
      ) {
        if (messages[i].type === "markschemeCard") {
          markschemeCards.push(messages[i]);
        } else {
          markingUpdatedMsgs.push(messages[i]);
        }
        i++;
      }

      // Sort markscheme cards by cardData.index (0=a, 1=b, etc.)
      markschemeCards.sort(
        (a, b) => (a.cardData?.index ?? 0) - (b.cardData?.index ?? 0)
      );

      // Output sorted cards, then marking_updated at the end
      result.push(...markschemeCards, ...markingUpdatedMsgs);
    } else {
      result.push(messages[i]);
      i++;
    }
  }

  return result;
};

function ChatThread({
  messages,
  options,
  isAwaitingResponse,
  isLearnPage = false,
  onClickDisclaimer,
  onClickFeedback,
  onVisibleMessagesChange,
  onSpeechControlsReady,
  voiceEnabled = true,
  audioGenerationMode = "single",
  threadKey,
  userMessageColor,
}: {
  messages: Message[];
  options: string[];
  isAwaitingResponse: boolean;
  isLearnPage?: boolean;
  onClickDisclaimer?: () => void;
  onClickFeedback?: (type: "positive" | "negative") => void;
  onVisibleMessagesChange?: (
    visibleMessages: Message[],
    shouldShowLoading: boolean
  ) => void;
  onSpeechControlsReady?: (controls: { fadeOutAndStop: () => void }) => void;
  voiceEnabled?: boolean;
  audioGenerationMode?: "single" | "bulk";
  threadKey?: string;
  userMessageColor?: string;
}) {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [activeTimeouts, setActiveTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const lastProcessedCountRef = useRef(0);
  const lastSpokenMessageIndexRef = useRef<number>(-1);
  const isSpeechPendingRef = useRef<boolean>(false);

  // Bulk audio state
  const [bulkAudioUrl, setBulkAudioUrl] = useState<string | null>(null);
  const [isBulkAudioPlaying, setIsBulkAudioPlaying] = useState(false);
  const lastBulkAudioMessagesRef = useRef<string>("");
  const isGeneratingBulkAudioRef = useRef<boolean>(false);

  // Web Audio API refs for bulk audio fade
  const bulkAudioContextRef = useRef<AudioContext | null>(null);
  const bulkGainNodeRef = useRef<GainNode | null>(null);
  const bulkSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bulkFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Text-to-speech functionality
  const {
    speakText,
    playPreGeneratedAudio,
    stop: stopSpeech,
    fadeOutAndStop,
    isSpeaking,
  } = useTextToSpeech({
    onSpeechComplete: () => {
      if (voiceEnabled) {
        // console.log('🔊 Speech completed, allowing next message to process');
        isSpeechPendingRef.current = false;
        setIsProcessingQueue(false);
      }
    },
    onError: (error) => {
      console.error("Text-to-speech error:", error);
      if (voiceEnabled) {
        isSpeechPendingRef.current = false;
        setIsProcessingQueue(false);
      }
    },
  });

  // Audio queue for pre-generating speech
  const {
    preGenerateAudio,
    generateBulkAudio,
    getCachedAudioUrl,
    isAudioReady,
    cleanup: cleanupAudioQueue,
  } = useAudioQueue({
    onAudioReady: (messageId) => {
      // console.log(`🔊 Audio ready for message: ${messageId}`);
    },
    onError: (messageId, error) => {
      console.error(
        `❌ Audio generation failed for message ${messageId}:`,
        error
      );
    },
  });

  const charsPerMs = 0.05; // 50 characters per second

  // Set up Web Audio API for bulk audio fade control
  const setupBulkAudioContext = useCallback(() => {
    if (!bulkAudioContextRef.current) {
      bulkAudioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }

    if (!bulkGainNodeRef.current) {
      bulkGainNodeRef.current = bulkAudioContextRef.current.createGain();
      bulkGainNodeRef.current.connect(bulkAudioContextRef.current.destination);
      bulkGainNodeRef.current.gain.value = 1.0; // Full volume initially
    }

    return {
      audioContext: bulkAudioContextRef.current,
      gainNode: bulkGainNodeRef.current,
    };
  }, []);

  // Handle bulk audio playback using Web Audio API only (Safari iOS compatible)
  const playBulkAudio = useCallback(async (audioUrl: string) => {
    try {
      // Check if audio is unlocked (required for Safari iOS autoplay)
      if (!isAudioGloballyUnlocked()) {
        console.log("🔒 Audio not unlocked yet, skipping bulk audio playback");
        return;
      }

      console.log("🔊 Starting bulk audio playback using Web Audio API");

      // Get the unlocked AudioContext
      const globalAudioContext = getGlobalAudioContext();
      if (!globalAudioContext) {
        console.error("❌ No global audio context available");
        return;
      }

      // Resume context if suspended (real iOS suspends between interactions)
      if (globalAudioContext.state === "suspended") {
        console.log(
          "📱 Resuming suspended AudioContext before bulk playback..."
        );
        await globalAudioContext.resume();
        console.log(
          "✅ AudioContext resumed, new state:",
          globalAudioContext.state
        );
      }

      console.log("🔊 Fetching and decoding bulk audio...");

      // Fetch the audio data
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`🔊 Audio fetched: ${arrayBuffer.byteLength} bytes`);

      // Decode the audio
      const audioBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
      console.log(
        `🔊 Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels`
      );

      // Create source and connect to destination
      const source = globalAudioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Set up gain node for volume control and fade support
      const gainNode = globalAudioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);
      gainNode.gain.value = 1.0; // Full volume

      setIsBulkAudioPlaying(true);

      // Handle playback completion
      source.onended = () => {
        console.log("✅ Bulk audio playback completed via Web Audio API");
        setIsBulkAudioPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setBulkAudioUrl(null);
      };

      // Store references for potential fade operations
      bulkGainNodeRef.current = gainNode;
      bulkSourceNodeRef.current = source as any; // Type compatibility

      // Start playback
      source.start(0);
      console.log("✅ Web Audio API bulk audio started successfully");
    } catch (error) {
      console.error("❌ Failed to start bulk audio playback:", error);
      setIsBulkAudioPlaying(false);
      // Clean up on error
      if (bulkAudioUrl) {
        URL.revokeObjectURL(bulkAudioUrl);
        setBulkAudioUrl(null);
      }
    }
  }, []);

  // Fade out and stop bulk audio (Web Audio API version)
  const fadeOutAndStopBulkAudio = useCallback(() => {
    if (isBulkAudioPlaying && bulkGainNodeRef.current) {
      console.log("🔇 Fading out bulk audio");

      // Clear any existing fade timeout
      if (bulkFadeTimeoutRef.current) {
        clearTimeout(bulkFadeTimeoutRef.current);
        bulkFadeTimeoutRef.current = null;
      }

      const globalAudioContext = getGlobalAudioContext();
      if (globalAudioContext && bulkGainNodeRef.current) {
        const gain = bulkGainNodeRef.current.gain;
        const fadeTime = 0.8;
        const currentTime = globalAudioContext.currentTime;

        try {
          gain.cancelScheduledValues(currentTime);
          gain.setValueAtTime(gain.value, currentTime);
          gain.exponentialRampToValueAtTime(0.001, currentTime + fadeTime);

          // Stop after fade completes
          bulkFadeTimeoutRef.current = setTimeout(
            () => {
              // Stop the audio source if it's still playing
              if (
                bulkSourceNodeRef.current &&
                typeof bulkSourceNodeRef.current.stop === "function"
              ) {
                try {
                  (bulkSourceNodeRef.current as any).stop();
                } catch (e) {
                  // Source may already be stopped
                }
              }

              setIsBulkAudioPlaying(false);
              if (bulkAudioUrl) {
                URL.revokeObjectURL(bulkAudioUrl);
                setBulkAudioUrl(null);
              }
              lastBulkAudioMessagesRef.current = "";
              isGeneratingBulkAudioRef.current = false;

              // Reset references
              bulkGainNodeRef.current = null;
              bulkSourceNodeRef.current = null;
            },
            fadeTime * 1000 + 30
          ); // Add 30ms buffer
        } catch (fadeError) {
          console.warn(
            "⚠️ Bulk audio fade failed, stopping immediately:",
            fadeError
          );
          // Fallback to immediate stop
          stopBulkAudio();
        }
      } else {
        // No Web Audio API available, stop immediately
        console.log(
          "⏹️ Web Audio API not available for bulk audio, stopping immediately"
        );
        stopBulkAudio();
      }
    }
  }, [isBulkAudioPlaying, bulkAudioUrl]);

  // Stop bulk audio immediately (without fade) - Web Audio API version
  const stopBulkAudio = useCallback(() => {
    // Clear any active fade
    if (bulkFadeTimeoutRef.current) {
      clearTimeout(bulkFadeTimeoutRef.current);
      bulkFadeTimeoutRef.current = null;
    }

    // Stop the audio source if it's still playing
    if (
      bulkSourceNodeRef.current &&
      typeof bulkSourceNodeRef.current.stop === "function"
    ) {
      try {
        (bulkSourceNodeRef.current as any).stop();
      } catch (e) {
        // Source may already be stopped, which is fine
        console.log("Audio source already stopped");
      }
    }

    // Clean up URL
    if (bulkAudioUrl) {
      URL.revokeObjectURL(bulkAudioUrl);
      setBulkAudioUrl(null);
    }

    // Update state
    setIsBulkAudioPlaying(false);
    lastBulkAudioMessagesRef.current = "";
    isGeneratingBulkAudioRef.current = false;

    // Reset gain for next use
    if (bulkGainNodeRef.current) {
      bulkGainNodeRef.current.gain.value = 1.0;
      bulkGainNodeRef.current = null; // Clear reference
    }

    // Clear source reference
    bulkSourceNodeRef.current = null;
  }, [bulkAudioUrl]);

  // Unified function to stop all audio (both single and bulk) - defined early
  const stopAllAudio = useCallback(() => {
    // Stop single message audio with fade
    fadeOutAndStop();
    // Stop bulk audio with fade
    fadeOutAndStopBulkAudio();
  }, [fadeOutAndStop, fadeOutAndStopBulkAudio]);

  // Pass speech controls to parent component
  useEffect(() => {
    if (onSpeechControlsReady) {
      onSpeechControlsReady({
        fadeOutAndStop: stopAllAudio, // Use unified function that stops all audio
      });
    }
  }, [stopAllAudio, onSpeechControlsReady]);

  // Generate hash for message content to prevent duplicate audio generation
  const getMessagesHash = useCallback((messages: Message[]) => {
    return messages
      .filter((msg) => msg.type === "apiMessage")
      .map((msg) => msg.id || msg.message)
      .join("|");
  }, []);

  // Generate bulk audio only if not already generated for these messages
  const generateBulkAudioIfNeeded = useCallback(
    async (messages: Message[], bulkId: string) => {
      // Check if already generating to prevent concurrent calls
      if (isGeneratingBulkAudioRef.current) {
        // console.log('🔊 Audio generation already in progress, skipping...');
        return;
      }

      const messagesHash = getMessagesHash(messages);

      // Don't generate if we already have audio for these exact messages and it's playing
      if (
        messagesHash === lastBulkAudioMessagesRef.current &&
        isBulkAudioPlaying
      ) {
        // console.log('🔊 Bulk audio already playing for these messages, skipping generation');
        return;
      }

      // Set generation lock
      isGeneratingBulkAudioRef.current = true;

      try {
        // Stop any existing audio first
        if (isBulkAudioPlaying) {
          // console.log('⏹️ Stopping existing bulk audio for new generation');
          stopBulkAudio();
        }

        // console.log('🔊 Generating new bulk audio for messages:', messagesHash.substring(0, 50) + '...');
        const audioUrl = await generateBulkAudio(messages, bulkId);

        if (audioUrl && isGeneratingBulkAudioRef.current) {
          // Check if not cancelled
          lastBulkAudioMessagesRef.current = messagesHash;
          setBulkAudioUrl(audioUrl);
          await playBulkAudio(audioUrl);
        }
      } finally {
        // Always release the lock
        isGeneratingBulkAudioRef.current = false;
      }
    },
    [getMessagesHash]
  );

  // Markdown components override (cast to any to avoid strict type mismatch across versions)
  const markdownComponents: any = {
    ul: (props: any) => <ul className="list-disc pl-2 ml-5 mb-3" {...props} />,
    ol: (props: any) => (
      <ol className="list-decimal pl-2 ml-5 mb-3" {...props} />
    ),
    li: (props: any) => <li className="mb-1" {...props} />,
  };

  // Reset thread state when threadKey changes (e.g., switching between question and learn flow)
  useEffect(() => {
    // Clear timers and internal queues
    activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    setActiveTimeouts([]);
    setVisibleMessages([]);
    setMessageQueue([]);
    setIsProcessingQueue(false);
    lastProcessedCountRef.current = 0;
    lastSpokenMessageIndexRef.current = -1;
    // Stop any ongoing speech/audio
    stopSpeech();
    stopBulkAudio();
    // Clean up audio queue
    cleanupAudioQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadKey]);

  // Process new messages - add them to queue
  useEffect(() => {
    // Only clear timers and reset when fully resetting the thread
    if (messages.length === 0) {
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      setActiveTimeouts([]);
      setVisibleMessages([]);
      setMessageQueue([]);
      setIsProcessingQueue(false);
      lastProcessedCountRef.current = 0;
      // Stop speech and reset tracking when messages are cleared
      stopSpeech();
      stopBulkAudio();
      lastSpokenMessageIndexRef.current = -1;
      // Clean up audio queue
      cleanupAudioQueue();
      return;
    }

    // Find new messages that haven't been processed yet
    const newMessages = messages.slice(lastProcessedCountRef.current);

    if (newMessages.length === 0) {
      return;
    }

    // Check if this is an initial load (all messages are new and we have no visible messages yet)
    const isInitialLoad =
      visibleMessages.length === 0 && lastProcessedCountRef.current === 0;

    // Check if thread was reset (visibleMessages cleared but we have messages to show)
    // Note: Restored conversations are handled by isFirstRenderRef above
    const isReload = visibleMessages.length === 0 && messages.length > 0;

    if (isInitialLoad || isReload) {
      // For initial load or reload, show ALL messages immediately without queue delay
      // These are historical messages the user has already seen, so no need for animation delay
      setVisibleMessages(messages);
      lastProcessedCountRef.current = messages.length;
      return;
    }

    // Separate immediate messages from queued messages
    const immediateMessages = newMessages.filter(
      (msg) =>
        msg.type === "systemMessage" ||
        msg.type === "markschemeCard" ||
        msg.type === "aoAnalysisCard" ||
        msg.type === "strategyCard" ||
        msg.type === "timingCard"
    );

    const systemMessages = newMessages.filter(
      (msg) => msg.type === "systemMessage"
    );
    const userMessages = newMessages.filter(
      (msg) => msg.type === "userMessage"
    );
    const apiMessages = newMessages.filter((msg) => msg.type === "apiMessage");

    // Always add immediate messages directly to visible (no delay needed)
    if (immediateMessages.length > 0) {
      setVisibleMessages((prev) => [...prev, ...immediateMessages]);
    }

    // If user sent a message, clear the queue and immediately show user messages
    if (userMessages.length > 0) {
      // Stop any ongoing speech when user sends a message
      if (isSpeaking) {
        fadeOutAndStop();
      }
      // Stop bulk audio when user sends a message
      stopBulkAudio();

      // Clear the message queue to stop processing pending AI messages
      // Also clear any active timers and allow the queue processor to restart later
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      setActiveTimeouts([]);
      setMessageQueue([]);
      setIsProcessingQueue(false);

      // Immediately add user messages to visible messages
      setVisibleMessages((prev) => [...prev, ...userMessages]);

      // Find the index after the last user message
      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "userMessage") {
          lastUserMessageIndex = i;
          break;
        }
      }

      // Update processed count to skip any AI messages that were pending
      lastProcessedCountRef.current = lastUserMessageIndex + 1;

      // Add any remaining API messages after the last user message to the queue
      const remainingApiMessages = messages
        .slice(lastUserMessageIndex + 1)
        .filter((msg) => msg.type === "apiMessage");
      if (remainingApiMessages.length > 0) {
        // Ensure each message has a consistent ID for audio caching
        const messagesWithIds = remainingApiMessages.map((msg, index) => ({
          ...msg,
          id:
            msg.id ||
            `remaining-api-${lastUserMessageIndex + 1 + index}-${msg.message.substring(0, 20).replace(/\s/g, "")}`,
        }));

        setMessageQueue(messagesWithIds);

        // Handle audio generation based on mode
        if (voiceEnabled && audioGenerationMode === "bulk") {
          const bulkId = `bulk-remaining-${Date.now()}-${Math.random()}`;
          generateBulkAudioIfNeeded(messagesWithIds, bulkId);
        } else if (voiceEnabled && audioGenerationMode === "single") {
          // console.log('🔊 Single mode: Pre-generating individual audio for', messagesWithIds.length, 'remaining API messages');
          preGenerateAudio(messagesWithIds);
        }
      }
    } else if (systemMessages.length > 0) {
      // System messages should interrupt the queue but still render immediately (already added above)
      // Clear any active timers and pending messages
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      setActiveTimeouts([]);
      setMessageQueue([]);
      setIsProcessingQueue(false);

      // Find the index after the last system message
      let lastSystemMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "systemMessage") {
          lastSystemMessageIndex = i;
          break;
        }
      }

      // Update processed count to the last system message
      lastProcessedCountRef.current = lastSystemMessageIndex + 1;

      // Queue any API messages that come after the last system message
      const remainingApiMessages = messages
        .slice(lastSystemMessageIndex + 1)
        .filter((msg) => msg.type === "apiMessage");
      if (remainingApiMessages.length > 0) {
        // Ensure each message has a consistent ID for audio caching
        const messagesWithIds = remainingApiMessages.map((msg, index) => ({
          ...msg,
          id:
            msg.id ||
            `remaining-sys-${lastSystemMessageIndex + 1 + index}-${msg.message.substring(0, 20).replace(/\s/g, "")}`,
        }));

        setMessageQueue(messagesWithIds);

        // Handle audio generation based on mode
        if (voiceEnabled && audioGenerationMode === "bulk") {
          const bulkId = `bulk-sys-${Date.now()}-${Math.random()}`;
          generateBulkAudioIfNeeded(messagesWithIds, bulkId);
        } else if (voiceEnabled && audioGenerationMode === "single") {
          // console.log('🔊 Single mode: Pre-generating individual audio for', messagesWithIds.length, 'remaining API messages after system message');
          preGenerateAudio(messagesWithIds);
        }
      }
    } else if (apiMessages.length > 0) {

      // Ensure each message has a consistent ID for audio caching
      const messagesWithIds = apiMessages.map((msg, index) => ({
        ...msg,
        id:
          msg.id ||
          `new-api-${lastProcessedCountRef.current + index}-${msg.message.substring(0, 20).replace(/\s/g, "")}`,
      }));

      // For bulk mode, need to include existing queue + new messages for bulk generation
      if (voiceEnabled && audioGenerationMode === "bulk") {
        const allQueuedMessages = [...messageQueue, ...messagesWithIds];
        setMessageQueue(allQueuedMessages);

        const bulkId = `bulk-new-${Date.now()}-${Math.random()}`;
        generateBulkAudioIfNeeded(allQueuedMessages, bulkId);
      } else {
        setMessageQueue((prev) => [...prev, ...messagesWithIds]);
        if (voiceEnabled && audioGenerationMode === "single") {
          // console.log('🔊 Pre-generating audio for', messagesWithIds.length, 'new API messages');
          preGenerateAudio(messagesWithIds);
        }
      }
    }

    // Update processed count
    lastProcessedCountRef.current = messages.length;
    // console.log("=== MESSAGE PROCESSING END ===\n");

    return () => {
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [
    messages,
    charsPerMs,
    isSpeaking,
    fadeOutAndStop,
    stopSpeech,
    voiceEnabled,
    audioGenerationMode,
  ]);

  // Sync card updates from messages to visibleMessages
  // This handles the case where a card's data is updated (e.g., on reattempt)
  // without adding new messages to the array
  useEffect(() => {
    const cardTypes = [
      "markschemeCard",
      "aoAnalysisCard",
      "strategyCard",
      "timingCard",
    ];

    setVisibleMessages((prev) => {
      let hasChanges = false;
      const updated = prev.map((visibleMsg) => {
        if (!cardTypes.includes(visibleMsg.type)) {
          return visibleMsg;
        }

        // Find the matching message in the source messages array
        const sourceMsg = messages.find(
          (msg) =>
            msg.type === visibleMsg.type &&
            msg.cardData?.currentQuestionWithMarkingResult?.legacyId ===
              visibleMsg.cardData?.currentQuestionWithMarkingResult?.legacyId &&
            msg.cardData?.index === visibleMsg.cardData?.index
        );

        if (!sourceMsg) {
          return visibleMsg;
        }

        // Check if the cardData has changed by comparing a key field
        // For markschemeCard, we compare the markingTable
        const sourceMarkingTable = sourceMsg.cardData?.question?.markingTable;
        const visibleMarkingTable = visibleMsg.cardData?.question?.markingTable;

        if (sourceMarkingTable !== visibleMarkingTable) {
          hasChanges = true;
          return {
            ...visibleMsg,
            cardData: sourceMsg.cardData,
          };
        }

        return visibleMsg;
      });

      return hasChanges ? updated : prev;
    });
  }, [messages]);

  // Queue processor - processes messages from the queue one by one with delays
  useEffect(() => {
    const shouldProcessQueue =
      messageQueue.length > 0 &&
      !isProcessingQueue &&
      (audioGenerationMode === "bulk" ||
        !voiceEnabled ||
        !isSpeechPendingRef.current);

    if (shouldProcessQueue) {
      setIsProcessingQueue(true);
      const nextMessage = messageQueue[0];

      // Calculate delay based on message type and previous message
      let delay = 0;
      if (nextMessage.type === "apiMessage" && visibleMessages.length > 0) {
        const lastVisible = visibleMessages[visibleMessages.length - 1];
        if (lastVisible.type === "apiMessage") {
          const prevMessageLength = lastVisible.message.length;
          delay = Math.min(
            Math.max(prevMessageLength / charsPerMs, 1000), // minimum 1000ms
            2500 // maximum 2.5s
          );
        }
      }


      if (!voiceEnabled || audioGenerationMode === "bulk") {
        // Voice OFF or BULK mode: Use timing system based on message length
        const timeout = setTimeout(() => {
          // console.log(`🎯 Adding queued message to visible: "${nextMessage.message.substring(0, 30)}..."`);
          setVisibleMessages((prev) => {
            const newVisible = [...prev, nextMessage];
            return newVisible;
          });
          setMessageQueue((prev) => prev.slice(1)); // Remove processed message
          setIsProcessingQueue(false);
          // Clear the consumed timer reference
          setActiveTimeouts([]);
        }, delay);

        setActiveTimeouts([timeout]);
      } else {
        // Voice ON + SINGLE mode: Immediate display + speech, timing controlled by speech completion
        // console.log(`🔊 Voice mode (single): Showing message and starting speech`);

        // Add to visible and remove from queue immediately (same as non-voice)
        setVisibleMessages((prev) => [...prev, nextMessage]);
        setMessageQueue((prev) => prev.slice(1));

        // Handle speech timing
        if (
          nextMessage.type === "apiMessage" &&
          nextMessage.message &&
          nextMessage.message.trim()
        ) {
          const messageIndex = visibleMessages.length; // Index in the visible array
          if (messageIndex > lastSpokenMessageIndexRef.current) {
            // Check if audio is unlocked (required for Safari iOS autoplay)
            if (!isAudioGloballyUnlocked()) {
              // console.log('🔒 Audio not unlocked yet, skipping single message speech');
              setIsProcessingQueue(false);
              return;
            }

            // console.log('🔊 Speaking new visible API message:', nextMessage.message.substring(0, 50) + '...');
            isSpeechPendingRef.current = true;

            // Use the message ID that was set when adding to queue
            const messageId =
              nextMessage.id || `fallback-${Date.now()}-${Math.random()}`;

            // Try to use pre-generated audio first
            const cachedAudioUrl = getCachedAudioUrl(messageId);
            if (cachedAudioUrl) {
              // console.log('🔊 Using pre-generated audio for message:', messageId);
              playPreGeneratedAudio(cachedAudioUrl);
            } else {
              // console.log('🔊 Pre-generated audio not available for:', messageId, '- generating on-demand');
              speakText(nextMessage.message);
            }

            lastSpokenMessageIndexRef.current = messageIndex;
            // Keep isProcessingQueue = true, will be set false in onSpeechComplete
          } else {
            // This message was already spoken, continue
            setIsProcessingQueue(false);
          }
        } else {
          // Non-API messages (system, cards, etc.) don't need speech - allow next immediately
          setIsProcessingQueue(false);
        }
      }
    }
  }, [
    messageQueue,
    isProcessingQueue,
    visibleMessages,
    charsPerMs,
    speakText,
    playPreGeneratedAudio,
    getCachedAudioUrl,
    voiceEnabled,
    audioGenerationMode,
  ]);

  // Watchdog: if the queue has items but no active timer and we're marked as processing,
  // reset the processing flag to allow the processor to schedule a new timer.
  useEffect(() => {
    if (
      messageQueue.length > 0 &&
      isProcessingQueue &&
      activeTimeouts.length === 0
    ) {
      setIsProcessingQueue(false);
    }
  }, [messageQueue, isProcessingQueue, activeTimeouts]);

  // Cleanup timeouts and audio queue on unmount
  useEffect(() => {
    return () => {
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      cleanupAudioQueue();

      // Clear bulk audio fade timeout
      if (bulkFadeTimeoutRef.current) {
        clearTimeout(bulkFadeTimeoutRef.current);
      }

      // Close bulk audio context
      if (
        bulkAudioContextRef.current &&
        bulkAudioContextRef.current.state !== "closed"
      ) {
        bulkAudioContextRef.current.close();
        bulkAudioContextRef.current = null;
      }

      // Clear bulk audio refs
      bulkGainNodeRef.current = null;
      bulkSourceNodeRef.current = null;
    };
  }, [cleanupAudioQueue]);

  // Check if there are messages still pending in the queue
  const hasPendingMessages = messageQueue.length > 0;
  const shouldShowLoading = isAwaitingResponse || hasPendingMessages;

  // Notify parent when visible messages or loading state changes
  useEffect(() => {
    if (onVisibleMessagesChange) {
      onVisibleMessagesChange(visibleMessages, shouldShowLoading);
    }
  }, [visibleMessages, shouldShowLoading, onVisibleMessagesChange]);

  const processMessageContent = (content: string, type: string) => {
    // Replace question pattern with custom component
    // More specific regex to avoid matching numbers in mathematical expressions
    const questionRegex =
      /(?:(?:question|Q)\s+(\d+)(?:\s+(?:part|about|on)\s+([a-z\d])(?:\b|$))?)|(?:(?:^|\s)(\d+)\s*\(\s*([a-z\d])\s*\)(?=\s|$))/gi;
    const processed = content
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(questionRegex, (match, q1, p1, q2, p2) => {
        // Handle both formats: "Question 1 part a" and "1 (a)"
        const questionNum = q1 || q2;
        const partLetter = p1 || p2;

        if (questionNum && partLetter) {
          // Convert numeric parts to letters (1->a, 2->b, etc) if needed
          const formattedPart = /^\d+$/.test(partLetter)
            ? String.fromCharCode(96 + parseInt(partLetter)) // Convert number to letter (1->a, 2->b, etc)
            : partLetter;
          return `<span class="${type === "apiMessage" ? "text-[rgba(0,0,0,0.4)]" : "text-white"} font-rounded-bold">${questionNum} (${formattedPart})</span>`;
        } else if (questionNum) {
          return `<span class="">${questionNum}</span>`;
        }

        return match;
      });
    // Convert \(...\) and \[...\] LaTeX delimiters to $...$ and $$...$$ for remark-math
    return preprocessLaTeX(processed);
  };

  const shouldHaveExtraTopMargin = (content: string) => {
    const questionRegex =
      /(?:(?:question|Q)\s+(\d+)(?:\s+(?:part|about|on)\s+([a-z\d])(?:\b|$))?)|(?:(?:^|\s)(\d+)\s*\(\s*([a-z\d])\s*\)(?=\s|$))/gi;
    return questionRegex.test(content);
  };

  const shouldShowMessageTail = (
    message: Message,
    index: number,
    messages: Message[]
  ) => {
    // Always show tail for user messages
    if (message.type === "userMessage") {
      return true;
    }

    // For API messages, show tail if:
    // 1. It's the last message in the array, OR
    // 2. The next message is not an API message (end of consecutive API message block)
    if (message.type === "apiMessage") {
      const isLastMessage = index === messages.length - 1;
      const nextMessage = messages[index + 1];
      const isEndOfApiBlock = nextMessage && nextMessage.type !== "apiMessage";

      return isLastMessage || isEndOfApiBlock;
    }

    return false;
  };

  const MessageTail = ({ messageType }: { messageType: string }) => {
    switch (messageType) {
      case "apiMessageLoading":
        return (
          <div className="absolute bottom-0 left-0 -translate-x-1.5 translate-y-1 z-[1000]">
            <svg
              width="20"
              height="16"
              viewBox="0 0 32 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="5.3908"
                cy="20.0298"
                r="4.85681"
                transform="rotate(-23.3265 5.3908 20.0298)"
                fill="#F2F2F7"
                fillOpacity="0.9"
              />
              <circle
                cx="21.0426"
                cy="11.0426"
                r="10.685"
                transform="rotate(-23.3265 21.0426 11.0426)"
                fill="#F2F2F7"
              />
            </svg>
          </div>
        );
      case "apiMessage":
        return (
          <div
            className="absolute bottom-0 left-0 -translate-x-0.5 translate-y-0.5"
            style={{ zIndex: 0 }}
          >
            <svg width="22" height="26" viewBox="0 0 17 21" fill="none">
              <path
                d="M0.11315 20.1846C5.31315 20.9846 10.4465 18.1212 12.1132 16.2879C10.3953 12.1914 21.0011 2.24186 14.0011 2.24148C12.3825 2.24148 11 -1.9986 5.11315 1.1846C5.09194 2.47144 5.11315 6.92582 5.11315 7.6842C5.11315 18.1842 -0.88685 19.5813 0.11315 20.1846Z"
                fill="#F2F2F7"
              />
            </svg>
          </div>
        );
      case "userMessage":
        return (
          <div
            className="absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5"
            style={{ zIndex: 0 }}
          >
            <svg width="22" height="26" viewBox="0 0 17 21" fill="none">
              <path
                d="M16.8869 20.1846C11.6869 20.9846 6.55352 18.1212 4.88685 16.2879C6.60472 12.1914 -4.00107 2.24186 2.99893 2.24148C4.61754 2.24148 6 -1.9986 11.8869 1.1846C11.9081 2.47144 11.8869 6.92582 11.8869 7.6842C11.8869 18.1842 17.8869 19.5813 16.8869 20.1846Z"
                fill={userMessageColor || "#00AEFF"}
              />
            </svg>
          </div>
        );
      default:
    }
  };

  return (
    <>
      <div
        className={`flex flex-col items-center w-full px-4 ${
          isLearnPage ? "pt-16" : ""
        }`}
      >
        {/* Spacer to push messages to bottom when container isn't full */}
        {/* <div className="flex-grow"></div> */}
        <div className="flex flex-col w-full">
          {(() => {
            const processedMessages =
              reorderConsecutiveMarkschemeCards(visibleMessages);
            const aoGroups = getAoCardGroups(processedMessages);
            // Track which indices are part of a group but not the first
            const aoSkipIndices = new Set<number>();
            aoGroups.forEach((group, startIdx) => {
              for (let i = 1; i < group.length; i++) {
                aoSkipIndices.add(startIdx + i);
              }
            });

            return processedMessages.map((message: Message, index: number) => {
              // Skip aoAnalysisCards that are part of a group but not the first
              if (
                message.type === "aoAnalysisCard" &&
                aoSkipIndices.has(index)
              ) {
                return null;
              }

              // Handle card message types
              if (
                message.type === "markschemeCard" ||
                message.type === "aoAnalysisCard" ||
                message.type === "strategyCard" ||
                message.type === "timingCard"
              ) {
                // Check if previous message was user or API message to add top margin
                const prevMessage =
                  index > 0 ? visibleMessages[index - 1] : null;
                const nextMessage =
                  index < visibleMessages.length - 1
                    ? visibleMessages[index + 1]
                    : null;
                const shouldAddTopMargin =
                  prevMessage &&
                  (prevMessage.type === "userMessage" ||
                    prevMessage.type === "apiMessage");
                const shouldAddBottomMargin =
                  nextMessage &&
                  (nextMessage.type === "userMessage" ||
                    nextMessage.type === "apiMessage");

                return (
                  <div
                    key={message.id || `card-${index}`}
                    className={`w-full animate-[fadeInUp_0.3s_ease-in-out] ${shouldAddTopMargin ? "mt-5" : ""} ${shouldAddBottomMargin ? "mb-5" : ""}`}
                  >
                    {message.type === "markschemeCard" && message.cardData && (
                      <MarkschemeCard
                        currentQuestionWithMarkingResult={
                          message.cardData.currentQuestionWithMarkingResult!
                        }
                        question={message.cardData.question!}
                        index={message.cardData.index || 0}
                        getQuestionHeading={
                          message.cardData.getQuestionHeading!
                        }
                        showMarkScheme={message.cardData.showMarkScheme}
                      />
                    )}
                    {message.type === "aoAnalysisCard" &&
                      message.cardData &&
                      (() => {
                        // Get the group of AO cards for this index
                        const group = aoGroups.get(index) || [message];
                        const firstCard = group[0];
                        const heading =
                          firstCard.cardData?.getQuestionHeading &&
                          firstCard.cardData?.question
                            ? firstCard.cardData.getQuestionHeading(
                                firstCard.cardData.question,
                                firstCard.cardData.index ?? 0
                              )
                            : "Markscheme";

                        return (
                          <div className="bg-white rounded-3xl border border-[#F2F2F7] overflow-hidden">
                            <p className="text-[15px] font-rounded-bold text-[rgba(0,0,0,0.3)] px-4 pt-4 pb-2">
                              {heading}
                            </p>
                            {group.map((aoMsg, aoIdx) => {
                              const aoData = aoMsg.cardData?.aoData as
                                | {
                                    label?: string;
                                    score?: number;
                                    maxScore?: number;
                                    progress?: number;
                                    feedbackPoints?: {
                                      text: string;
                                      mark: number;
                                    }[];
                                  }
                                | undefined;
                              return (
                                <FeedbackCard
                                  key={aoMsg.id || `ao-${aoIdx}`}
                                  label={aoData?.label ?? "AO"}
                                  score={aoData?.score ?? 0}
                                  maxScore={aoData?.maxScore ?? 0}
                                  progress={aoData?.progress ?? 0}
                                  strokeColor="#06B0FF"
                                  feedbackPoints={aoData?.feedbackPoints ?? []}
                                  isLastCard={aoIdx === group.length - 1}
                                />
                              );
                            })}
                          </div>
                        );
                      })()}
                    {message.type === "strategyCard" && message.cardData && (
                      <StrategyCard
                        title="Strategy"
                        strategySteps={
                          (message.cardData
                            .strategySteps as unknown as StrategyStep[]) || []
                        }
                        currentStepIndex={
                          message.cardData.currentStepIndex || 0
                        }
                        isMarked={message.cardData.isMarked || false}
                        userMark={message.cardData.userMark || 0}
                      />
                    )}
                    {message.type === "timingCard" && message.cardData && (
                      <TimingCard
                        durationSpentInSeconds={
                          message.cardData.durationSpentInSeconds || 0
                        }
                        isMarked={message.cardData.isMarked || false}
                        subLessonId={message.cardData.subLessonId}
                        difficulty={
                          message.cardData.difficulty as unknown as
                            | QuestionDifficulty
                            | undefined
                        }
                      />
                    )}
                  </div>
                );
              }
              // Handle regular message types
              else if (
                message.type !== "systemMessage" &&
                message.message.length > 0
              ) {
                return (
                  <React.Fragment
                    key={`message-fragment-${message.id || index}`}
                  >
                    <div
                      key={message.id || `message-${index}`}
                      className={`group relative rounded-[24px] py-1 px-2 text-base md:text-sm max-w-[320px] animate-[fadeInUp_0.3s_ease-in-out]
                     ${
                       message.type === "userMessage"
                         ? "self-end text-black ml-16 my-4 mb-4"
                         : "bg-[#F2F2F7] self-start mr-16"
                     } ${index !== visibleMessages.length - 1 ? "mb-1" : ""}
                    ${shouldHaveExtraTopMargin(message.message) ? "mt-5" : ""}
                    `}
                      style={
                        message.type === "userMessage"
                          ? { backgroundColor: userMessageColor || "#00AEFF" }
                          : undefined
                      }
                    >
                      {shouldShowMessageTail(
                        message,
                        index,
                        visibleMessages
                      ) && <MessageTail messageType={message.type} />}

                      <ReactMarkdown
                        className={`markdown-styles font-rounded-semibold [&_strong]:font-medium [&_p]:m-2 relative z-20`}
                        remarkPlugins={[
                          remarkGfm,
                          [remarkMath, { singleDollarTextMath: true }],
                          supersub,
                        ]}
                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                        components={markdownComponents}
                      >
                        {processMessageContent(message.message, message.type)}
                      </ReactMarkdown>

                      <div
                        className={`absolute right-0 -bottom-4 z-20 bg-white rounded-full p-1 px-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${
                          message.type === "apiMessage" &&
                          index === visibleMessages.length - 1 &&
                          !shouldShowLoading
                            ? "flex scale-100 opacity-100"
                            : "hidden group-hover:flex scale-button"
                        } flex-row gap-1 transition-all duration-200 transform origin-bottom`}
                      >
                        <button
                          className="like-button group/like"
                          onClick={() => {
                            onClickFeedback?.("positive");
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="block group-hover/like:hidden"
                          >
                            <path
                              d="M4.46387 16.9854C4.46387 20.0879 6.4502 22.6279 8.99902 22.6279H11.8906C13.0771 23.2344 14.4834 23.5859 16.0303 23.5859H17.2607C18.4033 23.5859 19.3789 23.5156 20.0117 23.3574C21.3037 23.0322 22.1211 22.1182 22.1211 20.9668C22.1211 20.7559 22.0947 20.5713 22.0332 20.3779C22.6396 19.9121 22.9824 19.2178 22.9824 18.4619C22.9824 18.1104 22.9121 17.7676 22.7891 17.4775C23.1934 17.0469 23.4307 16.4316 23.4307 15.79C23.4307 15.3594 23.3252 14.9375 23.1494 14.6035C23.3955 14.2256 23.5361 13.7246 23.5361 13.1797C23.5361 11.7734 22.4639 10.6924 21.0752 10.6924H17.8057C17.6211 10.6924 17.498 10.6045 17.5068 10.4375C17.5508 9.52344 18.9746 7.35254 18.9746 5.56836C18.9746 4.25879 18.0518 3.30078 16.7773 3.30078C15.8545 3.30078 15.2217 3.78418 14.6152 4.93555C13.5254 7.04492 12.1982 8.89062 10.2383 11.2988H8.66504C6.27441 11.2988 4.46387 13.8301 4.46387 16.9854ZM9.93945 16.915C9.93945 15.0518 10.3525 13.8564 11.5479 12.2656C12.875 10.4814 14.7207 8.3457 16.0479 5.69141C16.3291 5.1377 16.5225 4.99707 16.8037 4.99707C17.1377 4.99707 17.3574 5.24316 17.3574 5.66504C17.3574 6.96582 15.8633 9.14551 15.8633 10.5693C15.8633 11.6328 16.7158 12.3096 17.876 12.3096H21.0312C21.541 12.3096 21.9189 12.6963 21.9189 13.2061C21.9189 13.5664 21.8047 13.8037 21.4971 14.1025C21.2686 14.3311 21.2334 14.665 21.4355 14.9023C21.6904 15.2539 21.7959 15.4912 21.7959 15.79C21.7959 16.1504 21.6289 16.458 21.2773 16.7129C20.9785 16.9326 20.873 17.2842 21.0488 17.6357C21.2334 17.9961 21.3301 18.1719 21.3301 18.4531C21.3301 18.875 21.0576 19.1914 20.5127 19.4814C20.2227 19.6396 20.1436 19.9561 20.2666 20.2285C20.4512 20.6768 20.4775 20.7646 20.4688 20.958C20.4688 21.3359 20.1963 21.6348 19.6074 21.7842C19.0889 21.9072 18.2627 21.9688 17.1729 21.96L16.0391 21.9512C12.4004 21.916 9.93945 19.8682 9.93945 16.915ZM6.06348 16.9854C6.06348 14.7529 7.20605 12.9688 8.52441 12.9072C8.75293 12.9072 8.98145 12.9072 9.20996 12.9072C8.58594 14.1201 8.31348 15.3945 8.31348 16.915C8.31348 18.5322 8.87598 19.9561 9.9043 21.0635C9.5791 21.0635 9.23633 21.0635 8.90234 21.0635C7.36426 21.002 6.06348 19.1914 6.06348 16.9854Z"
                              fill="#1C1C1E"
                            />
                          </svg>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="hidden group-hover/like:block"
                          >
                            <path
                              d="M9.28906 16.9414C9.23633 20.4043 12.0488 22.9883 16.3818 23.0234L17.6475 23.0322C18.834 23.0498 19.7393 22.9619 20.2666 22.8213C21.0576 22.6279 21.752 22.127 21.752 21.2393C21.752 20.8877 21.6729 20.6328 21.5586 20.4307C21.4971 20.3252 21.5059 20.2373 21.6025 20.2021C22.2002 19.9297 22.6484 19.376 22.6484 18.6465C22.6484 18.2334 22.5342 17.8643 22.3408 17.5918C22.2529 17.4688 22.2705 17.3633 22.4111 17.2842C22.833 17.0117 23.1143 16.4844 23.1143 15.8691C23.1143 15.4297 22.9824 14.9639 22.7363 14.7266C22.6221 14.6123 22.6396 14.5332 22.7715 14.4189C23.0615 14.1641 23.2373 13.7158 23.2373 13.2061C23.2373 12.2568 22.499 11.4922 21.541 11.4922H18.2715C17.4805 11.4922 16.9619 11.0967 16.9619 10.4551C16.9619 9.2334 18.5176 6.94824 18.5176 5.28711C18.5176 4.39062 17.9375 3.83691 17.1553 3.83691C16.4785 3.83691 16.127 4.28516 15.7314 5.03223C14.3516 7.71289 12.5234 9.89258 11.1084 11.7559C9.88672 13.3818 9.32422 14.7617 9.28906 16.9414ZM4.70996 17.0117C4.70996 19.833 6.45898 22.1533 8.78809 22.1533H10.3701C8.73535 20.8965 7.95312 19.042 7.98828 16.915C8.02344 14.6387 8.83203 12.9863 9.70215 11.8438H8.44531C6.32715 11.8438 4.70996 14.1025 4.70996 17.0117Z"
                              fill="#1C1C1E"
                            />
                          </svg>
                        </button>
                        <button
                          className="dislike-button group/dislike"
                          onClick={() => {
                            onClickFeedback?.("negative");
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="block group-hover/dislike:hidden"
                          >
                            <path
                              d="M23.5361 10.9297C23.5361 7.82715 21.5498 5.28711 19.001 5.28711H16.1094C14.9229 4.68066 13.5166 4.3291 11.9697 4.3291H10.7393C9.59668 4.3291 8.62109 4.39941 7.98828 4.55762C6.69629 4.87402 5.87891 5.79688 5.87891 6.94824C5.87891 7.15039 5.91406 7.34375 5.9668 7.52832C5.36035 8.00293 5.01758 8.68848 5.01758 9.44434C5.01758 9.7959 5.08789 10.1387 5.21094 10.4287C4.80664 10.8594 4.56934 11.4834 4.56934 12.125C4.56934 12.5469 4.6748 12.9775 4.85059 13.3115C4.60449 13.6807 4.46387 14.1816 4.46387 14.7354C4.46387 16.1416 5.53613 17.2227 6.9248 17.2227H10.1943C10.3789 17.2227 10.502 17.3105 10.4932 17.4775C10.4492 18.3828 9.02539 20.5625 9.02539 22.3467C9.02539 23.6562 9.94824 24.6143 11.2227 24.6143C12.1455 24.6143 12.7783 24.1309 13.3848 22.9795C14.4834 20.8701 15.8018 19.0244 17.7617 16.6074H19.335C21.7256 16.6074 23.5361 14.085 23.5361 10.9297ZM18.0605 11C18.0605 12.8633 17.6475 14.0498 16.4521 15.6494C15.125 17.4248 13.2793 19.5693 11.9521 22.2236C11.6709 22.7773 11.4775 22.9092 11.2051 22.9092C10.8711 22.9092 10.6514 22.6719 10.6514 22.25C10.6514 20.9492 12.1367 18.7695 12.1367 17.3369C12.1367 16.2822 11.2842 15.5967 10.124 15.5967H6.96875C6.45898 15.5967 6.08105 15.2188 6.08105 14.709C6.08105 14.3486 6.2041 14.1113 6.50293 13.8125C6.73145 13.5752 6.7666 13.2412 6.56445 13.0127C6.30957 12.6523 6.2041 12.4238 6.2041 12.125C6.2041 11.7646 6.37109 11.457 6.72266 11.1934C7.02148 10.9824 7.12695 10.6221 6.95117 10.2705C6.7666 9.91895 6.66992 9.73438 6.66992 9.46191C6.66992 9.04004 6.94238 8.71484 7.4873 8.4248C7.77734 8.2666 7.85645 7.95898 7.7334 7.67773C7.54883 7.22949 7.52246 7.15039 7.53125 6.95703C7.53125 6.5791 7.80371 6.28027 8.39258 6.13086C8.91113 5.99902 9.7373 5.94629 10.8271 5.95508L11.9609 5.96387C15.5996 5.99902 18.0605 8.03809 18.0605 11ZM21.9453 10.9297C21.9453 13.1621 20.7939 14.9463 19.4756 14.999C19.2471 15.0078 19.0186 15.0078 18.79 15.0078C19.4141 13.7861 19.6865 12.5205 19.6865 11C19.6865 9.38281 19.124 7.95898 18.1045 6.84277C18.4297 6.84277 18.7637 6.85156 19.0977 6.85156C20.6357 6.91309 21.9453 8.71484 21.9453 10.9297Z"
                              fill="#1C1C1E"
                            />
                          </svg>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="hidden group-hover/dislike:block"
                          >
                            <path
                              d="M18.7109 10.9736C18.7637 7.51074 15.9512 4.91796 11.6094 4.88281L10.3438 4.87402C9.15723 4.86523 8.26074 4.95312 7.7334 5.08495C6.94238 5.2871 6.23926 5.77929 6.23926 6.67578C6.23926 7.01855 6.32715 7.28222 6.44141 7.48437C6.50293 7.58984 6.48535 7.66894 6.39746 7.71288C5.7998 7.97656 5.34277 8.53027 5.34277 9.26855C5.34277 9.67285 5.46582 10.0508 5.65918 10.3232C5.74707 10.4375 5.72949 10.543 5.58887 10.6309C5.16699 10.8945 4.87695 11.4307 4.87695 12.0459C4.87695 12.4853 5.01758 12.9424 5.25488 13.1797C5.37793 13.2939 5.36035 13.373 5.22852 13.4873C4.92969 13.751 4.7627 14.1904 4.7627 14.709C4.7627 15.6582 5.49219 16.4141 6.45898 16.4141H9.72852C10.5195 16.4141 11.0381 16.8184 11.0381 17.4512C11.0381 18.6816 9.47363 20.9668 9.47363 22.6279C9.47363 23.5244 10.0537 24.0781 10.8359 24.0781C11.5127 24.0781 11.873 23.6299 12.2598 22.874C13.6396 20.1934 15.4766 18.0225 16.8828 16.1504C18.1045 14.5332 18.6758 13.1445 18.7109 10.9736ZM23.29 10.8945C23.29 8.08203 21.541 5.76171 19.2031 5.76171H17.6299C19.2646 7.00976 20.0469 8.87304 20.0117 10.9912C19.9766 13.2764 19.1592 14.9287 18.2979 16.0713H19.5547C21.6729 16.0713 23.29 13.8037 23.29 10.8945Z"
                              fill="#1C1C1E"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {!shouldShowLoading &&
                      message.type == "apiMessage" &&
                      index === visibleMessages.length - 1 && (
                        <div
                          key={`disclaimer-${index}-${visibleMessages.length}`}
                          className="flex flex-row mt-4 ml-2 animate-[fadeInUp_0.3s_ease-in-out] transform translate-y-0 opacity-100 transition-all"
                        >
                          <button
                            className="text-[12px] text-gray-500 hover:underline text-left leading-[18px] whitespace-pre-line cursor-pointer"
                            onClick={() => {
                              onClickDisclaimer?.();
                            }}
                          >
                            Medly can make mistakes.{"\n"}Please double check
                            responses.
                          </button>
                        </div>
                      )}
                  </React.Fragment>
                );
              } else if (message.type == "systemMessage" && index !== 0) {
                if (message.message == "next_question") {
                  return (
                    <>
                      <div
                        key={`system-next-${index}`}
                        className="flex flex-row my-4 w-full items-center justify-center text-[12px] text-gray-500 gap-0.5"
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.9912 22.751C18.9746 22.751 23.0879 18.6377 23.0879 13.6631C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6631C4.90332 18.6377 9.0166 22.751 13.9912 22.751ZM10.8447 10.8242C10.5459 10.4727 10.6426 9.98047 11.1084 9.62891C11.8555 9.03125 12.9102 8.66211 14.0088 8.66211C16.5312 8.66211 18.5264 10.3496 18.9658 12.7754H19.8008C20.249 12.7754 20.3633 13.2148 20.1084 13.5664L18.667 15.5615C18.4033 15.9307 17.9551 15.9131 17.7002 15.5615L16.25 13.5664C15.9863 13.2236 16.1094 12.7754 16.5576 12.7754H17.4541C17.0498 11.3076 15.6699 10.209 14.0088 10.209C13.2178 10.209 12.6113 10.4463 11.9961 10.9121C11.583 11.1934 11.1523 11.1846 10.8447 10.8242ZM7.88281 13.7246L9.31543 11.7295C9.58789 11.3604 10.0273 11.3779 10.2822 11.7295L11.7412 13.7246C11.9961 14.0674 11.8818 14.5068 11.4336 14.5068H10.5723C10.9766 15.9834 12.3564 17.082 14.0264 17.082C14.8174 17.082 15.4238 16.8359 16.0303 16.3789C16.4434 16.0889 16.8828 16.0977 17.1816 16.458C17.4893 16.8096 17.3926 17.3105 16.9268 17.6621C16.1797 18.2598 15.1162 18.6201 14.0264 18.6201C11.5039 18.6201 9.50879 16.9414 9.06934 14.5068H8.18164C7.7334 14.5068 7.61914 14.0674 7.88281 13.7246Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                        </svg>
                        Page changed
                      </div>
                    </>
                  );
                } else if (message.message === "canvas_updated") {
                  return (
                    <>
                      <div
                        key={`system-canvas-${index}`}
                        className="flex flex-row my-4 w-full items-center justify-center text-[12px] text-gray-500 gap-1 font-rounded-bold"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                          <path
                            d="M13.7979 17.1348C13.6133 17.4248 13.3408 17.583 13.0156 17.583C12.6904 17.583 12.4355 17.4424 12.1982 17.1436L10.124 14.6211C9.97461 14.4277 9.89551 14.2344 9.89551 14.0234C9.89551 13.584 10.2383 13.2324 10.6777 13.2324C10.9326 13.2324 11.1436 13.3291 11.3545 13.6016L12.9893 15.667L16.4873 10.0859C16.6719 9.78711 16.9092 9.6377 17.1729 9.6377C17.5947 9.6377 17.9814 9.92773 17.9814 10.3672C17.9814 10.5693 17.8848 10.7803 17.7617 10.9648L13.7979 17.1348Z"
                            fill="white"
                          />
                        </svg>
                        Canvas updated
                      </div>
                    </>
                  );
                } else if (message.message === "marking_updated") {
                  return (
                    <>
                      <div
                        key={`system-marking-${index}`}
                        className="flex flex-row my-4 w-full items-center justify-center text-[12px] text-gray-500 gap-1 font-rounded-bold"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                          <path
                            d="M13.7979 17.1348C13.6133 17.4248 13.3408 17.583 13.0156 17.583C12.6904 17.583 12.4355 17.4424 12.1982 17.1436L10.124 14.6211C9.97461 14.4277 9.89551 14.2344 9.89551 14.0234C9.89551 13.584 10.2383 13.2324 10.6777 13.2324C10.9326 13.2324 11.1436 13.3291 11.3545 13.6016L12.9893 15.667L16.4873 10.0859C16.6719 9.78711 16.9092 9.6377 17.1729 9.6377C17.5947 9.6377 17.9814 9.92773 17.9814 10.3672C17.9814 10.5693 17.8848 10.7803 17.7617 10.9648L13.7979 17.1348Z"
                            fill="white"
                          />
                        </svg>
                        Marking updated
                      </div>
                    </>
                  );
                } else if (message.message.startsWith("spot_highlighted:")) {
                  // Parse: spot_highlighted:status:text
                  const parts = message.message.split(":");
                  const status = parts[1]; // correct, partial, or incorrect
                  const highlightedText = parts.slice(2).join(":"); // rejoin in case text has colons

                  const getStatusIcon = () => {
                    if (status === "correct") {
                      return (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                          <path
                            d="M13.7979 17.1348C13.6133 17.4248 13.3408 17.583 13.0156 17.583C12.6904 17.583 12.4355 17.4424 12.1982 17.1436L10.124 14.6211C9.97461 14.4277 9.89551 14.2344 9.89551 14.0234C9.89551 13.584 10.2383 13.2324 10.6777 13.2324C10.9326 13.2324 11.1436 13.3291 11.3545 13.6016L12.9893 15.667L16.4873 10.0859C16.6719 9.78711 16.9092 9.6377 17.1729 9.6377C17.5947 9.6377 17.9814 9.92773 17.9814 10.3672C17.9814 10.5693 17.8848 10.7803 17.7617 10.9648L13.7979 17.1348Z"
                            fill="white"
                          />
                        </svg>
                      );
                    } else if (status === "partial") {
                      return (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9912 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM13.9912 20.9316V6.38574C18.0166 6.38574 21.2598 9.62012 21.2686 13.6543C21.2773 17.6885 18.0254 20.9316 13.9912 20.9316Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                        </svg>
                      );
                    } else {
                      return (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM10.9941 17.4863C10.5283 17.4863 10.1592 17.1172 10.1592 16.6426C10.1592 16.4316 10.2471 16.2207 10.4141 16.0625L12.8047 13.6631L10.4141 11.2725C10.2471 11.1143 10.1592 10.9033 10.1592 10.6924C10.1592 10.2178 10.5283 9.85742 10.9941 9.85742C11.2402 9.85742 11.4336 9.93652 11.5918 10.0947L13.9912 12.4854L16.3994 10.0859C16.5752 9.91895 16.7598 9.83984 16.9971 9.83984C17.4629 9.83984 17.832 10.209 17.832 10.6748C17.832 10.8945 17.7441 11.0879 17.5771 11.2637L15.1865 13.6631L17.5771 16.0537C17.7354 16.2207 17.8232 16.4229 17.8232 16.6426C17.8232 17.1172 17.4541 17.4863 16.9795 17.4863C16.7422 17.4863 16.54 17.3984 16.373 17.2402L13.9912 14.8584L11.6094 17.2402C11.4512 17.4072 11.2402 17.4863 10.9941 17.4863Z"
                            fill="rgba(0,0,0,0.3)"
                          />
                        </svg>
                      );
                    }
                  };

                  return (
                    <div
                      key={`system-highlight-${index}`}
                      className="flex flex-row my-4 w-full items-center justify-center text-[12px] text-gray-500 gap-1 font-rounded-bold"
                    >
                      {getStatusIcon()}
                      Highlighted '{highlightedText}'
                    </div>
                  );
                }
              }
            });
          })()}
          {shouldShowLoading && (
            <div className="relative rounded-[24px] py-3 px-4 text-base md:text-sm self-start bg-[#F2F2F7] mr-16 mt-1">
              <span className="wave-dot p-1 bg-gray-300 rounded-full mr-1"></span>
              <span className="wave-dot p-1 bg-gray-300 rounded-full mr-1"></span>
              <span className="wave-dot p-1 bg-gray-300 rounded-full mr-1"></span>
              <MessageTail messageType="apiMessageLoading" />
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes wave {
            0%,
            60%,
            100% {
              transform: initial;
            }
            30% {
              transform: translateY(-3px);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .scale-button {
            animation: scaleIn 0.2s ease-out forwards;
          }
          .wave-dot {
            display: inline-block;
            animation: wave 1s infinite;
          }
          .wave-dot:nth-child(1) {
            animation-delay: 0s;
          }
          .wave-dot:nth-child(2) {
            animation-delay: 0.1s;
          }
          .wave-dot:nth-child(3) {
            animation-delay: 0.2s;
          }

          /* Custom scrollbar styling */
          div[class*="overflow-y-auto"] {
            scrollbar-width: thin; /* Firefox */
            scrollbar-color: #d9d9d9 transparent; /* Firefox */
          }

          div[class*="overflow-y-auto"]::-webkit-scrollbar {
            width: 4px; /* Chrome/Safari/Webkit */
          }

          div[class*="overflow-y-auto"]::-webkit-scrollbar-track {
            background: transparent; /* Chrome/Safari/Webkit */
          }

          div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
            background-color: #d9d9d9; /* Chrome/Safari/Webkit */
            border-radius: 2px; /* Fully rounded for 4px width */
          }

          div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb:hover {
            background-color: #d9d9d9; /* Slightly darker on hover */
          }
        `}</style>
      </div>

      {/* Message bubble fade */}

      <div
        className="absolute top-0 bottom-0 mt-0 w-full h-full z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.2) 100%)",
        }}
      />

      {/* Text fade */}
      <div
        className="absolute top-0 bottom-0 mt-0 w-full h-full z-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 70%, rgba(255, 255, 255, 0.1) 100%)",
        }}
      />
    </>
  );
}

export default ChatThread;
