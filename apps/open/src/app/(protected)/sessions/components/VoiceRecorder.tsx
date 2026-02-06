"use client";

import { useState, useEffect, useRef } from "react";
import { useSpeechToText } from "../hooks/useSpeechToText";

type RecorderState =
  | "idle"
  | "recording"
  | "recorded"
  | "playing"
  | "transcribing";

interface VoiceRecorderProps {
  onTranscription?: (text: string) => void;
  onSend?: (audioBlob: Blob, transcription: string) => void;
}

export default function VoiceRecorder({
  onTranscription,
  onSend,
}: VoiceRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  // Streaming bar visualization state (latest bar on the right)
  const NUM_BARS = 20;
  const BAR_INTERVAL_MS = 120; // how often to start a new bar
  const MIN_LEVEL = 0.08; // minimum visible height proportion
  const GAIN = 1.8; // amplify microphone signal a bit for better visual range
  const [audioLevels, setAudioLevels] = useState<number[]>(
    new Array(NUM_BARS).fill(0)
  );

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeDomainBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const lastBarStartTimeRef = useRef<number>(0);
  const currentBarMaxRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);

  const {
    status,
    transcription,
    startRecording,
    stopRecording,
    recordingStream,
  } = useSpeechToText();

  // Real-time audio analysis (time-domain peak) to drive streaming bars
  const analyzeAudio = () => {
    if (!analyserRef.current || !isAnalyzingRef.current) return;

    const analyser = analyserRef.current;

    // Ensure time-domain buffer matches analyser size
    const fftSize = analyser.fftSize;
    if (
      !timeDomainBufferRef.current ||
      timeDomainBufferRef.current.length !== fftSize
    ) {
      // Use explicit ArrayBuffer so TS infers ArrayBuffer instead of ArrayBufferLike
      timeDomainBufferRef.current = new Uint8Array(new ArrayBuffer(fftSize));
    }

    const buffer = timeDomainBufferRef.current;
    analyser.getByteTimeDomainData(buffer);

    // Compute peak absolute deviation from center (128)
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const deviation = Math.abs(buffer[i] - 128);
      if (deviation > peak) peak = deviation;
    }
    // Normalize 0..1 and add gentle gain; enforce a small floor for visibility
    const normalized = Math.max(MIN_LEVEL, Math.min(1, (peak / 128) * GAIN));

    const now = performance.now();

    // Start a new bar at fixed intervals
    if (now - lastBarStartTimeRef.current >= BAR_INTERVAL_MS) {
      lastBarStartTimeRef.current = now;
      currentBarMaxRef.current = 0;

      setAudioLevels((prev) => {
        const next = prev.slice(-NUM_BARS + 1);
        next.push(0); // new bar placeholder that will grow
        return next;
      });
    }

    // Grow the current (rightmost) bar by taking the max so it never shrinks
    currentBarMaxRef.current = Math.max(currentBarMaxRef.current, normalized);
    setAudioLevels((prev) => {
      if (prev.length === 0) return [currentBarMaxRef.current];
      const next = prev.slice();
      const lastIdx = next.length - 1;
      next[lastIdx] = Math.max(next[lastIdx] || 0, currentBarMaxRef.current);
      return next;
    });

    if (recorderState === "recording") {
      animationRef.current = requestAnimationFrame(analyzeAudio);
    }
  };

  const setupAudioAnalysis = async () => {
    try {
      if (!recordingStream) {
        console.warn("⚠️ No recording stream available for analysis");
        return;
      }

      // console.log("🎤 Setting up audio analysis with recording stream");

      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source =
        audioContextRef.current.createMediaStreamSource(recordingStream);

      analyserRef.current = audioContextRef.current.createAnalyser();
      // Use a moderate FFT size for stable time-domain peaks
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.8;

      source.connect(analyserRef.current);

      // console.log("✅ Audio analysis connected to recording stream");
      // Initialize streaming bars and start animation loop
      lastBarStartTimeRef.current = performance.now();
      currentBarMaxRef.current = 0;
      isAnalyzingRef.current = true;
      setAudioLevels(new Array(NUM_BARS).fill(0));
      analyzeAudio();
    } catch (error) {
      console.error("❌ Error setting up audio analysis:", error);
    }
  };

  // Timer for recording
  useEffect(() => {
    if (recorderState === "recording") {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [recorderState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      isAnalyzingRef.current = false;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, []);

  // Handle speech-to-text status changes
  useEffect(() => {
    if (status === "recording") {
      setRecorderState("recording");
    } else if (status === "processing") {
      setRecorderState("transcribing");
    } else if (status === "complete" && transcription) {
      setRecorderState("recorded");
      if (onTranscription) {
        onTranscription(transcription);
      }
    } else if (status === "error") {
      setRecorderState("idle");
      setRecordingTime(0);
    }
  }, [status, transcription, onTranscription]);

  // Set up audio analysis when recording stream becomes available
  useEffect(() => {
    if (recordingStream && status === "recording" && !analyserRef.current) {
      // console.log("🎵 Recording stream available, setting up audio analysis...");
      setupAudioAnalysis();
    }
  }, [recordingStream, status]);

  const handleStartRecording = async () => {
    setRecordingTime(0);
    setRecorderState("recording");
    await startRecording();
    // setupAudioAnalysis will be called automatically when recordingStream becomes available
  };

  const handleStopRecording = async () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    isAnalyzingRef.current = false;
    await stopRecording();
    setRecorderState("transcribing");
  };

  const handlePlay = () => {
    if (recordedAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        setRecorderState("playing");
      }
    }
  };

  const handleSend = () => {
    if (recordedAudio && onSend) {
      onSend(recordedAudio, transcription);
      setRecorderState("idle");
      setRecordingTime(0);
      setPlaybackTime(0);
      setRecordedAudio(null);
    }
  };

  const handleDelete = () => {
    setRecorderState("idle");
    setRecordingTime(0);
    setPlaybackTime(0);
    setRecordedAudio(null);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Real-time waveform bars for recording state
  const AnimatedWaveform = () => (
    <div className="flex items-center space-x-1 px-4">
      {audioLevels.map((level, i) => (
        <div
          key={i}
          className="bg-[#FF4B4C] rounded-full transition-all duration-75"
          style={{
            width: "3px",
            height: `${level * 24 + 8}px`, // Scale level to 8-32px height
          }}
        />
      ))}
    </div>
  );

  // Static waveform for playback state
  const StaticWaveform = () => (
    <div className="flex items-center space-x-1 px-4">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-400 rounded-full"
          style={{
            width: "3px",
            height: `${Math.random() * 20 + 8}px`,
          }}
        />
      ))}
    </div>
  );

  if (recorderState === "idle") {
    return (
      <button
        onClick={handleStartRecording}
        className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="white" />
        </svg>
      </button>
    );
  }

  if (recorderState === "recording") {
    return (
      <div className="flex items-center w-full justify-end">
        <AnimatedWaveform />

        <span className="text-[#FF383C] font-rounded-bold text-sm mx-2 text-right">
          {formatTime(recordingTime)}
        </span>

        <button
          onClick={handleStopRecording}
          className="flex items-center justify-center"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_2020_322)">
              <g clipPath="url(#clip1_2020_322)">
                <rect
                  width="12"
                  height="12"
                  transform="translate(4 4)"
                  fill="#FF383C"
                />
              </g>
              <path
                d="M19.6437 9.99512C19.6437 15.5022 15.2432 19.9903 9.82186 19.9903C4.41021 19.9903 0 15.5022 0 9.99512C0 4.47821 4.41021 0 9.82186 0C15.2432 0 19.6437 4.47821 19.6437 9.99512ZM7.2027 6.32045C6.58643 6.32045 6.21088 6.68302 6.21088 7.31016V12.6801C6.21088 13.2975 6.58643 13.6698 7.2027 13.6698H12.441C13.067 13.6698 13.4328 13.2975 13.4328 12.6801V7.31016C13.4328 6.68302 13.067 6.32045 12.441 6.32045H7.2027Z"
                fill="#FBDDDC"
              />
            </g>
            <defs>
              <clipPath id="clip0_2020_322">
                <rect width="20" height="20" fill="white" />
              </clipPath>
              <clipPath id="clip1_2020_322">
                <rect
                  width="12"
                  height="12"
                  fill="white"
                  transform="translate(4 4)"
                />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>
    );
  }

  if (recorderState === "transcribing") {
    return (
      <div className="flex items-center bg-gray-50 rounded-3xl px-4 py-2 max-w-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-600 text-sm">Processing...</span>
        </div>
      </div>
    );
  }

  if (recorderState === "recorded" || recorderState === "playing") {
    return (
      <div className="flex items-center bg-gray-50 rounded-3xl px-4 py-2 max-w-sm">
        <button
          onClick={handlePlay}
          className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="white" />
          </svg>
        </button>

        <StaticWaveform />

        <span className="text-gray-600 font-mono text-sm mx-2">
          {formatTime(recordingTime)}
        </span>

        <button
          onClick={handleSend}
          className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center ml-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill="white" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
}
