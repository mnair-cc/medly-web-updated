import { QuestionDifficulty } from "@/app/types/types";

// Custom interface for breakdown step question data
export interface BreakdownQuestionData {
    id?: number;
    legacyId: string;
    subLessonId?: string;
    correctAnswer: string;
    createdAt?: string;
    maxMark: number;
    options?: { option: string; explanation: string }[] | string[];
    order?: number;
    difficulty?: QuestionDifficulty;
    markScheme?: string[];
    questionGroupId?: number;
    irtParameters?: {
        a: number;
        b: number;
        c: number;
    };
    strategy?: string;
    questionText?: string;
    questionType: string;
    diagram?: string;
    questionStem?: string;
    questionStemDiagram?: string;
    updatedAt?: string;
    // Custom properties for breakdown steps
    sub_steps?: Array<{ step: string }>;
    success_string?: string;
    categories?: string[];
    correct_answer_mapping?: Record<string, string[]>;
    // Marking result properties
    questionLegacyId?: string;
    annotatedAnswer?: string | undefined;
    markingTable?: string | undefined;
    userAnswer?: string | string[] | { left?: string; right?: string } | undefined;
    userMark?: number | undefined;
    canvas?: any;
    highlights?: any[];
    annotations?: any[];
    messages?: any[];
    isMarked?: boolean;
}

export interface BreakdownStep {
    index: number;
    title: string;
    heading: string;
    description: string;
    questionData: BreakdownQuestionData;
}

export const getHardcodedSteps = (): BreakdownStep[] => [
    {
        "index": 0,
        "title": "Identify Problem",
        "heading": "What is this problem asking you to find?",
        "description": "Understanding what you're looking for helps you choose the right solution method.",
        "questionData": {
            "legacyId": "step-0-identify-problem",
            "questionType": "mcq",
            "maxMark": 1,
            "options": [
                { "option": "The equations of two lines", "explanation": "This is not the main goal of the problem." },
                { "option": "The intersection point of two lines", "explanation": "Correct! We need to find where the two robot paths meet." },
                { "option": "The slope of each line", "explanation": "While we'll find slopes, this isn't the final goal." },
                { "option": "The distance between two points", "explanation": "This is not what the problem is asking for." }
            ],
            "correctAnswer": "The intersection point of two lines"
        }
    },
    {
        "index": 1,
        "title": "Identify Key Facts",
        "heading": "What are the key facts about the robot paths?",
        "description": "Identifying the path points helps you understand what equations you need to find.",
        "questionData": {
            "legacyId": "step-1-identify-facts",
            "questionType": "short_answer",
            "maxMark": 1,
            "correctAnswer": "Robot A passes through (1,7), (3,3), and (5,-1). Robot B passes through (-1,-1), (3,3), and (7,7). Both robots travel in straight lines."
        }
    },
    {
        "index": 2,
        "title": "Find First Equation",
        "heading": "Use Desmos to find the equation for Robot A's path",
        "description": "Using linear regression in Desmos helps you find the exact equation from multiple points.",
        "questionData": {
            "legacyId": "step-2-first-equation",
            "questionType": "solve_with_desmos",
            "maxMark": 1,
            "sub_steps": [
                { "step": "Click on the table icon (+) to create a new table" },
                { "step": "Enter Robot A's x-coordinates in the x1 column: 1, 3, 5" },
                { "step": "Enter Robot A's y-coordinates in the y1 column: 7, 3, -1" },
                { "step": "In a new line, type: y1 ~ m*x1 + b" },
                { "step": "Press Enter to see the linear regression" },
                { "step": "Note the values of m (slope) and b (y-intercept)" },
                { "step": "The equation for Robot A is y = mx + b using these values" }
            ],
            "correctAnswer": "y = -2x + 9",
            "success_string": "y=2x+6"
        }
    },
    {
        "index": 3,
        "title": "Find Second Equation",
        "heading": "Use Desmos to find the equation for Robot B's path",
        "description": "Finding the second equation gives you the complete system to solve.",
        "questionData": {
            "legacyId": "step-3-second-equation",
            "questionType": "solve_with_desmos",
            "maxMark": 1,
            "sub_steps": [
                { "step": "Click on the table icon (+) to create another new table" },
                { "step": "Enter Robot B's x-coordinates in the x2 column: -1, 3, 7" },
                { "step": "Enter Robot B's y-coordinates in the y2 column: -1, 3, 7" },
                { "step": "In a new line, type: y2 ~ m*x2 + b" },
                { "step": "Press Enter to see the linear regression" },
                { "step": "Note the values of m (slope) and b (y-intercept)" },
                { "step": "The equation for Robot B is y = mx + b using these values" }
            ],
            "correctAnswer": "y = x + 2"
        }
    },
    {
        "index": 4,
        "title": "Solve System Using Desmos",
        "heading": "Find where the two robot paths intersect",
        "description": "The intersection point of two lines is the solution to the system of equations.",
        "questionData": {
            "legacyId": "step-4-solve-system",
            "questionType": "solve_with_desmos",
            "maxMark": 1,
            "sub_steps": [
                { "step": "Clear your tables and enter the first equation: y = -2x + 9" },
                { "step": "Press Enter to graph the first line" },
                { "step": "Enter the second equation: y = x + 2" },
                { "step": "Press Enter to graph the second line" },
                { "step": "Look for where the two lines intersect on the graph" },
                { "step": "Click on the intersection point to see the coordinates" },
                { "step": "The intersection point (x,y) is the solution to the system" }
            ],
            "correctAnswer": "(3,3)"
        }
    }
]; 