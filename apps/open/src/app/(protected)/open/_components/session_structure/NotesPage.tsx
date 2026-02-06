"use client";

import {
  useAiChat,
  useRegisterCapability,
  useRegisterContextCollector,
} from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import { usePdfNotesJob } from "@/app/(protected)/open/_hooks/usePdfNotesJob";
import { PDF_NOTES_STAGE_LABELS } from "@/app/(protected)/open/_lib/jobs";
import { SourceReference } from "@/app/(protected)/open/_types/content";
import { InputMode, TextbookContent } from "@/app/(protected)/sessions/types";
import type { Editor } from "@tiptap/core";
import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  handleCommandNavigation,
  useEditor,
} from "novel";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { slashCommand, suggestionItems } from "./slash-command";
// import { NodeSelector } from "./selectors/node-selector";
// import { LinkSelector } from "./selectors/link-selector";
// import { ColorSelector } from "./selectors/color-selector";
import Spinner from "@/app/_components/Spinner";
import { CitationPreview } from "../citations";
import { useSidebar } from "../sidebar/MOSidebarLayoutClient";
import { defaultExtensions } from "./extensions";
import "./notes-editor.css";
import {
  contentToHtml,
  getMarkdown,
  getStorageMarkdown,
} from "./notes/markdownUtils";
import { ReplaceAnimation } from "./replaceAnimation";
import { AskMedlyButton } from "./selectors/ask-medly-button";
import { DefineButton } from "./selectors/define-button";
import { TextButtons } from "./selectors/text-buttons";

// Helper: escape special regex characters
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Find which block index changed by comparing old vs new blocks
function findChangedBlockIndex(
  oldBlocks: string[],
  newBlocks: string[],
): number {
  for (let i = 0; i < Math.max(oldBlocks.length, newBlocks.length); i++) {
    if (oldBlocks[i] !== newBlocks[i]) return i;
  }
  return -1;
}

// Find ProseMirror position of block at index
function findBlockPosition(
  editor: Editor,
  blockIndex: number,
): { from: number; to: number } | null {
  const { doc } = editor.state;
  let currentIndex = 0;
  let result: { from: number; to: number } | null = null;

  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.isBlock && node.type.name !== "doc") {
      if (currentIndex === blockIndex) {
        result = { from: pos, to: pos + node.nodeSize };
        return false;
      }
      currentIndex++;
    }
    return true;
  });

  return result;
}

// Bridge component to expose the editor instance from context to the parent
const EditorInstanceBridge = ({
  onReady,
}: {
  onReady: (editor: Editor | null) => void;
}) => {
  const { editor } = useEditor();
  useEffect(() => {
    onReady(editor ?? null);
  }, [editor, onReady]);
  return null;
};

interface NotesPageProps {
  content: TextbookContent;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  openDocumentAtPage?: (page: number, sourceText: string) => void;
  onEditNotes?: (textToReplace: string, newText: string) => void;
  setEditNotesRef?: (
    fn:
      | ((
          edits: Array<{ textToReplace: string; newText: string }>,
          skipAnimation?: boolean,
        ) => Promise<Array<{ success: boolean; error?: string }>>)
      | null,
  ) => void;
  onRewriteNotes?: (newContent: string) => void;
  setRewriteNotesRef?: (
    fn:
      | ((
          newContent: string,
          skipAnimation?: boolean,
        ) => Promise<{ success: boolean; error?: string }>)
      | null,
  ) => void;
  setRewriteStreamRef?: (
    fn: {
      addChunk: (chunk: string) => void;
      end: () => void;
    } | null,
  ) => void;
  pageNotes?: string;
  updatePageNotes?: (notes: string, newVersion?: boolean) => void;
  updateNotesStorageKey?: (
    storageKey: string,
    notesContent: string,
  ) => Promise<void>;
  isLoadingPage?: boolean;
  documentName?: string;
  updateDocumentName?: (name: string) => void;
  updateSelectedText?: (text: string | null) => void;
  /** Storage path (gs://) of the source PDF document for notes generation */
  sourceDocumentStoragePath?: string;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  setCancelAnimationRef?: (fn: (() => void) | null) => void;
  sourceReferences?: SourceReference[];
  /** Current document ID for naming the generated notes file */
  documentId?: string;
  /** Full Firestore path to the Note document for automatic metadata update */
  noteDocumentPath?: string;
  /** Auto-start notes generation when component mounts (triggered from Header Summary button) */
  autoStartGeneration?: boolean;
  /** Callback when notes generation has started */
  onGenerationStarted?: () => void;
  /** Bottom padding to avoid toolbar overlap */
  toolbarHeight?: number;
}

interface HeadingInfo {
  id: string;
  text: string;
  position: number;
  level: 1 | 2 | 3;
}

