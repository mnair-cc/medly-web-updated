import { QuestionType, Step, StepType } from "../_types/types";

export const steps: Step[] = [
  // Step 0: Welcome
  {
    title: "Welcome to Medly",
    description:
      "Medly is the all-in-one thinking partner for your university degree.",
    type: StepType.INFO,
    primaryButtonText: "Get started",
    shouldCountInProgressBar: true,
  },
  // Step 1: Focus area
  {
    title: "What brings you to Medly?",
    type: StepType.QUESTION,
    questions: [
      {
        fieldName: "focusArea",
        type: QuestionType.MULTIPLE_CHOICE,
        options: [
          "Stay organized across my modules",
          "Keep up with lectures",
          "Get help with assignments",
          "Prepare for exams",
        ],
        values: [
          "stay_organised",
          "keep_up_lectures",
          "help_assignments",
          "prepare_exams",
        ],
      },
    ],
    primaryButtonText: "Continue",
    shouldCountInProgressBar: true,
  },
  // Step 2: Intro carousel (3 slides)
  {
    type: StepType.CAROUSEL,
    carouselKey: "intro",
    shouldCountInProgressBar: true,
  },
  // Step 3: Avatar + Name
  {
    title: "Let's get you set up",
    type: StepType.QUESTION,
    questions: [
      {
        fieldName: "avatar",
        type: QuestionType.AVATAR,
        options: [
          "🦊",
          "🐼",
          "🐔",
          "🦄",
          "🦋",
          "🦁",
          "🐙",
          "🦦",
          "🦥",
          "🧸",
          "🐭",
          "🐰",
        ],
        values: [
          "🦊",
          "🐼",
          "🐔",
          "🦄",
          "🦋",
          "🦁",
          "🐙",
          "🦦",
          "🦥",
          "🧸",
          "🐭",
          "🐰",
        ],
      },
      {
        fieldName: "userName",
        title: "What should we call you?",
        type: QuestionType.TEXT,
        placeholder: "Name",
      },
    ],
    primaryButtonText: "Continue",
    shouldCountInProgressBar: true,
  },
  // Step 4: University
  {
    title: "What university do you go to?",
    type: StepType.QUESTION,
    questions: [
      {
        fieldName: "university",
        type: QuestionType.SEARCHABLE_SELECT,
        placeholder: "Search for your university...",
      },
    ],
    primaryButtonText: "Continue",
    secondaryButtonText: "Not a university student?",
    shouldCountInProgressBar: true,
  },
  // Step 5: All set up
  {
    title: "You're in!",
    description:
      "You're joining thousands of students using Medly as their thinking partner!",
    type: StepType.INFO_DYNAMIC,
    dynamicContentKey: "universityStudentCount",
    primaryButtonText: "Continue",
    shouldCountInProgressBar: true,
  },
  // Step 8: Flow type selection (commented out)
  // {
  //   title: "What's on your mind?",
  //   description: "Pick the one that's weighing on your mind.",
  //   type: StepType.QUESTION,
  //   questions: [
  //     {
  //       fieldName: "flowType",
  //       type: QuestionType.FLOW_SELECT,
  //       options: [
  //         "A lecture",
  //         "An exam",
  //         "An assignment",
  //         "Everything about my degree",
  //       ],
  //       values: ["lecture", "exam", "assignment", "organize"],
  //     },
  //   ],
  //   primaryButtonText: "Continue",
  //   shouldCountInProgressBar: true,
  // },
  // Step 11: Loading -> Redirect
  {
    title: "Setting up your workspace...",
    type: StepType.LOADING_REDIRECT,
    shouldCountInProgressBar: false,
  },
];
