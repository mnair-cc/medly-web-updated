import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getRequestDeadline,
  getRemainingBudget,
  hasBudgetForRetry,
} from "../deadline";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";

const mockedHeaders = headers as ReturnType<typeof vi.fn>;

describe("deadline utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getRequestDeadline", () => {
    it("returns undefined when header is not set", async () => {
      mockedHeaders.mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(null),
      });

      const result = await getRequestDeadline();

      expect(result).toBeUndefined();
    });

    it("returns parsed deadline when header is set", async () => {
      const deadline = Date.now() + 5000;
      mockedHeaders.mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(String(deadline)),
      });

      const result = await getRequestDeadline();

      expect(result).toBe(deadline);
    });

    it("returns undefined for invalid header value", async () => {
      mockedHeaders.mockResolvedValueOnce({
        get: vi.fn().mockReturnValue("not-a-number"),
      });

      const result = await getRequestDeadline();

      expect(result).toBeUndefined();
    });
  });

  describe("getRemainingBudget", () => {
    it("returns null when deadline has passed", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Deadline was 1 second ago
      const deadline = Date.now() - 1000;

      const result = getRemainingBudget(deadline);

      expect(result).toBeNull();
    });

    it("returns null when remaining time is less than safety buffer (50ms)", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Deadline is 40ms from now (less than 50ms safety buffer)
      const deadline = Date.now() + 40;

      const result = getRemainingBudget(deadline);

      expect(result).toBeNull();
    });

    it("returns remaining time minus safety buffer when deadline is in future", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Deadline is 1000ms from now
      const deadline = Date.now() + 1000;

      const result = getRemainingBudget(deadline);

      // Should be 1000 - 50 (safety buffer) = 950ms
      expect(result).toBe(950);
    });

    it("returns correct budget for longer deadlines", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Deadline is 5000ms from now
      const deadline = Date.now() + 5000;

      const result = getRemainingBudget(deadline);

      // Should be 5000 - 50 (safety buffer) = 4950ms
      expect(result).toBe(4950);
    });
  });

  describe("hasBudgetForRetry", () => {
    it("returns false when less than 20% budget remains", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const originalBudget = 5000;
      // Deadline is 500ms from now (10% of 5000ms)
      const deadline = Date.now() + 500;

      const result = hasBudgetForRetry(deadline, originalBudget);

      expect(result).toBe(false);
    });

    it("returns false when exactly 20% budget remains", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const originalBudget = 5000;
      // Deadline is 1000ms from now (exactly 20% of 5000ms)
      const deadline = Date.now() + 1000;

      const result = hasBudgetForRetry(deadline, originalBudget);

      // Should be false because condition is > 20%, not >= 20%
      expect(result).toBe(false);
    });

    it("returns true when more than 20% budget remains", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const originalBudget = 5000;
      // Deadline is 1500ms from now (30% of 5000ms)
      const deadline = Date.now() + 1500;

      const result = hasBudgetForRetry(deadline, originalBudget);

      expect(result).toBe(true);
    });

    it("returns true when full budget remains", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const originalBudget = 5000;
      // Deadline is 5000ms from now (100% of budget)
      const deadline = Date.now() + 5000;

      const result = hasBudgetForRetry(deadline, originalBudget);

      expect(result).toBe(true);
    });

    it("returns false when deadline has passed", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const originalBudget = 5000;
      // Deadline was 1000ms ago
      const deadline = Date.now() - 1000;

      const result = hasBudgetForRetry(deadline, originalBudget);

      expect(result).toBe(false);
    });
  });
});
