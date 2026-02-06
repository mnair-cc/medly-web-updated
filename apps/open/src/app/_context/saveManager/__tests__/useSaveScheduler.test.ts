import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useSaveScheduler } from "../useSaveScheduler";

// ============================================================================
// Test Helpers
// ============================================================================

const advanceTimers = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

// ============================================================================
// Tests
// ============================================================================

describe("useSaveScheduler", () => {
  const mockOnFlush = vi.fn();

  const defaultOptions = {
    debounceMs: 1000,
    maxWaitMs: 5000,
    onFlush: mockOnFlush,
    isExecuting: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockOnFlush.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("schedule", () => {
    it("calls onFlush after debounce timeout", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      expect(mockOnFlush).not.toHaveBeenCalled();

      await advanceTimers(1000);

      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("resets debounce timer on multiple schedule calls", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());
      await advanceTimers(500);

      act(() => result.current.schedule());
      await advanceTimers(500);

      // Should not have fired yet (reset to 1000ms)
      expect(mockOnFlush).not.toHaveBeenCalled();

      await advanceTimers(500);
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("does not schedule when isExecuting is true", async () => {
      const { result } = renderHook(() =>
        useSaveScheduler({ ...defaultOptions, isExecuting: true })
      );

      act(() => result.current.schedule());

      await advanceTimers(10000);

      expect(mockOnFlush).not.toHaveBeenCalled();
    });

    it("fires at maxWaitMs even if debounce keeps resetting", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      // Keep resetting debounce
      act(() => result.current.schedule());
      await advanceTimers(500);
      act(() => result.current.schedule());
      await advanceTimers(500);
      act(() => result.current.schedule());
      await advanceTimers(500);
      act(() => result.current.schedule());
      await advanceTimers(500);
      act(() => result.current.schedule());
      await advanceTimers(500);

      // Advance to maxWait (5000ms total from first schedule)
      await advanceTimers(3000);

      // Should have fired at maxWait (5000ms)
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("skips debounce timer if debounceMs >= maxWaitMs", async () => {
      const { result } = renderHook(() =>
        useSaveScheduler({
          ...defaultOptions,
          debounceMs: 5000,
          maxWaitMs: 5000,
        })
      );

      act(() => result.current.schedule());

      await advanceTimers(1000);
      expect(mockOnFlush).not.toHaveBeenCalled();

      await advanceTimers(4000);
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("clears debounce timer when maxWait fires", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      // Fire maxWait
      await advanceTimers(5000);

      expect(mockOnFlush).toHaveBeenCalledTimes(1);

      // Debounce timer should be cleared, so no additional call
      await advanceTimers(10000);
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("clears maxWait timer when debounce fires", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      // Fire debounce before maxWait
      await advanceTimers(1000);

      expect(mockOnFlush).toHaveBeenCalledTimes(1);

      // MaxWait timer should be cleared, so no additional call
      await advanceTimers(10000);
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });
  });

  describe("flush", () => {
    it("calls onFlush immediately and clears timers", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      await act(async () => {
        await result.current.flush();
      });

      expect(mockOnFlush).toHaveBeenCalledTimes(1);

      // Timers should be cleared, so no additional call
      await advanceTimers(10000);
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("does not call onFlush if isExecuting is true", async () => {
      const { result } = renderHook(() =>
        useSaveScheduler({ ...defaultOptions, isExecuting: true })
      );

      await act(async () => {
        await result.current.flush();
      });

      expect(mockOnFlush).not.toHaveBeenCalled();
    });

    it("clears timers even if isExecuting is true", async () => {
      const { result, rerender } = renderHook(
        (props) => useSaveScheduler(props),
        {
          initialProps: defaultOptions,
        }
      );

      act(() => result.current.schedule());

      // Change to executing and clear timers directly
      rerender({ ...defaultOptions, isExecuting: true });

      act(() => result.current.clearTimers());

      // Timers should be cleared, so no call should happen
      await advanceTimers(10000);
      expect(mockOnFlush).not.toHaveBeenCalled();
    });
  });

  describe("clearTimers", () => {
    it("clears all timers", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      act(() => result.current.clearTimers());

      await advanceTimers(10000);

      expect(mockOnFlush).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("clears timers on unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useSaveScheduler(defaultOptions)
      );

      act(() => result.current.schedule());

      unmount();

      await advanceTimers(10000);

      expect(mockOnFlush).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles onFlush returning a promise", async () => {
      let resolveFlush: () => void;
      const flushPromise = new Promise<void>((resolve) => {
        resolveFlush = resolve;
      });
      mockOnFlush.mockReturnValue(flushPromise);

      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());

      await advanceTimers(1000);

      expect(mockOnFlush).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFlush!();
        await flushPromise;
      });
    });

    it("handles rapid schedule calls", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      // Rapidly schedule multiple times
      act(() => {
        result.current.schedule();
        result.current.schedule();
        result.current.schedule();
        result.current.schedule();
        result.current.schedule();
      });

      await advanceTimers(1000);

      // Should only fire once
      expect(mockOnFlush).toHaveBeenCalledTimes(1);
    });

    it("handles schedule after flush", async () => {
      const { result } = renderHook(() => useSaveScheduler(defaultOptions));

      act(() => result.current.schedule());
      await act(async () => {
        await result.current.flush();
      });

      expect(mockOnFlush).toHaveBeenCalledTimes(1);

      // Schedule again
      act(() => result.current.schedule());
      await advanceTimers(1000);

      expect(mockOnFlush).toHaveBeenCalledTimes(2);
    });
  });
});

