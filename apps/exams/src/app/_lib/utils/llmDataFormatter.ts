import { QuestionWithMarkingResult } from "@/app/types/types";

interface CanvasTextbox {
    text: string;
    x: number;
    y: number;
}

interface FormattedQuestionData {
    questionIdentifier: string;
    questionStem?: string;
    questionStemDiagram?: string;
    questionText: string;
    diagram?: string;
    questionType: string;
    maxMark: number;
    correctAnswer: string;
    markScheme?: any[];
    options?: any;
    passageText?: string;
}

interface DesmosExpression {
    index: number;
    latex?: string;
    confidence?: number;
    validation?: any;
    calculatedOutput?: number | null;
    strokes?: any | null;
}

interface FormattedStudentData {
    questionIdentifier: string;
    userAnswer?: string;
    userMark?: number;
    canvas?: any; // Raw canvas object with textboxes, paths, etc.
    canvasText?: CanvasTextbox[];
    desmosExpressions?: DesmosExpression[];
}

interface FormattedLLMData {
    questionData: FormattedQuestionData[];
    studentData: FormattedStudentData[];
}

/**
 * Converts questionsWithMarkingResults into a clean format for LLM consumption
 * Splits data into questionData (question details) and studentData (student responses)
 * Removes unnecessary metadata and extracts only text from canvas
 * Includes Desmos expression data with validations, strokes, and calculated outputs
 */
export function formatQuestionsForLLM(
    questionsWithMarkingResults: QuestionWithMarkingResult[],
    desmosExpressionsPerQuestion?: any[][]
): FormattedLLMData {
    const questionData: FormattedQuestionData[] = [];
    const studentData: FormattedStudentData[] = [];

    questionsWithMarkingResults.forEach((question, index) => {
        // Generate simple question identifier
        const questionIdentifier = `part ${index + 1}`;

        // Extract canvas textboxes with text content
        const canvasText: CanvasTextbox[] = [];
        if (question.canvas?.textboxes) {
            question.canvas.textboxes.forEach((textbox: any) => {
                if (textbox.text && textbox.text.trim()) {
                    canvasText.push({
                        text: textbox.text.trim(),
                        x: textbox.x,
                        y: textbox.y
                    });
                }
            });
        }

        // Extract Desmos expressions for this question
        const desmosExpressions: DesmosExpression[] = [];
        const questionDesmosData = desmosExpressionsPerQuestion?.[index];
        if (questionDesmosData && Array.isArray(questionDesmosData)) {
            questionDesmosData.forEach((expressionData: any) => {
                if (expressionData) {
                    const expression: DesmosExpression = {
                        index: expressionData.index || 0,
                    };

                    // Add OCR data if available
                    if (expressionData.ocr?.latex) {
                        expression.latex = expressionData.ocr.latex;
                        expression.confidence = expressionData.ocr.confidence || 0;
                    }

                    // Add validation data if available
                    if (expressionData.validation) {
                        expression.validation = expressionData.validation;
                    }

                    // Add calculated output if available
                    if (expressionData.calculatedOutput !== undefined) {
                        expression.calculatedOutput = expressionData.calculatedOutput;
                    }

                    // Add strokes data if available (but exclude large binary data)
                    if (expressionData.strokes) {
                        // Store a summary of strokes instead of full data
                        expression.strokes = {
                            hasStrokes: true,
                            strokeCount: Array.isArray(expressionData.strokes) ? expressionData.strokes.length : 0
                        };
                    }

                    desmosExpressions.push(expression);
                }
            });
        }

        // Build question data (keep only essential and non-empty optional fields)
        const formattedQuestion: FormattedQuestionData = {
            questionIdentifier,
            questionText: question.questionText,
            questionType: question.questionType,
            maxMark: question.maxMark,
            correctAnswer: question.correctAnswer
        };

        // Add optional fields only if they contain meaningful data
        if (question.questionStem && question.questionStem.trim()) {
            formattedQuestion.questionStem = question.questionStem;
        }

        if (question.questionStemDiagram && question.questionStemDiagram.trim()) {
            formattedQuestion.questionStemDiagram = question.questionStemDiagram;
        }

        if (question.diagram && question.diagram.trim()) {
            formattedQuestion.diagram = question.diagram;
        }

        if (question.markScheme && question.markScheme.length > 0) {
            formattedQuestion.markScheme = question.markScheme;
        }

        if (question.options !== null && question.options !== undefined) {
            formattedQuestion.options = question.options;
        }

        if (question.passageText && question.passageText.trim()) {
            formattedQuestion.passageText = question.passageText;
        }

        // Build student data
        const formattedStudentData: FormattedStudentData = {
            questionIdentifier
        };

        if (question.userAnswer !== undefined && question.userAnswer !== null) {
            formattedStudentData.userAnswer = question.userAnswer;
        }

        if (question.userMark !== undefined && question.userMark !== null) {
            formattedStudentData.userMark = question.userMark;
        }

        // Add raw canvas object if it exists
        if (question.canvas && (question.canvas.textboxes?.length > 0 || question.canvas.paths?.length > 0 || question.canvas.maths?.length > 0)) {
            formattedStudentData.canvas = question.canvas;
        }

        if (canvasText.length > 0) {
            formattedStudentData.canvasText = canvasText;
        }

        if (desmosExpressions.length > 0) {
            formattedStudentData.desmosExpressions = desmosExpressions;
        }

        questionData.push(formattedQuestion);
        studentData.push(formattedStudentData);
    });

    return {
        questionData,
        studentData
    };
}

/**
 * Helper function to get the formatted data as a JSON string ready for LLM
 */
export function formatQuestionsForLLMString(
    questionsWithMarkingResults: QuestionWithMarkingResult[],
    desmosExpressionsPerQuestion?: any[][]
): string {
    const formattedData = formatQuestionsForLLM(questionsWithMarkingResults, desmosExpressionsPerQuestion);
    return JSON.stringify(formattedData, null, 2);
}