const NotesPage = ({
  content,
  inputMode,
  setInputMode,
  openDocumentAtPage,
  onEditNotes,
  setEditNotesRef,
  onRewriteNotes,
  setRewriteNotesRef,
  setRewriteStreamRef,
  pageNotes,
  updatePageNotes,
  updateNotesStorageKey,
  isLoadingPage,
  documentName,
  updateDocumentName,
  documentId,
  updateSelectedText,
  sourceDocumentStoragePath,
  onAnimationStateChange,
  setCancelAnimationRef,
  sourceReferences,
  noteDocumentPath,
  autoStartGeneration,
  onGenerationStarted,
  toolbarHeight = 0,
}: NotesPageProps) => {
  // Chat context for selection updates + cross-document citation navigation
  const {
    updateSelectedText: updateChatSelectedText,
    executeCapability,
    setTargetPdfDocumentId,
    setTargetPdfPage,
    setTargetHighlightText,
  } = useAiChat();

  const { documents: sidebarDocuments } = useSidebar();

  const extensions = [...defaultExtensions, slashCommand, ReplaceAnimation];
  const [pageTitle, setPageTitle] = useState(documentName || "");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [headings, setHeadings] = useState<HeadingInfo[]>([]);
  const [currentHeadingIndex, setCurrentHeadingIndex] = useState<number | null>(
    null,
  );
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const hoverLineOverlayRef = useRef<HTMLDivElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // PDF notes job hook for generating notes from source PDF
  const [jobStageLabel, setJobStageLabel] = useState<string | null>(null);
  // Ref to track if streaming has started (to trigger startRewriteStream only once)
  const streamingStartedRef = useRef(false);
  // Buffer for aggregating chunks until we have complete lines
  const chunkBufferRef = useRef("");

  // Callback refs for streaming (defined later, used here)
  const addRewriteStreamChunkRef = useRef<((chunk: string) => void) | null>(
    null,
  );
  const endRewriteStreamRef = useRef<(() => void) | null>(null);

  const pdfNotesJob = usePdfNotesJob({
    onChunk: (chunk, _accumulated) => {
      // Aggregate chunks until we have complete lines before committing
      if (editorInstance && chunk) {
        // Start streaming on first chunk
        if (!streamingStartedRef.current) {
          streamingStartedRef.current = true;
          setIsNotesLoading(false); // Hide "Starting..." indicator
          setJobStageLabel(null);
        }

        // Add chunk to buffer
        chunkBufferRef.current += chunk;

        // Process complete lines from buffer (split on double newlines for paragraphs)
        // Keep incomplete content in buffer
        const lines = chunkBufferRef.current.split(/\n\n+/);

        // If we have more than one segment, all but the last are complete
        if (lines.length > 1) {
          // Process all complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const completeLine = lines[i].trim();
            if (completeLine) {
              // Convert markdown to HTML
              const htmlChunk = contentToHtml(
                editorInstance,
                completeLine,
                true,
              );
              if (htmlChunk && addRewriteStreamChunkRef.current) {
                addRewriteStreamChunkRef.current(htmlChunk);
              }
            }
          }
          // Keep the last (potentially incomplete) segment in buffer
          chunkBufferRef.current = lines[lines.length - 1];
        }
      }
    },
    onProgress: (_progress, stage) => {
      if (stage) {
        const label = PDF_NOTES_STAGE_LABELS[stage] || stage;
        setJobStageLabel(label);
      }
    },
    onSuccess: async (result) => {
      setJobStageLabel(null);
      streamingStartedRef.current = false;

      // Flush any remaining content in the buffer
      if (chunkBufferRef.current.trim() && editorInstance) {
        const htmlChunk = contentToHtml(
          editorInstance,
          chunkBufferRef.current.trim(),
          true,
        );
        if (htmlChunk && addRewriteStreamChunkRef.current) {
          addRewriteStreamChunkRef.current(htmlChunk);
        }
      }
      chunkBufferRef.current = "";

      // End the streaming animation
      if (endRewriteStreamRef.current) {
        endRewriteStreamRef.current();
      }

      // Check if markdown was generated
      if (!result.storage_key) {
        console.error("No storage_key in result");
        setIsNotesLoading(false);
        return;
      }

      // Wait for streaming animation and queue processing to complete
      // Poll until queue processing is done (max 5 seconds)
      const maxWait = 5000;
      const pollInterval = 100;
      let waited = 0;
      while (isProcessingQueueRef.current && waited < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        waited += pollInterval;
      }

      // Additional small delay for final DOM updates
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check if backend already updated Firestore metadata
      const backendUpdatedFirestore =
        noteDocumentPath && result.metadata_updated === true;

      // TODO: TEMPORARY DEBUG - Remove after testing
      console.log("[NotesPage] PDF notes job completed:", {
        noteDocumentPath,
        metadata_updated: result.metadata_updated,
        backendUpdatedFirestore,
        storage_key: result.storage_key,
      });

      // Only do manual update if backend didn't handle it (or failed)
      if (!backendUpdatedFirestore && updateNotesStorageKey) {
        // Get the final content from the editor (already streamed in)
        let finalMarkdown = "";
        try {
          finalMarkdown = editorInstance
            ? getStorageMarkdown(editorInstance)
            : "";
        } catch (error) {
          console.warn(
            "Failed to serialize final markdown, using fallback:",
            error,
          );
          finalMarkdown = editorInstance?.getText() || "";
        }

        if (finalMarkdown) {
          await updateNotesStorageKey(result.storage_key, finalMarkdown);
        }
      }

      setIsNotesLoading(false);
    },
    onError: (error) => {
      console.error("PDF notes job failed:", error);
      setJobStageLabel(null);
      streamingStartedRef.current = false;
      chunkBufferRef.current = ""; // Clear buffer on error
      // End streaming on error
      if (endRewriteStreamRef.current) {
        endRewriteStreamRef.current();
      }
      setIsNotesLoading(false);
    },
  });

  // Get PDF URL from source references (for citation preview)
  // Source references contain IDs of source documents - the first one is typically the primary source
  const pdfUrlForCitation = React.useMemo(() => {
    // First, try to get from content prop (if it's a PDF URL directly)
    try {
      const c = content as unknown as string;
      if (
        typeof c === "string" &&
        (c.endsWith(".pdf") || c.includes(".pdf") || c.startsWith("/assets/"))
      ) {
        return c;
      }
    } catch {}

    // For notes documents, we have sourceReferences but not the actual URL
    // The URL would need to be resolved from the source document ID
    // For now, return undefined if we only have references (not direct URL)
    if (sourceReferences && sourceReferences.length > 0) {
      // TODO: Resolve URL from sourceReferences[0].id if needed
      // The citation preview component may need to fetch the URL from the document ID
      return undefined;
    }

    return undefined;
  }, [content, sourceReferences]);

  // Citation modal state
  const [citationModal, setCitationModal] = useState<{
    visible: boolean;
    documentId: string;
    pageIndex: string;
    sourceSegment: string;
    x: number;
    y: number;
  } | null>(null);
  const [citationModalAnimated, setCitationModalAnimated] = useState(false);
  const [showCitationPreview, setShowCitationPreview] = useState(false);
  const [isCitationPreviewReady, setIsCitationPreviewReady] = useState(false);
  const citationShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Prevent bubbling mouseover from constantly remounting the same modal, and
  // allow onPreviewReady to confirm we're still hovering the same citation.
  const lastHoveredCitationKeyRef = useRef<string | null>(null);

  const clearCitationShowTimeout = useCallback(() => {
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }
  }, []);

  const getPdfUrlForDocumentId = useCallback(
    (documentId: string): string | undefined => {
      const doc = sidebarDocuments?.find((d) => d.id === documentId);
      if (!doc?.storageUrl) return undefined;
      return `/api/open/pdf-proxy?url=${encodeURIComponent(doc.storageUrl)}`;
    },
    [sidebarDocuments],
  );

  const navigateToCitation = useCallback(
    async (documentId: string, pageIndex0: number, sourceSegment: string) => {
      const pageNumber = pageIndex0 + 1; // citations are 0-indexed

      setTargetPdfDocumentId(documentId || null);
      setTargetHighlightText(sourceSegment || null);
      setTargetPdfPage(pageNumber);

      // Navigate cross-document if needed; MOSessionStructure will consume the jump once we're on that doc.
      if (documentId) {
        await executeCapability("navigateToDocument", { documentId });
      }
    },
    [
      executeCapability,
      setTargetHighlightText,
      setTargetPdfDocumentId,
      setTargetPdfPage,
    ],
  );

  // Debug state for manual text replacement testing
  const [debugTextToReplace, setDebugTextToReplace] = useState("");
  const [debugNewText, setDebugNewText] = useState("");
  const [debugResult, setDebugResult] = useState<string>("");

  // Debug state for rewrite notes testing
  const [debugRewriteContent, setDebugRewriteContent] = useState("");
  const [debugRewriteResult, setDebugRewriteResult] = useState<string>("");

  // Writing indicator state
  const [writingIndicator, setWritingIndicator] = useState<{
    visible: boolean;
    top: number;
    currentH1: string | null;
  }>({ visible: false, top: 0, currentH1: null });

  // Guard to distinguish programmatic editor changes from genuine user edits
  const isProgrammaticUpdateRef = useRef(false);

  // Streaming rewrite notes queue state
  const rewriteStreamQueueRef = useRef<string[]>([]);
  const rewriteStreamBufferRef = useRef<string>("");
  const isProcessingQueueRef = useRef(false);
  const isStreamActiveRef = useRef(false);

  // Animation tracking state
  const [isAnimating, setIsAnimating] = useState(false);
  const animationAbortRef = useRef<(() => void) | null>(null);

  // Ref to store rewriteNotes function for use in capability handler
  const rewriteNotesRef = useRef<
    | ((
        newContent: string,
        skipAnimation?: boolean,
      ) => Promise<{ success: boolean; error?: string }>)
    | null
  >(null);

  // Ref to store editNotes function for use in capability handler
  const editNotesRef = useRef<
    | ((
        textToReplace: string,
        newText: string,
        skipAnimation?: boolean,
      ) => Promise<{ success: boolean; error?: string }>)
    | null
  >(null);

  // const [openNode, setOpenNode] = useState(false);
  // const [openLink, setOpenLink] = useState(false);
  // const [openColor, setOpenColor] = useState(false);

  // ----------------------------------------
  // AI Chat capability registrations
  // ----------------------------------------

  // Handler for AI to add notes (append)
  const handleAiAddNote = useCallback(
    async (params: { text: string }) => {
      if (!editorInstance) return;
      // Convert markdown/plain text to HTML and append (block level, wrap plain text)
      const docSize = editorInstance.state.doc.content.size;
      const htmlContent = contentToHtml(editorInstance, params.text, true);
      editorInstance.commands.insertContentAt(docSize - 1, htmlContent);
    },
    [editorInstance],
  );

  // Handler for AI to edit notes - delegates to editNotes middleware for animation
  const handleAiEditNotes = useCallback(
    async (params: { textToReplace: string; newText: string }) => {
      // Use editNotes middleware (via ref) which has full animation support
      if (editNotesRef.current) {
        return await editNotesRef.current(
          params.textToReplace,
          params.newText,
          false,
        );
      }
      return { success: false, error: "Editor not initialized" };
    },
    [],
  );

  // Handler for AI to rewrite entire notes (uses rewriteNotes for animation)
  const handleAiRewriteNotes = useCallback(
    async (params: { newContent: string }) => {
      if (!editorInstance) {
        return { success: false, error: "Editor not initialized" };
      }
      // Use rewriteNotes function (with animation) if available via ref
      if (rewriteNotesRef.current) {
        return await rewriteNotesRef.current(params.newContent, false);
      }
      // Fallback: direct set content without animation (block level, wrap plain text)
      const htmlContent = contentToHtml(
        editorInstance,
        params.newContent,
        true,
      );
      editorInstance.commands.setContent(htmlContent);
      return { success: true };
    },
    [editorInstance],
  );

  // Register capabilities
  useRegisterCapability("addNote", handleAiAddNote, "notes");
  useRegisterCapability("editNotes", handleAiEditNotes, "notes");
  useRegisterCapability("rewriteNotes", handleAiRewriteNotes, "notes");

  // Register context collector
  const collectNotesContext = useCallback(async () => {
    // Get markdown using tiptap-markdown serializer
    const notesMarkdown = editorInstance ? getMarkdown(editorInstance) : "";
    return {
      documentName: documentName ?? "",
      notesPlainText: editorInstance?.getText() ?? "", // For text matching
      notesMarkdown, // AI reads/writes markdown
      headings: headings.map((h) => h.text),
    };
  }, [documentName, editorInstance, headings]);

  useRegisterContextCollector("notes", collectNotesContext);

  // ----------------------------------------
  // Notes page callbacks
  // ----------------------------------------

  /**
   * Cancel currently running animation and revert changes
   */
  const cancelAnimation = useCallback(() => {
    if (animationAbortRef.current) {
      animationAbortRef.current(); // Executes revert logic
      animationAbortRef.current = null;
    }
    setIsAnimating(false);
    onAnimationStateChange?.(false);
  }, [onAnimationStateChange]);

  /**
   * Edit notes by replacing exact text with new text (with animation)
   * Uses markdown-based matching: validates on markdown string, diffs to find changed blocks
   */
  const editNotes = useCallback(
    async (
      textToReplace: string,
      newText: string,
      skipAnimation = false,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!editorInstance) {
        return { success: false, error: "Editor not initialized" };
      }

      const currentHtml = editorInstance.getHTML();

      try {
        isProgrammaticUpdateRef.current = true;

        // Animation setup
        if (!skipAnimation) {
          setIsAnimating(true);
          onAnimationStateChange?.(true);
          animationAbortRef.current = () => {
            isProgrammaticUpdateRef.current = true;
            editorInstance.commands.setContent(currentHtml);
            isProgrammaticUpdateRef.current = false;
          };
        }

        // Empty textToReplace = append
        if (!textToReplace || textToReplace.trim() === "") {
          const htmlContent = contentToHtml(editorInstance, newText, true);
          if (editorInstance.isEmpty) {
            editorInstance.commands.setContent(htmlContent);
          } else {
            const docSize = editorInstance.state.doc.content.size;
            editorInstance.commands.insertContentAt(docSize - 1, htmlContent);
          }
          return { success: true };
        }

        // === STEP 1: Get current markdown ===
        const currentMarkdown = getMarkdown(editorInstance);

        // === STEP 2: Validate exists ===
        if (!currentMarkdown.includes(textToReplace)) {
          return {
            success: false,
            error:
              "Text not found. Copy exactly from <working_document_content>.",
          };
        }

        // Check uniqueness
        const regex = new RegExp(escapeRegExp(textToReplace), "g");
        const occurrences = (currentMarkdown.match(regex) || []).length;
        if (occurrences > 1) {
          return {
            success: false,
            error: `Found ${occurrences} matches. Include more context for unique match.`,
          };
        }

        // === STEP 3: Do markdown replacement ===
        const newMarkdown = currentMarkdown.replace(textToReplace, newText);

        // === STEP 4: Diff to find changed blocks ===
        const oldBlocks = currentMarkdown.split("\n\n");
        const newBlocks = newMarkdown.split("\n\n");
        const changedBlockIndex = findChangedBlockIndex(oldBlocks, newBlocks);

        // === STEP 5: Animate based on diff ===
        if (!skipAnimation && changedBlockIndex !== -1) {
          const blockPos = findBlockPosition(editorInstance, changedBlockIndex);
          if (blockPos) {
            // Highlight old block
            (editorInstance as any).commands.setReplaceDecorations([
              {
                from: blockPos.from,
                to: blockPos.to,
                className: "pm-line-highlight",
                type: "node",
              },
            ]);
            await new Promise((r) => setTimeout(r, 200));

            // Fade out
            (editorInstance as any).commands.setReplaceDecorations([
              {
                from: blockPos.from,
                to: blockPos.to,
                className: "pm-line-highlight pm-anim-fade-out",
                type: "node",
              },
            ]);
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        // === STEP 6: Update editor with new markdown ===
        const newHtml = contentToHtml(editorInstance, newMarkdown, true);
        editorInstance.commands.setContent(newHtml);

        // === STEP 7: Animate new block ===
        if (!skipAnimation && changedBlockIndex !== -1) {
          await new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          );

          const newBlockPos = findBlockPosition(
            editorInstance,
            changedBlockIndex,
          );
          if (newBlockPos) {
            // Fade in new block
            (editorInstance as any).commands.setReplaceDecorations([
              {
                from: newBlockPos.from,
                to: newBlockPos.to,
                className: "pm-line-highlight pm-anim-fade-in-initial",
                type: "node",
              },
            ]);
            void editorInstance.view.dom.offsetHeight;

            requestAnimationFrame(() => {
              (editorInstance as any).commands.setReplaceDecorations([
                {
                  from: newBlockPos.from,
                  to: newBlockPos.to,
                  className: "pm-line-highlight pm-anim-fade-in",
                  type: "node",
                },
              ]);
            });
            await new Promise((r) => setTimeout(r, 250));

            // Fade out highlight
            (editorInstance as any).commands.setReplaceDecorations([
              {
                from: newBlockPos.from,
                to: newBlockPos.to,
                className: "pm-line-highlight-fade-out",
                type: "node",
              },
            ]);
            await new Promise((r) => setTimeout(r, 250));
          }

          (editorInstance as any).commands.clearReplaceDecorations();
        }

        return { success: true };
      } catch (error) {
        console.error("editNotes error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        isProgrammaticUpdateRef.current = false;
        if (!skipAnimation) {
          setIsAnimating(false);
          onAnimationStateChange?.(false);
          animationAbortRef.current = null;
        }
      }
    },
    [editorInstance, onAnimationStateChange],
  );

  /**
   * Edit notes by replacing multiple text segments sequentially (with animations)
   * @param edits - Array of edit operations {textToReplace, newText}
   * @param skipAnimation - If true, skip animations for all edits
   * @returns Success/error result for each edit
   */
  const editNotesMultiple = useCallback(
    async (
      edits: Array<{ textToReplace: string; newText: string }>,
      skipAnimation = false,
    ): Promise<Array<{ success: boolean; error?: string }>> => {
      console.log("NotesPage.editNotesMultiple called ->", {
        edits,
        skipAnimation,
        hasEditor: !!editorInstance,
      });

      if (!editorInstance) {
        return edits.map(() => ({
          success: false,
          error: "Editor not initialized",
        }));
      }

      const results: Array<{ success: boolean; error?: string }> = [];

      // Process each edit sequentially, awaiting completion of animations
      for (const edit of edits) {
        const result = await editNotes(
          edit.textToReplace,
          edit.newText,
          skipAnimation,
        );
        results.push(result);

        // If an edit fails, log but continue with remaining edits
        if (!result.success) {
          console.warn("Edit failed in batch:", { edit, error: result.error });
        }
      }

      console.log("Batch edit complete ->", {
        totalEdits: edits.length,
        results,
      });
      return results;
    },
    [editorInstance, editNotes],
  );

  /**
   * Rewrite all notes with new content (instant replacement)
   * @param newContent - New HTML or plain text content
   * @returns Success/error result
   */
  // Helper function to extract headings from editor
  const extractHeadings = useCallback(() => {
    if (!editorInstance) return;

    const headingList: HeadingInfo[] = [];
    const { doc } = editorInstance.state;

    doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const level = node.attrs.level;
        if (level === 1 || level === 2 || level === 3) {
          const text = node.textContent || "";
          headingList.push({
            id: `h${level}-${pos}`,
            text,
            position: pos,
            level: level as 1 | 2 | 3,
          });
        }
      }
      return true;
    });

    setHeadings(headingList);
  }, [editorInstance]);

  const rewriteNotes = useCallback(
    async (
      newContent: string,
      skipAnimation = false,
    ): Promise<{ success: boolean; error?: string }> => {
      console.log("NotesPage.rewriteNotes called ->", {
        contentLength: newContent.length,
        skipAnimation,
        hasEditor: !!editorInstance,
      });

      if (!editorInstance) {
        return { success: false, error: "Editor not initialized" };
      }

      // Turn off loading state as soon as rewrite starts
      setIsNotesLoading(false);

      // Store current content for abort functionality
      const currentContent = editorInstance.getHTML();

      try {
        // Programmatic content writing (AI)
        isProgrammaticUpdateRef.current = true;

        // Convert content to HTML (block level, wrap plain text)
        const contentToSet = contentToHtml(editorInstance, newContent, true);

        // If skipping animation, do instant replacement
        if (skipAnimation) {
          console.log(
            "NotesPage.rewriteNotes: using instant replacement (skipAnimation=true)",
          );
          editorInstance.commands.setContent(contentToSet);
          isProgrammaticUpdateRef.current = false;

          // Manually extract headings after content replacement
          setTimeout(() => {
            extractHeadings();
          }, 0);

          return { success: true };
        }

        // Start animation tracking
        setIsAnimating(true);
        onAnimationStateChange?.(true);

        // Store abort function that can revert changes
        animationAbortRef.current = () => {
          if (editorInstance) {
            isProgrammaticUpdateRef.current = true;
            editorInstance.commands.setContent(currentContent);
            isProgrammaticUpdateRef.current = false;
            setWritingIndicator({ visible: false, top: 0, currentH1: null });
          }
        };

        // Parse HTML into individual block elements
        const parseBlocks = (html: string): string[] => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          const blocks: string[] = [];
          const blockTags = [
            "P",
            "H1",
            "H2",
            "H3",
            "H4",
            "H5",
            "H6",
            "BLOCKQUOTE",
            "PRE",
          ];
          const listTags = ["UL", "OL"];

          const processNode = (node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              const tagName = element.tagName;

              if (listTags.includes(tagName)) {
                /**
                 * IMPORTANT: Keep lists as a single block.
                 *
                 * The previous behavior wrapped each <li> in its own <ol>/<ul> so we could animate
                 * list items one-by-one. For ordered lists, that creates multiple one-item lists,
                 * and the browser restarts numbering at 1 each time (UI shows 1., 1., 1., ...).
                 *
                 * We'll animate the entire list as one block to preserve correct numbering.
                 */
                blocks.push(element.outerHTML);
              } else if (tagName === "LI") {
                // Safety fallback: if a loose <li> appears, wrap it in a <ul> so HTML is valid.
                blocks.push(`<ul>${element.outerHTML}</ul>`);
              } else if (blockTags.includes(tagName)) {
                // Regular block elements: extract as-is
                blocks.push(element.outerHTML);
              } else if (element.children.length > 0) {
                // Process children recursively
                Array.from(element.children).forEach((child) =>
                  processNode(child),
                );
              } else if (element.textContent?.trim()) {
                // Text content without block wrapper - wrap in paragraph
                blocks.push(`<p>${element.textContent.trim()}</p>`);
              }
            } else if (
              node.nodeType === Node.TEXT_NODE &&
              node.textContent?.trim()
            ) {
              // Standalone text nodes - wrap in paragraph
              blocks.push(`<p>${node.textContent.trim()}</p>`);
            }
          };

          // Process all child nodes
          Array.from(tempDiv.childNodes).forEach((node) => processNode(node));

          // If no blocks found, treat entire content as one block
          if (blocks.length === 0) {
            blocks.push(contentToSet);
          }

          return blocks;
        };

        const blocks = parseBlocks(contentToSet);

        // Clear editor first
        editorInstance.commands.clearContent();

        // Helper function to update writing indicator position
        const updateWritingIndicator = (h1Text: string | null = null) => {
          if (!editorInstance || !editorContainerRef.current) return;

          const { doc } = editorInstance.state;
          let lastBlockPos = 0;

          // Find the last block node
          doc.descendants((node, pos) => {
            if (node.isBlock) {
              lastBlockPos = pos;
            }
            return true;
          });

          // Get DOM position of the last block
          try {
            const $pos = doc.resolve(lastBlockPos);
            // Get the DOM node for the block
            const dom = editorInstance.view.nodeDOM($pos.pos);

            if (
              dom &&
              dom instanceof HTMLElement &&
              editorContainerRef.current
            ) {
              // Get the bounding rect of the block element
              const blockRect = dom.getBoundingClientRect();
              const containerRect =
                editorContainerRef.current.getBoundingClientRect();
              // Position indicator 8px below the bottom of the block
              const top = blockRect.bottom - containerRect.top + 8;

              setWritingIndicator({ visible: true, top, currentH1: h1Text });
            } else {
              // Fallback: if we can't get DOM, position at end of document
              const editorElement = editorInstance.view.dom;
              if (editorElement && editorContainerRef.current) {
                const editorRect = editorElement.getBoundingClientRect();
                const containerRect =
                  editorContainerRef.current.getBoundingClientRect();
                const top = editorRect.bottom - containerRect.top + 8;
                setWritingIndicator({ visible: true, top, currentH1: h1Text });
              }
            }
          } catch (e) {
            // If we can't find the position, try fallback
            try {
              const editorElement = editorInstance.view.dom;
              if (editorElement && editorContainerRef.current) {
                const editorRect = editorElement.getBoundingClientRect();
                const containerRect =
                  editorContainerRef.current.getBoundingClientRect();
                const top = editorRect.bottom - containerRect.top + 8;
                setWritingIndicator({ visible: true, top, currentH1: h1Text });
              }
            } catch (e2) {
              // If all else fails, hide the indicator
              setWritingIndicator({ visible: false, top: 0, currentH1: null });
            }
          }
        };

        // Helper function to extract h1 text from HTML block
        const extractH1Text = (html: string): string | null => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          const h1 = tempDiv.querySelector("h1");
          if (h1) {
            return h1.textContent?.trim() || null;
          }
          return null;
        };

        // Track current h1 heading
        let currentH1: string | null = null;

        // Show writing indicator initially
        setWritingIndicator({ visible: true, top: 0, currentH1: null });

        // Insert blocks one at a time with animation
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];

          // Check if this block is an h1 heading
          const h1Text = extractH1Text(block);
          if (h1Text) {
            currentH1 = h1Text;
          }

          // Insert the block content at the end
          const docSize = editorInstance.state.doc.content.size;
          editorInstance.commands.insertContentAt(docSize - 1, block);

          // Wait for ProseMirror to process the insertion
          await new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(undefined);
              });
            });
          });

          // Find the last block node in the document (should be the one we just inserted)
          const { doc } = editorInstance.state;
          let lastBlockFrom = 0;
          let lastBlockTo = 0;

          // Find the last block node
          doc.descendants((node, pos) => {
            if (node.isBlock) {
              lastBlockFrom = pos;
              lastBlockTo = pos + node.nodeSize;
            }
            return true;
          });

          // Update writing indicator position below the last block (with current h1)
          updateWritingIndicator(currentH1);

          // Apply fade-in + translateY animation decoration to the last block
          if (lastBlockFrom < lastBlockTo) {
            (editorInstance as any).commands.setReplaceDecorations([
              {
                from: lastBlockFrom,
                to: lastBlockTo,
                className: "pm-rewrite-fade-in",
                type: "node",
              },
            ]);

            // Remove decoration after animation completes (150ms)
            setTimeout(() => {
              (editorInstance as any).commands.clearReplaceDecorations();
            }, 150);
          }

          // Wait 150ms before adding next block (unless it's the last one)
          if (i < blocks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        }

        // Hide writing indicator when done
        setWritingIndicator({ visible: false, top: 0, currentH1: null });

        // Manually extract headings after content replacement
        // Use setTimeout to ensure the editor has processed all content
        setTimeout(() => {
          extractHeadings();
        }, 0);

        return { success: true };
      } catch (error) {
        console.error("Error in rewriteNotes:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      } finally {
        isProgrammaticUpdateRef.current = false;

        // Reset animation state if not skipping
        if (!skipAnimation) {
          setIsAnimating(false);
          onAnimationStateChange?.(false);
          animationAbortRef.current = null;
        }
      }
    },
    [editorInstance, extractHeadings, onAnimationStateChange],
  );

  // Helper function to insert a single block with animation (extracted from rewriteNotes)
  const insertBlockWithAnimation = useCallback(
    async (
      block: string,
      currentH1: React.MutableRefObject<string | null>,
    ): Promise<void> => {
      if (!editorInstance) return;

      // Helper function to update writing indicator position
      const updateWritingIndicator = (h1Text: string | null = null) => {
        if (!editorInstance || !editorContainerRef.current) return;

        const { doc } = editorInstance.state;
        let lastBlockPos = 0;

        // Find the last block node
        doc.descendants((node, pos) => {
          if (node.isBlock) {
            lastBlockPos = pos;
          }
          return true;
        });

        // Get DOM position of the last block
        try {
          const $pos = doc.resolve(lastBlockPos);
          const dom = editorInstance.view.nodeDOM($pos.pos);

          if (dom && dom instanceof HTMLElement && editorContainerRef.current) {
            const blockRect = dom.getBoundingClientRect();
            const containerRect =
              editorContainerRef.current.getBoundingClientRect();
            const top = blockRect.bottom - containerRect.top + 8;
            setWritingIndicator({ visible: true, top, currentH1: h1Text });
          } else {
            const editorElement = editorInstance.view.dom;
            if (editorElement && editorContainerRef.current) {
              const editorRect = editorElement.getBoundingClientRect();
              const containerRect =
                editorContainerRef.current.getBoundingClientRect();
              const top = editorRect.bottom - containerRect.top + 8;
              setWritingIndicator({ visible: true, top, currentH1: h1Text });
            }
          }
        } catch (e) {
          try {
            const editorElement = editorInstance.view.dom;
            if (editorElement && editorContainerRef.current) {
              const editorRect = editorElement.getBoundingClientRect();
              const containerRect =
                editorContainerRef.current.getBoundingClientRect();
              const top = editorRect.bottom - containerRect.top + 8;
              setWritingIndicator({ visible: true, top, currentH1: h1Text });
            }
          } catch (e2) {
            setWritingIndicator({ visible: false, top: 0, currentH1: null });
          }
        }
      };

      // Helper function to extract h1 text from HTML block
      const extractH1Text = (html: string): string | null => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const h1 = tempDiv.querySelector("h1");
        if (h1) {
          return h1.textContent?.trim() || null;
        }
        return null;
      };

      // Check if this block is an h1 heading
      const h1Text = extractH1Text(block);
      if (h1Text) {
        currentH1.current = h1Text;
      }

      // Mark as programmatic update (AI-generated) to preserve author="ai" attributes
      // and prevent transaction handler from marking as user-authored
      isProgrammaticUpdateRef.current = true;

      try {
        // Insert the block content at the end
        const docSize = editorInstance.state.doc.content.size;
        editorInstance.commands.insertContentAt(docSize - 1, block);

        // Wait for ProseMirror to process the insertion
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(undefined);
            });
          });
        });
      } finally {
        // Reset flag after transaction completes
        isProgrammaticUpdateRef.current = false;
      }

      // Find the last block node in the document
      const { doc } = editorInstance.state;
      let lastBlockFrom = 0;
      let lastBlockTo = 0;

      doc.descendants((node, pos) => {
        if (node.isBlock) {
          lastBlockFrom = pos;
          lastBlockTo = pos + node.nodeSize;
        }
        return true;
      });

      // Update writing indicator position
      updateWritingIndicator(currentH1.current);

      // Apply fade-in + translateY animation decoration
      if (lastBlockFrom < lastBlockTo) {
        (editorInstance as any).commands.setReplaceDecorations([
          {
            from: lastBlockFrom,
            to: lastBlockTo,
            className: "pm-rewrite-fade-in",
            type: "node",
          },
        ]);

        setTimeout(() => {
          (editorInstance as any).commands.clearReplaceDecorations();
        }, 150);
      }

      // Wait 150ms before next block (twice as fast)
      await new Promise((resolve) => setTimeout(resolve, 150));
    },
    [editorInstance],
  );

  // Process the rewrite stream queue
  const processRewriteStreamQueue = useCallback(async () => {
    if (!editorInstance || isProcessingQueueRef.current) return;

    isProcessingQueueRef.current = true;
    const currentH1Ref = { current: null as string | null };

    try {
      while (
        rewriteStreamQueueRef.current.length > 0 ||
        isStreamActiveRef.current
      ) {
        // Process queue items
        if (rewriteStreamQueueRef.current.length > 0) {
          const block = rewriteStreamQueueRef.current.shift()!;

          await insertBlockWithAnimation(block, currentH1Ref);
        } else if (isStreamActiveRef.current) {
          // Stream is still active but no items yet, wait a bit for more chunks
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          // Stream ended and queue is empty
          break;
        }
      }

      // Hide writing indicator and re-enable editing when done (only if stream is not active)
      if (!isStreamActiveRef.current) {
        setWritingIndicator({ visible: false, top: 0, currentH1: null });

        // Re-enable editing when streaming is complete
        if (editorInstance) {
          editorInstance.setEditable(true);
        }

        // Extract headings after content is complete
        setTimeout(() => {
          extractHeadings();
        }, 0);
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [editorInstance, insertBlockWithAnimation, extractHeadings]);

  // Start streaming rewrite notes (clear editor and initialize)
  const startRewriteStream = useCallback(() => {
    if (!editorInstance) return;

    isStreamActiveRef.current = true;
    rewriteStreamBufferRef.current = "";
    rewriteStreamQueueRef.current = [];
    isProcessingQueueRef.current = false;

    // Disable editing while streaming
    editorInstance.setEditable(false);

    // Clear editor first (mark as programmatic to preserve any existing author attributes)
    isProgrammaticUpdateRef.current = true;
    editorInstance.commands.clearContent();
    // Wait for clear to complete before resetting flag
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isProgrammaticUpdateRef.current = false;
      });
    });

    // Show writing indicator
    setWritingIndicator({ visible: true, top: 0, currentH1: null });
    setIsNotesLoading(false);
  }, [editorInstance]);

  // Add chunk to rewrite stream buffer
  const addRewriteStreamChunk = useCallback(
    (chunk: string) => {
      if (!editorInstance) return;

      if (!isStreamActiveRef.current) {
        startRewriteStream();
      }

      // Backend emits complete HTML blocks (based on close tags)
      // Trim whitespace and add directly to queue as a complete block
      const trimmedChunk = chunk.trim();
      if (trimmedChunk.length > 0) {
        rewriteStreamQueueRef.current.push(trimmedChunk);

        // Trigger processing if not already processing
        if (!isProcessingQueueRef.current) {
          processRewriteStreamQueue();
        }
      }
    },
    [editorInstance, startRewriteStream, processRewriteStreamQueue],
  );

  // End streaming rewrite notes
  const endRewriteStream = useCallback(() => {
    isStreamActiveRef.current = false;

    // Process any remaining buffer content (shouldn't happen with HTML block-based chunks, but keep for safety)
    if (rewriteStreamBufferRef.current.trim()) {
      const remaining = rewriteStreamBufferRef.current.trim();
      rewriteStreamBufferRef.current = "";
      if (remaining) {
        rewriteStreamQueueRef.current.push(remaining);
      }
    }

    // Process final queue items
    if (!isProcessingQueueRef.current) {
      processRewriteStreamQueue();
    } else {
      // If processing is already running, it will re-enable editing when done
      // Otherwise, re-enable editing now since stream ended and queue is empty
      if (rewriteStreamQueueRef.current.length === 0 && editorInstance) {
        editorInstance.setEditable(true);
      }
    }
  }, [processRewriteStreamQueue, editorInstance]);

  // Set up streaming refs for usePdfNotesJob hook
  useEffect(() => {
    addRewriteStreamChunkRef.current = addRewriteStreamChunk;
    endRewriteStreamRef.current = endRewriteStream;
    return () => {
      addRewriteStreamChunkRef.current = null;
      endRewriteStreamRef.current = null;
    };
  }, [addRewriteStreamChunk, endRewriteStream]);

  // Expose edit function via ref callback - only when editor is ready
  useEffect(() => {
    if (setEditNotesRef && editorInstance) {
      setEditNotesRef(editNotesMultiple);
    } else if (setEditNotesRef && !editorInstance) {
      setEditNotesRef(null);
    }
    return () => {
      if (setEditNotesRef) {
        setEditNotesRef(null);
      }
    };
  }, [setEditNotesRef, editNotesMultiple, editorInstance]);

  // Expose rewrite function via ref callback - only when editor is ready
  // Also set internal ref for capability handler to use
  useEffect(() => {
    if (editorInstance) {
      rewriteNotesRef.current = rewriteNotes;
      if (setRewriteNotesRef) {
        setRewriteNotesRef(rewriteNotes);
      }
    } else {
      rewriteNotesRef.current = null;
      if (setRewriteNotesRef) {
        setRewriteNotesRef(null);
      }
    }
    return () => {
      rewriteNotesRef.current = null;
      if (setRewriteNotesRef) {
        setRewriteNotesRef(null);
      }
    };
  }, [setRewriteNotesRef, rewriteNotes, editorInstance]);

  // Set editNotes ref for capability handler
  useEffect(() => {
    if (editorInstance) {
      editNotesRef.current = editNotes;
    } else {
      editNotesRef.current = null;
    }
    return () => {
      editNotesRef.current = null;
    };
  }, [editNotes, editorInstance]);

  // Expose rewrite stream functions via ref callback - only when editor is ready
  useEffect(() => {
    if (setRewriteStreamRef && editorInstance) {
      setRewriteStreamRef({
        addChunk: addRewriteStreamChunk,
        end: endRewriteStream,
      });
    } else if (setRewriteStreamRef && !editorInstance) {
      setRewriteStreamRef(null);
    }
    return () => {
      if (setRewriteStreamRef) {
        setRewriteStreamRef(null);
      }
    };
  }, [
    setRewriteStreamRef,
    addRewriteStreamChunk,
    endRewriteStream,
    editorInstance,
  ]);

  // Expose cancel animation function via ref callback
  useEffect(() => {
    if (setCancelAnimationRef) {
      setCancelAnimationRef(cancelAnimation);
    }
    return () => {
      if (setCancelAnimationRef) {
        setCancelAnimationRef(null);
      }
    };
  }, [setCancelAnimationRef, cancelAnimation]);

  // Disable editing when notes are loading or being streamed
  useEffect(() => {
    if (!editorInstance) return;

    const shouldBeEditable = !isNotesLoading && !isStreamActiveRef.current;
    editorInstance.setEditable(shouldBeEditable);
  }, [editorInstance, isNotesLoading]);

  // Track if we've done initial content load
  const hasInitializedContentRef = useRef(false);

  // Initialize editor with persisted notes (once when editor is ready and loading has completed)
  // Notes are stored canonically as markdown (Medly markdown + citations).
  useEffect(() => {
    // Wait until the page has finished loading so we don't mark initialized
    // before remote content arrives.
    if (!editorInstance) return;
    if (isLoadingPage) return;
    if (hasInitializedContentRef.current) return;

    const html = pageNotes
      ? contentToHtml(editorInstance, pageNotes, true)
      : "";

    if (!html) {
      // Ensure the editor starts from a known empty state for brand-new docs.
      isProgrammaticUpdateRef.current = true;
      editorInstance.commands.clearContent();
      isProgrammaticUpdateRef.current = false;
    } else {
      isProgrammaticUpdateRef.current = true;
      editorInstance.commands.setContent(html);
      isProgrammaticUpdateRef.current = false;
    }

    hasInitializedContentRef.current = true;
  }, [editorInstance, pageNotes, isLoadingPage]);

  // Sync editor content changes to parent (save as markdown - canonical raw format)
  // Don't save while loading, streaming, or before initial content is loaded to avoid overwriting
  useEffect(() => {
    if (!editorInstance || !updatePageNotes) return;

    const handleUpdate = () => {
      // Don't save while loading, streaming, processing queue, or before initial content is set
      if (
        isLoadingPage ||
        !hasInitializedContentRef.current ||
        isStreamActiveRef.current ||
        isProcessingQueueRef.current ||
        isProgrammaticUpdateRef.current
      ) {
        return;
      }

      // Persist the "storage" markdown (preserve formatting as much as possible).
      const md = getStorageMarkdown(editorInstance);
      updatePageNotes(md);
    };

    editorInstance.on("update", handleUpdate);
    return () => {
      editorInstance.off("update", handleUpdate);
    };
  }, [editorInstance, updatePageNotes, isLoadingPage]);

  // Sync page title to parent when it changes (only when user edits, not when prop changes)
  const prevPageTitleRef = useRef(pageTitle);
  useEffect(() => {
    // Skip if this is just syncing from external prop change
    if (prevPageTitleRef.current === pageTitle) {
      return;
    }
    prevPageTitleRef.current = pageTitle;

    console.log("📝 NotesPage pageTitle changed:", pageTitle);
    console.log("📝 updateDocumentName available:", !!updateDocumentName);

    // Update document name for both sidebar and header display
    if (updateDocumentName) {
      console.log("📝 About to call updateDocumentName with:", pageTitle);
      updateDocumentName(pageTitle);
      console.log("✅ Called updateDocumentName");
    }
  }, [pageTitle, updateDocumentName]);

  // Sync external documentName changes to local state
  useEffect(() => {
    if (documentName !== undefined && documentName !== pageTitle) {
      setPageTitle(documentName);
      prevPageTitleRef.current = documentName;
    }
  }, [documentName]);

  // Track selection changes and update chat context
  useEffect(() => {
    if (!editorInstance) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editorInstance.state.selection;
      const selectedText = editorInstance.state.doc.textBetween(from, to, " ");

      if (selectedText && selectedText.trim().length > 0) {
        updateChatSelectedText(selectedText.trim());
      } else {
        updateChatSelectedText(null);
      }
    };

    editorInstance.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editorInstance.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editorInstance, updateChatSelectedText]);

  // Extract H1 headings from editor on mount and updates
  useEffect(() => {
    if (!editorInstance) return;

    // Initial extraction
    extractHeadings();

    // Update headings when editor content changes
    const handleUpdate = () => {
      extractHeadings();
    };

    editorInstance.on("update", handleUpdate);
    return () => {
      editorInstance.off("update", handleUpdate);
    };
  }, [editorInstance, extractHeadings]);

  // NOTE: author tracking removed (we now keep notes canonical as markdown, and don't persist author attrs)

  // Track current visible heading based on scroll position
  useEffect(() => {
    if (!editorInstance || headings.length === 0) {
      setCurrentHeadingIndex(null);
      return;
    }

    const updateCurrentHeading = () => {
      const editorElement = editorInstance.view.dom;
      if (!editorElement) return;

      // Find the scrollable container (could be window or a parent element)
      let scrollContainer: Element | Window = window;
      let scrollTop = window.scrollY;
      let viewportHeight = window.innerHeight;

      // Try to find a scrollable parent container
      let parent = editorElement.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (
          style.overflowY === "auto" ||
          style.overflowY === "scroll" ||
          parent.scrollHeight > parent.clientHeight
        ) {
          scrollContainer = parent;
          scrollTop = parent.scrollTop;
          viewportHeight = parent.clientHeight;
          break;
        }
        parent = parent.parentElement;
      }

      const viewportCenter = scrollTop + viewportHeight / 2;

      // Find which heading is closest to the viewport center
      let closestIndex: number | null = null;
      let closestDistance = Infinity;

      headings.forEach((heading, index) => {
        try {
          const $pos = editorInstance.state.doc.resolve(heading.position);
          const dom = editorInstance.view.nodeDOM($pos.pos);

          if (dom && dom instanceof HTMLElement) {
            const rect = dom.getBoundingClientRect();
            let elementTop: number;

            if (scrollContainer === window) {
              elementTop = rect.top + window.scrollY;
            } else {
              const containerRect = (
                scrollContainer as Element
              ).getBoundingClientRect();
              elementTop =
                rect.top -
                containerRect.top +
                (scrollContainer as Element).scrollTop;
            }

            const distance = Math.abs(elementTop - viewportCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          }
        } catch (e) {
          // Position might be invalid, skip
        }
      });

      setCurrentHeadingIndex(closestIndex);
    };

    const editorElement = editorInstance.view.dom;
    let scrollContainer: Element | null = null;

    // Find scrollable container
    let parent = editorElement?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        parent.scrollHeight > parent.clientHeight
      ) {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateCurrentHeading);
    }
    window.addEventListener("scroll", updateCurrentHeading);

    // Initial update with a small delay to ensure DOM is ready
    setTimeout(updateCurrentHeading, 100);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updateCurrentHeading);
      }
      window.removeEventListener("scroll", updateCurrentHeading);
    };
  }, [editorInstance, headings]);

  // Auto-scroll to current heading in menu when menu becomes visible
  useEffect(() => {
    if (
      !isMenuHovered ||
      currentHeadingIndex === null ||
      !menuContainerRef.current
    )
      return;

    // Small delay to ensure the menu is fully rendered
    const timeoutId = setTimeout(() => {
      const menuContainer = menuContainerRef.current;
      if (!menuContainer) return;

      // Find the button for the current heading
      const buttons = menuContainer.querySelectorAll("button");
      const currentButton = buttons[currentHeadingIndex];

      if (currentButton) {
        currentButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isMenuHovered, currentHeadingIndex]);

  // Scroll to heading when clicked and mark it selected immediately
  const scrollToHeading = useCallback(
    (heading: HeadingInfo, index?: number) => {
      if (!editorInstance) return;

      try {
        // Place the selection just inside the heading node so scrolling is reliable
        const posInsideNode = Math.max(1, heading.position + 1);
        editorInstance.commands.setTextSelection({
          from: posInsideNode,
          to: posInsideNode,
        });
        editorInstance.commands.focus();
        editorInstance.commands.scrollIntoView();
      } catch {
        // Fallback: set selection at the stored position
        const $pos = editorInstance.state.doc.resolve(heading.position);
        editorInstance.commands.setTextSelection($pos.pos);
        editorInstance.commands.scrollIntoView();
      }

      // Immediately reflect the selection in the indicator/menu UI
      const idx =
        typeof index === "number"
          ? index
          : headings.findIndex((h) => h.id === heading.id);
      if (idx >= 0) setCurrentHeadingIndex(idx);

      // Highlight the line for the selected heading, then fade it out over 3s
      try {
        const doc = editorInstance.state.doc;
        const $pos = doc.resolve(Math.max(1, heading.position + 1));
        let blockFrom = 0;
        let blockTo = doc.content.size;
        for (let depth = $pos.depth; depth >= 0; depth--) {
          const nodeAtDepth = $pos.node(depth);
          if (nodeAtDepth.isBlock) {
            blockFrom = $pos.before(depth);
            blockTo = $pos.after(depth);
            break;
          }
        }

        // Step A: apply solid highlight
        (editorInstance as any).commands.setReplaceDecorations([
          {
            from: blockFrom,
            to: blockTo,
            className: "pm-menu-line-highlight",
            type: "node",
          },
        ]);

        // Step B: after a tick, switch to slow fade-out (3s)
        setTimeout(() => {
          (editorInstance as any).commands.setReplaceDecorations([
            {
              from: blockFrom,
              to: blockTo,
              className: "pm-menu-line-highlight-fade-out",
              type: "node",
            },
          ]);
          // Step C: cleanup after fade completes
          setTimeout(() => {
            (editorInstance as any).commands.clearReplaceDecorations();
          }, 3100);
        }, 50);
      } catch {
        // No-op if decoration fails; scrolling & selection still work
      }
    },
    [editorInstance, headings],
  );

  // Hover block highlight: show a full-width highlight for the entire wrapped block (e.g., li, p)
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    let rafId: number | null = null;
    const overlay = () => hoverLineOverlayRef.current;
    const prose = () =>
      container.querySelector(".ProseMirror") as HTMLElement | null;

    const onMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const overlayEl = overlay();
        const proseEl = prose();
        if (!overlayEl || !proseEl) return;

        // Only react to moves inside the editor content
        const target = e.target as HTMLElement | null;
        if (!target || !proseEl.contains(target)) {
          overlayEl.style.opacity = "0";
          return;
        }

        // Find the nearest block element that represents the hovered text block
        const blockEl = target.closest("p, h1, li, blockquote, pre");
        if (!blockEl || !proseEl.contains(blockEl)) {
          overlayEl.style.opacity = "0";
          return;
        }

        // Use the full block rect for vertical sizing so wrapped lines are fully highlighted
        const blockRect = (blockEl as HTMLElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const verticalPadding = 4; // Padding above and below the highlight
        const top = blockRect.top - containerRect.top - verticalPadding;
        const height = blockRect.height + verticalPadding * 2;

        // Compute left inset based on actual text/content start (accounts for bullets/indents)
        let leftMeasureEl: HTMLElement = blockEl as HTMLElement;
        if (
          leftMeasureEl.tagName === "LI" &&
          leftMeasureEl.firstElementChild instanceof HTMLElement
        ) {
          // In lists, Tiptap often wraps content in <li><p>...</p></li>
          leftMeasureEl = leftMeasureEl.firstElementChild;
        }
        const leftRect = leftMeasureEl.getBoundingClientRect();
        const left = Math.max(0, leftRect.left - containerRect.left - 24);

        overlayEl.style.top = `${top}px`;
        overlayEl.style.height = `${height}px`;
        overlayEl.style.left = `${left}px`;
        overlayEl.style.right = `0px`; // keep right edge fixed to container
        overlayEl.style.opacity = "0"; // disabled
      });
    };

    const onMouseLeave = () => {
      const overlayEl = overlay();
      if (overlayEl) {
        overlayEl.style.opacity = "0";
      }
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Citation hover modal handlers
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    let activeCitation: HTMLElement | null = null;
    let hideTimeout: NodeJS.Timeout | null = null;
    let isHoveringModal = false;

    const clearHideTimeout = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimeout();
      hideTimeout = setTimeout(() => {
        if (!isHoveringModal && activeCitation) {
          activeCitation = null;
          lastHoveredCitationKeyRef.current = null;
          setCitationModalAnimated(false);
          setShowCitationPreview(false);
          setIsCitationPreviewReady(false);
          clearCitationShowTimeout();
          setCitationModal(null);
          hideTimeout = null;
        }
      }, 200);
    };

    const handleCitationMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const citation = target.closest(".citation") as HTMLElement | null;
      if (!citation) return;

      clearHideTimeout();
      activeCitation = citation;

      const documentId = citation.getAttribute("data-document-id") || "";
      const pageIndex = citation.getAttribute("data-page-index");
      const sourceSegment = citation.getAttribute("data-source-segment");
      if (!pageIndex || !sourceSegment) {
        return;
      }

      const hoverKey = `${documentId}|${pageIndex}|${sourceSegment}`;
      // If we're already showing this exact citation, ignore bubbling mouseover events.
      if (lastHoveredCitationKeyRef.current === hoverKey) {
        activeCitation = citation;
        return;
      }
      lastHoveredCitationKeyRef.current = hoverKey;

      const rect = citation.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setCitationModalAnimated(false);
      setIsCitationPreviewReady(false);
      clearCitationShowTimeout();
      // Start loading immediately, but keep the hover UI hidden until the preview is ready.
      setShowCitationPreview(true);
      setCitationModal({
        visible: true,
        documentId,
        pageIndex,
        sourceSegment,
        x: rect.right - containerRect.left + 8,
        y: rect.top - containerRect.top,
      });
    };

    const handleCitationMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const citation = target.closest(".citation") as HTMLElement | null;
      if (!citation) return;

      const related = (e.relatedTarget as HTMLElement | null) ?? null;
      const relatedIsModal = related?.closest("[data-citation-modal]") !== null;
      const relatedIsCitation = related && citation.contains(related);

      // Don't hide if moving to modal or to another part of citation
      if (relatedIsModal) {
        isHoveringModal = true;
        return;
      }

      if (relatedIsCitation) {
        return;
      }

      // Schedule hide with delay to allow moving to modal
      if (activeCitation === citation) {
        scheduleHide();
      }
    };

    const handleModalMouseOver = (e: MouseEvent) => {
      clearHideTimeout();
      isHoveringModal = true;
    };

    const handleModalMouseOut = (e: MouseEvent) => {
      const related = (e.relatedTarget as HTMLElement | null) ?? null;
      const relatedIsCitation = related?.closest(".citation") !== null;
      const relatedIsModal = related?.closest("[data-citation-modal]") !== null;

      if (relatedIsCitation || relatedIsModal) {
        return;
      }

      isHoveringModal = false;
      scheduleHide();
    };

    const handleCitationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const citation = target.closest(".citation") as HTMLElement | null;
      if (!citation) return;
      const documentId = citation.getAttribute("data-document-id") || "";
      const pageIndexAttr = citation.getAttribute("data-page-index") || "";
      const sourceSegment = citation.getAttribute("data-source-segment") || "";
      // Handle comma/space separated, default to first number
      const first = pageIndexAttr.split(/[,\s]+/).find(Boolean);
      const pageIndex0 = first ? parseInt(first, 10) : NaN;
      if (Number.isNaN(pageIndex0) || pageIndex0 < 0) return;
      void navigateToCitation(documentId, pageIndex0, sourceSegment || "");
    };

    container.addEventListener("mouseover", handleCitationMouseOver);
    container.addEventListener("mouseout", handleCitationMouseOut);
    container.addEventListener("click", handleCitationClick);

    // Add modal event listeners when modal is rendered
    const handleDocumentMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-citation-modal]")) {
        handleModalMouseOver(e);
      }
    };

    const handleDocumentMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-citation-modal]")) {
        handleModalMouseOut(e);
      }
    };

    document.addEventListener("mouseover", handleDocumentMouseOver);
    document.addEventListener("mouseout", handleDocumentMouseOut);

    return () => {
      container.removeEventListener("mouseover", handleCitationMouseOver);
      container.removeEventListener("mouseout", handleCitationMouseOut);
      container.removeEventListener("click", handleCitationClick);
      document.removeEventListener("mouseover", handleDocumentMouseOver);
      document.removeEventListener("mouseout", handleDocumentMouseOut);
      clearHideTimeout();
    };
  }, [editorInstance, openDocumentAtPage]);

  // Debug handler for manual text replacement
  const handleDebugReplace = async () => {
    const result = await editNotes(debugTextToReplace, debugNewText);
    if (result.success) {
      setDebugResult("✅ Success: Text replaced");
    } else {
      setDebugResult(`❌ Error: ${result.error}`);
    }
    // Clear result after 3 seconds
    setTimeout(() => setDebugResult(""), 3000);
  };

  // Debug handler for rewrite notes
  const handleDebugRewrite = async () => {
    const result = await rewriteNotes(debugRewriteContent);
    if (result.success) {
      setDebugRewriteResult("✅ Success: All content rewritten");
    } else {
      setDebugRewriteResult(`❌ Error: ${result.error}`);
    }
    // Clear result after 3 seconds
    setTimeout(() => setDebugRewriteResult(""), 3000);
  };

  // Handler for Create/Regenerate Notes button
  const handleCreateNotesClick = async () => {
    console.log("[NotesPage] Create Notes button clicked");
    console.log(
      "[NotesPage] sourceDocumentStoragePath:",
      sourceDocumentStoragePath,
    );

    if (!sourceDocumentStoragePath) {
      console.error(
        "[NotesPage] Cannot create notes: no source document storage path",
      );
      return;
    }

    // Don't allow starting a new job if one is already running
    if (pdfNotesJob.isRunning) {
      console.warn("[NotesPage] Job already in progress");
      return;
    }

    // Clear existing content before regenerating
    if (editorInstance && !editorInstance.isEmpty) {
      isProgrammaticUpdateRef.current = true;
      editorInstance.commands.clearContent();
      isProgrammaticUpdateRef.current = false;
    }

    setIsNotesLoading(true);
    setJobStageLabel("Starting...");

    // Start the PDF notes job with the source document storage path
    // Use the same output path as manually created notes: users/{userId}/notes/
    // The API will create files named: {timestamp}_{documentId}.md
    pdfNotesJob.mutate(sourceDocumentStoragePath, {
      imageMode: "prescan",
      outputPath: "notes",
      documentId: documentId,
      // TODO: Re-enable when backend metadata update is deployed
      // noteDocumentPath: noteDocumentPath,
    });
  };

  // Auto-start notes generation when triggered from Header Summary button
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    // Only trigger once per autoStartGeneration change to true
    if (!autoStartGeneration) {
      hasAutoStartedRef.current = false;
      return;
    }
    if (hasAutoStartedRef.current) return;

    // Check if conditions are met for auto-generation
    const notesExist = pageNotes && pageNotes.trim().length > 0;
    if (
      sourceDocumentStoragePath &&
      !pdfNotesJob.isRunning &&
      !notesExist
    ) {
      hasAutoStartedRef.current = true;
      handleCreateNotesClick();
      onGenerationStarted?.();
    }
  }, [autoStartGeneration, sourceDocumentStoragePath, pdfNotesJob.isRunning, pageNotes, onGenerationStarted]);

  // Check if editor has content (for banner text)
  const hasExistingNotes = editorInstance && !editorInstance.isEmpty;

  // Show loading spinner while fetching initial content
  if (isLoadingPage) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <Spinner size="normal" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-start p-8 relative">
      {/* Heading Indicators - hidden on mobile */}
      {headings.length > 0 && (
        <div className="fixed left-10 top-1/3 -translate-y-1/2 hidden md:flex flex-col gap-1 items-center z-10 group py-1 px-2">
          {/* Indicator Lines */}
          <div className="flex flex-col gap-1 items-center py-2">
            {headings.map((heading, index) => (
              <div
                key={heading.id}
                className={`h-[2px] w-4 my-1 transition-all rounded-[2px] ${
                  index === currentHeadingIndex ? "bg-black" : "bg-[#595959]/30"
                }`}
                style={{
                  height: index === currentHeadingIndex ? "2px" : "2px",
                }}
              />
            ))}
          </div>

          {/* Invisible bridge to maintain hover between indicator and menu */}
          <div className="absolute left-full top-0 bottom-0 w-6 pointer-events-none group-hover:pointer-events-auto" />

          {/* Hover Menu */}
          <div
            ref={menuContainerRef}
            className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-[280px] bg-white/95 backdrop-blur-[16px] sm:rounded-[16px] shadow-[0_0_16px_rgba(0,0,0,0.16)] flex flex-col border-0 sm:border border-white p-2 gap-1 transition-all duration-150 ease-out max-h-[400px] overflow-y-auto opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
            style={{
              transformOrigin: "top left",
            }}
          >
            {headings.map((heading, index) => {
              const isCurrent = index === currentHeadingIndex;
              const indentClass =
                heading.level === 2
                  ? "pl-4"
                  : heading.level === 3
                    ? "pl-8"
                    : "";
              return (
                <button
                  key={heading.id}
                  onClick={() => scrollToHeading(heading, index)}
                  className={`text-left text-[13px] px-3 py-1 rounded-[6px] ${indentClass} ${
                    isCurrent
                      ? "font-rounded-bold text-black"
                      : "font-rounded-semibold text-[#595959]"
                  } hover:bg-[#f2f2f7]`}
                >
                  {heading.text || "Untitled"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full md:max-w-[680px]">
        {/* Debug Panel for Text Replacement & Rewrite */}
        <div className="hidden mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          {/* Edit Notes Section */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">
              Debug: Edit Notes (Replace Text)
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Text to Replace (Markdown):
                </label>
                <input
                  type="text"
                  value={debugTextToReplace}
                  onChange={(e) => setDebugTextToReplace(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleDebugReplace()}
                  placeholder="e.g., ## Introduction"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  New Text (Markdown):
                </label>
                <input
                  type="text"
                  value={debugNewText}
                  onChange={(e) => setDebugNewText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleDebugReplace()}
                  placeholder="e.g., <h1>New Title</h1>"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleDebugReplace}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Replace
              </button>
              {debugResult && (
                <p
                  className={`text-sm mt-2 ${debugResult.includes("✅") ? "text-green-600" : "text-red-600"}`}
                >
                  {debugResult}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-300"></div>

          {/* Rewrite Notes Section */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">
              Debug: Rewrite Notes (Replace All)
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  New Content (Markdown):
                </label>
                <textarea
                  value={debugRewriteContent}
                  onChange={(e) => setDebugRewriteContent(e.target.value)}
                  placeholder="e.g., # New Title\n\nNew paragraph with **bold**"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
                />
              </div>
              <button
                onClick={handleDebugRewrite}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Rewrite All
              </button>
              {debugRewriteResult && (
                <p
                  className={`text-sm mt-2 ${debugRewriteResult.includes("✅") ? "text-green-600" : "text-red-600"}`}
                >
                  {debugRewriteResult}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-300"></div>

          {/* Show Current Markdown (for verifying getMarkdown output) */}
          <div>
            <p className="text-sm font-semibold mb-2 text-gray-700">
              Debug: Current Markdown (AI sees this)
            </p>
            <button
              onClick={() => {
                const md = editorInstance ? getMarkdown(editorInstance) : "";
                console.log("Current markdown:", md);
                alert(md || "(empty)");
              }}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Show Markdown in Alert + Console
            </button>
          </div>
        </div>

        {/* Editable Page Title */}
        <div className="relative w-full mt-10 mb-2 md:mb-4 mb-0 grid">
          <div
            className="text-3xl font-rounded-bold md:px-12 invisible whitespace-pre-wrap col-start-1 row-start-1 pointer-events-none break-words"
            aria-hidden="true"
            style={{ minHeight: "48px" }}
          >
            {pageTitle && pageTitle !== "New Document" ? pageTitle + " " : "Untitled"}
          </div>
          {/* Ghost placeholder - shown when title is empty */}
          {(!pageTitle || pageTitle === "New Document") && (
            <div
              className="text-3xl font-rounded-bold md:px-12 text-black/50 col-start-1 row-start-1 pointer-events-none select-none"
              style={{ minHeight: "48px" }}
              aria-hidden="true"
            >
              Untitled
            </div>
          )}
          <textarea
            ref={titleTextareaRef}
            value={pageTitle === "New Document" ? "" : pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const textarea = e.currentTarget;
                const cursorPos = textarea.selectionStart;
                const currentValue =
                  pageTitle === "New Document" ? "" : pageTitle;
                const textBeforeCursor = currentValue.slice(0, cursorPos);
                const textAfterCursor = currentValue.slice(cursorPos);

                if (textAfterCursor) {
                  // Split: keep text before cursor as title, move rest to body
                  setPageTitle(textBeforeCursor);

                  // Prepend textAfterCursor to body as new paragraph
                  if (editorInstance) {
                    const currentContent = editorInstance.getHTML();
                    const newParagraph = `<p>${textAfterCursor}</p>`;
                    editorInstance.commands.setContent(
                      newParagraph + currentContent,
                    );
                    // Focus at start of body
                    editorInstance.commands.focus("start");
                  }
                } else {
                  // Cursor at end: just move focus to body start
                  if (editorInstance) {
                    editorInstance.commands.focus("start");
                  }
                }
              }
            }}
            className="w-full text-3xl font-rounded-bold md:px-12 focus:outline-none bg-transparent resize-none overflow-hidden col-start-1 row-start-1 h-full"
            style={{ caretColor: "#000", minHeight: "48px" }}
            rows={1}
          />
        </div>

        {sourceDocumentStoragePath &&
          !pdfNotesJob.isRunning &&
          !isNotesLoading && !hasExistingNotes && (
            <div className="w-full bg-[white]/50 rounded-[10px] mx-10 mb-5 flex flex-row items-center justify-between px-4 py-2">
              <div className="font-rounded-semibold text-[14px] text-[#06B0FF] flex-1">
                {hasExistingNotes
                  ? "Regenerate notes from your slides, annotations and transcript?"
                  : "Write notes based on your slides, annotations and transcript?"}
              </div>
              <button
                onClick={handleCreateNotesClick}
                disabled={pdfNotesJob.isRunning}
                className="bg-[#06B0FF] text-white px-4 py-2 rounded-[10px] font-rounded-semibold text-[14px] disabled:opacity-50"
              >
                {hasExistingNotes ? "Regenerate notes" : "Create notes"}
              </button>
            </div>
          )}

        <EditorRoot>
          <div
            ref={editorContainerRef}
            className="relative min-h-[500px] w-full md:px-12"
            style={{ paddingBottom: 160 + toolbarHeight }}
          >
            {/* Citation Modal */}
            {citationModal && citationModal.visible && (
              <div
                data-citation-modal
                className={`absolute z-50 w-[320px] h-[240px] bg-white/95 backdrop-blur-[16px] rounded-[16px] shadow-[0_0_16px_rgba(0,0,0,0.16)] border border-[#f2f2f7] transition-all duration-150 ease-out overflow-hidden ${
                  citationModalAnimated && isCitationPreviewReady
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-90 pointer-events-none"
                }`}
                style={{
                  left: `${citationModal.x}px`,
                  top: `${citationModal.y}px`,
                  transformOrigin: "left center",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const first = citationModal.pageIndex
                    .split(/[,\s]+/)
                    .find(Boolean);
                  const pageIndex0 = first ? Number.parseInt(first, 10) : NaN;
                  if (Number.isNaN(pageIndex0) || pageIndex0 < 0) return;
                  void navigateToCitation(
                    citationModal.documentId || "",
                    pageIndex0,
                    citationModal.sourceSegment || "",
                  );
                }}
              >
                {showCitationPreview && pdfUrlForCitation && (
                  <div className="w-full h-[240px]">
                    <CitationPreview
                      pdfUrl={
                        (citationModal.documentId
                          ? getPdfUrlForDocumentId(citationModal.documentId)
                          : undefined) ?? pdfUrlForCitation
                      }
                      pageNumber={(() => {
                        const first = citationModal.pageIndex
                          .split(/[,\s]+/)
                          .find(Boolean);
                        const pageIndex0 = first
                          ? Number.parseInt(first, 10)
                          : NaN;
                        return !Number.isNaN(pageIndex0) && pageIndex0 >= 0
                          ? pageIndex0 + 1
                          : 1;
                      })()}
                      sourceText={citationModal.sourceSegment}
                      documentId={citationModal.documentId}
                      onPreviewReady={() => {
                        const key = `${citationModal.documentId}|${citationModal.pageIndex}|${citationModal.sourceSegment}`;
                        // Only show if we're still hovering this citation
                        if (lastHoveredCitationKeyRef.current !== key) return;
                        setIsCitationPreviewReady(true);
                        clearCitationShowTimeout();
                        citationShowTimeoutRef.current = setTimeout(() => {
                          // Delay the fade-in so first visible frame is already rendered
                          if (lastHoveredCitationKeyRef.current !== key) return;
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                              setCitationModalAnimated(true);
                            });
                          });
                        }, 200);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <div
              ref={hoverLineOverlayRef}
              className="pointer-events-none absolute left-0 right-0 z-[0] mx-4 rounded-[6px]"
              style={{
                top: 0,
                height: 0,
                opacity: 0,
                background: "rgba(242, 242, 247, 0.7)",
              }}
            />
            {/* Writing Indicator */}
            {(writingIndicator.visible || isNotesLoading) && (
              <div
                className="absolute -left-4 -right-4 md:left-10 md:right-10 z-10 pointer-events-none transition-all duration-300 ease-out"
                style={{
                  top: `${writingIndicator.top}px`,
                }}
              >
                <div className="w-full bg-white rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Spinner size="small" />
                    {/* Show animated fake status messages while loading (before actual writing starts) */}
                    {isNotesLoading && (
                      <span className="text-[14px] font-rounded-semibold text-[#595959] whitespace-nowrap">
                        {jobStageLabel || "Starting..."}
                      </span>
                    )}
                    {/* Show actual writing progress when content is being written */}
                    {!isNotesLoading && writingIndicator.visible && (
                      <span className="text-[14px] font-rounded-semibold text-[#595959]">
                        {writingIndicator.currentH1
                          ? `Writing notes on ${writingIndicator.currentH1}`
                          : "Writing..."}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <EditorContent
              extensions={extensions}
              className="relative min-h-[500px] w-full"
              editorProps={{
                attributes: {
                  class: "font-default focus:outline-none max-w-full",
                },
                handleKeyDown: (view, event) => {
                  // Let the command menu handle ArrowUp/ArrowDown/Enter when open
                  if (handleCommandNavigation(event)) {
                    event.preventDefault();
                    return true;
                  }

                  // Handle Backspace at the very start of the document
                  if (event.key === "Backspace") {
                    const { state } = view;
                    const { selection } = state;
                    const { $from } = selection;

                    // Check if cursor is at the very start of the document
                    if ($from.pos === 1 && selection.empty) {
                      event.preventDefault();

                      // Get first block's text content
                      const firstNode = state.doc.firstChild;
                      const firstLineText = firstNode?.textContent || "";

                      // Get current title value
                      const currentTitle =
                        pageTitle === "New Document" ? "" : pageTitle;

                      if (firstLineText) {
                        // Merge first line into title
                        const newTitle = currentTitle + firstLineText;
                        setPageTitle(newTitle);

                        // Remove first block from editor
                        if (firstNode) {
                          const tr = state.tr.delete(0, firstNode.nodeSize);
                          view.dispatch(tr);
                        }

                        // Focus title at end (after state update)
                        setTimeout(() => {
                          titleTextareaRef.current?.focus();
                          titleTextareaRef.current?.setSelectionRange(
                            newTitle.length,
                            newTitle.length,
                          );
                        }, 0);
                      } else {
                        // Empty first line, just focus title at end
                        setTimeout(() => {
                          titleTextareaRef.current?.focus();
                          titleTextareaRef.current?.setSelectionRange(
                            currentTitle.length,
                            currentTitle.length,
                          );
                        }, 0);
                      }

                      return true;
                    }
                  }

                  return false;
                },
              }}
            >
              <EditorInstanceBridge onReady={setEditorInstance} />
              <style
                dangerouslySetInnerHTML={{
                  __html: `
              /* Text replacement animation styles */
              .text-highlight-animate {
                background-color: #DDEEF6 !important;
                padding: 2px 0;
                border-radius: 2px;
              }

              .text-fade-out {
                animation: fadeOut 0.3s ease-out forwards !important;
              }

              .text-fade-in {
                transition: opacity 0.3s ease-out !important;
              }

              /* Decoration-based animations (ProseMirror decorations) */
              .pm-anim-highlight {
                background-color: #DDEEF6 !important;
                border-radius: 2px;
                padding: 0 2px;
                transition: background-color 0.2s ease-in-out;
              }
              .pm-anim-fade-out {
                opacity: 0;
                transition: opacity 0.3s ease-out;
              }
              .pm-anim-fade-in-initial {
                opacity: 0 !important;
                /* No transition - instant opacity 0 to prevent flash */
              }
              .pm-anim-fade-in {
                opacity: 0;
                animation: pmFadeIn 0.3s ease-in forwards;
              }
              .pm-line-highlight {
                position: relative;
                background-color: #DDEEF6 !important;
                // border-radius: 6px;
                transition: background-color 0.2s ease-in-out;
                /* Ensure line highlight doesn't fade with text */
                opacity: 1 !important;
                // margin-left: -8px;
                // margin-right: -8px;
                // padding-left: 8px;
                // padding-right: 8px;
              }
              .pm-line-highlight-fade-out {
                position: relative;
                background-color: #DDEEF6 !important;
                // border-radius: 6px;
                /* Fade only the background, not the text content */
                animation: pmLineHighlightFadeOut 0.3s ease-out forwards;
                // margin-left: -8px;
                // margin-right: -8px;
                // padding-left: 8px;
                // padding-right: 8px;
              }
              /* Menu-triggered line highlight (3s fade) */
              .pm-menu-line-highlight {
                position: relative;
                background-color: #DDEEF6 !important;
                transition: background-color 0.2s ease-in-out;
                opacity: 1 !important;
              }
              .pm-menu-line-highlight-fade-out {
                position: relative;
                background-color: #DDEEF6 !important;
                animation: pmMenuLineHighlightFadeOut 3s ease-out forwards;
              }
              @keyframes pmLineHighlightFadeOut {
                from {
                  background-color: rgba(242, 242, 247, 0.7);
                }
                to {
                  background-color: rgba(242, 242, 247, 0);
                }
              }
              @keyframes pmMenuLineHighlightFadeOut {
                from {
                  background-color: rgba(242, 242, 247, 0.7);
                }
                to {
                  background-color: rgba(242, 242, 247, 0);
                }
              }
              @keyframes pmFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }

              @keyframes fadeOut {
                from {
                  opacity: 1;
                }
                to {
                  opacity: 0;
                }
              }

              /* Rewrite notes animation - fade in + translate from bottom */
              .pm-rewrite-fade-in {
                animation: pmRewriteFadeIn 0.15s ease-out both;
                will-change: opacity, transform;
                transform: translateZ(0);
                backface-visibility: hidden;
              }
              @keyframes pmRewriteFadeIn {
                from {
                  opacity: 0;
                  transform: translateY(16px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `,
                }}
              />
              <EditorCommand className="z-[9999] pointer-events-auto h-auto max-h-[330px] w-72 overflow-y-auto rounded-[16px] border border-[#f2f2f7] bg-white px-2 py-2 shadow-lg transition-all">
                <EditorCommandEmpty className="px-2 text-gray-400">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList className="pointer-events-auto">
                  {suggestionItems.map((item: any) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={({ editor, range }) =>
                        item.command?.({ editor, range })
                      }
                      className="flex w-full items-center space-x-2 rounded-[12px] p-2 text-left text-sm hover:bg-[#f2f2f7] aria-selected:bg-[#f2f2f7] cursor-pointer pointer-events-auto"
                      key={item.title}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#f2f2f7] bg-white">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-rounded-semibold">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.description}
                        </p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>
              <EditorBubble
                tippyOptions={{
                  placement: "top",
                }}
                className="flex w-fit overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg divide-x divide-gray-200"
              >
                <TextButtons />
                <AskMedlyButton />
                <DefineButton />
                {/* Additional bubble menu items - Commented out */}
                {/* <NodeSelector open={openNode} onOpenChange={setOpenNode} />
              <LinkSelector open={openLink} onOpenChange={setOpenLink} />
              <ColorSelector open={openColor} onOpenChange={setOpenColor} /> */}
              </EditorBubble>
            </EditorContent>
          </div>
        </EditorRoot>
      </div>
    </div>
  );
};

export default NotesPage;
