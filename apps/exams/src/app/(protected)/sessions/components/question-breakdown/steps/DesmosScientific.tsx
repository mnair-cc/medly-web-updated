"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useDesmosButtonDetection } from "@/app/_hooks/useDesmosButtonDetection";
import { useMathValidation } from "@/app/_hooks/useMathValidation";
import HandwritingLayer from "./HandwritingLayer";
import SketchCanvasToolbar from "./SketchCanvasToolbar";
import { SessionType } from "../../../types";

// Extend the global Window interface to include Desmos
declare global {
  interface Window {
    Desmos: {
      GraphingCalculator: (element: HTMLElement, options?: any) => any;
      ScientificCalculator: (element: HTMLElement, options?: any) => any;
    };
  }
}

interface LineSnapshot {
  latex: string;
  confidence: number | null;
  strokes: any; // { paths: { paths: Point[] }[] }
}

interface LineData {
  index: number;
  strokes: any | null;
  ocr?: {
    latex: string;
    confidence: number;
    confidence_rate?: number;
    raw: any; // full Mathpix result
  } | null;
  validation?: {
    mode: "algebraic_steps" | "individual" | "consistency";
    stepValidation?: any; // StepValidation when algebraic_steps
    individualValidation?: any; // IndividualValidation when individual
    overall?: any; // MathValidationResponse["summary"] snapshot
  } | null;
  calculatedOutput?: number | null; // 🆕 Desmos calculated result
}

interface LineHistoryEntry {
  timestamp: number;
  index: number;
  from: LineSnapshot | null;
  to: LineSnapshot;
}

interface ExpressionItemDecoration {
  index: number;
  decoration: boolean;
  validationState?: "invalid" | "indeterminate" | "valid"; // Add validation state for different decoration colors
}

interface DesmosScientificProps {
  inputMode?: string;
  desmos_type?: "graph" | "scientific";
  width?: number;
  height?: number;
  expressions?: Array<{
    id?: string;
    latex: string;
    color?: string;
    [key: string]: any;
  }>;
  options?: any;
  onExpressionsChange?: (expressions: any[]) => void;
  onPressCheckDesmos?: () => void;
  onExpressionItemPress?: (index: number, element: HTMLElement) => void;
  onPressUnderline?: (index: number) => void;
  onExpressionUpdated?: (expressionIndex: number, latex: string) => void;
  showMedlyLayer?: boolean;
  isAwaitingResponse?: boolean;
  isSolveTogether?: boolean;
  expressionItemDecorations?: ExpressionItemDecoration[];
  hideKeyboard?: boolean;
  onLinesDataChange?: (data: {
    current: LineData[];
    history: LineHistoryEntry[];
  }) => void;
  maxMark?: number; // NEW: Number of marks for the question to determine initial lines
  floatingMessage?: {
    text: string;
    targetText?: string;
    targetAction?: string;
    targetIndex?: number;
    targetComponent?: string;
  };
  isReadOnly?: boolean;
  questionId?: string;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeIndex: number
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeIndex: number) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  sessionType?: SessionType;
}

