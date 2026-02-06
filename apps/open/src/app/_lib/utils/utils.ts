import moment from "moment";
import { QuestionWithMarkingResult, AnswerAttempt } from "@/app/types/types";

export const lessonIdToSubjectId = (lessonId: string | undefined | null) => {
  if (!lessonId || typeof lessonId !== "string") {
    return "";
  }
  return lessonId.replace(/\d+(\.\d+)*$/, "");
};

export const paperIdToSubjectId = (paperId: string) => {
  return paperId.replace(/^medly(paper|mocks)/, "").replace(/_.*$/, "");
};

// TODO: find a more standardised way of doing this
export const constructSubjectLegacyId = (
  examBoard: string,
  course: string,
  subject: string
): string => {
  const examBoardMappings: Record<string, string> = {
    AP: "ap",
    AQA: "aqa",
    Edexcel: "edexcel",
    OCR: "ocr",
    IB: "ib",
    CIE: "cie",
  };

  const courseMappings: Record<string, string> = {
    GCSE: "GCSE",
    "IGCSE (International GCSE)": "IGCSE",
    "A-Level": "A2",
    "IAL (International A-Level)": "IAL",
    "AP (Advanced Placement)": "AP",
    "IB (International Baccalaureate)": "IB",
  };

  const subjectMappings: Record<string, string> = {
    Biology: "Bio",
    "Biology A": "BioA",
    "Biology (Combined)": "CBio",
    Chemistry: "Chem",
    "Chemistry (Combined)": "CChem",
    Physics: "Phys",
    "Physics (Combined)": "CPhys",
    Psychology: "Psych",
    "US History": "USHistory",
    History: "His",
    Economics: "Econ",
    "English Language": "EngLang",
    "English Literature": "EngLit",
    Geography: "Geog",
    "Maths: Analysis and Approaches": "MathsAA",
    "Maths: Applications and Interpretations": "MathsAI",
    Maths: "Maths",
    Mathematics: "Maths",
    "Business Studies": "Bus",
    "Religious Studies": "RE",
    "Computer Science": "Compsci",
    Sociology: "Socio",
    "Environment Systems and Societies": "ESS",
    "Design and Technology": "Des",
    "Food and Nutrition": "FN",
    "Media Studies": "Media",
    "Physical Education": "PE",
  };

  const examBoardId = examBoardMappings[examBoard] || examBoard.toLowerCase();
  const courseId = courseMappings[course] || course;
  const subjectId = subjectMappings[subject] || subject;

  let result = `${examBoardId}${courseId}${subjectId}`;

  // OCR A-Level and GCSE subjects should end with "A"
  if (examBoard === "OCR" && (course === "A-Level" || course === "GCSE")) {
    result += "A";
  }

  return result;
};

