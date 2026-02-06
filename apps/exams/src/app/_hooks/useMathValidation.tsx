import { useState, useCallback } from "react";
import { curriculumApiClient } from "../_lib/utils/axiosHelper";
import { MathValidationResponse } from "@/app/types/mathValidation";

interface UseMathValidationProps {
  onValidationComplete?: (result: MathValidationResponse) => void;
  onValidationError?: (error: string) => void;
}

export const useMathValidation = ({
  onValidationComplete,
  onValidationError,
}: UseMathValidationProps = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationResult, setLastValidationResult] =
    useState<MathValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateExpressions = useCallback(
    async (expressions: Array<{ latex: string; [key: string]: unknown }>) => {
      if (!expressions || expressions.length === 0) {
        // console.log("📋 No expressions to validate");
        return;
      }

      // Extract just the latex strings from the expression objects
      const latexSteps = expressions
        .map((expr) => expr.latex)
        .filter((latex) => latex && latex.trim() !== ""); // Filter out empty expressions

      if (latexSteps.length === 0) {
        // console.log("📋 No non-empty expressions to validate");
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const requestPayload = { latex_steps: latexSteps };
        const response = await curriculumApiClient.post<MathValidationResponse>(
          "/practice/validate-math",
          requestPayload
        );
        const result = response.data;
        setLastValidationResult(result);

        // Call the completion callback if provided
        if (onValidationComplete) {
          onValidationComplete(result);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Math validation failed";
        setError(errorMessage);

        // Call the error callback if provided
        if (onValidationError) {
          onValidationError(errorMessage);
        }

        throw err;
      } finally {
        setIsValidating(false);
      }
    },
    [onValidationComplete, onValidationError]
  );

  const clearValidation = useCallback(() => {
    setLastValidationResult(null);
    setError(null);
  }, []);

  return {
    validateExpressions,
    isValidating,
    lastValidationResult,
    error,
    clearValidation,
  };
};