const DesmosScientific = forwardRef<any, DesmosScientificProps>(
  (
    {
      inputMode = "math",
      desmos_type = "scientific",
      width = 600,
      height = 400,
      expressions = [],
      options = {},
      onExpressionsChange,
      onPressCheckDesmos,
      onExpressionItemPress,
      onPressUnderline,
      onExpressionUpdated,
      showMedlyLayer = false,
      isAwaitingResponse = false,
      isSolveTogether = false,
      expressionItemDecorations = [],
      hideKeyboard = true,
      onLinesDataChange,
      maxMark, // NEW: Added this parameter
      floatingMessage,
      isReadOnly = false,
      questionId,
      onStrokeAdded,
      onStrokeRemoved,
      onEraseAction,
      sessionType,
    },
    ref
  ) => {
    const calculatorRef = useRef<HTMLDivElement>(null);
    const calculatorInstance = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentBounds, setCurrentBounds] = useState<any>(null);
    const [currentTool, setCurrentTool] = useState<"pen" | "eraser" | "">(
      "pen"
    );
    const handwritingLayerRef = useRef<any>(null);
    const { isWideScreen, isTouchScreen } = useResponsive();

    // State to track validation-based decorations
    const [validationDecorations, setValidationDecorations] = useState<
      ExpressionItemDecoration[]
    >([]);

    // ----- Handwriting lines data (current state + history) -----
    const [linesCurrent, setLinesCurrent] = useState<LineData[]>([]);
    const [linesHistory, setLinesHistory] = useState<LineHistoryEntry[]>([]);
    const linesCurrentRef = useRef<LineData[]>([]);
    const linesHistoryRef = useRef<LineHistoryEntry[]>([]);

    // Mapping from validation order (non-empty expressions) -> original indices
    const nonEmptyIndexMapRef = useRef<number[]>([]);
    // Last committed snapshot per index for history diffs
    const lastCommittedSnapshotByIndexRef = useRef<Map<number, LineSnapshot>>(
      new Map()
    );
    const lastFocusedIndexRef = useRef<number | null>(null);

    // Helper: ensure linesCurrent has an entry for index
    const ensureLineIndex = useCallback((index: number) => {
      setLinesCurrent((prev) => {
        const next = [...prev];
        while (next.length <= index) {
          next.push({
            index: next.length,
            strokes: null,
            ocr: null,
            validation: null,
          });
        }
        return next;
      });
    }, []);

    // Helper: build snapshot from current data for an index
    const getLineSnapshot = useCallback(
      (index: number): LineSnapshot | null => {
        const line = linesCurrentRef.current[index];
        if (!line) return null;
        return {
          latex: line.ocr?.latex ?? "",
          confidence: line.ocr?.confidence ?? null,
          strokes: line.strokes ?? null,
        } as LineSnapshot;
      },
      []
    );

    // Emit consolidated lines data to parent (separate from onExpressionsChange)
    const emitLinesData = useCallback(() => {
      if (onLinesDataChange) {
        onLinesDataChange({
          current: linesCurrentRef.current,
          history: linesHistoryRef.current,
        });
      }
    }, [onLinesDataChange]);

    // Base64 helper (not used yet)
    const jsonToBase64 = useCallback((obj: unknown): string => {
      try {
        const json = JSON.stringify(obj);
        if (typeof window === "undefined") {
          // @ts-ignore
          return Buffer.from(json).toString("base64");
        }
        return btoa(unescape(encodeURIComponent(json)));
      } catch (e) {
        console.error("jsonToBase64 failed", e);
        return "";
      }
    }, []);

    // Function to create initial expressions based on saved expressions or question marks (max of saved count or marks * 2, max 10)
    const createInitialExpressions = useCallback(() => {
      // console.log('🔢 createInitialExpressions called with maxMark:', maxMark);

      if (
        !calculatorInstance.current ||
        desmos_type !== "scientific" ||
        !maxMark
      ) {
        return;
      }

      try {
        if (
          typeof calculatorInstance.current.getState === "function" &&
          typeof calculatorInstance.current.setState === "function"
        ) {
          const currentState = calculatorInstance.current.getState();
          const currentExpressions = [
            ...(currentState?.expressions?.list || []),
          ];

          // Count saved expressions that need lines
          const savedExpressionCount = Array.isArray(expressions)
            ? expressions.length
            : 0;

          // Calculate number of initial lines: max of saved expressions or (marks * 2, max 10)
          const maxMarkLineCount = Math.min(maxMark * 2, 10);
          const targetLineCount = Math.max(
            savedExpressionCount,
            maxMarkLineCount
          );
          // console.log('🎯 Target line count:', targetLineCount, '(saved expressions:', savedExpressionCount, ', marks calc:', maxMarkLineCount, ')');

          // Only create initial expressions if we don't already have enough
          if (currentExpressions.length < targetLineCount) {
            const expressionsToAdd =
              targetLineCount - currentExpressions.length;
            // console.log('➕ Adding', expressionsToAdd, 'initial expressions');

            for (let i = 0; i < expressionsToAdd; i++) {
              currentExpressions.push({
                id: `expr-${currentExpressions.length}`,
                latex: "",
                type: "expression",
              });
            }

            // Suppress change notifications during this update
            suppressChangeNotificationRef.current = true;

            calculatorInstance.current.setState({
              ...currentState,
              expressions: { list: currentExpressions },
            });

            // console.log('✅ Created', expressionsToAdd, 'initial expressions, total:', currentExpressions.length);
          }
        }
      } catch (error) {
        console.error("❌ Error creating initial expressions:", error);
      }
    }, [desmos_type, maxMark]);

    // Ref to track when we should suppress change notifications
    const suppressChangeNotificationRef = useRef(false);
    // Ref to track the last expressions state for comparison
    const lastExpressionsRef = useRef<any[]>([]);

    // Function to get current expressions safely
    const getCurrentExpressions = useCallback(() => {
      if (!calculatorInstance.current || desmos_type !== "scientific")
        return [];

      try {
        if (typeof calculatorInstance.current.getState === "function") {
          const state = calculatorInstance.current.getState();
          return state?.expressions?.list || [];
        }
      } catch (error) {
        console.error("❌ Error getting current expressions:", error);
      }
      return [];
    }, [desmos_type]);

    // 🆕 Function to extract calculated results from DOM (since BasicCalculator API doesn't expose them)
    const getCalculatedResults = useCallback(() => {
      if (!calculatorRef.current) return [];

      const results: Array<{
        index: number;
        input: string;
        result: string | null;
        resultType: "decimal" | "fraction" | "integer" | "expression" | null;
        displayFormat: "decimal" | "fraction" | null;
        numericValue: number | null;
      }> = [];

      try {
        const basicExpressions = calculatorRef.current.querySelectorAll(
          ".dcg-basic-expression"
        );

        basicExpressions.forEach((expr, index) => {
          const mathField = expr.querySelector(".dcg-math-field");
          const outputContainer = expr.querySelector(
            ".dcg-exp-output-container"
          );

          const input = mathField?.textContent?.trim() || "";
          let result = null;
          let resultType = null;
          let displayFormat = null;
          let numericValue = null;

          if (outputContainer) {
            const outputVisible =
              window.getComputedStyle(outputContainer).display !== "none";

            if (outputVisible) {
              // Extract result from the math mode element
              const mathMode = outputContainer.querySelector(
                ".dcg-mq-math-mode .dcg-mq-root-block"
              );
              if (mathMode) {
                const fullText = mathMode.textContent?.trim();

                if (fullText && fullText.includes("=")) {
                  const parts = fullText.split("=");
                  if (parts.length > 1) {
                    result = parts[1].trim();

                    // Determine result type and numeric value
                    if (result.includes(".")) {
                      resultType = "decimal";
                      numericValue = Number(result);
                    } else if (result.includes("/")) {
                      resultType = "fraction";
                      // Parse fraction to decimal for numeric value
                      const fractionParts = result.split("/");
                      if (fractionParts.length === 2) {
                        const numerator = Number(fractionParts[0].trim());
                        const denominator = Number(fractionParts[1].trim());
                        if (
                          !isNaN(numerator) &&
                          !isNaN(denominator) &&
                          denominator !== 0
                        ) {
                          numericValue = numerator / denominator;
                        }
                      }
                    } else if (!isNaN(Number(result))) {
                      resultType = "integer";
                      numericValue = Number(result);
                    } else {
                      resultType = "expression";
                    }

                    // Check display format from fraction toggle
                    const fractionToggle = outputContainer.querySelector(
                      ".dcg-basic-fraction-toggle"
                    );
                    const isShowingDecimal = fractionToggle
                      ?.getAttribute("aria-label")
                      ?.includes("Displaying as decimal");
                    displayFormat = isShowingDecimal ? "decimal" : "fraction";
                  }
                }
              }
            }
          }

          results.push({
            index,
            input,
            result,
            resultType: resultType as any,
            displayFormat: displayFormat as any,
            numericValue,
          });
        });
      } catch (error) {
        console.error("❌ Error extracting calculated results:", error);
      }

      return results;
    }, []);

    // Function to process validation results and update decorations
    const processValidationResults = useCallback(
      (result: any) => {
        // Update decorations based on validation results
        if (result.line_validations) {
          let newDecorations: ExpressionItemDecoration[] = [];

          // Process line validations from the new API structure
          newDecorations = result.line_validations.map(
            (validation: any, backendIndex: number) => {
              let validationState: "invalid" | "indeterminate" | "valid" =
                "valid";
              let showDecoration = false;

              if (validation.valid === false) {
                validationState = "invalid";
                showDecoration = true;
              } else if (validation.valid === null) {
                validationState = "indeterminate";
                showDecoration = true;
              } else {
                validationState = "valid";
                showDecoration = false;
              }

              // Map backend array index to original expression index
              const originalIndex = nonEmptyIndexMapRef.current[backendIndex];

              return {
                index: originalIndex, // Use original index from mapping
                decoration: showDecoration,
                validationState,
              };
            }
          );

          setValidationDecorations(newDecorations);

          // Also store validation into linesCurrent per original index
          setLinesCurrent((prev) => {
            const updated = [...prev];
            const map = nonEmptyIndexMapRef.current;

            // 🆕 Get calculated results from Desmos to include in validation data
            const calculatedResults = getCalculatedResults();

            // Process line validations from the new API structure
            result.line_validations.forEach((lv: any, backendIndex: number) => {
              // Use backend array index to map to original expression index
              if (backendIndex >= 0 && backendIndex < map.length) {
                const origIndex = map[backendIndex];
                const line =
                  updated[origIndex] ||
                  ({ index: origIndex, strokes: null } as any);

                // 🆕 Get calculated output for this expression
                const calculatedResult = calculatedResults[origIndex];
                const calculatedOutput = calculatedResult?.numericValue || null;

                updated[origIndex] = {
                  ...line,
                  validation: {
                    lineValidation: lv,
                    overall: {
                      valid: result.valid,
                      error: result.error,
                    },
                  },
                  // 🆕 Add calculated output from Desmos at top level
                  calculatedOutput: calculatedOutput,
                } as any;
              }
            });

            linesCurrentRef.current = updated;
            return updated;
          });

          // Emit after validation merge
          setTimeout(() => emitLinesData(), 0);
        }
      },
      [getCurrentExpressions, emitLinesData]
    );

    // Function to handle validation errors
    const handleValidationError = useCallback((error: any) => {
      console.error("❌ Math validation error:", error);
      // Clear decorations on validation error
      setValidationDecorations([]);
    }, []);

    // Initialize math validation hook
    const { validateExpressions, isValidating } = useMathValidation({
      onValidationComplete: processValidationResults,
      onValidationError: handleValidationError,
    });

    // Function to trigger math validation for current expressions
    const triggerMathValidation = useCallback(() => {
      if (desmos_type === "scientific") {
        // console.log('🔍 Triggering math validation...');

        // Get current expressions and validate all non-empty ones
        const currentExpressions = getCurrentExpressions();
        const indexed: Array<{ expr: any; idx: number }> =
          currentExpressions.map((expr: any, idx: number) => ({ expr, idx }));
        const nonEmpty: Array<{ expr: any; idx: number }> = indexed.filter(
          (item) => item.expr.latex && item.expr.latex.trim() !== ""
        );
        const expressionsToValidate: any[] = nonEmpty.map((item) => item.expr);
        nonEmptyIndexMapRef.current = nonEmpty.map((item) => item.idx);

        if (expressionsToValidate.length > 0) {
          // Clear existing decorations while validating
          setValidationDecorations([]);
          validateExpressions(expressionsToValidate).catch((err) => {
            console.error("❌ Validation failed in DesmosScientific:", err);
          });
        } else {
          // No expressions to validate, but still trigger validation flow for proper state management
          setValidationDecorations([]);

          // Simulate validation completion with empty result to ensure proper state management
          processValidationResults({
            valid: true,
            line_validations: [],
            error: null,
          });
        }
      }
    }, [
      desmos_type,
      getCurrentExpressions,
      validateExpressions,
      setValidationDecorations,
      processValidationResults,
    ]);

    // Function to ensure there's always an empty expression at the end
    const ensureEmptyExpressionAtEnd = useCallback(() => {
      // console.log('🔍 ensureEmptyExpressionAtEnd called');

      if (!calculatorInstance.current || desmos_type !== "scientific") {
        return false; // Return false if no action taken
      }

      try {
        if (
          typeof calculatorInstance.current.getState === "function" &&
          typeof calculatorInstance.current.setState === "function"
        ) {
          const currentState = calculatorInstance.current.getState();
          const currentExpressions = [
            ...(currentState?.expressions?.list || []),
          ];

          // Check if the last expression has content (any strokes drawn)
          // Add new line if there are any strokes, regardless of OCR success
          const lastExpression =
            currentExpressions[currentExpressions.length - 1];
          const lastExpressionIndex = currentExpressions.length - 1;
          const lastLineData = linesCurrentRef.current[lastExpressionIndex];

          const hasLatex =
            lastExpression &&
            lastExpression.latex &&
            lastExpression.latex.trim() !== "";
          const hasStrokes =
            lastLineData &&
            lastLineData.strokes &&
            lastLineData.strokes.paths &&
            lastLineData.strokes.paths.length > 0;

          if (hasStrokes) {
            // console.log('✅ Last expression has strokes, adding new empty expression (latex:', hasLatex, ', strokes:', hasStrokes, ')');

            // Add a new empty expression
            currentExpressions.push({
              id: `expr-${currentExpressions.length}`,
              latex: "",
              type: "expression",
            });

            // Suppress change notifications during this update
            suppressChangeNotificationRef.current = true;

            calculatorInstance.current.setState({
              ...currentState,
              expressions: { list: currentExpressions },
            });

            // console.log('➕ Added new empty expression at end, new length:', currentExpressions.length);

            return true; // Return true if action taken
          }
        }
      } catch (error) {
        console.error("❌ Error ensuring empty expression at end:", error);
      }
      return false; // Return false if no action taken
    }, [desmos_type]);

    // Helper function to send expressions with bounds (for graphing calculator)
    const sendExpressionsWithBounds = useCallback(
      (expressions: any[], bounds?: any) => {
        if (!onExpressionsChange) return;

        if (desmos_type === "scientific") {
          // Scientific calculator doesn't have bounds, send expressions as-is
          // console.log('🔄 About to call onExpressionsChange with:', expressions);
          onExpressionsChange(expressions);
          return;
        }

        // For graphing calculator, include bounds as a special entry
        const boundsToUse = bounds || currentBounds;
        const expressionsWithBounds = [...expressions];

        if (boundsToUse) {
          expressionsWithBounds.push({
            id: "__graph_bounds__",
            type: "graphBounds",
            graphBounds: {
              mathCoordinates: boundsToUse.mathCoordinates,
              pixelCoordinates: boundsToUse.pixelCoordinates,
              left: boundsToUse.mathCoordinates.left,
              right: boundsToUse.mathCoordinates.right,
              bottom: boundsToUse.mathCoordinates.bottom,
              top: boundsToUse.mathCoordinates.top,
            },
            latex: `\\text{Bounds: } [${boundsToUse.mathCoordinates.left.toFixed(2)}, ${boundsToUse.mathCoordinates.right.toFixed(2)}] \\times [${boundsToUse.mathCoordinates.bottom.toFixed(2)}, ${boundsToUse.mathCoordinates.top.toFixed(2)}]`,
          });
        }

        onExpressionsChange(expressionsWithBounds);
      },
      [onExpressionsChange, desmos_type, currentBounds]
    );

    // Consolidated function to notify expression changes
    const notifyExpressionsChange = useCallback(
      (expressions?: any[]) => {
        if (!onExpressionsChange) return;

        const currentExpressions = expressions || getCurrentExpressions();

        // Update our tracking ref
        lastExpressionsRef.current = [...currentExpressions];

        if (desmos_type === "scientific") {
          // For scientific calculator, send expressions directly
          // console.log('🔄 Notifying expression change:', currentExpressions);
          onExpressionsChange(currentExpressions);
        } else {
          // For graphing calculator, include bounds
          sendExpressionsWithBounds(currentExpressions);
        }
      },
      [
        onExpressionsChange,
        desmos_type,
        getCurrentExpressions,
        sendExpressionsWithBounds,
      ]
    );

    // Add function to window for easy testing
    useEffect(() => {
      if (isLoaded && calculatorInstance.current) {
        (window as any).testAddExpression = ensureEmptyExpressionAtEnd;
      }
    }, [isLoaded, ensureEmptyExpressionAtEnd]);

    // Handler for when LaTeX is generated from handwriting
    const handleExpressionUpdate = useCallback(
      (expressionIndex: number, latex: string) => {
        // console.log('🎯 Received LaTeX for expression', expressionIndex, ':', latex);

        if (!calculatorInstance.current) {
          // console.warn('⚠️ Cannot update expression - calculator not ready');
          return;
        }

        // Allow empty strings for clearing expressions, but check for null/undefined
        if (latex == null) {
          // console.warn('⚠️ Cannot update expression - LaTeX is null or undefined');
          return;
        }

        try {
          if (desmos_type === "scientific") {
            // For scientific calculator, use setState method
            if (
              typeof calculatorInstance.current.getState === "function" &&
              typeof calculatorInstance.current.setState === "function"
            ) {
              const currentState = calculatorInstance.current.getState();
              const currentExpressions = [
                ...(currentState?.expressions?.list || []),
              ];

              // Update the specific expression or extend array if needed
              while (currentExpressions.length <= expressionIndex) {
                currentExpressions.push({
                  id: `expr-${currentExpressions.length}`,
                  latex: "",
                  type: "expression",
                });
              }

              // Set the expression at the target index
              currentExpressions[expressionIndex] = {
                ...currentExpressions[expressionIndex],
                latex: latex.trim(),
              };

              // Suppress change notifications during this update
              suppressChangeNotificationRef.current = true;

              calculatorInstance.current.setState({
                ...currentState,
                expressions: { list: currentExpressions },
              });

              // if (latex.trim()) {
              //     console.log('✅ Updated expression', expressionIndex, 'with LaTeX:', latex.trim());
              // } else {
              //     console.log('🧹 Cleared expression', expressionIndex);
              // }

              // Do autoexpand, notify changes, and trigger validation in a single operation
              setTimeout(() => {
                const didAutoExpand = ensureEmptyExpressionAtEnd();
                const finalExpressions = getCurrentExpressions();

                // Always notify with the final state (after potential autoexpand)
                notifyExpressionsChange(finalExpressions);

                // Trigger math validation after expression update
                triggerMathValidation();

                // console.log(`✅ Handwriting update complete. Auto-expanded: ${didAutoExpand}, Validation triggered`);
              }, 50);
            } else if (
              typeof calculatorInstance.current.setExpression === "function"
            ) {
              // Fallback for graphing calculator
              calculatorInstance.current.setExpression({
                id: `expr-${expressionIndex}`,
                latex: latex.trim(),
              });
              // console.log('✅ Updated expression via setExpression', expressionIndex);
            }
          } else {
            // For graphing calculator, use the standard setExpression method
            if (
              typeof calculatorInstance.current.setExpression === "function"
            ) {
              calculatorInstance.current.setExpression({
                id: `expr-${expressionIndex}`,
                latex: latex.trim(),
              });
              // console.log('✅ Updated graphing calculator expression', expressionIndex);
            }
          }
        } catch (error) {
          // console.error('❌ Error updating Desmos expression:', error);
        }
      },
      [
        desmos_type,
        ensureEmptyExpressionAtEnd,
        getCurrentExpressions,
        notifyExpressionsChange,
        triggerMathValidation,
      ]
    );

    // OCR event handler from HandwritingLayer to keep strokes/OCR per line
    const handleOcrEvent = useCallback(
      (payload: { expressionIndex: number; strokes: any; ocr: any | null }) => {
        const { expressionIndex, strokes, ocr } = payload;
        ensureLineIndex(expressionIndex);
        setLinesCurrent((prev) => {
          const next = [...prev];
          while (next.length <= expressionIndex) {
            next.push({
              index: next.length,
              strokes: null,
              ocr: null,
              validation: null,
            });
          }
          const prevLine = next[expressionIndex] || {
            index: expressionIndex,
            strokes: null,
            ocr: null,
            validation: null,
          };

          // 🆕 Get calculated results and include in validation data
          setTimeout(() => {
            const calculatedResults = getCalculatedResults();
            const calculatedResult = calculatedResults[expressionIndex];
            const calculatedOutput = calculatedResult?.numericValue || null;

            setLinesCurrent((current) => {
              const updated = [...current];
              if (updated[expressionIndex]) {
                updated[expressionIndex] = {
                  ...updated[expressionIndex],
                  // 🆕 Add calculated output at top level
                  calculatedOutput: calculatedOutput,
                } as any;
                linesCurrentRef.current = updated;
              }
              return updated;
            });
            // Emit after calculated output is added
            emitLinesData();
          }, 150); // Small delay to ensure DOM is updated with results

          next[expressionIndex] = {
            ...prevLine,
            index: expressionIndex,
            strokes: strokes ?? prevLine.strokes,
            ocr: ocr
              ? {
                  latex: ocr.latex_styled ?? "",
                  confidence: ocr.confidence ?? null,
                  confidence_rate: ocr.confidence_rate,
                  raw: ocr,
                }
              : null,
          } as any;
          // sync ref before emitting to avoid being one event behind
          linesCurrentRef.current = next;
          return next;
        });
        // Defer emit to avoid triggering parent state updates during this component's render lifecycle
        setTimeout(() => emitLinesData(), 0);
      },
      [ensureLineIndex, onLinesDataChange, getCalculatedResults, emitLinesData]
    );

    // Tool change handler
    const handleToolChange = useCallback((tool: "pen" | "eraser" | "") => {
      // Toggle: tapping the same tool deselects to none
      setCurrentTool((prev) => {
        const next = prev === tool ? "" : tool;
        // console.log('🔧 Tool changed:', { from: prev, to: next });
        return next;
      });
    }, []);

    // Globally manage touch behavior: when a tool is active, disable pinch-zoom only
    useEffect(() => {
      if (typeof document === "undefined") return;

      // Ensure style for the class exists once (no global touch-action; leave overlay to control it)
      const STYLE_ID = "medly-global-no-zoom-style";
      let styleTag = document.getElementById(
        STYLE_ID
      ) as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = STYLE_ID;
        // Intentionally empty; we keep the class for possible future hooks but avoid forcing pan/zoom globally
        styleTag.textContent = `.medly-no-zoom {}`;
        document.head.appendChild(styleTag);
      }

      const htmlEl = document.documentElement;
      const preventGesture = (e: Event) => {
        // Attempt to prevent pinch-zoom on Safari
        e.preventDefault();
      };

      if (currentTool !== "") {
        htmlEl.classList.add("medly-no-zoom");
        // Non-standard Safari events to suppress pinch-zoom
        document.addEventListener(
          "gesturestart",
          preventGesture as EventListener,
          { passive: false } as any
        );
        document.addEventListener(
          "gesturechange",
          preventGesture as EventListener,
          { passive: false } as any
        );
        document.addEventListener(
          "gestureend",
          preventGesture as EventListener,
          { passive: false } as any
        );
      } else {
        htmlEl.classList.remove("medly-no-zoom");
      }

      return () => {
        // Always remove listeners on cleanup; safe if they weren't added
        document.removeEventListener(
          "gesturestart",
          preventGesture as EventListener
        );
        document.removeEventListener(
          "gesturechange",
          preventGesture as EventListener
        );
        document.removeEventListener(
          "gestureend",
          preventGesture as EventListener
        );
      };
    }, [currentTool]);

    // Undo handler
    const handleUndo = useCallback(() => {
      console.log("↩️ DesmosScientific: Undo triggered");
      if (handwritingLayerRef.current?.triggerUndo) {
        handwritingLayerRef.current.triggerUndo();
      }
    }, []);

    // Redo handler
    const handleRedo = useCallback(() => {
      console.log("↪️ DesmosScientific: Redo triggered");
      console.log("🔍 DesmosScientific: HandwritingLayer ref status:", {
        hasHandwritingLayerRef: !!handwritingLayerRef.current,
        hasTriggerRedo: !!handwritingLayerRef.current?.triggerRedo,
      });
      if (handwritingLayerRef.current?.triggerRedo) {
        console.log(
          "✅ DesmosScientific: Calling HandwritingLayer triggerRedo"
        );
        handwritingLayerRef.current.triggerRedo();
      } else {
        console.warn(
          "❌ DesmosScientific: Cannot call triggerRedo - HandwritingLayer ref not available"
        );
      }
    }, []);

    // Clear all handler
    const handleClearAll = useCallback(() => {
      console.log("🎯 DesmosScientific: Clear all triggered");
      if (handwritingLayerRef.current?.triggerClearAll) {
        handwritingLayerRef.current.triggerClearAll();
      }
    }, []);

    // Expose handleUndo, handleRedo, handleClearAll, and getLastStrokeTime via ref
    useImperativeHandle(
      ref,
      () => ({
        triggerUndo: handleUndo,
        triggerRedo: handleRedo,
        triggerClearAll: handleClearAll,
        getLastStrokeTime: () => {
          // Delegate to HandwritingLayer
          return handwritingLayerRef.current?.getLastStrokeTime() || 0;
        },
      }),
      [handleUndo, handleRedo, handleClearAll]
    );

    // Handler for when expression focus changes (when user moves to a different line)
    const handleExpressionLineFocusChange = useCallback(
      (previousIndex: number | null, currentIndex: number) => {
        // console.log('🔄 Expression focus changed from', previousIndex, 'to', currentIndex);

        // Trigger validation when user moves to a different expression
        triggerMathValidation();

        // Update history when focus leaves a line
        if (previousIndex !== null && previousIndex >= 0) {
          const toSnapshot = getLineSnapshot(previousIndex);
          if (toSnapshot) {
            const fromSnapshot =
              lastCommittedSnapshotByIndexRef.current.get(previousIndex) ||
              null;
            setLinesHistory((prev) => {
              const next = [
                ...prev,
                {
                  timestamp: Date.now(),
                  index: previousIndex,
                  from: fromSnapshot,
                  to: toSnapshot,
                },
              ];
              linesHistoryRef.current = next;
              return next;
            });
            lastCommittedSnapshotByIndexRef.current.set(
              previousIndex,
              toSnapshot
            );
            setTimeout(() => emitLinesData(), 0);
          }
        }
        lastFocusedIndexRef.current = currentIndex;
      },
      [triggerMathValidation, getLineSnapshot, emitLinesData]
    );

    // Load Desmos API script
    useEffect(() => {
      // Guard against SSR
      if (typeof window === "undefined") return;

      const loadDesmosScript = () => {
        // Check if script is already loaded or loading
        if (window.Desmos) {
          setIsLoaded(true);
          return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector(
          'script[src*="desmos.com/api"]'
        );
        if (existingScript) {
          // Script exists but may not be loaded yet, wait for it
          const checkLoaded = () => {
            if (window.Desmos) {
              setIsLoaded(true);
            } else {
              setTimeout(checkLoaded, 100);
            }
          };
          checkLoaded();
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://www.desmos.com/api/v1.11/calculator.js?apiKey=f04ac3ce0c8f48a88d5b2e08a90b3066";
        script.async = true;
        script.onload = () => {
          setIsLoaded(true);
        };
        script.onerror = () => {
          console.error("Failed to load Desmos API");
        };

        document.head.appendChild(script);
      };

      loadDesmosScript();
    }, []);

    // Initialize calculator when script is loaded
    useEffect(() => {
      if (
        typeof window === "undefined" ||
        !isLoaded ||
        !calculatorRef.current ||
        !window.Desmos
      )
        return;

      // Prevent multiple initializations
      if (calculatorInstance.current) return;

      try {
        // console.log('🧮 Initializing Desmos calculator, type:', desmos_type);
        // Default options based on calculator type
        let defaultOptions = {};

        if (desmos_type === "scientific") {
          // Scientific calculator options
          defaultOptions = {
            keypad: true,
            expressions: true,
            settingsMenu: true,
            expressionsTopbar: true,
            border: true,
            ...options,
          };

          // Create the scientific calculator instance
          calculatorInstance.current = window.Desmos.ScientificCalculator(
            calculatorRef.current,
            defaultOptions
          );
          // console.log('✅ Scientific calculator created successfully');

          // Create initial empty expressions FIRST for scientific calculator
          if (desmos_type === "scientific") {
            createInitialExpressions();
            // console.log('🔢 Initial expressions created for scientific calculator');
          }
        } else {
          // Graphing calculator options (default)
          defaultOptions = {
            keypad: true,
            graphpaper: true,
            expressions: true,
            settingsMenu: true,
            zoomButtons: true,
            expressionsTopbar: true,
            pointsOfInterest: true,
            trace: true,
            border: true,
            ...options,
          };

          // Create the graphing calculator instance
          calculatorInstance.current = window.Desmos.GraphingCalculator(
            calculatorRef.current,
            defaultOptions
          );
        }

        // Set initial expressions from saved handwriting data if provided
        if (
          expressions &&
          Array.isArray(expressions) &&
          desmos_type === "scientific"
        ) {
          // Get current state with empty expressions created above
          const currentState = calculatorInstance.current.getState();
          const currentExpressions = [
            ...(currentState?.expressions?.list || []),
          ];
          // console.log('📊 Current expressions count before setting saved data:', currentExpressions.length);

          // Update specific indices with saved data
          expressions.forEach((expr, index) => {
            if (currentExpressions[index]) {
              // Check if this is handwriting data (has ocr property) or regular expression data
              if (
                expr &&
                typeof expr === "object" &&
                expr.ocr &&
                expr.ocr.latex
              ) {
                // This is saved handwriting data - extract LaTeX from OCR
                currentExpressions[index] = {
                  ...currentExpressions[index],
                  latex: expr.ocr.latex,
                };
                // console.log(`🔄 Updated expression ${index} with saved LaTeX:`, expr.ocr.latex);
              } else if (expr && typeof expr === "object" && expr.latex) {
                // This is regular expression data - use as-is
                currentExpressions[index] = {
                  ...currentExpressions[index],
                  latex: expr.latex,
                };
                // console.log(`🔄 Updated expression ${index} with regular LaTeX:`, expr.latex);
              }
            }
          });

          // Set updated state
          calculatorInstance.current.setState({
            ...currentState,
            expressions: { list: currentExpressions },
          });
          // console.log('✅ Applied saved expressions to existing lines');
        } else if (expressions && Array.isArray(expressions)) {
          // For graphing calculator, use original logic
          expressions.forEach((expr, index) => {
            // Check if this is handwriting data (has ocr property) or regular expression data
            if (
              expr &&
              typeof expr === "object" &&
              expr.ocr &&
              expr.ocr.latex
            ) {
              // This is saved handwriting data - extract LaTeX from OCR
              calculatorInstance.current.setExpression({
                id: `expr-${index}`,
                latex: expr.ocr.latex,
                color: "#000000",
              });
            } else if (expr && typeof expr === "object" && expr.latex) {
              // This is regular expression data - use as-is
              const { id, latex, color, ...otherProps } = expr;
              calculatorInstance.current.setExpression({
                id: id || `expr-${index}`,
                latex,
                color,
                ...otherProps,
              });
            }
          });
        }

        // Observe expression analysis changes - only available for graphing calculator
        if (
          desmos_type !== "scientific" &&
          calculatorInstance.current &&
          typeof calculatorInstance.current.observe === "function"
        ) {
          calculatorInstance.current.observe("expressionAnalysis", function () {
            const analysisData = calculatorInstance.current.expressionAnalysis;
            const currentExpressions =
              calculatorInstance.current.getExpressions();

            // Create a map of expressions by ID for quick lookup
            const expressionsMap = currentExpressions.reduce(
              (map: any, expr: any) => {
                map[expr.id] = expr;
                return map;
              },
              {}
            );

            // Transform the analysis object into an array of objects with content
            const expressionAnalysisArray = Object.keys(analysisData).map(
              (expressionId) => ({
                id: expressionId,
                latex: expressionsMap[expressionId]?.latex || "N/A",
                type: expressionsMap[expressionId]?.type || "expression",
                isGraphable: analysisData[expressionId].isGraphable,
                isError: analysisData[expressionId].isError,
                errorMessage: analysisData[expressionId].errorMessage || null,
                evaluationDisplayed:
                  analysisData[expressionId].evaluationDisplayed || false,
                evaluation: analysisData[expressionId].evaluation || null,
              })
            );
          });
        }

        // Observe graph paper bounds changes (zoom/pan) - only for graphing calculator
        if (
          desmos_type !== "scientific" &&
          calculatorInstance.current &&
          typeof calculatorInstance.current.observe === "function"
        ) {
          calculatorInstance.current.observe("graphpaperBounds", function () {
            const bounds = calculatorInstance.current.graphpaperBounds;
            // Update current bounds state
            setCurrentBounds(bounds);

            // Send updated expressions with new bounds
            if (
              calculatorInstance.current &&
              typeof calculatorInstance.current.getExpressions === "function"
            ) {
              const currentExpressions =
                calculatorInstance.current.getExpressions();
              sendExpressionsWithBounds(currentExpressions, bounds);
            }
          });
        }

        // Send initial expressions immediately after initialization
        setTimeout(() => {
          // console.log('📤 Sending initial expressions...');
          if (calculatorInstance.current) {
            // For graphing calculator, create initial expressions here
            if (desmos_type !== "scientific") {
              createInitialExpressions();
            }

            // Handle different APIs for different calculator types
            if (desmos_type === "scientific") {
              // Scientific calculator uses getState() instead of getExpressions()
              if (typeof calculatorInstance.current.getState === "function") {
                const state = calculatorInstance.current.getState();
                // Convert state to expressions format for consistency
                const expressions = state.expressions || [];
                // console.log('📤 Sending scientific calculator expressions:', expressions);
                sendExpressionsWithBounds(expressions);
              }
            } else {
              // Graphing calculator uses getExpressions()
              if (
                typeof calculatorInstance.current.getExpressions === "function"
              ) {
                const initialExpressions =
                  calculatorInstance.current.getExpressions();

                // Also get initial bounds for graphing calculator
                const initialBounds =
                  calculatorInstance.current.graphpaperBounds;
                if (initialBounds) {
                  setCurrentBounds(initialBounds);
                  sendExpressionsWithBounds(initialExpressions, initialBounds);
                } else {
                  sendExpressionsWithBounds(initialExpressions);
                }
              }
            }
          }
        }, 100); // Small delay to ensure calculator is fully ready
      } catch (error) {
        console.error("Error initializing Desmos calculator:", error);
      }
    }, [isLoaded, expressions, options, desmos_type, createInitialExpressions]);

    // Effect to handle hiding keyboard elements for scientific calculator
    useEffect(() => {
      // console.log('⚡ hideKeyboard effect triggered - isLoaded:', isLoaded, 'calculatorRef.current:', !!calculatorRef.current, 'desmos_type:', desmos_type, 'hideKeyboard:', hideKeyboard);
      if (!isLoaded || !calculatorRef.current || desmos_type !== "scientific")
        return;

      const hideKeyboardElements = () => {
        // console.log('⌨️ hideKeyboardElements called, hideKeyboard:', hideKeyboard);
        const calcBasicMain = calculatorRef.current?.querySelector(
          ".dcg-calc-basic-main"
        );
        // console.log('🔍 calcBasicMain found:', !!calcBasicMain);
        if (calcBasicMain) {
          // Hide all children except dcg-basic-list-container
          const children = Array.from(calcBasicMain.children) as HTMLElement[];
          children.forEach((child) => {
            if (!child.classList.contains("dcg-basic-list-container")) {
              child.style.display = hideKeyboard ? "none" : "";
            }
          });

          // Also hide the placeholder within dcg-basic-list-container if keyboard is hidden
          const listContainer = calcBasicMain.querySelector(
            ".dcg-basic-list-container"
          ) as HTMLElement;
          if (listContainer) {
            // Remove border top from list container
            listContainer.style.borderTop = "transparent";

            const placeholder = listContainer.querySelector(
              ".dcg-basic-list-placeholder"
            ) as HTMLElement;
            if (placeholder) {
              placeholder.style.display = hideKeyboard ? "none" : "";
            }

            // Style borders for dcg-basic-expression elements (initial sizing handled in HandwritingLayer)
            const expressions = listContainer.querySelectorAll(
              ".dcg-basic-expression"
            ) as NodeListOf<HTMLElement>;
            expressions.forEach((expression) => {
              // Set transparent borders except for bottom border
              expression.style.borderTop = "transparent";
              expression.style.borderLeft = "transparent";
              expression.style.borderRight = "transparent";
              expression.style.borderBottom = "1px solid rgb(233, 233, 233)";

              // Reduce font size in math field elements to 0.5x
              const mathFields = expression.querySelectorAll(
                ".dcg-math-field"
              ) as NodeListOf<HTMLElement>;
              mathFields.forEach((mathField) => {
                if (!mathField.dataset.originalFontSize) {
                  // Store the original font size on first run
                  const computedStyle = window.getComputedStyle(mathField);
                  mathField.dataset.originalFontSize = computedStyle.fontSize;
                }

                // Get the original font size value (remove 'px' and convert to number)
                const originalFontSize = parseFloat(
                  mathField.dataset.originalFontSize || "16"
                );
                if (originalFontSize > 0) {
                  mathField.style.fontSize = `${originalFontSize * 0.75}px`;
                }
              });
            });
          }

          // Hide dcg-tooltipped-error-container if keyboard is hidden
          if (hideKeyboard) {
            const errorContainers = calcBasicMain.querySelectorAll(
              ".dcg-tooltipped-error-container"
            ) as NodeListOf<HTMLElement>;
            errorContainers.forEach((container) => {
              container.style.display = "none";
            });
          }
          // console.log('✅ hideKeyboardElements completed successfully');
        } else {
          // console.log('❌ calcBasicMain not found, keyboard hiding skipped');
        }
      };

      // Wait a bit longer to ensure the DOM is fully rendered
      const timeoutId = setTimeout(hideKeyboardElements, 200);

      // Also observe for any DOM changes that might restore the elements
      const observer = new MutationObserver((mutations) => {
        // console.log('🔄 DOM mutation detected, hideKeyboard:', hideKeyboard, 'mutations:', mutations.length);
        if (hideKeyboard) {
          hideKeyboardElements();
        }
      });

      if (calculatorRef.current) {
        observer.observe(calculatorRef.current, {
          childList: true,
          subtree: true,
        });
      }

      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }, [isLoaded, hideKeyboard, desmos_type]);

    // Note: Math field visibility is now handled by HandwritingLayer.tsx based on confidence scores

    // Simple effect to handle the 'change' observer
    useEffect(() => {
      if (
        !calculatorInstance.current ||
        typeof calculatorInstance.current.observeEvent !== "function"
      ) {
        return;
      }

      // Remove any existing 'change' observer
      if (typeof calculatorInstance.current.unobserveEvent === "function") {
        calculatorInstance.current.unobserveEvent("change");
      }

      // Add the 'change' observer
      calculatorInstance.current.observeEvent(
        "change",
        function (eventName: string, event: any) {
          // Skip if we're suppressing notifications
          if (suppressChangeNotificationRef.current) {
            // console.log('🚫 Suppressing change notification');
            suppressChangeNotificationRef.current = false; // Reset flag
            return;
          }

          const isUserInitiated =
            event && typeof event.isUserInitiated === "boolean"
              ? event.isUserInitiated
              : true;
          // console.log('🔄 Change detected, user initiated:', isUserInitiated);

          if (isUserInitiated && desmos_type === "scientific") {
            // For user typing in scientific calculator, do autoexpand and notify
            setTimeout(() => {
              const didAutoExpand = ensureEmptyExpressionAtEnd();
              const currentExpressions = getCurrentExpressions();

              // Notify with current state
              notifyExpressionsChange(currentExpressions);

              // console.log(`✅ User change processed. Auto-expanded: ${didAutoExpand}`);
            }, 50);
          } else if (!isUserInitiated) {
            // For programmatic changes, just notify immediately
            const currentExpressions = getCurrentExpressions();
            notifyExpressionsChange(currentExpressions);
          }
        }
      );

      // Cleanup function to remove the observer
      return () => {
        if (
          calculatorInstance.current &&
          typeof calculatorInstance.current.unobserveEvent === "function"
        ) {
          calculatorInstance.current.unobserveEvent("change");
        }
      };
    }, [
      onExpressionsChange,
      desmos_type,
      ensureEmptyExpressionAtEnd,
      getCurrentExpressions,
      notifyExpressionsChange,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (calculatorInstance.current) {
          try {
            // Remove event observers before destroying
            // Note: 'change' observer is handled in separate effect above
            if (typeof calculatorInstance.current.unobserve === "function") {
              // Only unobserve expressionAnalysis if it was added (graphing calculator only)
              if (desmos_type !== "scientific") {
                calculatorInstance.current.unobserve("expressionAnalysis");
                calculatorInstance.current.unobserve("graphpaperBounds");
              }
            }

            // Destroy the calculator instance
            if (typeof calculatorInstance.current.destroy === "function") {
              calculatorInstance.current.destroy();
            }
            calculatorInstance.current = null;
          } catch (error) {
            console.error("Error destroying Desmos calculator:", error);
          }
        }
      };
    }, [desmos_type]);

    return (
      <div
        className="desmos-step pointer-events-none z-10"
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          minHeight: "40px",
        }}
      >
        <div
          ref={calculatorRef}
          style={{
            width: "100%",
            height: "100%",
            // border: '1px solid transparent',
            // borderRadius: '4px'
          }}
        />
        {isWideScreen ? (
          <>
            <HandwritingLayer
              ref={handwritingLayerRef}
              containerRef={calculatorRef}
              onPressCheckDesmos={onPressCheckDesmos}
              onExpressionItemPress={onExpressionItemPress}
              onPressUnderline={onPressUnderline}
              onExpressionUpdated={
                onExpressionUpdated || handleExpressionUpdate
              }
              onExpressionLineFocusChange={handleExpressionLineFocusChange}
              isAwaitingResponse={isAwaitingResponse}
              calculatorInstance={calculatorInstance}
              showMedlyLayer={true}
              expressionItemDecorations={validationDecorations}
              currentTool={
                inputMode === "pen"
                  ? "pen"
                  : inputMode === "eraser"
                    ? "eraser"
                    : ""
              }
              onOcrEvent={handleOcrEvent}
              floatingMessage={floatingMessage}
              hideExpressionCalculatedOutput={true}
              hideSendButton={sessionType === SessionType.MockSession}
              isReadOnly={isReadOnly}
              initialExpressionData={expressions || []}
              questionId={questionId}
              onStrokeAdded={onStrokeAdded}
              onStrokeRemoved={onStrokeRemoved}
              onEraseAction={(questionId, canvasRef, erasedData) => {
                console.log("📍 DesmosScientific: onEraseAction called with:", {
                  questionId,
                  hasCanvasRef: !!canvasRef,
                  hasErasedData: !!erasedData,
                  erasedDataType: typeof erasedData,
                });
                onEraseAction?.(questionId, canvasRef, erasedData);
              }}
            />
          </>
        ) : (
          <>
            {console.log("📱 NOT rendering HandwritingLayer - not wide screen")}
          </>
        )}
      </div>
    );
  }
);

DesmosScientific.displayName = "DesmosScientific";

export default DesmosScientific;