export const deconstructSubjectLegacyId = (subjectLegacyId: string) => {
  // Reverse mappings for lookup
  const examBoardMappings: Record<string, string> = {
    ap: "AP",
    aqa: "AQA",
    edexcel: "Edexcel",
    ocr: "OCR",
    ib: "IB",
    cie: "CIE",
  };

  const courseMappings: Record<string, string> = {
    GCSE: "GCSE",
    IGCSE: "IGCSE (International GCSE)",
    A2: "A-Level",
    IAL: "IAL (International A-Level)",
    AP: "AP (Advanced Placement)",
    IB: "IB (International Baccalaureate)",
  };

  const subjectMappings: Record<string, string> = {
    Bio: "Biology",
    BioA: "Biology A",
    CBio: "Biology (Combined)",
    Chem: "Chemistry",
    CChem: "Chemistry (Combined)",
    Phys: "Physics",
    CPhys: "Physics (Combined)",
    Psych: "Psychology",
    USHistory: "US History",
    His: "History",
    Econ: "Economics",
    EngLang: "English Language",
    EngLit: "English Literature",
    Geog: "Geography",
    MathsAA: "Maths: Analysis and Approaches",
    MathsAI: "Maths: Applications and Interpretations",
    Maths: "Maths",
    Bus: "Business Studies",
    RE: "Religious Studies",
    Compsci: "Computer Science",
    Socio: "Sociology",
    ESS: "Environment Systems and Societies",
    Des: "Design and Technology",
    FN: "Food and Nutrition",
    Media: "Media Studies",
    PE: "Physical Education",
  };

  // Extract exam board
  let examBoard = "";
  let remainingId = subjectLegacyId;

  for (const [shortCode, fullName] of Object.entries(examBoardMappings)) {
    if (subjectLegacyId.toLowerCase().startsWith(shortCode)) {
      examBoard = fullName;
      remainingId = subjectLegacyId.substring(shortCode.length);
      break;
    }
  }

  // Extract course
  let course = "";
  for (const [shortCode, fullName] of Object.entries(courseMappings)) {
    if (remainingId.startsWith(shortCode)) {
      course = fullName;
      remainingId = remainingId.substring(shortCode.length);
      break;
    }
  }

  // The remaining part is the subject
  let subjectTitle = "";
  let subjectId = remainingId;

  // Handle OCR A-Level and GCSE subjects that end with "A"
  if (
    examBoard === "OCR" &&
    (course === "A-Level" || course === "GCSE") &&
    remainingId.endsWith("A")
  ) {
    subjectId = remainingId.slice(0, -1); // Remove the "A" suffix
  }

  for (const [shortCode, fullName] of Object.entries(subjectMappings)) {
    if (subjectId === shortCode) {
      subjectTitle = fullName;
      break;
    }
  }

  return { examBoard, course, subjectTitle };
};

export const formatDurationAsHoursAndMinutes = (minutes: number) => {
  const duration = moment.duration(minutes, "minutes");
  const hours = Math.floor(duration.asHours());
  const mins = duration.minutes();
  return `${hours}h ${mins}m`;
};

export const deconstructMockPaperId = (
  mockPaperId: string
): {
  examBoard: string;
  course: string;
  subjectTitle: string;
  series?: string;
  mockPaperNumber: string;
  subjectLegacyId: string;
} => {
  mockPaperId = mockPaperId.replace("medlymocks", "");
  const subjectLegacyId = mockPaperId.split("_")[0];
  const mockPaperNumber = mockPaperId.split("_")[1].match(/[12]/)?.[0] || "";
  const series = mockPaperId.includes("_B") ? "Combined" : "";
  const { examBoard, course, subjectTitle } =
    deconstructSubjectLegacyId(subjectLegacyId);
  return {
    examBoard,
    course,
    subjectTitle,
    mockPaperNumber,
    subjectLegacyId,
    series,
  };
};

// ----- Added helpers for canvas latex summary and stroke PNG rendering -----
export function buildCanvasLatexSummary(lines: Array<any>): Array<{
  index: number;
  latex: string;
  confidence: number | null;
  isMathValid: boolean | null;
  calculatedOutput: number | null;
}> {
  const getIsValid = (line: any): boolean | null => {
    const v = line?.validation;
    if (!v) return null;
    if (v.mode === "algebraic_steps" && v.stepValidation)
      return !!v.stepValidation.valid;
    if (v.mode === "individual" && v.individualValidation)
      return !!v.individualValidation.parsed_successfully;
    if (v.overall && typeof v.overall.overall_valid === "boolean")
      return !!v.overall.overall_valid;
    return null;
  };

  return (lines || []).map((line: any) => ({
    index: line?.index ?? 0,
    latex: line?.ocr?.latex ?? "",
    confidence:
      typeof line?.ocr?.confidence === "number" ? line.ocr.confidence : null,
    isMathValid: getIsValid(line),
    calculatedOutput:
      typeof line?.calculatedOutput === "number" ? line.calculatedOutput : null,
  }));
}

export function getQuestionIdentifier(
  questionIndex: number,
  currentPageIndex: number,
  sessionType: string
): string {
  const questionNumber = currentPageIndex + 1;
  const isPaperOrMock = sessionType === "paper" || sessionType === "mock";

  if (isPaperOrMock) {
    const letter = String.fromCharCode(97 + questionIndex); // a, b, c...
    return `${questionNumber}${letter}`;
  } else {
    return `${questionNumber}.${questionIndex + 1}`;
  }
}

