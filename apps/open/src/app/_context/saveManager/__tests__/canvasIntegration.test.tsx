import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  useSaveManager,
  SaveState,
  SaveManagerProvider,
  DEBOUNCE_MS,
} from "../../SaveManagerProvider";
import { SessionType } from "@/app/(protected)/sessions/types";
import { hasCanvasContentChanged } from "../saveManager.utils";
import type { QuestionWithMarkingResult, Canvas } from "@/app/types/types";
import type { ReactNode } from "react";

// ============================================================================
// Mocks
// ============================================================================

const { mockPut } = vi.hoisted(() => ({
  mockPut: vi.fn(),
}));

vi.mock("@/app/_lib/utils/axiosHelper", () => ({
  curriculumApiV2Client: { put: mockPut },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../../UserProvider", () => ({
  useUser: () => ({
    refetchUser: vi.fn(),
    user: null,
    setUser: vi.fn(),
    loading: false,
    error: undefined,
    updateUser: vi.fn(),
  }),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SaveManagerProvider>{children}</SaveManagerProvider>
  </QueryClientProvider>
);

const defaultParams = {
  lessonId: "lesson-123",
  sessionType: SessionType.LessonSession,
};

// ============================================================================
// Tests
// ============================================================================

describe("Canvas Save Integration (mimicking useSession logic)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * This test mimics the logic in useSession.tsx:updateQuestionCanvas
   * which was the site of the bug. It checks if hasCanvasContentChanged
   * correctly identifies property changes and triggers addPendingSave.
   */
  it("triggers a save when ONLY the font size of a textbox is changed", async () => {
    const { result } = renderHook(() => useSaveManager(defaultParams), {
      wrapper,
    });

    const initialCanvas: Canvas = {
      textboxes: [{ text: "Solve for x", x: 10, y: 10, fontSize: 12, color: "black" }],
      paths: [],
    };

    const updatedCanvas: Canvas = {
      ...initialCanvas,
      textboxes: [{ ...initialCanvas.textboxes![0], fontSize: 24 }],
    };

    // Mimic useSession logic:
    // if (hasCanvasContentChanged(existingQuestion.canvas, canvas)) { addPendingSave(...) }
    
    // 1. First, set an initial state (this wouldn't trigger a save if we don't call addPendingSave, 
    // but in this test we are testing the transition from initial to updated)
    const initialQuestion = {
      questionLegacyId: "q1",
      canvas: initialCanvas,
    } as QuestionWithMarkingResult;

    // 2. Now simulate the update logic
    await act(async () => {
      if (hasCanvasContentChanged(initialQuestion.canvas, updatedCanvas)) {
        result.current.addPendingSave({
          ...initialQuestion,
          canvas: updatedCanvas,
        });
      }
    });

    // Verify it was added to pending saves
    expect(result.current.hasPendingSaves).toBe(true);
    expect(result.current.saveState).toBe(SaveState.SAVING);

    // Advance timers to trigger the API call
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    // Verify API was called with the updated fontSize
    expect(mockPut).toHaveBeenCalledTimes(1);
    const sentCanvas = mockPut.mock.calls[0][1].answers[0].canvas;
    expect(sentCanvas.textboxes[0].fontSize).toBe(24);
  });

  it("triggers a save when ONLY the color of a math element is changed", async () => {
    const { result } = renderHook(() => useSaveManager(defaultParams), {
      wrapper,
    });

    const initialCanvas: Canvas = {
      maths: [{ latex: "x^2", x: 10, y: 10, fontSize: 14, color: "black" }],
      paths: [],
    };

    const updatedCanvas: Canvas = {
      ...initialCanvas,
      maths: [{ ...initialCanvas.maths![0], color: "blue" }],
    };

    const initialQuestion = {
      questionLegacyId: "q1",
      canvas: initialCanvas,
    } as QuestionWithMarkingResult;

    await act(async () => {
      if (hasCanvasContentChanged(initialQuestion.canvas, updatedCanvas)) {
        result.current.addPendingSave({
          ...initialQuestion,
          canvas: updatedCanvas,
        });
      }
    });

    expect(result.current.hasPendingSaves).toBe(true);
    
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(mockPut).toHaveBeenCalledTimes(1);
    const sentCanvas = mockPut.mock.calls[0][1].answers[0].canvas;
    expect(sentCanvas.maths[0].color).toBe("blue");
  });

  it("does NOT trigger a save when an empty textbox is added (initial bug prevention logic)", async () => {
    const { result } = renderHook(() => useSaveManager(defaultParams), {
      wrapper,
    });

    const initialCanvas: Canvas = {
      textboxes: [{ text: "Question", x: 10, y: 10, fontSize: 12, color: "black" }],
      paths: [],
    };

    // Adding a second textbox that is empty
    const updatedCanvas: Canvas = {
      ...initialCanvas,
      textboxes: [
        initialCanvas.textboxes![0],
        { text: "", x: 50, y: 50, fontSize: 12, color: "black" }
      ],
    };

    const initialQuestion = {
      questionLegacyId: "q1",
      canvas: initialCanvas,
    } as QuestionWithMarkingResult;

    await act(async () => {
      if (hasCanvasContentChanged(initialQuestion.canvas, updatedCanvas)) {
        result.current.addPendingSave({
          ...initialQuestion,
          canvas: updatedCanvas,
        });
      }
    });

    // Should NOT have added a pending save
    expect(result.current.hasPendingSaves).toBe(false);
    expect(result.current.saveState).toBe(SaveState.SAVED);
  });
});

