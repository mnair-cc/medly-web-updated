import { useState, useCallback, useRef, useEffect } from "react";
import { isAudioGloballyUnlocked } from "./useAudioUnlock";
import { curriculumApiClient } from "@/app/_lib/utils/axiosHelper";

// Configuration - Call backend TTS endpoint directly
const DEFAULT_VOICE = "nova";

interface UseTextToSpeechOptions {
  onSpeechComplete?: () => void;
  onError?: (error: string) => void;
}

interface TTSRequest {
  text: string;
  voice?: string;
  instructions?: string;
}

interface TTSResponse {
  audio_base64: string;
  content_type: string;
  text_processed: string;
}

export const useTextToSpeech = (options?: UseTextToSpeechOptions) => {
  const { onSpeechComplete, onError } = options || {};
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio management refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean text by removing markdown formatting - same logic as original
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

  // Convert base64 audio to blob URL
  const createAudioFromBase64 = useCallback(
    (base64Audio: string, contentType: string): string => {
      try {
        // Decode base64 to binary
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob and URL
        const blob = new Blob([bytes], { type: contentType });
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error("❌ Failed to create audio from base64:", error);
        throw new Error("Failed to process audio data");
      }
    },
    []
  );

  // Set up Web Audio API for volume control
  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 1.0; // Full volume initially
    }

    return {
      audioContext: audioContextRef.current,
      gainNode: gainNodeRef.current,
    };
  }, []);

  // Play audio with Web Audio API integration
  const playAudio = useCallback(
    async (audioUrl: string) => {
      return new Promise<void>((resolve, reject) => {
        try {
          // Check if audio is unlocked (required for Safari iOS autoplay)
          if (!isAudioGloballyUnlocked()) {
            // console.log('🔒 Audio not unlocked, skipping playback');
            const errorMessage =
              "Audio not unlocked - click record button first";
            setError(errorMessage);
            setIsSpeaking(false);
            if (onError) {
              onError(errorMessage);
            }
            resolve(); // Don't reject, just skip playback
            return;
          }

          // Create audio element
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          // Audio event handlers
          audio.onloadeddata = () => {
            // console.log('✅ Audio loaded, starting playback');
          };

          audio.onplay = () => {
            // console.log('▶️ Audio playback started');
          };

          audio.onended = () => {
            // console.log('✅ Audio playback completed');
            setIsSpeaking(false);

            // Clean up
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;

            if (onSpeechComplete) {
              onSpeechComplete();
            }
            resolve();
          };

          audio.onerror = (e) => {
            console.error("❌ Audio playback error:", e);
            setIsSpeaking(false);

            // Clean up
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;

            const errorMessage = "Audio playback failed";
            setError(errorMessage);
            if (onError) {
              onError(errorMessage);
            }
            reject(new Error(errorMessage));
          };

          // Start playback
          audio
            .play()
            .then(async () => {
              // Set up Web Audio API after successful play (for fade support)
              // This prevents Safari autoplay issues
              try {
                const { audioContext, gainNode } = setupAudioContext();

                // Resume audio context if suspended (Safari requirement)
                if (audioContext.state === "suspended") {
                  console.log(
                    "📱 Resuming suspended AudioContext before TTS playback..."
                  );
                  await audioContext.resume();
                  console.log(
                    "✅ AudioContext resumed for TTS, new state:",
                    audioContext.state
                  );
                }

                // Connect audio element to Web Audio API only after it's playing
                if (
                  !sourceNodeRef.current ||
                  sourceNodeRef.current.mediaElement !== audio
                ) {
                  sourceNodeRef.current =
                    audioContext.createMediaElementSource(audio);
                  sourceNodeRef.current.connect(gainNode);
                }
              } catch (webAudioError) {
                // If Web Audio API setup fails, audio will still play without fade support
                console.warn(
                  "⚠️ Web Audio API setup failed, audio will play without fade support:",
                  webAudioError
                );
              }
            })
            .catch((playError) => {
              console.error("❌ Failed to start audio playback:", playError);
              const errorMessage = `Playback failed: ${playError.message}`;
              setError(errorMessage);
              setIsSpeaking(false);

              if (onError) {
                onError(errorMessage);
              }
              reject(playError);
            });
        } catch (error) {
          console.error("❌ Error setting up audio playback:", error);
          const errorMessage = `Audio setup failed: ${error}`;
          setError(errorMessage);
          setIsSpeaking(false);

          if (onError) {
            onError(errorMessage);
          }
          reject(error);
        }
      });
    },
    [setupAudioContext, onSpeechComplete, onError]
  );

  const speakText = useCallback(
    async (text: string, voice?: string, instructions?: string) => {
      try {
        // Stop any current speech
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }

        // Abort any pending requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Clean the text before speaking
        const cleanedText = cleanText(text);
        if (!cleanedText.trim()) {
          console.warn("⚠️ No text to speak after cleaning");
          return;
        }

        // console.log('🔊 Starting text-to-speech for:', cleanedText.substring(0, 50) + '...');

        setError(null);
        setIsSpeaking(true);

        // Prepare request - only text is required, voice and instructions are optional
        const requestBody: TTSRequest = {
          text: cleanedText,
          ...(voice && { voice }),
          ...(instructions && { instructions }),
        };

        // Call backend TTS endpoint directly with axios
        const response = await curriculumApiClient.post<TTSResponse>(
          "/api/tts/generate",
          requestBody,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        const ttsResponse: TTSResponse = response.data;

        // Convert base64 audio to playable URL
        const audioUrl = createAudioFromBase64(
          ttsResponse.audio_base64,
          ttsResponse.content_type
        );

        // Play the audio
        await playAudio(audioUrl);
      } catch (error: any) {
        // Handle abort (user stopped)
        if (error.name === "AbortError") {
          // console.log('🛑 TTS request was aborted');
          return;
        }

        const errorMessage = `Error during text-to-speech: ${error.message || error}`;
        // console.error('❌ Text-to-speech error:', error);
        setError(errorMessage);
        setIsSpeaking(false);

        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [cleanText, createAudioFromBase64, playAudio, onError]
  );

  const fadeOutAndStop = useCallback(() => {
    if (audioRef.current && isSpeaking) {
      // console.log('🔇 Fading out speech synthesis');

      // Clear any existing fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }

      // Try to fade if Web Audio API is available
      if (
        gainNodeRef.current &&
        audioContextRef.current &&
        !audioRef.current.paused
      ) {
        const gain = gainNodeRef.current.gain;
        const audioContext = audioContextRef.current;
        const fadeTime = 0.8;
        const currentTime = audioContext.currentTime;

        try {
          gain.cancelScheduledValues(currentTime);
          gain.setValueAtTime(gain.value, currentTime);
          gain.exponentialRampToValueAtTime(0.001, currentTime + fadeTime);

          // Stop after fade completes
          fadeTimeoutRef.current = setTimeout(
            () => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current = null;
                setIsSpeaking(false);
              }
            },
            fadeTime * 1000 + 30
          ); // Add 30ms buffer
        } catch (fadeError) {
          console.warn("⚠️ Fade failed, stopping immediately:", fadeError);
          // Fallback to immediate stop
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
          setIsSpeaking(false);
        }
      } else {
        // No Web Audio API available, stop immediately
        // console.log('⏹️ Web Audio API not available, stopping immediately');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
        setIsSpeaking(false);
      }
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    // Clear any active fade
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop audio playback
    if (audioRef.current) {
      // console.log('⏹️ Stopping speech synthesis immediately');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsSpeaking(false);
    }

    // Reset gain for next use
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = 1.0;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Close audio context
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clear refs
      gainNodeRef.current = null;
      sourceNodeRef.current = null;
    };
  }, []);

  // Play pre-generated audio directly (bypassing TTS generation)
  const playPreGeneratedAudio = useCallback(
    async (audioUrl: string) => {
      try {
        // Check if audio is unlocked (required for Safari iOS autoplay)
        if (!isAudioGloballyUnlocked()) {
          // console.log('🔒 Audio not unlocked, skipping pre-generated audio playback');
          const errorMessage = "Audio not unlocked - click record button first";
          setError(errorMessage);
          setIsSpeaking(false);
          if (onError) {
            onError(errorMessage);
          }
          return;
        }

        // Stop any current speech
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }

        // Abort any pending requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        // console.log('🔊 Playing pre-generated audio');

        setError(null);
        setIsSpeaking(true);

        // Play the pre-generated audio
        await playAudio(audioUrl);
      } catch (error: any) {
        const errorMessage = `Error playing pre-generated audio: ${error.message || error}`;
        console.error("❌ Pre-generated audio playback error:", error);
        setError(errorMessage);
        setIsSpeaking(false);

        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [playAudio, onError]
  );

  return {
    isSpeaking,
    error,
    speakText,
    playPreGeneratedAudio,
    stop,
    fadeOutAndStop,
  };
};
