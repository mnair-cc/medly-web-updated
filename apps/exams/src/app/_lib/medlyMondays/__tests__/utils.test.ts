import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isSubjectUnlockedByFeature,
  isCurrentlyMondayUTC,
  MedlyMondaysFeature,
} from "../utils";

describe("medlyMondays/utils", () => {
  describe("isCurrentlyMondayUTC", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Window is 9am Monday UTC to 9am Tuesday UTC

    it("returns false on Monday before 9am UTC", () => {
      // Monday, January 6, 2025 08:59:59 UTC
      vi.setSystemTime(new Date("2025-01-06T08:59:59Z"));
      expect(isCurrentlyMondayUTC()).toBe(false);
    });

    it("returns true on Monday at 9am UTC", () => {
      // Monday, January 6, 2025 09:00:00 UTC
      vi.setSystemTime(new Date("2025-01-06T09:00:00Z"));
      expect(isCurrentlyMondayUTC()).toBe(true);
    });

    it("returns true on Monday afternoon UTC", () => {
      // Monday, January 6, 2025 15:00:00 UTC
      vi.setSystemTime(new Date("2025-01-06T15:00:00Z"));
      expect(isCurrentlyMondayUTC()).toBe(true);
    });

    it("returns true on Monday at 11:59pm UTC", () => {
      // Monday, January 6, 2025 23:59:59 UTC
      vi.setSystemTime(new Date("2025-01-06T23:59:59Z"));
      expect(isCurrentlyMondayUTC()).toBe(true);
    });

    it("returns true on Tuesday before 9am UTC", () => {
      // Tuesday, January 7, 2025 08:59:59 UTC
      vi.setSystemTime(new Date("2025-01-07T08:59:59Z"));
      expect(isCurrentlyMondayUTC()).toBe(true);
    });

    it("returns false on Tuesday at 9am UTC", () => {
      // Tuesday, January 7, 2025 09:00:00 UTC
      vi.setSystemTime(new Date("2025-01-07T09:00:00Z"));
      expect(isCurrentlyMondayUTC()).toBe(false);
    });

    it("returns false on Sunday UTC", () => {
      // Sunday, January 5, 2025 12:00:00 UTC
      vi.setSystemTime(new Date("2025-01-05T12:00:00Z"));
      expect(isCurrentlyMondayUTC()).toBe(false);
    });

    it("returns false on Friday UTC", () => {
      // Friday, January 10, 2025 12:00:00 UTC
      vi.setSystemTime(new Date("2025-01-10T12:00:00Z"));
      expect(isCurrentlyMondayUTC()).toBe(false);
    });
  });

  describe("isSubjectUnlockedByFeature", () => {
    describe("with single subject legacy ID", () => {
      const feature: MedlyMondaysFeature = { subjects: ["aqaGCSEBio"] };

      it("unlocks exact match - aqaGCSEBio", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", feature)).toBe(true);
      });

      it("does not unlock aqaA2Bio (exact match required)", () => {
        expect(isSubjectUnlockedByFeature("aqaA2Bio", feature)).toBe(false);
      });

      it("does not unlock aqaGCSECBio (exact match required)", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSECBio", feature)).toBe(false);
      });

      it("does not unlock edexcelGCSEBio", () => {
        expect(isSubjectUnlockedByFeature("edexcelGCSEBio", feature)).toBe(
          false
        );
      });

      it("does not unlock aqaGCSEChem", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEChem", feature)).toBe(false);
      });

      it("is case-sensitive", () => {
        expect(isSubjectUnlockedByFeature("aqagcsebio", feature)).toBe(false);
        expect(isSubjectUnlockedByFeature("AQAGCSEBIO", feature)).toBe(false);
      });
    });

    describe("with multiple subject legacy IDs (same subject, different boards)", () => {
      const feature: MedlyMondaysFeature = {
        subjects: ["aqaGCSEBio", "edexcelGCSEBio", "ocrGCSEBioA"],
      };

      it("unlocks aqaGCSEBio", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", feature)).toBe(true);
      });

      it("unlocks edexcelGCSEBio", () => {
        expect(isSubjectUnlockedByFeature("edexcelGCSEBio", feature)).toBe(
          true
        );
      });

      it("unlocks ocrGCSEBioA", () => {
        expect(isSubjectUnlockedByFeature("ocrGCSEBioA", feature)).toBe(true);
      });

      it("does not unlock cieIGCSEBio - not in list", () => {
        expect(isSubjectUnlockedByFeature("cieIGCSEBio", feature)).toBe(false);
      });

      it("does not unlock aqaGCSEChem", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEChem", feature)).toBe(false);
      });
    });

    describe("with multiple different subjects", () => {
      const feature: MedlyMondaysFeature = {
        subjects: ["aqaGCSEBio", "aqaGCSEChem", "aqaGCSEPhys"],
      };

      it("unlocks aqaGCSEBio", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", feature)).toBe(true);
      });

      it("unlocks aqaGCSEChem", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEChem", feature)).toBe(true);
      });

      it("unlocks aqaGCSEPhys", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEPhys", feature)).toBe(true);
      });

      it("does not unlock aqaGCSEMaths", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEMaths", feature)).toBe(false);
      });
    });

    describe("with none feature", () => {
      const feature: MedlyMondaysFeature = "none";

      it("does not unlock any subject", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", feature)).toBe(false);
        expect(isSubjectUnlockedByFeature("edexcelA2Chem", feature)).toBe(
          false
        );
        expect(isSubjectUnlockedByFeature("ocrGCSEMathsA", feature)).toBe(
          false
        );
      });
    });

    describe("with textbook-view feature", () => {
      const feature: MedlyMondaysFeature = "textbook-view";

      it("does not unlock any subject (textbook-view is for textbooks only)", () => {
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", feature)).toBe(false);
        expect(isSubjectUnlockedByFeature("edexcelA2Chem", feature)).toBe(
          false
        );
      });
    });

    describe("edge cases", () => {
      const feature: MedlyMondaysFeature = { subjects: ["aqaGCSEBio"] };

      it("returns false for undefined subjectLegacyId", () => {
        expect(isSubjectUnlockedByFeature(undefined, feature)).toBe(false);
      });

      it("returns false for empty string subjectLegacyId", () => {
        expect(isSubjectUnlockedByFeature("", feature)).toBe(false);
      });

      it("returns false for empty subjects array", () => {
        const emptyFeature: MedlyMondaysFeature = { subjects: [] };
        expect(isSubjectUnlockedByFeature("aqaGCSEBio", emptyFeature)).toBe(
          false
        );
      });

      it("handles IB subject legacy IDs", () => {
        const ibFeature: MedlyMondaysFeature = {
          subjects: ["ibMathsAA"],
        };
        expect(isSubjectUnlockedByFeature("ibMathsAA", ibFeature)).toBe(true);
        expect(isSubjectUnlockedByFeature("ibMathsAI", ibFeature)).toBe(false);
        expect(isSubjectUnlockedByFeature("aqaGCSEMaths", ibFeature)).toBe(
          false
        );
      });

      it("handles combined subject legacy IDs", () => {
        const combinedFeature: MedlyMondaysFeature = {
          subjects: ["aqaGCSECChem"],
        };
        expect(isSubjectUnlockedByFeature("aqaGCSECChem", combinedFeature)).toBe(
          true
        );
        expect(isSubjectUnlockedByFeature("aqaGCSEChem", combinedFeature)).toBe(
          false
        );
      });
    });
  });
});
