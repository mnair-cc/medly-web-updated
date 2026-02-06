import { Slide } from "../_types/types";

export const WRAPPED_SEEN_KEY = "medly_wrapped_seen_2025";

export const slides: Slide[] = [
  {
    type: "welcome",
    showNextButton: false,
    backgroundColor: "#1D9AEE",
    textColor: "#FFFFFF",
  },
  {
    type: "loading",
    showNextButton: false,
    backgroundColor: "#FFFFFF",
    textColor: "#05B0FF",
  },
  {
    type: "completed_papers",
    title1: "You completed {numberOfPapers}",
    title2: "Medly Mock {paperOrPapers}",
    title3: "this week!",
    backgroundColor: "#05B0FF",
    textColor: "#FFFFFF",
  },
  {
    type: "time_spent",
    title1: "You spent over {hours} {hourOrHours} on ",
    title2: "Medly Mocks!",
    figureLarge: "{hoursAndMinutes}",
    backgroundColor: "#464B70",
    textColor: "#FAFBD9",
  },
  {
    type: "lets_see",
    title1: "Let's see how you did...",
    backgroundColor: "#05486A",
    textColor: "#FFAFBB",
  },
  {
    type: "grades",
    title1: "Your Christmas Mock Results",
    backgroundColor: "#464B70",
    textColor: "#FAF6F0",
  },
  {
    type: "with_others",
    backgroundColor: "#FFA6D4",
    textColor: "#300A42",
  },
  {
    type: "best_subject",
    title1: "Your best Medly",
    title2: "subject was",
    figureLarge: "{subject}",
    backgroundColor: "#68556A",
    textColor: "#D6F1FF",
  },
  {
    type: "percentile",
    title1: "You were in the {award}",
    backgroundColor: "#313131",
    textColor: "#FFE28A",
  },
  // {
  //   type: "school_leaderboard",
  //   title1: "Join your school",
  //   title2: "leaderboard",
  //   subtitle:
  //     "Help us by telling us which school you go to. Your details will be kept completely anonymous.",
  //   backgroundColor: "#05486A",
  //   textColor: "#FFAFBB",
  //   buttonText: "Save & Continue",
  // },
  {
    type: "strongest_topics",
    backgroundColor: "#464B71",
    textColor: "#F7CAFF",
  },
  {
    type: "weakest_topics",
    backgroundColor: "#464B71",
    textColor: "#F7CAFF",
  },
  {
    type: "summary",
    title1: "Thank you for sitting the",
    title2: "2025 Christmas Mocks!",
    buttonText: "Review your papers",
    backgroundColor: "#05B0FF",
    textColor: "#FFFFFF",
    // subtitle: "We hope you found the Medly Mocks useful. We'll see you next year!",
  },
];

export const slideVariants = {
  enter: {
    // x: 1000,
    opacity: 0,
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: {
    zIndex: 0,
    // x: -1000,
    opacity: 0,
  },
};

export const fromTopVariants = {
  enter: {
    // y: -1000,
    opacity: 0,
  },
  center: {
    y: 0,
    opacity: 1,
  },
  exit: {
    // y: 1000,
    opacity: 0,
  },
};
