import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInactivityTriggerOptions {
    callback: () => void | Promise<void>;
    delay?: number;
    enabled?: boolean;
}

export function useInactivityTrigger({
    callback,
    delay = 500,
    enabled = true
}: UseInactivityTriggerOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);

    // Keep refs in sync
    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    // Clear existing timeout
    const clearTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Reset the timer (called on keyboard activity)
    const resetTimer = useCallback(() => {
        clearTimer();

        if (!enabled || isLoadingRef.current) {
            return;
        }

        timeoutRef.current = setTimeout(async () => {
            if (!isLoadingRef.current) {
                setIsLoading(true);
                try {
                    await callback();
                } catch (error) {
                    console.error('Error in inactivity trigger callback:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        }, delay);
    }, [callback, delay, enabled, clearTimer]);

    // Manual trigger function
    const trigger = useCallback(async () => {
        if (isLoadingRef.current) {
            return;
        }

        clearTimer();
        setIsLoading(true);
        try {
            await callback();
        } catch (error) {
            console.error('Error in manual trigger:', error);
        } finally {
            setIsLoading(false);
        }
    }, [callback, clearTimer]);

    // Set up global keyboard event listeners
    useEffect(() => {
        if (!enabled) {
            clearTimer();
            return;
        }

        const handleKeyboardActivity = (event: KeyboardEvent) => {
            // Reset timer on any keyboard activity
            resetTimer();
        };

        // Listen for all keyboard events globally
        document.addEventListener('keydown', handleKeyboardActivity, true);
        document.addEventListener('keyup', handleKeyboardActivity, true);
        document.addEventListener('keypress', handleKeyboardActivity, true);

        // Cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeyboardActivity, true);
            document.removeEventListener('keyup', handleKeyboardActivity, true);
            document.removeEventListener('keypress', handleKeyboardActivity, true);
            clearTimer();
        };
    }, [enabled, resetTimer, clearTimer]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            clearTimer();
        };
    }, [clearTimer]);

    return {
        isLoading,
        trigger,
        reset: resetTimer
    };
} 