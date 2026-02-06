import { QuestionSessionPageType } from "@/app/(protected)/sessions/types";

const TOOLBAR_HEIGHT = 152; // px - accounts for toolbar height (96px) + floating offset + extra breathing room

export function useToolbarPadding(options: {
  pageType: QuestionSessionPageType;
  isWideScreen: boolean;
}) {
  // SketchToolbar shows for Document/Practice on wide screens
  const showsSketchToolbar =
    options.isWideScreen &&
    (options.pageType === QuestionSessionPageType.Document ||
      options.pageType === QuestionSessionPageType.Practice);

  // TranscriptionToolbar shows for Document
  const showsTranscriptionToolbar =
    options.pageType === QuestionSessionPageType.Document;

  const showsToolbar = showsSketchToolbar || showsTranscriptionToolbar;

  const toolbarHeight = showsToolbar ? TOOLBAR_HEIGHT : 0;

  return {
    showsToolbar,
    toolbarHeight,
  };
}
