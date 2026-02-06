import type { CarouselSlide, FlowType } from "../_types/types";

// Intro carousel (shown after focus area selection)
export const introCarouselSlides: CarouselSlide[] = [
  {
    title: "All your course stuff, sorted",
    description:
      "Medly learns from your materials and keeps everything organized for you.",
    imagePath: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Fmessy.png?alt=media&token=f7fd0e0b-9ba0-4bb9-b3d6-2d458dff261a",
  },
  {
    title: "For lectures, essays and exams",
    description: "Whether it's a concept that won't click, an essay that won't start, Medly will help you get there.",
    imagePath: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Fhelp_me.png?alt=media&token=f1e461d1-ba4e-4969-8827-7cf0cc29ce70",
  },
  {
    title: "Built for proper academic work",
    description:
      "Built for your degree. Medly helps you think deeper, not skip the work.",
    imagePath: "https://firebasestorage.googleapis.com/v0/b/medly-540f4.appspot.com/o/assets%2Fopen%2Fjust_write.png?alt=media&token=00f0bc65-8c36-4567-9187-70caddf59dcd",
  },
];

// Placeholder carousel content - 3 slides per flow type
export const carouselContentByFlow: Record<FlowType, CarouselSlide[]> = {
  organize: [
    {
      title: "Upload your materials",
      description:
        "Drag and drop lecture slides, notes, and readings. Medly organizes them for you.",
      imagePath: "/assets/open-onboarding/carousel/organize-1.png",
    },
    {
      title: "Find anything instantly",
      description:
        "Search across all your materials. Never lose track of important content again.",
      imagePath: "/assets/open-onboarding/carousel/organize-2.png",
    },
    {
      title: "Stay on top of deadlines",
      description:
        "Track assessments and create study plans that work for you.",
      imagePath: "/assets/open-onboarding/carousel/organize-3.png",
    },
  ],
  exam: [
    {
      title: "Upload your course materials",
      description:
        "Add lecture slides, notes, and past papers. Medly learns what you need to know.",
      imagePath: "/assets/open-onboarding/carousel/exam-1.png",
    },
    {
      title: "Generate practice questions",
      description:
        "Get unlimited practice questions tailored to your exact syllabus.",
      imagePath: "/assets/open-onboarding/carousel/exam-2.png",
    },
    {
      title: "Track your progress",
      description:
        "See where you're strong and where you need more practice.",
      imagePath: "/assets/open-onboarding/carousel/exam-3.png",
    },
  ],
  assignment: [
    {
      title: "Upload your brief",
      description:
        "Add your assignment brief and any relevant readings or lecture notes.",
      imagePath: "/assets/open-onboarding/carousel/assignment-1.png",
    },
    {
      title: "Get guidance, not answers",
      description:
        "Medly helps you understand concepts and structure your work.",
      imagePath: "/assets/open-onboarding/carousel/assignment-2.png",
    },
    {
      title: "Check your understanding",
      description: "Test yourself on key concepts before you write.",
      imagePath: "/assets/open-onboarding/carousel/assignment-3.png",
    },
  ],
  lecture: [
    {
      title: "Upload your lecture slides",
      description:
        "Add slides, recordings, or notes from lectures you've missed or found confusing.",
      imagePath: "/assets/open-onboarding/carousel/lecture-1.png",
    },
    {
      title: "Get instant explanations",
      description:
        "Ask questions about anything. Medly explains concepts in your own words.",
      imagePath: "/assets/open-onboarding/carousel/lecture-2.png",
    },
    {
      title: "Make it stick",
      description:
        "Generate flashcards and practice questions to reinforce your learning.",
      imagePath: "/assets/open-onboarding/carousel/lecture-3.png",
    },
  ],
};
