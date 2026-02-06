import { useState, useCallback, useRef } from 'react';

// Global state for audio unlock (shared across all components in the app)
let globalAudioUnlocked = false;
let globalAudioContext: AudioContext | null = null;

interface UseAudioUnlockReturn {
  isAudioUnlocked: boolean;
  unlockAudio: () => Promise<boolean>;
  getAudioContext: () => AudioContext | null;
}

export const useAudioUnlock = (): UseAudioUnlockReturn => {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(globalAudioUnlocked);
  const unlockAttemptedRef = useRef(false);

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    // Always re-prime audio context to maintain gesture context
    // Even if already unlocked, Safari iOS needs fresh gesture context for new audio

    console.log(`🔓 ${globalAudioUnlocked ? 'Re-priming' : 'Unlocking'} audio for Safari iOS...`);

    try {
      console.log('🔓 Step 1: Creating AudioContext...');

      // Create or get existing AudioContext
      if (!globalAudioContext) {
        console.log('🔓 Creating new AudioContext...');
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔓 AudioContext created, state:', globalAudioContext.state);
      }

      // Resume AudioContext if suspended (required for Safari)
      if (globalAudioContext.state === 'suspended') {
        console.log('🔊 Step 2: Resuming suspended AudioContext...');
        await globalAudioContext.resume();
        console.log('🔊 AudioContext resumed, new state:', globalAudioContext.state);
      }

      console.log('🔓 Step 3: Creating silent audio using Web Audio API...');

      // Instead of data URL, create silent audio using Web Audio API
      // This is more reliable on Safari iOS
      const audioBuffer = globalAudioContext.createBuffer(1, 1, 22050); // Tiny 1-sample buffer
      const source = globalAudioContext.createBufferSource();
      const gainNode = globalAudioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = 0.001; // Very quiet

      source.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);

      console.log('🔓 Step 4: Playing silent audio via Web Audio API...');

      // Play the silent audio buffer
      source.start(0);

      // Wait a tiny moment for it to "play"
      await new Promise(resolve => setTimeout(resolve, 10));

      console.log(`✅ Step 5: Silent audio played successfully - Safari audio ${globalAudioUnlocked ? 're-primed' : 'unlocked'}!`);

      // No cleanup needed for Web Audio API source (it's one-time use)

      // Mark as globally unlocked (if not already)
      if (!globalAudioUnlocked) {
        globalAudioUnlocked = true;
        console.log('🎉 Audio permanently unlocked for this session!');
      } else {
        console.log('🔄 Audio context re-primed successfully!');
      }

      setIsAudioUnlocked(true);

      console.log('✅ Audio gesture context refreshed!');

      return true;

    } catch (error) {
      console.error('❌ Failed to unlock/re-prime audio - Error details:', error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Don't prevent future attempts - always allow re-priming
      return false;
    }
  }, []);

  const getAudioContext = useCallback((): AudioContext | null => {
    return globalAudioContext;
  }, []);

  return {
    isAudioUnlocked,
    unlockAudio,
    getAudioContext,
  };
};

// Export function to check global unlock state without hook
export const isAudioGloballyUnlocked = (): boolean => {
  return globalAudioUnlocked;
};

// Export function to get global audio context without hook
export const getGlobalAudioContext = (): AudioContext | null => {
  return globalAudioContext;
};