export async function renderLinesToPngBase64(
  lines: Array<{ strokes?: any | null }>,
  options: {
    padding?: number;
    background?: string;
    strokeColor?: string;
    headerColor?: string;
    borderColor?: string;
    lineWidth?: number;
    maxWidth?: number;
    headers?: string[];
    headerWrap?: boolean;
    headerTextAlign?: "left" | "center";
    headerFont?: string;
    headerLineHeight?: number;
    headerMaxWidth?: number;
    headerMarginBottom?: number;
  } = {}
): Promise<string> {
  const {
    padding = 8,
    background = "#ffffff",
    strokeColor = "#000000",
    headerColor = "#000000",
    borderColor = "#000000",
    lineWidth = 2,
    maxWidth = 900,
    headers = [],
    headerWrap = true,
    headerTextAlign = "center",
    headerFont = "16px monospace",
    headerLineHeight = 20,
    headerMaxWidth,
    headerMarginBottom = 10,
  } = options;

  try {
    // Filter out lines without strokes and group by headers if provided
    const validLines = lines.filter(
      (line) => line.strokes && line.strokes.paths
    );

    if (validLines.length === 0) {
      return "";
    }

    // Prepare a measuring context for header text
    const measuringCanvas = document.createElement("canvas");
    const measureCtx = measuringCanvas.getContext("2d");
    if (!measureCtx) {
      throw new Error("Could not get canvas context");
    }
    measureCtx.font = headerFont;
    const effectiveHeaderMaxWidth =
      typeof headerMaxWidth === "number" && headerMaxWidth > 0
        ? Math.min(headerMaxWidth, maxWidth - 2 * padding)
        : maxWidth - 2 * padding;
    const wrapText = (text: string, maxLineWidth: number): string[] => {
      if (!headerWrap) return [text];
      const linesOut: string[] = [];
      const paragraphs = String(text).split(/\r?\n/);
      paragraphs.forEach((paragraph) => {
        const words = paragraph.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          linesOut.push("");
          return;
        }
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + " " + words[i];
          const width = measureCtx.measureText(testLine).width;
          if (width > maxLineWidth) {
            linesOut.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        linesOut.push(currentLine);
      });
      return linesOut;
    };

    // Group lines by headers if headers are provided
    let lineGroups: Array<{ header?: string; lines: typeof validLines }> = [];

    if (headers && headers.length > 0) {
      // Assume headers correspond to groups of lines
      let currentIndex = 0;
      headers.forEach((header, headerIndex) => {
        const groupLines = [];
        // Find lines that belong to this header
        // This assumes lines are already grouped in order
        while (
          currentIndex < validLines.length &&
          (!headers[headerIndex + 1] ||
            currentIndex <
              (validLines.length / headers.length) * (headerIndex + 1))
        ) {
          groupLines.push(validLines[currentIndex]);
          currentIndex++;
        }
        if (groupLines.length > 0) {
          lineGroups.push({ header, lines: groupLines });
        }
      });
    } else {
      // No headers, treat all lines as one group
      lineGroups = [{ lines: validLines }];
    }

    // Calculate bounds for all strokes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let totalHeight = 0;
    const groupHeights: Array<{ headerHeight: number; linesHeight: number }> = [];
    const headerLinesByGroup: Array<string[] | undefined> = [];
    let maxHeaderLineWidth = 0;

    lineGroups.forEach((group) => {
      let groupHeight = 0;

      // Add height for header if present
      if (group.header) {
        const wrapped = wrapText(group.header, effectiveHeaderMaxWidth);
        headerLinesByGroup.push(wrapped);
        const headerHeight = wrapped.length * headerLineHeight + headerMarginBottom;
        groupHeight += headerHeight;
        wrapped.forEach((line) => {
          const w = measureCtx.measureText(line).width;
          maxHeaderLineWidth = Math.max(maxHeaderLineWidth, w);
        });
      } else {
        headerLinesByGroup.push(undefined);
      }

      group.lines.forEach((line) => {
        let lineMinY = Infinity,
          lineMaxY = -Infinity;

        line.strokes.paths.forEach((stroke: any) => {
          if (stroke.paths && Array.isArray(stroke.paths)) {
            stroke.paths.forEach((point: { x: number; y: number }) => {
              minX = Math.min(minX, point.x);
              maxX = Math.max(maxX, point.x);
              minY = Math.min(minY, point.y);
              maxY = Math.max(maxY, point.y);
              lineMinY = Math.min(lineMinY, point.y);
              lineMaxY = Math.max(lineMaxY, point.y);
            });
          }
        });

        const lineHeight = lineMaxY - lineMinY;
        groupHeight += lineHeight + 20; // 20px spacing between lines
      });

      groupHeights.push({
        headerHeight: group.header
          ? (headerLinesByGroup[headerLinesByGroup.length - 1]?.length || 0) *
              headerLineHeight +
            headerMarginBottom
          : 0,
        linesHeight: group.header
          ? groupHeight -
            (((headerLinesByGroup[headerLinesByGroup.length - 1]?.length || 0) *
              headerLineHeight) +
              headerMarginBottom)
          : groupHeight,
      });
      totalHeight += groupHeight;
    });

    // Add spacing between groups
    totalHeight += (lineGroups.length - 1) * 10;

    const strokesWidth = Math.max(0, maxX - minX) + 2 * padding;
    const headerWidthCandidate =
      (headers && headers.length > 0
        ? Math.min(maxHeaderLineWidth + 2 * padding, maxWidth)
        : 0);
    const canvasWidth = Math.min(
      Math.max(strokesWidth, headerWidthCandidate),
      maxWidth
    );
    const canvasHeight = totalHeight + 2 * padding;
    const centerXOffset = Math.max(0, (canvasWidth - strokesWidth) / 2);

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Fill background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set styles
    // Default stroke style will be overridden per usage (strokes vs border)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Set text style for headers
    ctx.font = headerFont;
    ctx.fillStyle = headerColor;
    ctx.textAlign = headerTextAlign;

    // Draw each group with optional header
    let currentY = padding;

    lineGroups.forEach((group, groupIndex) => {
      // Draw header if present
      if (group.header) {
        const linesForHeader = headerLinesByGroup[groupIndex] || [group.header];
        const headerX =
          headerTextAlign === "center" ? canvasWidth / 2 : padding;
        linesForHeader.forEach((line) => {
          currentY += headerLineHeight;
          ctx.fillText(line, headerX, currentY);
        });
        currentY += headerMarginBottom; // Move down past header block
      }

      // Top of the answer area for this group (used for full-width border)
      const groupTopY = currentY;

      // Track bounds for this group's strokes (for dotted border)
      let groupStrokeMinX = Infinity;
      let groupStrokeMinY = Infinity;
      let groupStrokeMaxX = -Infinity;
      let groupStrokeMaxY = -Infinity;

      // Draw strokes for this group
      group.lines.forEach((line) => {
        // Ensure stroke color for drawn strokes
        ctx.strokeStyle = strokeColor;
        let lineMinY = Infinity,
          lineMaxY = -Infinity;

        // First pass to get line bounds
        line.strokes.paths.forEach((stroke: any) => {
          if (stroke.paths && Array.isArray(stroke.paths)) {
            stroke.paths.forEach((point: { x: number; y: number }) => {
              lineMinY = Math.min(lineMinY, point.y);
              lineMaxY = Math.max(lineMaxY, point.y);
            });
          }
        });

        // Second pass to draw and track bounds
        line.strokes.paths.forEach((stroke: any) => {
          if (
            stroke.paths &&
            Array.isArray(stroke.paths) &&
            stroke.paths.length > 1
          ) {
            ctx.beginPath();

            const firstPoint = stroke.paths[0];
            const firstX = firstPoint.x - minX + padding + centerXOffset;
            const firstY = firstPoint.y - lineMinY + currentY;
            ctx.moveTo(firstX, firstY);

            // Track bounds for this stroke
            groupStrokeMinX = Math.min(groupStrokeMinX, firstX);
            groupStrokeMaxX = Math.max(groupStrokeMaxX, firstX);
            groupStrokeMinY = Math.min(groupStrokeMinY, firstY);
            groupStrokeMaxY = Math.max(groupStrokeMaxY, firstY);

            for (let i = 1; i < stroke.paths.length; i++) {
              const point = stroke.paths[i];
              const strokeX = point.x - minX + padding + centerXOffset;
              const strokeY = point.y - lineMinY + currentY;
              ctx.lineTo(strokeX, strokeY);

              // Track bounds for this point
              groupStrokeMinX = Math.min(groupStrokeMinX, strokeX);
              groupStrokeMaxX = Math.max(groupStrokeMaxX, strokeX);
              groupStrokeMinY = Math.min(groupStrokeMinY, strokeY);
              groupStrokeMaxY = Math.max(groupStrokeMaxY, strokeY);
            }

            ctx.stroke();
          } else if (
            stroke.paths &&
            Array.isArray(stroke.paths) &&
            stroke.paths.length === 1
          ) {
            // Draw a dot for single-point strokes (e.g., dots between letters)
            const point = stroke.paths[0];
            const dotX = point.x - minX + padding + centerXOffset;
            const dotY = point.y - lineMinY + currentY;
            const radius = Math.max(1, lineWidth / 2);

            // Use stroke color for fill
            const prevFill = ctx.fillStyle;
            ctx.fillStyle = strokeColor;
            ctx.beginPath();
            ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = prevFill;

            // Track bounds including dot radius
            groupStrokeMinX = Math.min(groupStrokeMinX, dotX - radius);
            groupStrokeMaxX = Math.max(groupStrokeMaxX, dotX + radius);
            groupStrokeMinY = Math.min(groupStrokeMinY, dotY - radius);
            groupStrokeMaxY = Math.max(groupStrokeMaxY, dotY + radius);
          }
        });

        currentY += lineMaxY - lineMinY + 20; // Move down for next line
      });

      // Draw dotted border around the answer area (full width) if there are any strokes
      if (
        groupStrokeMinX !== Infinity &&
        groupStrokeMinY !== Infinity &&
        groupStrokeMaxX !== -Infinity &&
        groupStrokeMaxY !== -Infinity
      ) {
        const borderPaddingY = 8; // vertical padding above/below strokes
        const borderX = padding; // full width within padding
        const borderWidth = canvasWidth - 2 * padding;
        const topCandidate = groupStrokeMinY - borderPaddingY;
        const borderY = Math.max(groupTopY, topCandidate);
        const bottomCandidate = groupStrokeMaxY + borderPaddingY;
        const borderHeight = Math.max(24, bottomCandidate - borderY); // ensure visible box

        // Save context state
        ctx.save();

        // Set up dotted line style
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // 5px dash, 5px gap
        ctx.lineDashOffset = 0;

        // Draw dotted rectangle
        ctx.strokeRect(borderX, borderY, borderWidth, borderHeight);

        // Restore context state
        ctx.restore();
      }

      // Add spacing between groups
      if (groupIndex < lineGroups.length - 1) {
        currentY += 10;
      }
    });

    // Convert to base64
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.split(",")[1]; // Remove "data:image/png;base64," prefix
  } catch (error) {
    console.error("Error rendering lines to PNG:", error);
    return "";
  }
}

