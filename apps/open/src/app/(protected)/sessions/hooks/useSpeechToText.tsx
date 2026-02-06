import { useState, useCallback, useRef } from 'react';
import {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  AudioInputStream,
  ResultReason,
  CancellationDetails,
} from 'microsoft-cognitiveservices-speech-sdk';


const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!;
const subscriptionRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!;

// Create and configure the speech config once
const speechConfig = SpeechConfig.fromSubscription(subscriptionKey, subscriptionRegion);
// Configure voice and recognition language (optional)
speechConfig.speechRecognitionLanguage = 'en-US';

interface UseSpeechToTextOptions {
  onTranscriptionComplete?: (transcription: string) => void;
  onError?: (error: string) => void;
}

export const useSpeechToText = (options?: UseSpeechToTextOptions) => {
  const { onTranscriptionComplete, onError } = options || {};
  const [status, setStatus] = useState<
    'idle' | 'recording' | 'processing' | 'complete' | 'error'
  >('idle');

  const [transcription, setTranscription] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setStatus('idle');
      setTranscription('');
      audioChunksRef.current = [];
      // console.log('🎤 Starting recording process...');

      if (!hasPermission) {
        try {
          // console.log('🎤 Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          setHasPermission(true);
        } catch (err) {
          setStatus('error');
          console.error('❌ Microphone permission not granted:', err);
          return;
        }
      }

      setStatus('recording');

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      // Try different MIME types for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }

      // console.log('🎤 Using MIME type:', mimeType || 'default');

      const recorder = new MediaRecorder(streamRef.current, {
        ...(mimeType && { mimeType })
      });

      // Set up event handlers BEFORE starting
      recorder.ondataavailable = (event) => {
        // console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // console.log('⏹️ Recording stopped. Processing', audioChunksRef.current.length, 'chunks');
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: audioChunksRef.current[0].type || 'audio/webm'
          });
          // console.log('🎵 Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);

          setStatus('processing');
          await transcribeAudio(audioBlob);
        } else {
          console.warn('⚠️ No audio chunks recorded');
          setStatus('error');
        }
      };

      // console.log('🎤 Starting MediaRecorder...');
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);

      // Set up 3-minute max recording timer
      maxRecordingTimerRef.current = setTimeout(() => {
        // console.log('⏰ Max recording time (3 minutes) reached, stopping recording...');
        if (recorder && recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3 * 60 * 1000); // 3 minutes in milliseconds
    } catch (err) {
      setStatus('error');
      console.error('❌ Failed to start recording:', err);
    }
  }, [hasPermission]);

  /**
   * Stop recording audio
   * and immediately trigger speech recognition
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.warn('⚠️ No recording in progress.');
        return;
      }

      // console.log('⏹️ Stopping recording...');
      mediaRecorder.stop();

      // Clear the max recording timer
      if (maxRecordingTimerRef.current) {
        clearTimeout(maxRecordingTimerRef.current);
        maxRecordingTimerRef.current = null;
      }

      // The onstop handler set up in startRecording will handle the processing
      setMediaRecorder(null);
    } catch (error) {
      setStatus('error');
      console.error('❌ Error stopping recording:', error);
    }
  }, [mediaRecorder]);

  // Convert WebM audio to WAV format for Azure Speech SDK
  const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
    try {
      // console.log('🔄 Converting WebM to WAV...');

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // console.log('📊 Audio decoded:', {
      //   sampleRate: audioBuffer.sampleRate,
      //   channels: audioBuffer.numberOfChannels,
      //   duration: audioBuffer.duration,
      //   length: audioBuffer.length
      // });

      // Resample to 16kHz if needed (Azure Speech optimal)
      const targetSampleRate = 16000;
      let resampledBuffer = audioBuffer;

      if (audioBuffer.sampleRate !== targetSampleRate) {
        // console.log('🔄 Resampling to 16kHz...');
        const offlineContext = new OfflineAudioContext(
          1, // mono
          Math.ceil(audioBuffer.duration * targetSampleRate),
          targetSampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        resampledBuffer = await offlineContext.startRendering();
      }

      // Convert to WAV
      const wav = encodeWAV(resampledBuffer);
      const wavBlob = new Blob([wav], { type: 'audio/wav' });

      // console.log('✅ WAV conversion complete:', wavBlob.size, 'bytes');
      await audioContext.close();
      return wavBlob;

    } catch (error) {
      console.error('❌ Error converting WebM to WAV:', error);
      throw error;
    }
  };

  // Encode audio buffer as WAV
  const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Get first channel (mono)

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  };

  /**
   * Transcribe the recorded audio from blob via Azure Speech
   */
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // console.log('🎯 Starting transcription process...');
      // console.log('🎵 Audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

      // Check if we have valid credentials
      if (!subscriptionKey || !subscriptionRegion) {
        throw new Error('Azure Speech credentials not found');
      }

      // console.log('🔑 Using Azure region:', subscriptionRegion);

      // Convert WebM to WAV if needed
      let processedAudioBlob = audioBlob;
      if (audioBlob.type.includes('webm') || audioBlob.type.includes('opus')) {
        // console.log('🔄 Converting audio to WAV format for Azure Speech...');
        processedAudioBlob = await convertWebMToWav(audioBlob);
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await processedAudioBlob.arrayBuffer();
      const audioBuffer = new Uint8Array(arrayBuffer);

      // console.log('🔄 Processed audio buffer:', audioBuffer.length, 'bytes, type:', processedAudioBlob.type);

      // Create push stream and write audio data
      const pushStream = AudioInputStream.createPushStream();
      pushStream.write(audioBuffer);
      pushStream.close();

      // console.log('📡 Created audio input stream');

      // Create the AudioConfig from the stream
      const audioConfig = AudioConfig.fromStreamInput(pushStream);
      // Create the SpeechRecognizer
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

      // console.log('🎤 Created speech recognizer, starting recognition...');

      recognizer.recognizeOnceAsync(
        (result) => {
          // console.log('🎯 Recognition result received');
          // console.log('📝 Result reason:', result.reason);
          // console.log('📝 Result text:', result.text);

          switch (result.reason) {
            case ResultReason.RecognizedSpeech:
              // console.log('✅ Speech recognized:', result.text);
              setStatus('complete');
              if (onTranscriptionComplete) {
                onTranscriptionComplete(result.text);
              } else {
                setTranscription(result.text); // Fallback for backwards compatibility
              }
              break;
            case ResultReason.NoMatch:
              // console.log('⚠️ NOMATCH: Speech could not be recognized.');
              setStatus('complete');
              if (onTranscriptionComplete) {
                onTranscriptionComplete('');
              } else if (onError) {
                onError('No speech could be recognized from the audio');
              } else {
                setTranscription(''); // Fallback
              }
              break;
            case ResultReason.Canceled:
              const cancellation = CancellationDetails.fromResult(result);
              // console.log('❌ CANCELED: Reason=', cancellation.reason);
              // console.log('❌ CANCELED: ErrorCode=', cancellation.ErrorCode);
              // console.log('❌ CANCELED: ErrorDetails=', cancellation.errorDetails);

              const errorMessage = `Speech recognition canceled: ${cancellation.errorDetails || 'Unknown error'}`;

              if (cancellation.reason === 1) {
                // 1 => Error
                console.error('❌ Azure Speech Service Error:', {
                  errorCode: cancellation.ErrorCode,
                  errorDetails: cancellation.errorDetails,
                  subscriptionKey: subscriptionKey ? '***SET***' : 'NOT SET',
                  region: subscriptionRegion
                });
              }

              setStatus('error');
              if (onError) {
                onError(errorMessage);
              }
              break;
            default:
              // console.log('🤔 Unknown result reason:', result.reason);
              setStatus('complete');
              if (onTranscriptionComplete) {
                onTranscriptionComplete('');
              }
              break;
          }

          recognizer.close();
        },
        (error) => {
          setStatus('error');
          const errorMessage = `Recognition failed: ${error}`;
          // console.error('❌ Recognition failed:', error);

          if (onError) {
            onError(errorMessage);
          }

          recognizer.close();
        }
      );
    } catch (error) {
      setStatus('error');
      const errorMessage = `Error during speech recognition: ${error}`;
      console.error('❌ Error during speech recognition:', error);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  return {
    status,          // 'idle' | 'recording' | 'processing' | 'complete' | 'error'
    transcription,   // The recognized text (if any)
    startRecording,
    stopRecording,
    recordingStream: streamRef.current, // Expose the recording stream for analysis
  };
};