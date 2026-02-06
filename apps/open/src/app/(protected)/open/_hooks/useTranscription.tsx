/**
 * Transcription Hook for Next.js
 * Handles real-time speech transcription via WebSocket connection to Flask backend
 */

import { useSocket } from "@/app/_hooks/useSocket";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TranscriptionConfig {
  service_type?: "azure_speech" | "azure" | "openai";
  // Azure Speech SDK options (for service_type: 'azure_speech')
  speech_key?: string;
  service_region?: string;
  enable_diarization?: boolean;
  language?: string;
  // GPT-4o options (for service_type: 'azure' or 'openai')
  model?: "gpt-4o-transcribe" | "gpt-4o-mini-transcribe";
  noise_reduction?: "none" | "near_field" | "far_field";
  turn_threshold?: number;
  turn_prefix_padding_ms?: number;
  turn_silence_duration_ms?: number;
  include_logprobs?: boolean;
  endpoint?: string;
  deployment?: string;
  api_key?: string;
}

export interface TranscriptionChunk {
  timestamp: number; // Unix timestamp in milliseconds
  text: string; // The transcript segment
}

export interface UseTranscriptionReturn {
  isRecording: boolean;
  currentText: string;
  transcriptChunks: TranscriptionChunk[];
  error: string | null;
  status: string | null;
  startTranscription: (config?: TranscriptionConfig) => Promise<void>;
  stopTranscription: () => void;
  elapsedTime: number;
}

export function useTranscription(
  initialTranscriptChunks: TranscriptionChunk[] = [],
): UseTranscriptionReturn {
  const { socket } = useSocket();
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [transcriptChunks, setTranscriptChunks] = useState<
    TranscriptionChunk[]
  >(initialTranscriptChunks);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTranscriptionStarted = (data: any) => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setCurrentText("");
      // Don't reset transcriptHistory - keep accumulated history
      setError(null);
      console.log("Transcription started:", data);
    };

    const handleTranscriptionDelta = (data: {
      delta: string;
      current_text: string;
    }) => {
      setCurrentText(data.current_text);
      setError(null);
      console.log(
        "Transcription delta:",
        data.delta,
        "| Current text:",
        data.current_text,
      );
    };

    const handleTranscriptionCompleted = (data: {
      transcript: string;
      transcript_history: string[];
    }) => {
      // Convert string array to chunks with timestamps
      const newChunks: TranscriptionChunk[] = data.transcript_history.map(
        (text) => ({
          timestamp: Date.now(),
          text,
        }),
      );
      setTranscriptChunks(newChunks);
      setCurrentText("");
      console.log("Transcript completed:", data.transcript);
    };

    const handleStatusUpdate = (data: { message: string }) => {
      setStatus(data.message);
      console.log("Status:", data.message);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setIsRecording(false);
      isRecordingRef.current = false;
      console.error("Transcription error:", data.message);
    };

    const handleTranscriptionStopped = () => {
      setIsRecording(false);
      isRecordingRef.current = false;
      console.log("Transcription stopped");
    };

    socket.on("transcription_started", handleTranscriptionStarted);
    socket.on("transcription_delta", handleTranscriptionDelta);
    socket.on("transcription_completed", handleTranscriptionCompleted);
    socket.on("status_update", handleStatusUpdate);
    socket.on("error", handleError);
    socket.on("transcription_stopped", handleTranscriptionStopped);

    return () => {
      socket.off("transcription_started", handleTranscriptionStarted);
      socket.off("transcription_delta", handleTranscriptionDelta);
      socket.off("transcription_completed", handleTranscriptionCompleted);
      socket.off("status_update", handleStatusUpdate);
      socket.off("error", handleError);
      socket.off("transcription_stopped", handleTranscriptionStopped);
    };
  }, [socket]);

  const startTranscription = useCallback(
    async (config: TranscriptionConfig = {}) => {
      if (!socket?.connected) {
        setError("Not connected to server");
        return;
      }

      if (isRecordingRef.current) {
        setError("Transcription already in progress");
        return;
      }

      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        mediaStreamRef.current = stream;

        // Create AudioContext
        const audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 24000,
        });
        audioContextRef.current = audioContext;

        // Load AudioWorklet processor
        await audioContext.audioWorklet.addModule("/audio-processor.js");

        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(
          audioContext,
          "audio-processor",
        );

        // Handle audio data from the worklet
        workletNode.port.onmessage = (event) => {
          if (!isRecordingRef.current || !socket?.connected) {
            return;
          }

          const audioData = event.data;
          // Convert to base64 and send
          const base64 = arrayBufferToBase64(audioData);
          socket.emit("audio_chunk", { audio: base64 });
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination);
        workletNodeRef.current = workletNode;

        // Prepare configuration based on service type
        const serviceType = config.service_type || "azure_speech";
        const transcriptionConfig: Record<string, any> = {
          service_type: serviceType,
        };

        // Add service-specific configuration
        if (serviceType === "azure_speech") {
          // Azure Speech SDK configuration
          transcriptionConfig.speech_key = config.speech_key;
          transcriptionConfig.service_region = config.service_region;
          transcriptionConfig.enable_diarization =
            config.enable_diarization || false;
          transcriptionConfig.language = config.language || "en-US";
        } else {
          // GPT-4o real-time configuration (azure or openai)
          transcriptionConfig.model = config.model || "gpt-4o-transcribe";
          transcriptionConfig.noise_reduction =
            config.noise_reduction === "none" ? null : config.noise_reduction;
          transcriptionConfig.turn_threshold = config.turn_threshold || 0.5;
          transcriptionConfig.turn_prefix_padding_ms =
            config.turn_prefix_padding_ms || 300;
          transcriptionConfig.turn_silence_duration_ms =
            config.turn_silence_duration_ms || 500;
          transcriptionConfig.include_logprobs =
            config.include_logprobs !== false;
          transcriptionConfig.endpoint = config.endpoint;
          transcriptionConfig.deployment = config.deployment;
          transcriptionConfig.api_key = config.api_key;
        }

        // Start transcription session
        socket.emit("start_transcription", transcriptionConfig);

        // Start timer
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setElapsedTime(
              Math.floor((Date.now() - startTimeRef.current) / 1000),
            );
          }
        }, 1000);

        setIsRecording(true);
        isRecordingRef.current = true;
        setError(null);
      } catch (err: any) {
        setError(`Failed to start transcription: ${err.message}`);
        console.error("Error starting transcription:", err);
      }
    },
    [socket],
  );

  const stopTranscription = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    setElapsedTime(0);

    // Stop audio processing
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop transcription session
    if (socket?.connected && isRecordingRef.current) {
      socket.emit("stop_transcription");
    }

    setIsRecording(false);
    isRecordingRef.current = false;
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    isRecording,
    currentText,
    transcriptChunks,
    error,
    status,
    startTranscription,
    stopTranscription,
    elapsedTime,
  };
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