// GCSE tier defaulting helper
export function getDefaultedGcseHigher(
  subjectLegacyId: string,
  stored?: boolean
): boolean | undefined {
  if (stored !== undefined) return stored;
  try {
    const { course, subjectTitle } =
      deconstructSubjectLegacyId(subjectLegacyId);
    const t = (subjectTitle || "").toLowerCase();
    const isScience =
      !t.includes("computer") &&
      (t.includes("biology") ||
        t.includes("chemistry") ||
        t.includes("physics"));
    const isMath = t.includes("math");
    const requiresTier = course === "GCSE" && (isScience || isMath);
    return requiresTier ? true : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Removes diagram and questionStemDiagram fields from QuestionWithMarkingResult
 * to avoid persisting large data to Firebase
 */
export const excludeDiagramFields = (
  answer: QuestionWithMarkingResult
): Omit<QuestionWithMarkingResult, "diagram" | "questionStemDiagram"> => {
  const { diagram, questionStemDiagram, ...answerWithoutDiagrams } = answer;
  return answerWithoutDiagrams;
};

/**
 * Organizes canvas data by question parts with associated latex expressions
 * @param allCanvasData - Array of canvas objects from different question parts
 * @param canvasLatexSummary - JSON string containing latex expressions with indices
 * @returns Formatted string with canvas data organized by parts
 */
export function formatCanvasDataByParts(
  allCanvasData: any[],
  canvasLatexSummary: string
): string {
  try {
    const latexArray = JSON.parse(canvasLatexSummary);

    // Group latex expressions by their index (index 0 -> part 1, index 1 -> part 2, etc.)
    const latexByPart: { [key: number]: any[] } = {};
    latexArray.forEach((latexItem: any) => {
      const partIndex = latexItem.index; // index 0 corresponds to part 1
      if (!latexByPart[partIndex]) {
        latexByPart[partIndex] = [];
      }
      // Remove the index field and keep only latex, confidence, isMathValid, calculatedOutput
      const { index, ...latexWithoutIndex } = latexItem;
      latexByPart[partIndex].push(latexWithoutIndex);
    });

    // Build formatted canvas for each question part
    const formattedParts: string[] = [];
    allCanvasData.forEach((canvas, partIndex) => {
      const partNumber = partIndex + 1;
      const latexForThisPart = latexByPart[partIndex] || [];

      // Remove fontSize, color, and isMath from textboxes
      const textboxesForThisPart = (canvas.textboxes || []).map(
        (textbox: any) => {
          const { fontSize, color, isMath, ...textboxWithoutProps } = textbox;
          return textboxWithoutProps;
        }
      );

      const partFormatted = `<student_canvas_part_${partNumber}>
Latex: ${JSON.stringify(latexForThisPart)}
Textboxes: ${JSON.stringify(textboxesForThisPart)}
</student_canvas_part_${partNumber}>`;

      formattedParts.push(partFormatted);
    });

    return formattedParts.join("\n\n");
  } catch (error) {
    console.error("Error creating formatted canvas:", error);
    return "";
  }
}

// Helper function to create first attempt from existing question data
const createFirstAttemptFromExisting = (
  questionData: QuestionWithMarkingResult
): AnswerAttempt => {
  return {
    attemptNumber: 1,
    timestamp:
      typeof questionData.updatedAt === "string"
        ? questionData.updatedAt
        : (questionData.updatedAt as { toDate?: () => Date })
            ?.toDate?.()
            ?.toISOString() || new Date().toISOString(),
    annotatedAnswer:
      typeof questionData.annotatedAnswer === "string"
        ? questionData.annotatedAnswer
        : undefined,
    markingTable: questionData.markingTable,
    userAnswer: questionData.userAnswer,
    userMark: questionData.userMark,
    canvas: questionData.canvas,
  };
};

// Helper function for lazy construction in UI
export const getAnswerAttempts = (
  question: QuestionWithMarkingResult
): AnswerAttempt[] => {
  if (question.answerAttempts) {
    return question.answerAttempts;
  }

  // Only create first attempt if question has been marked
  if (question.isMarked) {
    return [createFirstAttemptFromExisting(question)];
  }

  return [];
};

// Helper function to calculate marks gained from retries
export const getMarksGained = (attempts: AnswerAttempt[]): number => {
  if (attempts.length <= 1) return 0;
  const firstMark = attempts[0]?.userMark || 0;
  const lastMark = attempts[attempts.length - 1]?.userMark || 0;
  return lastMark - firstMark;
};
