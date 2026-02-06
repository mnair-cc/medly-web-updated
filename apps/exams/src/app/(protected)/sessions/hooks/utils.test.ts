// Test file to validate SPR matching logic
import { describe, it, expect } from "vitest";
import { markSatQuestion } from "./utils";

const testCases = [
  // Test case for 3.5
  {
    correct: "3.5",
    user: "3.5",
    shouldMatch: true,
    description: "3.5 exact match",
  },
  {
    correct: "3.5",
    user: "3.50",
    shouldMatch: true,
    description: "3.5 with trailing zero",
  },
  {
    correct: "3.5",
    user: "7/2",
    shouldMatch: true,
    description: "3.5 as fraction 7/2",
  },
  {
    correct: "3.5",
    user: "31/2",
    shouldMatch: false,
    description: "3.5 as fraction 31/2 (should not match)",
  },
  {
    correct: "3.5",
    user: "3 1/2",
    shouldMatch: false,
    description: "3.5 as mixed fraction 3 1/2 (should not match)",
  },

  // Test case for 2/3
  {
    correct: "2/3",
    user: "2/3",
    shouldMatch: true,
    description: "2/3 exact match",
  },
  {
    correct: "2/3",
    user: ".6666",
    shouldMatch: true,
    description: "2/3 as .6666",
  },
  {
    correct: "2/3",
    user: ".6667",
    shouldMatch: true,
    description: "2/3 as .6667",
  },
  {
    correct: "2/3",
    user: "0.666",
    shouldMatch: true,
    description: "2/3 as 0.666",
  },
  {
    correct: "2/3",
    user: "0.667",
    shouldMatch: true,
    description: "2/3 as 0.667",
  },
  {
    correct: "2/3",
    user: "0.66",
    shouldMatch: false,
    description: "2/3 vs 0.66 (should not match)",
  },
  {
    correct: "2/3",
    user: ".66",
    shouldMatch: false,
    description: "2/3 vs .66 (should not match)",
  },
  {
    correct: "2/3",
    user: "0.67",
    shouldMatch: false,
    description: "2/3 vs 0.67 (should not match)",
  },
  {
    correct: "2/3",
    user: ".67",
    shouldMatch: false,
    description: "2/3 vs .67 (should not match)",
  },

  // Test case for -1/3
  {
    correct: "-1/3",
    user: "-1/3",
    shouldMatch: true,
    description: "-1/3 exact match",
  },
  {
    correct: "-1/3",
    user: "-.3333",
    shouldMatch: true,
    description: "-1/3 as -.3333",
  },
  {
    correct: "-1/3",
    user: "-0.333",
    shouldMatch: true,
    description: "-1/3 as -0.333",
  },
  {
    correct: "-1/3",
    user: "-.33",
    shouldMatch: false,
    description: "-1/3 vs -.33 (should not match)",
  },
  {
    correct: "-1/3",
    user: "-0.33",
    shouldMatch: false,
    description: "-1/3 vs -0.33 (should not match)",
  },

  // Test case for 1/6 (0.1666...)
  {
    correct: "1/6",
    user: "1/6",
    shouldMatch: true,
    description: "1/6 exact match",
  },
  {
    correct: "1/6",
    user: "0.1666",
    shouldMatch: true,
    description: "1/6 as 0.1666",
  },
  {
    correct: "1/6",
    user: "0.1667",
    shouldMatch: true,
    description: "1/6 as 0.1667",
  },
  {
    correct: "1/6",
    user: "0.16",
    shouldMatch: false,
    description: "1/6 vs 0.16 (should not match)",
  },
  {
    correct: "1/6",
    user: "0.17",
    shouldMatch: false,
    description: "1/6 vs 0.17 (should not match)",
  },

  // Test case for 5/6 (0.8333...)
  {
    correct: "5/6",
    user: "5/6",
    shouldMatch: true,
    description: "5/6 exact match",
  },
  {
    correct: "5/6",
    user: "0.8333",
    shouldMatch: true,
    description: "5/6 as 0.8333",
  },
  {
    correct: "5/6",
    user: "0.8334",
    shouldMatch: true,
    description: "5/6 as 0.8334",
  },
  {
    correct: "5/6",
    user: "0.83",
    shouldMatch: false,
    description: "5/6 vs 0.83 (should not match)",
  },

  // Test case for 1/9 (0.1111...)
  {
    correct: "1/9",
    user: "0.1111",
    shouldMatch: true,
    description: "1/9 as 0.1111",
  },
  {
    correct: "1/9",
    user: "0.11",
    shouldMatch: false,
    description: "1/9 vs 0.11 (should not match)",
  },

  // Test case for 1/7 (0.142857...)
  {
    correct: "1/7",
    user: "1/7",
    shouldMatch: true,
    description: "1/7 exact match",
  },
  {
    correct: "1/7",
    user: "0.1429",
    shouldMatch: true,
    description: "1/7 as 0.1429",
  },
  {
    correct: "1/7",
    user: "0.14",
    shouldMatch: false,
    description: "1/7 vs 0.14 (should not match)",
  },

  // Test case for 5/11 (0.454545...)
  {
    correct: "5/11",
    user: "5/11",
    shouldMatch: true,
    description: "5/11 exact match",
  },
  {
    correct: "5/11",
    user: "0.4545",
    shouldMatch: true,
    description: "5/11 as 0.4545",
  },
  {
    correct: "5/11",
    user: "0.45",
    shouldMatch: false,
    description: "5/11 vs 0.45 (should not match)",
  },

  // Test case for 1/11 (0.090909...)
  {
    correct: "1/11",
    user: "0.0909",
    shouldMatch: true,
    description: "1/11 as 0.0909",
  },
  {
    correct: "1/11",
    user: "0.09",
    shouldMatch: false,
    description: "1/11 vs 0.09 (should not match)",
  },

  // Test case for 3/11 (0.272727...)
  {
    correct: "3/11",
    user: "0.2727",
    shouldMatch: true,
    description: "3/11 as 0.2727",
  },
  {
    correct: "3/11",
    user: "0.27",
    shouldMatch: false,
    description: "3/11 vs 0.27 (should not match)",
  },

  // Test case for 1/37 (0.027027...)
  {
    correct: "1/37",
    user: "0.027027",
    shouldMatch: true,
    description: "1/37 as 0.027027",
  },
  {
    correct: "1/37",
    user: "0.027",
    shouldMatch: true,
    description: "1/37 as 0.027 (3 decimal places)",
  },
  {
    correct: "1/37",
    user: "0.03",
    shouldMatch: false,
    description: "1/37 vs 0.03 (should not match - too truncated)",
  },
];

describe("SAT SPR Matching", () => {
  testCases.forEach(({ correct, user, shouldMatch, description }) => {
    it(description, () => {
      const markingContext = {
        questionLegacyId: "test",
        question: "Test question",
        correctAnswer: correct,
        markMax: 1,
        userAnswer: user,
        canvas: undefined,
        questionType: "spr",
      };

      const result = markSatQuestion(markingContext);
      const actualMatch = (result.userMark ?? 0) > 0;

      expect(actualMatch).toBe(shouldMatch);
    });
  });
});
