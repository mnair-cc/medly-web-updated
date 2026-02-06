import FeedbackCard from "@/app/(protected)/sessions/components/answer-components/FeedbackCard";
import MarkschemeCard from "@/app/(protected)/sessions/components/answer-components/MarkschemeCard";
import StrategyCard from "@/app/(protected)/sessions/components/answer-components/StrategyCard";
import TimingCard from "@/app/(protected)/sessions/components/answer-components/TimingCard";
import { useAudioQueue } from "@/app/(protected)/sessions/hooks/useAudioQueue";
import {
  getGlobalAudioContext,
  isAudioGloballyUnlocked,
} from "@/app/(protected)/sessions/hooks/useAudioUnlock";
import { useTextToSpeech } from "@/app/(protected)/sessions/hooks/useTextToSpeech";
import { QuestionSessionPageType } from "@/app/(protected)/sessions/types";
import { MedlyFullLogo } from "@/app/_components/icons/MedlyLogoIcon";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Spinner from "@/app/_components/Spinner";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { Message, QuestionDifficulty, StrategyStep } from "@/app/types/types";
import "katex/dist/katex.min.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import supersub from "remark-supersub";
import { CitationPreview, replaceCitationsWithHtml } from "../citations";
import { AwaitingChip } from "./AwaitingChip";
import { ToolCallChip } from "./ToolCallChip";

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
  pdfUrl,
  onNavigateToDocument,
  getPdfUrlForDocumentId,
  setPageType,
  setTargetPdfDocumentId,
  setTargetPdfPage,
  setTargetHighlightText,
  onUndoNotesChange,
  onCancelAnimation,
  isNotesAnimating,
  currentAnimatingMessageId,
  quickReplies,
  onQuickReplyClick,
  uploadRequest,
  onUploadRequest,
  isUploadingFromRequest,
  userMessageColor = "#F9F9FB",
}: {
  messages: Message[];
  options: string[];
  isAwaitingResponse: boolean;
  isLearnPage?: boolean;
  onClickDisclaimer?: () => void;
  onClickFeedback?: (type: "positive" | "negative") => void;
  onVisibleMessagesChange?: (
    visibleMessages: Message[],
    shouldShowLoading: boolean,
  ) => void;
  onSpeechControlsReady?: (controls: { fadeOutAndStop: () => void }) => void;
  voiceEnabled?: boolean;
  audioGenerationMode?: "single" | "bulk";
  pdfUrl?: string;
  onNavigateToDocument?: (documentId: string) => Promise<void> | void;
  getPdfUrlForDocumentId?: (documentId: string) => string | undefined;
  setPageType?: (type: QuestionSessionPageType) => void;
  setTargetPdfDocumentId?: (documentId: string | null) => void;
  setTargetPdfPage?: (page: number | null) => void;
  setTargetHighlightText?: (text: string | null) => void;
  onUndoNotesChange?: (messageId: string) => void;
  onCancelAnimation?: () => void;
  isNotesAnimating?: boolean;
  currentAnimatingMessageId?: string | null;
  quickReplies?: Array<{ id: string; label: string; description?: string }>;
  onQuickReplyClick?: (label: string) => void;
  uploadRequest?: { label: string };
  onUploadRequest?: () => void;
  isUploadingFromRequest?: boolean;
  userMessageColor?: string;
}) {
  const [visibleMessagesRaw, setVisibleMessages] = useState<Message[]>([]);
  const [activeTimeouts, setActiveTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const lastProcessedCountRef = useRef(0);
  const { isWideScreen } = useResponsive();
  // Deduplicate visibleMessages at render time to handle React StrictMode double-invocation
  const visibleMessages = useMemo(() => {
    const seen = new Set<string>();
    return visibleMessagesRaw.filter((m, index) => {
      // Create a unique key for each message type
      // Use index as fallback for messages without ID to prevent all ID-less messages
      // from being deduplicated to just one
      const key = m.isToolCall
        ? `tool:${m.toolCallId}`
        : m.isStatusMessage
          ? `status:${m.message}`
          : m.id
            ? `msg:${m.id}`
            : `msg:index-${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [visibleMessagesRaw]);
  const lastSpokenMessageIndexRef = useRef<number>(-1);
  const isSpeechPendingRef = useRef<boolean>(false);

  // Citation modal state
  const [citationModal, setCitationModal] = useState<{
    visible: boolean;
    documentId: string;
    pageIndex: string;
    sourceSegment: string;
    x: number;
    y: number;
  } | null>(null);
  const [citationModalAnimated, setCitationModalAnimated] = useState(false);
  const [showCitationPreview, setShowCitationPreview] = useState(false);
  const [isCitationPreviewReady, setIsCitationPreviewReady] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const citationShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Prevent repeated mouseover bubbling from re-opening/remounting the same citation modal,
  // which can cause CitationPreview to restart its highlight effect in a tight loop.
  const lastHoveredCitationKeyRef = useRef<string | null>(null);
  // More reliable hover tracking for citation modal hide/show
  const citationHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringCitationRef = useRef(false);
  const isHoveringCitationModalRef = useRef(false);

  const clearCitationHideTimeout = useCallback(() => {
    if (citationHideTimeoutRef.current) {
      clearTimeout(citationHideTimeoutRef.current);
      citationHideTimeoutRef.current = null;
    }
  }, []);

  const hideCitationModal = useCallback(() => {
    lastHoveredCitationKeyRef.current = null;
    isHoveringCitationRef.current = false;
    isHoveringCitationModalRef.current = false;
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }
    setCitationModalAnimated(false);
    setShowCitationPreview(false);
    setIsCitationPreviewReady(false);
    setCitationModal(null);
  }, []);

  const scheduleCitationHide = useCallback(
    (delayMs: number = 200) => {
      clearCitationHideTimeout();
      citationHideTimeoutRef.current = setTimeout(() => {
        if (
          !isHoveringCitationRef.current &&
          !isHoveringCitationModalRef.current
        ) {
          hideCitationModal();
        }
      }, delayMs);
    },
    [clearCitationHideTimeout, hideCitationModal],
  );

  // Bulk audio state
  const [bulkAudioUrl, setBulkAudioUrl] = useState<string | null>(null);
  const [isBulkAudioPlaying, setIsBulkAudioPlaying] = useState(false);
  const lastBulkAudioMessagesRef = useRef<string>("");
  const isGeneratingBulkAudioRef = useRef<boolean>(false);

  // Web Audio API refs for bulk audio fade
  const bulkAudioContextRef = useRef<AudioContext | null>(null);
  const bulkGainNodeRef = useRef<GainNode | null>(null);
  const bulkSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
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
        error,
      );
    },
  });

  const charsPerMs = 0.05; // 50 characters per second

  // Check if message mode is enabled (defaults to true for current behavior)
  const messageMode = process.env.NEXT_PUBLIC_MESSAGE_MODE !== "false";

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
          "📱 Resuming suspended AudioContext before bulk playback...",
        );
        await globalAudioContext.resume();
        console.log(
          "✅ AudioContext resumed, new state:",
          globalAudioContext.state,
        );
      }

      console.log("🔊 Fetching and decoding bulk audio...");

      // Fetch the audio data
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${response.status} ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`🔊 Audio fetched: ${arrayBuffer.byteLength} bytes`);

      // Decode the audio
      const audioBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
      console.log(
        `🔊 Audio decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels`,
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
      bulkSourceNodeRef.current = source;

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
              if (bulkSourceNodeRef.current) {
                try {
                  bulkSourceNodeRef.current.stop();
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
            fadeTime * 1000 + 30,
          ); // Add 30ms buffer
        } catch (fadeError) {
          console.warn(
            "⚠️ Bulk audio fade failed, stopping immediately:",
            fadeError,
          );
          // Fallback to immediate stop
          stopBulkAudio();
        }
      } else {
        // No Web Audio API available, stop immediately
        console.log(
          "⏹️ Web Audio API not available for bulk audio, stopping immediately",
        );
        stopBulkAudio();
      }
    }
  }, [isBulkAudioPlaying, bulkAudioUrl]);

  // Stop bulk audio immediately (without fade) - Web Audio API version
  const stopBulkAudio = useCallback(() => {
    console.log("⏹️ Stopping bulk audio");

    // Clear any active fade
    if (bulkFadeTimeoutRef.current) {
      clearTimeout(bulkFadeTimeoutRef.current);
      bulkFadeTimeoutRef.current = null;
    }

    // Stop the audio source if it's still playing
    if (bulkSourceNodeRef.current) {
      try {
        bulkSourceNodeRef.current.stop();
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
    [getMessagesHash],
  );

  // Markdown components override (cast to any to avoid strict type mismatch across versions)
  const markdownComponents: any = {
    ul: (props: any) => <ul className="list-disc pl-2 ml-5 mb-3" {...props} />,
    ol: (props: any) => (
      <ol className="list-decimal pl-2 ml-5 mb-3" {...props} />
    ),
    li: (props: any) => <li className="mb-1" {...props} />,
    h1: (props: any) => (
      <h1 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h1>
    ),
    h2: (props: any) => (
      <h2 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h2>
    ),
    h3: (props: any) => (
      <h3 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h3>
    ),
    h4: (props: any) => (
      <h4 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h4>
    ),
    h5: (props: any) => (
      <h5 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h5>
    ),
    h6: (props: any) => (
      <h6 className="font-rounded-bold mt-2 relative pl-4">
        <span className="absolute left-0 text-[#595959]/50 font-rounded-bold">
          #
        </span>
        {props.children}
      </h6>
    ),
  };

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
    console.log(
      "[Thread] Effect running. lastProcessedRef:",
      lastProcessedCountRef.current,
      "messages.length:",
      messages.length,
    );
    const newMessages = messages.slice(lastProcessedCountRef.current);
    console.log(
      "[Thread] New messages to process:",
      newMessages.length,
      newMessages.map((m) => ({
        id: m.id?.slice(-10),
        type: m.isToolCall ? "tool" : m.isStatusMessage ? "status" : m.type,
      })),
    );

    if (newMessages.length === 0) {
      console.log("[Thread] No new messages, returning early");
      return;
    }

    // Check if this is an initial load (loading pre-existing messages from database)
    // vs new messages arriving during an active session
    const isInitialLoad = lastProcessedCountRef.current === 0;

    // For initial load, add ALL messages immediately (no queue processing needed)
    // This handles loading historical conversations from the database
    if (isInitialLoad && newMessages.length >= 1) {
      console.log(
        "[Thread] Initial load detected - adding all messages immediately",
      );
      setVisibleMessages(newMessages);
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
        msg.type === "timingCard" ||
        msg.isToolCall || // Tool call messages should appear immediately
        msg.isStatusMessage || // Status messages should appear immediately too
        msg.isStreaming || // Streaming messages should appear immediately for real-time display
        msg.isAwaitingResponse, // Awaiting messages should appear immediately
    );

    const systemMessages = newMessages.filter(
      (msg) => msg.type === "systemMessage",
    );
    const userMessages = newMessages.filter(
      (msg) => msg.type === "userMessage",
    );
    const apiMessages = newMessages.filter((msg) => msg.type === "apiMessage");

    // console.log("Immediate messages:", immediateMessages.length, "User messages:", userMessages.length, "API messages:", apiMessages.length);

    // Always add immediate messages directly to visible (no delay needed)
    if (immediateMessages.length > 0) {
      console.log(
        "[Thread] Immediate messages to add:",
        immediateMessages.length,
      );
      setVisibleMessages((prev) => {
        console.log(
          "[Thread] setVisibleMessages called. prev.length:",
          prev.length,
        );
        // Deduplicate by id AND content to prevent double-adding
        const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
        const existingToolCallIds = new Set(
          prev
            .filter((m) => m.isToolCall)
            .map((m) => m.toolCallId)
            .filter(Boolean),
        );
        const existingStatusContents = new Set(
          prev.filter((m) => m.isStatusMessage).map((m) => m.message),
        );

        const filteredMessages = immediateMessages.filter((m) => {
          // Skip if already exists by ID
          if (m.id && existingIds.has(m.id)) {
            console.log("[Thread] SKIP by ID:", m.id?.slice(-10));
            return false;
          }
          // Skip duplicate tool calls by toolCallId
          if (
            m.isToolCall &&
            m.toolCallId &&
            existingToolCallIds.has(m.toolCallId)
          ) {
            console.log(
              "[Thread] SKIP tool by toolCallId:",
              m.toolCallId?.slice(-10),
            );
            return false;
          }
          // Skip duplicate status messages by content
          if (m.isStatusMessage && existingStatusContents.has(m.message)) {
            console.log(
              "[Thread] SKIP status by content:",
              m.message?.slice(0, 20),
            );
            return false;
          }
          console.log(
            "[Thread] ADDING to visible:",
            m.id?.slice(-10),
            m.isToolCall ? "tool" : m.isStatusMessage ? "status" : m.type,
          );
          return true;
        });

        const result =
          filteredMessages.length > 0 ? [...prev, ...filteredMessages] : prev;
        console.log("[Thread] visibleMessages after update:", result.length);
        return result;
      });
    }

    // If user sent a message, clear the queue and immediately show user messages
    if (userMessages.length > 0) {
      // console.log(
      //   "User message detected - clearing message queue and showing user messages immediately"
      // );

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
      // No user interruption, just add API messages to the queue
      // console.log("Adding API messages to queue for delayed processing");

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

  // Sync updates to existing messages (e.g., tool call status changes, streaming content)
  useEffect(() => {
    const messagesById = new Map(messages.map((m) => [m.id, m]));

    setVisibleMessages((prev) => {
      let hasChanges = false;
      const updated = prev.map((visibleMsg) => {
        if (!visibleMsg.id) return visibleMsg;

        const sourceMsg = messagesById.get(visibleMsg.id);
        if (!sourceMsg) return visibleMsg;

        // Check for tool call updates (status and display detail)
        if (visibleMsg.isToolCall) {
          const statusChanged =
            visibleMsg.toolCallStatus !== sourceMsg.toolCallStatus;
          const displayDetailChanged =
            visibleMsg.toolDisplayDetail !== sourceMsg.toolDisplayDetail;

          if (statusChanged || displayDetailChanged) {
            hasChanges = true;
            return {
              ...visibleMsg,
              toolCallStatus: sourceMsg.toolCallStatus,
              toolDisplayDetail: sourceMsg.toolDisplayDetail,
            };
          }
        }

        // Check for streaming message updates (content changes during streaming)
        if (visibleMsg.isStreaming || sourceMsg.isStreaming) {
          const contentChanged = visibleMsg.message !== sourceMsg.message;
          const streamingChanged =
            visibleMsg.isStreaming !== sourceMsg.isStreaming;

          if (contentChanged || streamingChanged) {
            hasChanges = true;
            return {
              ...visibleMsg,
              message: sourceMsg.message,
              isStreaming: sourceMsg.isStreaming,
            };
          }
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

      // console.log(`Processing next message from queue: "${nextMessage.message.substring(0, 30)}..."`);

      // Calculate delay based on message type and previous message
      // Skip delay when messageMode is false - display instantly
      let delay = 0;
      if (
        messageMode &&
        nextMessage.type === "apiMessage" &&
        visibleMessages.length > 0
      ) {
        const lastVisible = visibleMessages[visibleMessages.length - 1];
        if (lastVisible.type === "apiMessage") {
          const prevMessageLength = lastVisible.message.length;
          delay = Math.min(
            Math.max(prevMessageLength / charsPerMs, 1000), // minimum 1000ms
            2500, // maximum 2.5s
          );
        }
      }

      // console.log(`Setting delay of ${delay}ms for next message`);

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

  // Citation hover modal handlers
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    let activeCitation: HTMLElement | null = null;

    const handleCitationMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const citation = target.closest(".citation-chat") as HTMLElement | null;
      if (!citation) return;

      clearCitationHideTimeout();
      isHoveringCitationRef.current = true;

      const documentId = citation.getAttribute("data-document-id") || "";
      const pageIndex = citation.getAttribute("data-page-index");
      const sourceSegment = citation.getAttribute("data-source-segment");
      if (!pageIndex || !sourceSegment) {
        return;
      }

      const hoverKey = `${documentId}|${pageIndex}|${sourceSegment}`;
      // If we're already showing this exact citation, ignore bubbling mouseover events.
      if (lastHoveredCitationKeyRef.current === hoverKey) {
        activeCitation = citation;
        return;
      }
      lastHoveredCitationKeyRef.current = hoverKey;
      activeCitation = citation;

      const rect = citation.getBoundingClientRect();

      setCitationModalAnimated(false);
      setIsCitationPreviewReady(false);
      // Start loading immediately, but keep the hover UI hidden until preview is ready.
      setShowCitationPreview(true);
      setCitationModal({
        visible: true,
        documentId,
        pageIndex,
        sourceSegment,
        x: rect.left - 320 - 8, // Position to the left (320px modal width + 8px gap)
        y: rect.top,
      });
    };

    const handleCitationMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const citation = target.closest(".citation-chat") as HTMLElement | null;
      if (!citation) return;

      const related = (e.relatedTarget as HTMLElement | null) ?? null;
      const relatedIsModal = related?.closest("[data-citation-modal]") !== null;
      const relatedIsCitation = related && citation.contains(related);

      // Don't hide if moving to modal or to another part of citation
      if (relatedIsModal) {
        isHoveringCitationRef.current = false;
        isHoveringCitationModalRef.current = true;
        return;
      }

      if (relatedIsCitation) {
        return;
      }

      // Schedule hide with delay to allow moving to modal
      if (activeCitation === citation) {
        isHoveringCitationRef.current = false;
        scheduleCitationHide();
      }
    };

    const handleContainerMouseLeave = () => {
      isHoveringCitationRef.current = false;
      isHoveringCitationModalRef.current = false;
      scheduleCitationHide(0);
    };

    const handleCitationClick = (e: MouseEvent) => {
      console.log("[CITE-CLICK] event");
      const target = e.target as HTMLElement | null;
      if (!target) {
        console.log("[CITE-CLICK] no target");
        return;
      }
      const citation = target.closest(".citation-chat") as HTMLElement | null;
      if (!citation) {
        console.log("[CITE-CLICK] no citation element");
        return;
      }
      const documentId = citation.getAttribute("data-document-id") || "";
      const pageIndexAttr = citation.getAttribute("data-page-index") || "";
      const sourceSegment = citation.getAttribute("data-source-segment") || "";

      // Handle comma/space separated, default to first number
      const first = pageIndexAttr.split(/[,\s]+/).find(Boolean);
      const pageIndex = first ? parseInt(first, 10) : NaN;
      if (Number.isNaN(pageIndex) || pageIndex < 0) {
        console.log("[CITE-CLICK] invalid page index", {
          pageIndexAttr,
          first,
          parsed: pageIndex,
        });
        return;
      }

      // Citations use 0-indexed pageIndex; DocumentPage expects 1-indexed page number.
      const pageNumber = pageIndex + 1;
      console.log("[CITE-CLICK] parsed", {
        documentId,
        pageIndexAttr,
        pageIndex,
        pageNumber,
        hasSourceSegment: !!sourceSegment,
      });

      // Force a state change even when clicking the same citation repeatedly.
      // This ensures DocumentPage re-runs the flash highlight effect.
      const scheduleJump = () => {
        setTargetPdfDocumentId?.(documentId || null);
        setTargetHighlightText?.(sourceSegment || null);
        setTargetPdfPage?.(pageNumber);
      };
      setTargetHighlightText?.(null);
      setTargetPdfPage?.(null);
      requestAnimationFrame(scheduleJump);

      // Navigate cross-document if needed (no-op if we're already there).
      if (documentId && onNavigateToDocument) {
        try {
          const currentPath =
            typeof window !== "undefined" ? window.location.pathname : "";
          const alreadyOnDoc = currentPath.includes(`/open/doc/${documentId}`);
          if (!alreadyOnDoc) {
            void onNavigateToDocument(documentId);
          }
        } catch {
          void onNavigateToDocument(documentId);
        }
      } else {
        // Same-document fallback: ensure document view is visible.
        setPageType?.(QuestionSessionPageType.Document);
      }
    };

    container.addEventListener("mouseover", handleCitationMouseOver);
    container.addEventListener("mouseout", handleCitationMouseOut);
    container.addEventListener("click", handleCitationClick);
    container.addEventListener("mouseleave", handleContainerMouseLeave);

    return () => {
      container.removeEventListener("mouseover", handleCitationMouseOver);
      container.removeEventListener("mouseout", handleCitationMouseOut);
      container.removeEventListener("click", handleCitationClick);
      container.removeEventListener("mouseleave", handleContainerMouseLeave);
      clearCitationHideTimeout();
    };
  }, [
    setPageType,
    onNavigateToDocument,
    setTargetPdfDocumentId,
    setTargetPdfPage,
    setTargetHighlightText,
    clearCitationHideTimeout,
    scheduleCitationHide,
  ]);

  // Check if there are messages still pending in the queue
  const hasPendingMessages = messageQueue.length > 0;

  // Check if the last visible message is a running tool call
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
  const hasRunningToolCall =
    lastVisibleMessage?.isToolCall &&
    lastVisibleMessage?.toolCallStatus === "running";

  // Check if there's an API message streaming (last message is from API and has content)
  const hasStreamingApiMessage =
    lastVisibleMessage?.type === "apiMessage" && lastVisibleMessage?.message;

  // Don't show loading bubble if a tool call is already showing (it has its own spinner) or if API is streaming
  const shouldShowLoading =
    (isAwaitingResponse || hasPendingMessages) &&
    !hasRunningToolCall &&
    !hasStreamingApiMessage;

  // Notify parent when visible messages or loading state changes
  useEffect(() => {
    if (onVisibleMessagesChange) {
      onVisibleMessagesChange(visibleMessages, shouldShowLoading);
    }
  }, [visibleMessages, shouldShowLoading, onVisibleMessagesChange]);

  // Process text to add line breaks where messages would be split (for non-message mode)
  const addLineBreaksAtSplitPoints = (text: string): string => {
    // Temporarily protect LaTeX expressions from processing
    const latexPlaceholders: string[] = [];
    let protectedText = text;

    // Replace LaTeX expressions with placeholders
    const latexRegexes = [
      /\$\$([\s\S]*?)\$\$/g, // Block LaTeX with $$
      /\$([^\$]*?)\$/g, // Inline LaTeX with $
      /\\\[([\s\S]*?)\\\]/g, // Block LaTeX with \[ \]
      /\\\(([\s\S]*?)\\\)/g, // Inline LaTeX with \( \)
    ];

    latexRegexes.forEach((regex) => {
      protectedText = protectedText.replace(regex, (match: string) => {
        const placeholder = `__LATEX_${latexPlaceholders.length}__`;
        latexPlaceholders.push(match);
        return placeholder;
      });
    });

    // Step 1: Split by newlines first - each line becomes a potential segment
    const newlineSplit = protectedText
      .replace("\n$$", "$$")
      .replace(/\n\n/g, "\n")
      .split("\n")
      .filter((segment) => segment.trim().length > 0);

    const processedSegments: string[] = [];

    // Step 2: Process each line-separated segment
    for (const segment of newlineSplit) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) continue;

      // Check if this segment contains sentence-ending punctuation
      const hasSentenceEnding = /[.!?]/.test(trimmedSegment);

      if (!hasSentenceEnding) {
        // No sentence punctuation - treat as single segment
        processedSegments.push(trimmedSegment);
      } else {
        // Has sentence punctuation - split by sentence boundaries
        const sentences = trimmedSegment
          .split(/([.!?])(\s+|$)/)
          .filter((part) => part.trim().length > 0);

        let currentSentence = "";

        for (let i = 0; i < sentences.length; i++) {
          const part = sentences[i];

          // If this is punctuation
          if (/^[.!?]$/.test(part)) {
            currentSentence += part;

            // Check if this should NOT be split:
            const beforePunct = currentSentence.slice(0, -1);
            const nextPart = sentences[i + 1];
            const beforeTrimmed = beforePunct.trim();
            const beforeLastWord = beforeTrimmed.split(/\s+/).pop() || "";

            // 1. Decimal numbers (e.g., "3.14", "123.456")
            // Check if period is between digits (before and after)
            const isDecimal =
              part === "." &&
              /\d$/.test(beforePunct) &&
              nextPart &&
              /^\s*\d/.test(nextPart);

            // 2. List items - more robust detection
            // Matches: "1.", "2.", "a.", "i.", "A.", "I.", "iv.", etc.
            // Also handles markdown headers like "### 1. Title" or "## 2. Subtitle"
            const isListItem =
              part === "." &&
              // Check if the last word before period is a list marker (number or letter)
              (/^(?:\d+|[a-z]|[ivx]+|[A-Z]|[IVX]+)$/i.test(beforeLastWord) ||
                // Or if it's a numbered list pattern at start of line/segment (with optional markdown headers)
                /^(?:#{1,6}\s+)?(?:\d+|[a-z]|[ivx]+|[A-Z]|[IVX]+)\s*$/i.test(
                  beforeTrimmed,
                )) &&
              // Ensure there's content after (not end of segment)
              nextPart &&
              // Next part should have content (not just whitespace or another number/letter)
              nextPart.trim().length > 0 &&
              // Don't split if next part looks like continuation (starts with letter, not just another number)
              !/^\s*(?:\d+|[a-z]|[ivx]+|[A-Z]|[IVX]+)\s*$/i.test(
                nextPart.trim(),
              );

            // 3. Abbreviations (e.g., "Dr.", "Mr.", "etc.", "e.g.", "i.e.")
            const isAbbreviation =
              part === "." &&
              /\b(?:Dr|Mr|Mrs|Ms|Prof|etc|vs|e\.g|i\.e|approx|est|inc|corp|ltd|co|st|ave|blvd|rd)$/i.test(
                beforePunct,
              );

            if (!isDecimal && !isListItem && !isAbbreviation) {
              // This is a sentence boundary - push the current sentence
              if (currentSentence.trim()) {
                processedSegments.push(currentSentence.trim());
              }
              currentSentence = "";
              // Skip the whitespace part that follows punctuation
              if (i + 1 < sentences.length && /^\s+$/.test(sentences[i + 1])) {
                i++;
              }
            } else if (sentences[i + 1]) {
              // Not a sentence boundary - add space back (filter removed it)
              currentSentence += " ";
            }
          } else {
            // This is regular text
            currentSentence += part;
          }
        }

        // Add any remaining text as a segment
        if (currentSentence.trim()) {
          processedSegments.push(currentSentence.trim());
        }
      }
    }

    // Restore LaTeX expressions
    const restoredSegments = processedSegments
      .map((segment) => {
        let result = segment;
        latexPlaceholders.forEach((latex, index) => {
          result = result.replace(`__LATEX_${index}__`, latex);
        });
        return result;
      })
      .filter((segment) => segment.length > 0);

    // Join segments, preserving list structure (single newline between list items)
    const listItemRegex = /^(?:[-*+]|\d+\.)\s/;
    const parts: string[] = [];
    for (let i = 0; i < restoredSegments.length; i++) {
      const current = restoredSegments[i];
      const next = restoredSegments[i + 1];
      parts.push(current);
      if (next) {
        // Use single newline if both current and next are list items
        const currentIsList = listItemRegex.test(current);
        const nextIsList = listItemRegex.test(next);
        parts.push(currentIsList && nextIsList ? "\n" : "\n\n");
      }
    }

    return parts.join("");
  };

  const processMessageContent = (content: string, type: string) => {
    // Replace question pattern with custom component
    // More specific regex to avoid matching numbers in mathematical expressions
    const questionRegex =
      /(?:(?:question|Q)\s+(\d+)(?:\s+(?:part|about|on)\s+([a-z\d])(?:\b|$))?)|(?:(?:^|\s)(\d+)\s*\(\s*([a-z\d])\s*\)(?=\s|$))/gi;

    // Skills regex to match /Define, /Summarize, /Explain, /Contextualize
    const skillRegex =
      /\/(Define|Summarize|Explain|Contextualize|Simplify|Brief me|Add comment|What did I miss\?)(?=\s|$)/gi;

    // First, normalize escape sequences
    let processed = content.replace(/\\\\/g, "\\").replace(/\\n/g, "\n");

    // Replace skills
    processed = processed.replace(skillRegex, (_, skillName) => {
      return `<span class="text-[#595959] font-rounded-bold bg-[rgba(255,255,255,0.8)] rounded-[10px] py-1 px-2 mr-1 -ml-1.5">${skillName}</span>`;
    });

    // Replace question patterns
    processed = processed.replace(questionRegex, (_, q1, p1, q2, p2) => {
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

      return _;
    });

    // Replace citations LAST to avoid other regexes matching inside HTML attributes
    processed = replaceCitationsWithHtml(processed, undefined, "citation-chat");

    return processed;
  };

  const shouldHaveExtraTopMargin = (content: string) => {
    const questionRegex =
      /(?:(?:question|Q)\s+(\d+)(?:\s+(?:part|about|on)\s+([a-z\d])(?:\b|$))?)|(?:(?:^|\s)(\d+)\s*\(\s*([a-z\d])\s*\)(?=\s|$))/gi;
    return questionRegex.test(content);
  };

  const shouldShowMessageTail = (
    message: Message,
    index: number,
    messages: Message[],
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
                fill={isWideScreen ? userMessageColor : "white"}
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
        ref={chatContainerRef}
        className={`flex flex-col items-center w-full px-4 ${isLearnPage ? "pt-16" : "pt-4"
          }`}
      >
        {/* Citation Modal */}
        {(() => {
          if (!citationModal || !citationModal.visible) return null;
          const resolvedPdfUrl =
            (citationModal.documentId
              ? getPdfUrlForDocumentId?.(citationModal.documentId)
              : undefined) ?? pdfUrl;
          if (!resolvedPdfUrl) return null;

          // Citations store 0-indexed pageIndex; CitationPreview expects 1-based.
          const first = citationModal.pageIndex.split(/[,\s]+/).find(Boolean);
          const pageIndex = first ? Number.parseInt(first, 10) : NaN;
          const pageNumber =
            !Number.isNaN(pageIndex) && pageIndex >= 0 ? pageIndex + 1 : 1;

          return (
            <div
              data-citation-modal
              className={`fixed z-50 w-[320px] h-[240px] bg-white/95 backdrop-blur-[16px] rounded-[16px] shadow-[0_0_16px_rgba(0,0,0,0.16)] border border-[#f2f2f7] transition-all duration-150 ease-out overflow-hidden ${citationModalAnimated && isCitationPreviewReady
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-90 pointer-events-none"
                }`}
              style={{
                left: `${citationModal.x}px`,
                top: `${citationModal.y}px`,
                transformOrigin: "right center",
              }}
              onClick={(e) => {
                // Clicking the hover preview should behave like clicking the citation itself:
                // navigate to the cited document, jump to the cited page, and highlight the cited text.
                e.preventDefault();
                e.stopPropagation();

                const documentId = citationModal.documentId || "";
                const sourceSegment = citationModal.sourceSegment || "";

                const first = citationModal.pageIndex
                  .split(/[,\s]+/)
                  .find(Boolean);
                const pageIndex = first ? Number.parseInt(first, 10) : NaN;
                if (Number.isNaN(pageIndex) || pageIndex < 0) return;
                const pageNumber = pageIndex + 1; // citation pageIndex is 0-based

                setTargetPdfDocumentId?.(documentId || null);
                setTargetHighlightText?.(sourceSegment || null);
                setTargetPdfPage?.(pageNumber);

                if (documentId && onNavigateToDocument) {
                  try {
                    const currentPath =
                      typeof window !== "undefined"
                        ? window.location.pathname
                        : "";
                    const alreadyOnDoc = currentPath.includes(
                      `/open/doc/${documentId}`,
                    );
                    if (!alreadyOnDoc) {
                      void onNavigateToDocument(documentId);
                    }
                  } catch {
                    void onNavigateToDocument(documentId);
                  }
                } else {
                  setPageType?.(QuestionSessionPageType.Document);
                }
              }}
              onMouseEnter={() => {
                clearCitationHideTimeout();
                isHoveringCitationModalRef.current = true;
              }}
              onMouseLeave={(e) => {
                isHoveringCitationModalRef.current = false;
                const related = (e.relatedTarget as HTMLElement | null) ?? null;
                const relatedIsCitation =
                  related?.closest(".citation-chat") !== null;
                if (!relatedIsCitation) {
                  scheduleCitationHide();
                }
              }}
            >
              {showCitationPreview && (
                <div className="w-full h-[240px]">
                  <CitationPreview
                    pdfUrl={resolvedPdfUrl}
                    pageNumber={pageNumber}
                    sourceText={citationModal.sourceSegment}
                    documentId={citationModal.documentId}
                    onPreviewReady={() => {
                      // Only animate in if we're still hovering this citation
                      const key = `${citationModal.documentId}|${citationModal.pageIndex}|${citationModal.sourceSegment}`;
                      if (lastHoveredCitationKeyRef.current !== key) return;
                      setIsCitationPreviewReady(true);
                      // Give the browser a moment to paint the rendered PDF before we fade in
                      if (citationShowTimeoutRef.current) {
                        clearTimeout(citationShowTimeoutRef.current);
                      }
                      citationShowTimeoutRef.current = setTimeout(() => {
                        // Re-check hover key in case the user moved away quickly
                        if (lastHoveredCitationKeyRef.current !== key) return;
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            setCitationModalAnimated(true);
                          });
                        });
                      }, 200);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* Spacer to push messages to bottom when container isn't full */}
        {/* <div className="flex-grow"></div> */}
        <div className="flex flex-col w-full">
          {(() => {
            // Render each message separately (no grouping)
            if (!messageMode) {
              const groupedMessages: Array<{
                messages: Message[];
                type: "api" | "other";
                startIndex: number;
                showLogo: boolean;
              }> = [];

              visibleMessages.forEach((message, index) => {
                const prevMessage =
                  index > 0 ? visibleMessages[index - 1] : null;
                // Show logo before the first assistant action of each invocation
                const isAssistantMessage =
                  message.type === "apiMessage" || !!message.isToolCall;
                const isNewInvocation =
                  !prevMessage ||
                  prevMessage.type === "userMessage" ||
                  (prevMessage.invocationId !== message.invocationId &&
                    message.invocationId !== undefined);
                const showLogo = isAssistantMessage && isNewInvocation;

                console.log("[Thread] Logo check:", {
                  index,
                  type: message.type,
                  invocationId: message.invocationId,
                  prevInvocationId: prevMessage?.invocationId,
                  isAssistantMessage,
                  isNewInvocation,
                  showLogo,
                });

                if (
                  message.type === "apiMessage" &&
                  message.message.length > 0
                ) {
                  // Each API message is its own group
                  groupedMessages.push({
                    messages: [message],
                    type: "api",
                    startIndex: index,
                    showLogo,
                  });
                } else {
                  groupedMessages.push({
                    messages: [message],
                    type: "other",
                    startIndex: index,
                    showLogo,
                  });
                }
              });

              return groupedMessages.map((group, groupIndex) => {
                if (group.type === "api") {
                  // Render grouped API messages as plain text block
                  // Join messages with spaces first, then add line breaks at split points (only in message mode)
                  const combinedText = group.messages
                    .map((m) => m.message)
                    .join(" ");
                  const textWithLineBreaks = messageMode
                    ? addLineBreaksAtSplitPoints(combinedText)
                    : combinedText;
                  const firstMessage = group.messages[0];
                  const isLastGroup = groupIndex === groupedMessages.length - 1;
                  const isLastApiMessage = isLastGroup && !shouldShowLoading;

                  // Use pre-computed showLogo from grouping (first assistant message after user)
                  const showLogo = group.showLogo;

                  return (
                    <React.Fragment key={`api-group-${group.startIndex}`}>
                      <div
                        className={`w-11/12 self-start mr-16 ${showLogo ? "mt-8 mb-4" : "mb-1"} animate-[fadeInUp_0.3s_ease-out]`}
                      >
                        {showLogo && (
                          <div className="mb-4">
                            <MedlyFullLogo />
                          </div>
                        )}
                        <ReactMarkdown
                          className="markdown-styles font-rounded-semibold leading-relaxed [&_strong]:font-rounded-bold [&_p]:m-0 [&_p]:mb-2"
                          remarkPlugins={[
                            remarkGfm,
                            [remarkMath, { singleDollarTextMath: true }],
                            supersub,
                          ]}
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                          components={markdownComponents}
                        >
                          {processMessageContent(
                            textWithLineBreaks,
                            "apiMessage",
                          )}
                        </ReactMarkdown>
                        {/* Quick replies - show for last API message */}
                        {isLastApiMessage &&
                          quickReplies &&
                          quickReplies.length > 0 && (
                            <div className="mt-4 flex flex-col gap-1 animate-[fadeInUp_0.3s_ease-out]">
                              {quickReplies.map((reply) => (
                                <PrimaryButtonClicky
                                  key={reply.id}
                                  buttonText={reply.label}
                                  description={reply.description || " "}
                                  onPress={() =>
                                    onQuickReplyClick?.(reply.label)
                                  }
                                  showKeyboardShortcut={false}
                                />
                              ))}
                            </div>
                          )}
                        {/* Upload request button - show for last API message */}
                        {isLastApiMessage && uploadRequest && (
                          <div className="mt-4 animate-[fadeInUp_0.3s_ease-out]">
                            <button
                              onClick={onUploadRequest}
                              disabled={isUploadingFromRequest}
                              className="w-full relative flex flex-row items-center justify-start py-4 px-4 rounded-[16px] border overflow-visible text-[15px] font-rounded-bold min-w-[80px] min-h-[76px] transition-transform duration-100 gap-3 bg-white border-[#F0F0F0] hover:translate-y-[2px] active:translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed"
                              style={{ borderBottomWidth: "4px" }}
                            >
                              {isUploadingFromRequest ? (
                                <Spinner style="dark" />
                              ) : (
                                <svg
                                  width="28"
                                  height="28"
                                  viewBox="0 0 28 28"
                                  fill="none"
                                >
                                  <path
                                    d="M16.6631 17.4424V19.2002H20.7852C23.5449 19.2002 25.2324 17.5654 25.2324 15.333C25.2324 13.4697 24.1689 11.9668 22.4199 11.2725C22.4287 7.2998 19.5635 4.43457 15.8809 4.43457C13.543 4.43457 11.7852 5.63867 10.6865 7.22949C8.58594 6.71094 6.10742 8.30176 6.01953 10.7803C4.00684 11.123 2.76758 12.793 2.76758 14.9199C2.76758 17.2842 4.56934 19.2002 7.49609 19.2002H11.3018V17.4424H7.49609C5.58008 17.4424 4.54297 16.2998 4.54297 14.8848C4.54297 13.2412 5.62402 12.0898 7.41699 12.0898C7.54883 12.0898 7.60156 12.0195 7.59277 11.8965C7.54004 9.27734 9.41211 8.43359 11.3018 8.9873C11.416 9.01367 11.4863 8.99609 11.5391 8.89941C12.3828 7.36133 13.6924 6.18359 15.8721 6.18359C18.6318 6.18359 20.6006 8.37207 20.7324 10.9297C20.7588 11.3955 20.7236 11.9141 20.6885 12.3359C20.6709 12.459 20.7236 12.5293 20.8379 12.5469C22.4463 12.8545 23.457 13.7861 23.457 15.2539C23.457 16.5371 22.5605 17.4424 20.75 17.4424H16.6631ZM13.9824 23.5947C14.4395 23.5947 14.8086 23.2256 14.8086 22.7861V14.6914L14.7207 13.127L15.2832 13.7773L16.5049 15.0078C16.6543 15.166 16.8564 15.2539 17.0586 15.2539C17.4629 15.2539 17.7969 14.9551 17.7969 14.542C17.7969 14.3311 17.7178 14.1641 17.5596 14.0234L14.6064 11.2461C14.3867 11.0439 14.2021 10.9648 13.9824 10.9648C13.7715 10.9648 13.5781 11.0439 13.3584 11.2461L10.4053 14.0234C10.2471 14.1641 10.1768 14.3311 10.1768 14.542C10.1768 14.9551 10.502 15.2539 10.9062 15.2539C11.1084 15.2539 11.3105 15.166 11.46 15.0078L12.6816 13.7773L13.2529 13.127L13.1562 14.6914V22.7861C13.1562 23.2256 13.5342 23.5947 13.9824 23.5947Z"
                                    fill="#1C1C1E"
                                  />
                                </svg>
                              )}
                              <div className="flex flex-col items-start">
                                <span className="text-[rgba(0,0,0,0.8)]">
                                  {isUploadingFromRequest
                                    ? "Uploading..."
                                    : uploadRequest.label}
                                </span>
                                {!isUploadingFromRequest && (
                                  <span className="text-[14px] font-rounded-semibold text-gray-500 leading-tight">
                                    .pdf, .pptx, .docx
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        )}
                        {isLastApiMessage &&
                          !(quickReplies && quickReplies.length > 0) &&
                          !uploadRequest && (
                            <div className="flex flex-row mt-5 mb-5 -mr-5 animate-[fadeInUp_0.3s_ease-in-out] transform translate-y-0 opacity-100 transition-all items-center justify-end">
                              <button
                                className="text-[12px] text-[#F2F2F7] opacity-60 hover:underline text-right leading-[18px] whitespace-pre-line cursor-pointer"
                                onClick={() => {
                                  onClickDisclaimer?.();
                                }}
                              >
                                Medly can make mistakes.{"\n"}Please double check
                                responses.
                              </button>
                            </div>
                          )}
                      </div>
                    </React.Fragment>
                  );
                } else {
                  // Render other message types normally
                  return group.messages.map((message, msgIndex) => {
                    const index = group.startIndex + msgIndex;
                    // Show logo before first message in group if showLogo is true
                    if (msgIndex === 0 && group.showLogo) {
                      return (
                        <React.Fragment key={`other-with-logo-${index}`}>
                          <div className="mt-8 mb-4 self-start animate-[fadeInUp_0.3s_ease-out]">
                            <MedlyFullLogo />
                          </div>
                          {renderMessage(message, index)}
                        </React.Fragment>
                      );
                    }
                    return renderMessage(message, index);
                  });
                }
              });
            } else {
              // Original rendering logic when messageMode is true
              return visibleMessages.map((message, index) =>
                renderMessage(message, index),
              );
            }
          })()}
          {shouldShowLoading && (
            <div className="self-start mr-16 mt-2 animate-[fadeInUp_0.3s_ease-in-out] flex flex-col items-start gap-2">
              <MedlyFullLogo />
              <span className="text-sm font-rounded-semibold text-[#595959] flex items-center">
                <p className="mr-1">
                  Thinking
                </p>
                <span className="dot-wave-small-wrap" aria-hidden="true">
                  <span className="dot-wave-small"></span>
                  <span className="dot-wave-small"></span>
                  <span className="dot-wave-small"></span>
                </span>
              </span>
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes wave {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
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
            animation: wave 0.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .wave-dot:nth-child(1) {
            animation-delay: 0s;
          }
          .wave-dot:nth-child(2) {
            animation-delay: 0.06s;
          }
          .wave-dot:nth-child(3) {
            animation-delay: 0.12s;
          }
          @keyframes dotWave {
            /* One smooth "hop", then stay at rest to create a pause before looping */
            0%,
            60%,
            100% {
              transform: translateY(0);
            }
            15% {
              transform: translateY(-4px);
            }
            30% {
              transform: translateY(0);
            }
          }
          .dot-wave-small-wrap {
            display: inline-flex;
            align-items: center;
          }
          .dot-wave-small {
            display: inline-block;
            width: 3px;
            height: 3px;
            margin-left: 2px;
            background-color: #595959;
            border-radius: 50%;
            animation: dotWave 1.35s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            will-change: transform;
          }
          .dot-wave-small-wrap .dot-wave-small:nth-child(1) {
            animation-delay: 0s;
          }
          .dot-wave-small-wrap .dot-wave-small:nth-child(2) {
            animation-delay: 0.12s;
          }
          .dot-wave-small-wrap .dot-wave-small:nth-child(3) {
            animation-delay: 0.24s;
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

  // Helper function to render individual messages (used when messageMode is true)
  function renderMessage(message: Message, index: number) {
    return (
      <React.Fragment key={`message-fragment-${message.id || index}`}>
        {(() => {
          // Handle tool call messages
          if (message.isToolCall) {
            return (
              <div
                key={message.id || `toolcall-${index}`}
                className="self-start mr-16 animate-[fadeInUp_0.3s_ease-in-out]"
              >
                <ToolCallChip
                  toolCall={{
                    toolCallId: message.toolCallId || "",
                    toolName: message.toolName || "",
                    status: message.toolCallStatus || "running",
                    toolDisplayDetail: message.toolDisplayDetail,
                  }}
                />
              </div>
            );
          }

          // Handle awaiting messages
          if (message.isAwaitingResponse) {
            return (
              <div
                key={message.id || `awaiting-${index}`}
                className="self-start mr-16 animate-[fadeInUp_0.3s_ease-in-out]"
              >
                <AwaitingChip message={message.awaitingText || "Waiting..."} />
              </div>
            );
          }

          // Handle undo notes change message (Open notes animation system)
          const undoData = (message as any).undoData as
            | { isUndone: boolean }
            | undefined;
          if ((message as any).type === "undoNotesChange" && undoData) {
            const isLastMessage = index === visibleMessages.length - 1;
            const isUndone = undoData.isUndone;
            const isThisAnimating = currentAnimatingMessageId === message.id;

            if (isLastMessage) {
              // Full card with button
              return (
                <div
                  key={message.id || `undo-${index}`}
                  className="w-full my-4 animate-[fadeInUp_0.3s_ease-in-out]"
                >
                  <div className="bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] p-4 mx-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-rounded-semibold text-[#595959]">
                          Meeting notes {isUndone ? "reverted" : "edited"}
                        </span>
                        {!isThisAnimating && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <circle cx="8" cy="8" r="8" fill="#34C759" />
                            <path
                              d="M5 8L7 10L11 6"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {isThisAnimating && (
                          <div className="w-4 h-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#595959]"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-[#595959] mb-3">Updated.</div>
                    {isThisAnimating ? (
                      <button
                        onClick={() => onCancelAnimation?.()}
                        className="px-4 py-2 text-sm font-rounded-semibold text-[#595959] bg-[#f2f2f7] rounded-[8px] hover:bg-[#e5e5ea] transition-colors"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => onUndoNotesChange?.(message.id!)}
                        disabled={isNotesAnimating}
                        className="px-4 py-2 text-sm font-rounded-semibold text-[#595959] bg-[#f2f2f7] rounded-[8px] hover:bg-[#e5e5ea] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUndone ? "Reapply" : "Undo"}
                      </button>
                    )}
                  </div>
                </div>
              );
            } else {
              // Compact "Change applied" version
              return (
                <div
                  key={message.id || `undo-compact-${index}`}
                  className="w-full my-2"
                >
                  <div className="flex items-center justify-center gap-2 text-xs text-[#595959] font-rounded-semibold">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="rgba(89,89,89,0.2)" />
                      <path
                        d="M5 8L7 10L11 6"
                        stroke="#595959"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Change applied</span>
                  </div>
                </div>
              );
            }
          }

          // Handle card message types
          if (
            message.type === "markschemeCard" ||
            message.type === "aoAnalysisCard" ||
            message.type === "strategyCard" ||
            message.type === "timingCard"
          ) {
            const prevMessage = index > 0 ? visibleMessages[index - 1] : null;
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
                    getQuestionHeading={message.cardData.getQuestionHeading!}
                    showMarkScheme={message.cardData.showMarkScheme}
                  />
                )}
                {message.type === "aoAnalysisCard" &&
                  message.cardData &&
                  (() => {
                    const aoData = message.cardData?.aoData as
                      | {
                        label?: string;
                        score?: number;
                        maxScore?: number;
                        progress?: number;
                        feedbackPoints?: { text: string; mark: number }[];
                      }
                      | undefined;
                    return (
                      <FeedbackCard
                        label={aoData?.label ?? "AO"}
                        score={aoData?.score ?? 0}
                        maxScore={aoData?.maxScore ?? 0}
                        progress={aoData?.progress ?? 0}
                        strokeColor="#06B0FF"
                        feedbackPoints={aoData?.feedbackPoints ?? []}
                      />
                    );
                  })()}
                {message.type === "strategyCard" && message.cardData && (
                  <StrategyCard
                    title="Strategy"
                    strategySteps={
                      (message.cardData
                        .strategySteps as unknown as StrategyStep[]) || []
                    }
                    currentStepIndex={message.cardData.currentStepIndex || 0}
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
            (message.message.length > 0 || message.attachments)
          ) {
            return (
              <React.Fragment key={`message-fragment-${message.id || index}`}>
                {/* Attachment cards for user messages */}
                {message.type === "userMessage" && message.attachments && (
                  <div className="flex flex-col gap-2 self-end mr-2 animate-[fadeInUp_0.3s_ease-in-out]">
                    {/* Screenshot attachment */}
                    {message.attachments.screenshot && (
                      <div className="w-[200px] bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2">
                        <div className="w-[40px] h-[40px] rounded-[8px] overflow-hidden border border-[#E0E0E0] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)]">
                          <img
                            src={message.attachments.screenshot.dataUrl}
                            alt="Selection"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col overflow-hidden flex-1">
                          <div className="truncate leading-none font-rounded-semibold">
                            Screenshot
                          </div>
                          <div className="text-[12px] mt-0.5 text-[#595959]/80">
                            Image
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Selected text attachment */}
                    {message.attachments.selectedText && (
                      <div className="w-[200px] bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2">
                        <div className="w-[32px] h-[40px] bg-white rounded-[8px] mr-1 border border-[#F2F2F7] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)] flex items-center justify-center">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 28 28"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M16.9355 22.9971H22.0244C22.5166 22.9971 22.7715 22.7686 22.7715 22.373C22.7715 21.9688 22.5166 21.749 22.0244 21.749H20.2051V5.50684H22.0244C22.5166 5.50684 22.7715 5.28711 22.7715 4.87402C22.7715 4.47852 22.5166 4.26758 22.0244 4.26758H16.9355C16.4434 4.26758 16.1885 4.47852 16.1885 4.87402C16.1885 5.28711 16.4434 5.50684 16.9355 5.50684H18.7725V21.749H16.9355C16.4434 21.749 16.1885 21.9688 16.1885 22.373C16.1885 22.7686 16.4434 22.9971 16.9355 22.9971Z"
                              fill="#595959"
                            />
                            <path
                              d="M4.52539 20.2373C5.12305 20.2373 5.43945 19.9912 5.63281 19.3584L6.59082 16.6514H11.6006L12.5586 19.3584C12.752 19.9912 13.0684 20.2373 13.666 20.2373C14.2988 20.2373 14.7031 19.8594 14.7031 19.2705C14.7031 19.0508 14.668 18.8662 14.5801 18.6201L10.7129 8.16113C10.4404 7.39648 9.93066 7.03613 9.10449 7.03613C8.31348 7.03613 7.80371 7.39648 7.54004 8.15234L3.64648 18.6729C3.55859 18.9014 3.52344 19.0947 3.52344 19.2881C3.52344 19.877 3.90137 20.2373 4.52539 20.2373ZM7.10059 14.999L9.07812 9.30371H9.13086L11.1084 14.999H7.10059Z"
                              fill="#595959"
                            />
                          </svg>
                        </div>
                        <div className="flex flex-col overflow-hidden flex-1">
                          <div className="truncate leading-none font-rounded-semibold">
                            {message.attachments.selectedText}
                          </div>
                          <div className="text-[12px] mt-0.5 text-[#595959]/80">
                            Selected text
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Dragged context attachments */}
                    {message.attachments.draggedContexts?.map((item) => (
                      <div
                        key={item.id}
                        className="w-[200px] bg-[#F2F2F7] rounded-[12px] p-2 text-[14px] flex flex-row items-center gap-2"
                      >
                        <div className="w-[32px] h-[40px] bg-white rounded-[8px] mr-1 border border-[#F2F2F7] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)] flex items-center justify-center">
                          {item.type === "folder" ? (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"
                                stroke="#595959"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                                stroke="#595959"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14 2V8H20"
                                stroke="#595959"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden flex-1">
                          <div className="truncate leading-none font-rounded-semibold">
                            {item.name}
                          </div>
                          <div className="text-[12px] mt-0.5 text-[#595959]/80">
                            {item.type === "folder"
                              ? "Folder"
                              : item.documentType || "Document"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  key={message.id || `message-${index}`}
                  className={`group relative rounded-[24px] py-1 px-2 text-sm md:text-sm max-w-[320px] animate-[fadeInUp_0.3s_ease-in-out]
                   ${message.type === "userMessage"
                      ? "self-end ml-16 my-4 mb-4"
                      : "bg-[#F2F2F7] self-start mr-16"
                    } ${index !== visibleMessages.length - 1 ? "mb-1" : ""}
                  ${shouldHaveExtraTopMargin(message.message) ? "mt-5" : ""}
                  `}
                  style={
                    message.type === "userMessage"
                      ? {
                          backgroundColor: isWideScreen
                            ? userMessageColor
                            : "white",
                        }
                      : undefined
                  }
                >
                  {shouldShowMessageTail(message, index, visibleMessages) && (
                    <MessageTail messageType={message.type} />
                  )}

                  <ReactMarkdown
                    className={`markdown-styles font-rounded-semibold [&_strong]:font-rounded-bold [&_p]:m-2 relative z-20`}
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

                  {/* Typing cursor for streaming messages */}
                  {message.isStreaming && message.type === "apiMessage" && (
                    <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                  )}

                  <div
                    className={`absolute right-0 -bottom-4 z-20 bg-white rounded-full p-1 px-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${message.type === "apiMessage" &&
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
                {/* Quick replies - show for last API message */}
                {message.type == "apiMessage" &&
                  index === visibleMessages.length - 1 &&
                  quickReplies &&
                  quickReplies.length > 0 && (
                    <div className="mt-4 flex flex-col gap-1 ml-2 animate-[fadeInUp_0.3s_ease-out]">
                      {quickReplies.map((reply) => (
                        <PrimaryButtonClicky
                          key={reply.id}
                          buttonText={reply.label}
                          description={reply.description}
                          onPress={() => onQuickReplyClick?.(reply.label)}
                          showKeyboardShortcut={false}
                        />
                      ))}
                    </div>
                  )}
                {/* Upload request button - show for last API message */}
                {message.type == "apiMessage" &&
                  index === visibleMessages.length - 1 &&
                  uploadRequest && (
                    <div className="mt-4 ml-2 animate-[fadeInUp_0.3s_ease-out]">
                      <button
                        onClick={onUploadRequest}
                        disabled={isUploadingFromRequest}
                        className="w-full relative flex flex-row items-center justify-start py-4 px-4 rounded-[16px] border overflow-visible text-[15px] font-rounded-bold min-w-[80px] min-h-[76px] transition-transform duration-100 gap-3 bg-white border-[#F0F0F0] hover:translate-y-[2px] active:translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        style={{ borderBottomWidth: "4px" }}
                      >
                        {isUploadingFromRequest ? (
                          <Spinner style="dark" />
                        ) : (
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M16.6631 17.4424V19.2002H20.7852C23.5449 19.2002 25.2324 17.5654 25.2324 15.333C25.2324 13.4697 24.1689 11.9668 22.4199 11.2725C22.4287 7.2998 19.5635 4.43457 15.8809 4.43457C13.543 4.43457 11.7852 5.63867 10.6865 7.22949C8.58594 6.71094 6.10742 8.30176 6.01953 10.7803C4.00684 11.123 2.76758 12.793 2.76758 14.9199C2.76758 17.2842 4.56934 19.2002 7.49609 19.2002H11.3018V17.4424H7.49609C5.58008 17.4424 4.54297 16.2998 4.54297 14.8848C4.54297 13.2412 5.62402 12.0898 7.41699 12.0898C7.54883 12.0898 7.60156 12.0195 7.59277 11.8965C7.54004 9.27734 9.41211 8.43359 11.3018 8.9873C11.416 9.01367 11.4863 8.99609 11.5391 8.89941C12.3828 7.36133 13.6924 6.18359 15.8721 6.18359C18.6318 6.18359 20.6006 8.37207 20.7324 10.9297C20.7588 11.3955 20.7236 11.9141 20.6885 12.3359C20.6709 12.459 20.7236 12.5293 20.8379 12.5469C22.4463 12.8545 23.457 13.7861 23.457 15.2539C23.457 16.5371 22.5605 17.4424 20.75 17.4424H16.6631ZM13.9824 23.5947C14.4395 23.5947 14.8086 23.2256 14.8086 22.7861V14.6914L14.7207 13.127L15.2832 13.7773L16.5049 15.0078C16.6543 15.166 16.8564 15.2539 17.0586 15.2539C17.4629 15.2539 17.7969 14.9551 17.7969 14.542C17.7969 14.3311 17.7178 14.1641 17.5596 14.0234L14.6064 11.2461C14.3867 11.0439 14.2021 10.9648 13.9824 10.9648C13.7715 10.9648 13.5781 11.0439 13.3584 11.2461L10.4053 14.0234C10.2471 14.1641 10.1768 14.3311 10.1768 14.542C10.1768 14.9551 10.502 15.2539 10.9062 15.2539C11.1084 15.2539 11.3105 15.166 11.46 15.0078L12.6816 13.7773L13.2529 13.127L13.1562 14.6914V22.7861C13.1562 23.2256 13.5342 23.5947 13.9824 23.5947Z" fill="#1C1C1E"/>
                          </svg>
                        )}
                        <div className="flex flex-col items-start">
                          <span className="text-[rgba(0,0,0,0.8)]">{isUploadingFromRequest ? "Uploading..." : uploadRequest.label}</span>
                          {!isUploadingFromRequest && (
                            <span className="text-[14px] font-rounded-semibold text-gray-500 leading-tight">.pdf, .pptx, .docx</span>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                {!shouldShowLoading &&
                  message.type == "apiMessage" &&
                  index === visibleMessages.length - 1 &&
                  !(quickReplies && quickReplies.length > 0) &&
                  !uploadRequest && (
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
            }
          }
          return null;
        })()}
      </React.Fragment>
    );
  }
}

export default ChatThread;
