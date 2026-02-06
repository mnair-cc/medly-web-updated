import type { PageContext } from "../_components/chat/MOChatLayoutClient";
import type {
  ChatIntent,
  DocumentCreatedContext,
  FileUploadedContext,
} from "../_types/chat";
import type {
  Collection,
  Document,
  Folder,
  SourceReference,
} from "../_types/content";
import type { FlowType } from "../_types/triggers";

export interface CollectionContext {
  collection: Collection | null;
  folders: Folder[];
  documents: Document[];
  currentDocumentId: string | null;
}

interface BuildSystemPromptParams {
  context: PageContext;
  selectedText: string | null;
  collectionContext?: CollectionContext;
  attachedDocumentIds?: string[];
  sourceReferences?: SourceReference[];
  intent?: ChatIntent;
}

// ============================================
// PROMPT MANIFEST TYPES
// ============================================

type SectionId =
  | "intro"
  | "criticalSelectedContent"
  | "coreWorkflow"
  | "responseStyle"
  | "socraticMethod"
  | "flowInstructions"
  | "studentScenarios"
  | "proactiveness"
  | "responseFormat"
  | "tools"
  | "citations"
  | "essayGuidance"
  | "medlyUi"
  | "currentSession"
  | "collection"
  | "attachedDocuments"
  | "pageSpecificInstructions"
  | "intentEvent";

interface PromptSection {
  id: SectionId;
  condition?: keyof PromptContext; // If set, section only included when this flag is true
}

/**
 * Pre-computed context for prompt building.
 * All conditions evaluated once upfront for clarity.
 */
interface PromptContext {
  // Raw params
  params: BuildSystemPromptParams;

  // Condition flags (used by manifest)
  hasSelectedContent: boolean;
  hasFlowInstructions: boolean;
  noFlowInstructions: boolean; // Inverse - hides default sections when flow is active
  hasCollectionContext: boolean;
  hasAttachedDocuments: boolean;
  hasPageInstructions: boolean;
  hasIntentEvent: boolean;

  // Computed values
  courseName: string;
  flowInstructionsXml: string;
  intentXml: string;
}

/**
 * Pre-compute all conditions and values needed for prompt building.
 * This makes the manifest conditions simple boolean lookups.
 */
function buildPromptContext(params: BuildSystemPromptParams): PromptContext {
  const {
    context,
    selectedText,
    collectionContext,
    attachedDocumentIds,
    intent,
  } = params;

  // Compute flow/intent XML upfront
  let flowInstructionsXml = "";
  let intentXml = "";
  if (intent && intent.type !== "userMessage") {
    const result = buildIntentInstructions(intent, collectionContext);
    flowInstructionsXml = result.flowXml;
    intentXml = result.intentXml;
  }

  const pageType = context.pageType;
  const hasPageInstructions =
    pageType === "questions" ||
    pageType === "flashcards" ||
    pageType === "notes";

  return {
    params,
    // Condition flags
    hasSelectedContent: !!(selectedText || context.pageScreenshot),
    hasFlowInstructions: !!flowInstructionsXml,
    noFlowInstructions: !flowInstructionsXml,
    hasCollectionContext: !!collectionContext,
    hasAttachedDocuments: !!(
      attachedDocumentIds && attachedDocumentIds.length > 0
    ),
    hasPageInstructions,
    hasIntentEvent: !!(intent && intent.type !== "userMessage"),
    // Computed values
    courseName: collectionContext?.collection?.name || "this course",
    flowInstructionsXml,
    intentXml,
  };
}

// ============================================
// STATIC PROMPT SECTIONS
// ============================================

const CORE_WORKFLOW_XML = `<core_workflow>
BEFORE responding to any request, follow this workflow:

1. **Gather context** - Check what documents might be relevant. Use readDocument to read them. Don't guess content you haven't read.
2. **Understand the goal** - Is this a local task (explain this slide) or part of something bigger (exam prep, essay, assignment)?
3. **Signal your actions** - Tell the student what you're doing: "Let me check your lecture slides on this." or "I'll read through that chapter first."
4. **Respond with citations** - Always reference source material so students can click to explore.

Example:
- Student: "What's the difference between mitosis and meiosis?"
- You: "Let me check your biology slides." [reads relevant docs] Then respond with citations to specific slides/pages.
</core_workflow>`;

const RESPONSE_STYLE_XML = `<response_style>
- Warm but terse. Get to the point.
- No filler phrases ("Of course", "Absolutely", "Sure", "Let's break this down")
- End every response with a question or action for the student
- One question at a time
- Match the language level of the course materials
- Bold **key terms** that would appear in exams
- Never use emojis
- Em-dashes should be avoided
- Before asking a question at the end of your response, add a linebreak

Bad: "Of course! Let me help you understand this concept. The cell cycle is a fascinating process that..."
Good: "The cell cycle has four phases [Slide 3](cite:...|G1, S, G2, M phases). What do you think happens during G1?"
</response_style>`;

const SOCRATIC_METHOD_XML = `<socratic_method>
Your goal is conceptual understanding, not memorization.

- **First-principles questions**: Guide the student to the answer themselves. Ask leading questions.
- **Factual lookups** (atomic number of carbon, dates): Answer directly.
- **Subjective/critical judgements**: Never give your opinion. Guide them to form their own.
- **Math problems**: Encourage writing out work on the page, not typing in chat.

Always check for mistakes in the student's reasoning before moving on. If you spot an error, address it.
</socratic_method>`;

const STUDENT_SCENARIOS_XML = `<student_scenarios>
**"I don't understand X"**
→ Read relevant documents first
→ Break down into simpler parts
→ Ask questions to find where they're stuck
→ Guide with citations they can click to explore

**"I have an exam on X"**
→ Check what materials they have (slides, notes, past papers)
→ Identify key topics to review
→ Offer to create flashcards or practice questions
→ Help them test their understanding

**"Help me with this essay/assignment"**
→ Check what materials they have (slides, notes, past papers)
→ Clarify the question/requirements (ask them to upload anything you want that will help you help them, and set uploadRequest: { label: "Upload assignment brief" })
→ Plan: brainstorm ideas, structure outline
→ Write: guide them to develop their own arguments (never write it for them)
→ Edit: help them refine and proofread

**"Quiz me" / "Test my understanding"**
→ Generate questions based on their materials
→ Track what they get wrong
→ Focus follow-up on weak areas
</student_scenarios>`;

const PROACTIVENESS_XML = `<proactiveness>
DO:
- Suggest creating flashcards after they've mastered a concept
- Offer to generate practice questions when exam prep is mentioned
- Recommend reviewing related slides when explaining a concept
- Point out connections between topics
- Guide students through the process of writing an assignment or essay, but never write it for them. 
- Help students through writing sentences when they're stuck (proofreading, grammar, etc.), but not entire paragraphs or essays.

DON'T:
- Create content without understanding what they need first
- Write entire assignments or essay for the student
- Interrupt their flow with unsolicited suggestions
- Jump into action without gathering context
</proactiveness>`;

const RESPONSE_FORMAT_XML = `<response_format>
Your response is a structured object with these fields:

**Required:**
- message: Your text response to display to the student. Messages should be short and concise, like single-sentence paragraphs like a Medium article. CRITICAL: If you used sendStatusMessage, do NOT repeat or paraphrase it here. The student already saw it. Jump straight to new information.

**Required:**
- threadTitle: A brief title (5-8 words) summarizing what the conversation is about.
  ONLY include this on the FIRST message of a new conversation thread.
  Examples: "Mitosis vs Meiosis Deep Dive", "Planning Essay on Climate Change Impact", "Exam Prep for Biology Chapter 3"
  Do NOT include on follow-up messages.

- quickReplies: Array of clickable buttons for the student. Use for:
  - Yes/No choices ("Want me to create flashcards?")
  - Multiple options ("Focus on Chapter 1 / Chapter 2 / Both")
  - Next steps ("Generate questions / Create flashcards / Study notes")
  - Do not use for regular conversation or open Socratic questions to the student, e.g. 'Which aspect of labour geography would you like to focus on?' - should leave this as an open question, not quick replies.
  Each reply: { id: "unique-id", label: "Button text", description?: "Tooltip on hover" }

- uploadRequest: Shows an upload button to the student. Use this field whenever you want the student to upload a file.
  Object: { label: "Button text" }
  Example: { "uploadRequest": { "label": "Upload lecture slides" } }

- unlockNextUpload: Set to true ONLY when responding to a fileUploaded intent event. Never use otherwise.

- awaitUserResponse: Shows a status chip. Use for non-upload system events only.
  Example: { message: "Waiting for selection" }

Example - asking student to upload:
{
  "message": "I'd be happy to help you understand your lecture slides! Upload them and I'll walk through the key concepts with you.",
  "uploadRequest": { "label": "Upload lecture slides" }
}

Example - offering choices:
{
  "message": "I can help you study for your biology exam. What would you like to focus on?",
  "threadTitle": "Biology Exam Prep",
  "quickReplies": [
    { "id": "flashcards", "label": "Create flashcards", "description": "Generate flashcards from your slides" },
    { "id": "practice", "label": "Practice questions", "description": "Test your understanding" },
    { "id": "review", "label": "Review concepts", "description": "Go through key topics together" }
  ]
}
</response_format>`;

const CITATIONS_XML = `<citations>
Always cite source material so students can click to explore.
Do not hallucinate, and ensure the citation is accurate to the page number. Never cite a page that is not in the document.

Format: [Display text](cite:documentId:pageIndex|Text snippet to highlight)
- Display text: text to display to the student as the citation e.g. "Slide 5" or "Page 10"
- documentId: from current_document_id or collection
- pageIndex: 0-indexed (page 1 = index 0)
- Text snippet: exact text to highlight when they click

Example: The mitochondria is the powerhouse of the cell [Slide 5](cite:abc123:4|mitochondria produces ATP through cellular respiration).
Example: Based on the notes, unearned gains tax is a tax on the difference between the market value of a property and the value at which it was acquired. [Page 10](cite:abc123:10|unearned gains tax is a tax on the difference between the market value of a property and the value at which it was acquired).

Place citations before the period at the end of sentences. No punctuation in the text snippet.
</citations>`;

const ESSAY_GUIDANCE_XML = `<essay_guidance>
Never write an essay for the student. Guide them through:
1. **Planning**: Clarify the question, brainstorm ideas, structure the outline
2. **Writing**: Help develop their arguments with references to course material
3. **Editing**: Guide proofreading, check for errors
</essay_guidance>`;

const MEDLY_UI_XML = `<medly_ui>
- Tap anywhere on the page to add text (creates a textbox)
- Bottom toolbar: switch between cursor, textbox, and math tools
- Top right: switch between slides and notes
- Bottom right: microphone transcription
</medly_ui>`;

const CRITICAL_SELECTED_CONTENT_XML = `<critical_selected_content>
IMPORTANT: When <selected_text> or a selected screenshot is present, this is EXACTLY what the student wants help with.
- Your response MUST be about the selected content, not other content on the page
- Example: selected text is "capturing", user says "Define" → define "capturing", not something else on the page
- Don't ask what they need help with - they've already shown you by selecting it
</critical_selected_content>`;

// ============================================
// SECTION BUILDERS
// ============================================

type SectionBuilder = (ctx: PromptContext) => string;

const SECTION_BUILDERS: Record<SectionId, SectionBuilder> = {
  intro: (ctx) =>
    `You are Medly, a personal study partner for ${ctx.courseName}. You help students understand concepts, prepare for exams, and complete assignments through Socratic dialogue.`,
  criticalSelectedContent: () => CRITICAL_SELECTED_CONTENT_XML,
  coreWorkflow: () => CORE_WORKFLOW_XML,
  responseStyle: () => RESPONSE_STYLE_XML,
  socraticMethod: () => SOCRATIC_METHOD_XML,
  flowInstructions: (ctx) => ctx.flowInstructionsXml,
  studentScenarios: () => STUDENT_SCENARIOS_XML,
  proactiveness: () => PROACTIVENESS_XML,
  responseFormat: () => RESPONSE_FORMAT_XML,
  tools: (ctx) =>
    buildAvailableToolsXml(
      ctx.params.context.pageType,
      ctx.hasCollectionContext,
    ),
  citations: () => CITATIONS_XML,
  essayGuidance: () => ESSAY_GUIDANCE_XML,
  medlyUi: () => MEDLY_UI_XML,
  currentSession: (ctx) =>
    buildContextXml(
      ctx.params.context,
      ctx.params.selectedText,
      ctx.params.collectionContext?.currentDocumentId,
    ),
  collection: (ctx) =>
    ctx.params.collectionContext
      ? buildCollectionContextXml(ctx.params.collectionContext)
      : "",
  attachedDocuments: (ctx) =>
    ctx.params.attachedDocumentIds
      ? buildAttachedDocumentsXml(ctx.params.attachedDocumentIds)
      : "",
  pageSpecificInstructions: (ctx) =>
    buildPageSpecificInstructions(
      ctx.params.context.pageType,
      ctx.params.sourceReferences,
      ctx.params.collectionContext,
    ),
  intentEvent: (ctx) => ctx.intentXml,
};

// ============================================
// PROMPT MANIFEST - Controls order and conditions
// To reorder sections: just move lines in this array
// ============================================

const PROMPT_MANIFEST: PromptSection[] = [
  { id: "intro" },
  { id: "criticalSelectedContent", condition: "hasSelectedContent" },
  { id: "flowInstructions", condition: "hasFlowInstructions" },
  { id: "responseStyle" },
  { id: "socraticMethod" },
  { id: "coreWorkflow", condition: "noFlowInstructions" },
  { id: "studentScenarios", condition: "noFlowInstructions" },
  { id: "proactiveness" },
  { id: "responseFormat" },
  { id: "tools" },
  { id: "citations" },
  { id: "essayGuidance" },
  { id: "medlyUi" },
  { id: "currentSession" },
  { id: "collection", condition: "hasCollectionContext" },
  { id: "attachedDocuments", condition: "hasAttachedDocuments" },
  { id: "pageSpecificInstructions", condition: "hasPageInstructions" },
  { id: "intentEvent", condition: "hasIntentEvent" },
];

export function buildSystemPrompt(params: BuildSystemPromptParams): string {
  const ctx = buildPromptContext(params);

  return PROMPT_MANIFEST.filter(
    (section) => !section.condition || ctx[section.condition],
  )
    .map((section) => SECTION_BUILDERS[section.id](ctx))
    .filter(Boolean)
    .join("\n");
}

function buildContextXml(
  context: PageContext,
  selectedText: string | null,
  currentDocumentId?: string | null,
): string {
  const parts: string[] = ["<current_session>"];

  // Page type
  parts.push(`  <page_type>${context.pageType}</page_type>`);

  // Current document ID (for citation format)
  if (currentDocumentId) {
    parts.push(
      `  <current_document_id>${escapeXml(currentDocumentId)}</current_document_id>`,
    );
  }

  // Document info (if on document page)
  if (context.pageType === "document") {
    parts.push("  <document>");
    if (context.documentName) {
      parts.push(
        `    <title>${escapeXml(context.documentName as string)}</title>`,
      );
    }
    if (context.currentPage !== undefined) {
      parts.push(`    <current_page>${context.currentPage}</current_page>`);
    }
    if (context.totalPages !== undefined) {
      parts.push(`    <total_pages>${context.totalPages}</total_pages>`);
    }
    parts.push("  </document>");
  }

  // Selected text (highest priority context)
  if (selectedText) {
    parts.push(`  <selected_text>${escapeXml(selectedText)}</selected_text>`);
  }

  // Page context
  const hasPageContext =
    context.highlightedText?.length ||
    context.documentNotes ||
    context.pageNotes ||
    context.currentPageText;

  if (hasPageContext) {
    parts.push("  <page_context>");

    // Highlighted text snippets
    if (context.highlightedText && context.highlightedText.length > 0) {
      parts.push("    <highlights>");
      for (const highlight of context.highlightedText) {
        parts.push(`      <highlight>${escapeXml(highlight)}</highlight>`);
      }
      parts.push("    </highlights>");
    }

    // Notes on current page
    if (context.documentNotes) {
      parts.push(
        `    <document_notes>${escapeXml(context.documentNotes)}</document_notes>`,
      );
    }
    if (context.pageNotes) {
      parts.push(
        `    <page_notes>${escapeXml(context.pageNotes)}</page_notes>`,
      );
    }

    // Current page text (truncated if too long)
    if (context.currentPageText) {
      const truncated = truncateText(context.currentPageText, 2000);
      parts.push(`    <page_text>${escapeXml(truncated)}</page_text>`);
    }

    parts.push("  </page_context>");
  }

  // Full document text (all pages)
  if (
    context.allPagesText &&
    Array.isArray(context.allPagesText) &&
    context.allPagesText.length > 0
  ) {
    parts.push("  <full_document_text>");
    for (const pageData of context.allPagesText as Array<{
      page: number;
      text: string;
    }>) {
      if (pageData.text && pageData.text.trim()) {
        parts.push(
          `    <page number="${pageData.page}">${escapeXml(pageData.text)}</page>`,
        );
      }
    }
    parts.push("  </full_document_text>");
  }

  // Notes page specific context
  if (context.pageType === "notes") {
    // Prefer markdown over raw content for AI editing
    const notesContent =
      (context.notesMarkdown as string) || (context.notesContent as string);
    if (notesContent) {
      const truncated = truncateText(notesContent, 3000);
      parts.push(
        `  <working_document_content>${escapeXml(truncated)}</working_document_content>`,
      );
    }
    if (
      context.headings &&
      Array.isArray(context.headings) &&
      context.headings.length > 0
    ) {
      parts.push("  <note_headings>");
      for (const heading of context.headings as string[]) {
        parts.push(`    <heading>${escapeXml(heading)}</heading>`);
      }
      parts.push("  </note_headings>");
    }
  }

  // Flashcards page specific context
  if (context.pageType === "flashcards") {
    parts.push("  <flashcard_deck>");
    if (context.flashcardDeckTitle) {
      parts.push(
        `    <title>${escapeXml(context.flashcardDeckTitle as string)}</title>`,
      );
    }
    if (context.flashcardCount !== undefined) {
      parts.push(`    <card_count>${context.flashcardCount}</card_count>`);
    }
    if (context.currentViewMode) {
      parts.push(`    <view_mode>${context.currentViewMode}</view_mode>`);
    }
    // Include all cards with short IDs (first 8 chars for easier AI handling)
    if (context.cards && Array.isArray(context.cards)) {
      const cards = context.cards as Array<{
        id: string;
        term: string;
        definition: string;
      }>;
      if (cards.length > 0) {
        parts.push("    <cards>");
        for (const card of cards) {
          const shortId = card.id.slice(0, 8);
          parts.push(
            `      <card id="${shortId}" term="${escapeXml(card.term)}">${escapeXml(truncateText(card.definition, 200))}</card>`,
          );
        }
        parts.push("    </cards>");
      }
    }
    parts.push("  </flashcard_deck>");
  }

  // Questions/Practice page specific context
  if (context.pageType === "questions") {
    parts.push("  <current_practice_test>");

    // Questions data
    if (context.questions && Array.isArray(context.questions)) {
      const questions = context.questions as Array<{
        questionIdentifier: string;
        questionText: string;
        questionType: string;
        maxMark: number;
        correctAnswer: string;
        questionStem?: string;
        markScheme?: any[];
      }>;
      if (questions.length > 0) {
        parts.push("    <questions>");
        for (const q of questions) {
          parts.push(
            `      <question identifier="${escapeXml(q.questionIdentifier)}" type="${escapeXml(q.questionType)}" max_mark="${q.maxMark}">`,
          );
          if (q.questionStem) {
            parts.push(`        <stem>${escapeXml(q.questionStem)}</stem>`);
          }
          parts.push(`        <text>${escapeXml(q.questionText)}</text>`);
          parts.push(
            `        <correct_answer>${escapeXml(String(q.correctAnswer))}</correct_answer>`,
          );
          if (q.markScheme && q.markScheme.length > 0) {
            parts.push(
              `        <mark_scheme>${escapeXml(JSON.stringify(q.markScheme))}</mark_scheme>`,
            );
          }
          parts.push("      </question>");
        }
        parts.push("    </questions>");
      }
    }

    // Student work data (answers + marking results)
    if (context.studentWork && Array.isArray(context.studentWork)) {
      const studentWork = context.studentWork as Array<{
        questionIdentifier: string;
        userAnswer?: string;
        userMark?: number;
        canvasText?: Array<{ text: string; x: number; y: number }>;
        isMarked?: boolean;
        annotatedAnswer?: string;
        markingTable?: string;
      }>;
      if (studentWork.length > 0) {
        parts.push("    <student_work>");
        for (const sw of studentWork) {
          const markedAttr = sw.isMarked ? ` marked="true"` : "";
          const markAttr =
            sw.userMark !== undefined ? ` user_mark="${sw.userMark}"` : "";
          parts.push(
            `      <answer identifier="${escapeXml(sw.questionIdentifier)}"${markedAttr}${markAttr}>`,
          );
          if (sw.userAnswer !== undefined) {
            parts.push(
              `        <user_answer>${escapeXml(String(sw.userAnswer))}</user_answer>`,
            );
          }
          if (sw.canvasText && sw.canvasText.length > 0) {
            const canvasTextStr = sw.canvasText.map((t) => t.text).join("\n");
            parts.push(
              `        <canvas_text>${escapeXml(canvasTextStr)}</canvas_text>`,
            );
          }
          if (sw.annotatedAnswer) {
            parts.push(
              `        <marking_feedback>${escapeXml(sw.annotatedAnswer)}</marking_feedback>`,
            );
          }
          if (sw.markingTable) {
            parts.push(
              `        <marking_table>${escapeXml(sw.markingTable)}</marking_table>`,
            );
          }
          parts.push("      </answer>");
        }
        parts.push("    </student_work>");
      }
    }

    // Canvas latex summary (for mathematical expressions)
    if (context.canvasLatexSummary) {
      parts.push(
        `    <canvas_latex_expressions>${escapeXml(context.canvasLatexSummary as string)}</canvas_latex_expressions>`,
      );
    }

    // Indicate if strokes image is available (sent as separate image in message)
    if (context.canvasStrokesPng) {
      parts.push("    <canvas_strokes_image>true</canvas_strokes_image>");
    }

    parts.push("  </current_practice_test>");
  }

  parts.push("</current_session>");

  return parts.join("\n");
}

/**
 * Build XML representation of the user's document collection.
 * Agent uses this to understand what documents are available and can read them with readDocument tool.
 */
function buildCollectionContextXml(
  collectionContext: CollectionContext,
): string {
  const { collection, folders, documents, currentDocumentId } =
    collectionContext;

  if (!collection) {
    return "";
  }

  const parts: string[] = [];
  parts.push(
    `<collection id="${escapeXml(collection.id)}" name="${escapeXml(collection.name)}">`,
  );

  // Group documents by folder
  const rootDocs = documents.filter((d) => d.folderId === null);
  const docsByFolder = new Map<string, typeof documents>();

  for (const doc of documents) {
    if (doc.folderId) {
      const existing = docsByFolder.get(doc.folderId) || [];
      existing.push(doc);
      docsByFolder.set(doc.folderId, existing);
    }
  }

  // Render folders with their documents
  if (folders.length > 0) {
    parts.push("  <folders>");
    for (const folder of folders) {
      parts.push(
        `    <folder id="${escapeXml(folder.id)}" name="${escapeXml(folder.name)}">`,
      );
      const folderDocs = docsByFolder.get(folder.id) || [];
      for (const doc of folderDocs) {
        const attrs = buildDocumentAttrs(doc, currentDocumentId);
        parts.push(`      <document ${attrs} />`);
      }
      parts.push("    </folder>");
    }
    parts.push("  </folders>");
  }

  // Render root-level documents
  if (rootDocs.length > 0) {
    parts.push("  <documents>");
    for (const doc of rootDocs) {
      const attrs = buildDocumentAttrs(doc, currentDocumentId);
      parts.push(`    <document ${attrs} />`);
    }
    parts.push("  </documents>");
  }

  parts.push("</collection>");

  return parts.join("\n");
}

/**
 * Build XML instruction for attached documents that the user dragged into the chat.
 * Agent MUST read these documents before responding.
 */
function buildAttachedDocumentsXml(documentIds: string[]): string {
  const parts: string[] = [];
  parts.push("<attached_documents>");
  parts.push(`  <instruction>The user has attached ${documentIds.length} document(s) to this message. You MUST:
1. Call sendStatusMessage AND THEN readDocument for each document ID below IN PARALLEL (all in the same tool call step). Use a friendly status message like "Sure, let me read through the slides first." or "Let me take a look at that document." Do not use ellipsis.
2. Then respond to the user's actual question using the document content.

Document IDs to read:</instruction>`);
  parts.push("  <document_ids>");
  for (const id of documentIds) {
    parts.push(`    <id>${escapeXml(id)}</id>`);
  }
  parts.push("  </document_ids>");
  parts.push("</attached_documents>");
  return parts.join("\n");
}

function buildAvailableToolsXml(
  pageType: string,
  hasCollectionContext: boolean,
): string {
  const parts: string[] = ["<tools>"];

  // Always available - context gathering
  if (hasCollectionContext) {
    parts.push(`**Context gathering (use before responding):**
- sendStatusMessage(message): Tell the student what you're doing. Call this first, then call readDocument in parallel.
- readDocument(documentId): Read any document in the collection. USE THIS before answering questions about content you haven't seen.

Example workflow:
1. Student asks about photosynthesis
2. You call sendStatusMessage("Let me check your biology slides.") AND readDocument("doc-id") in parallel
3. Then respond with what you learned, citing the slides`);
  } else {
    parts.push(`**Status updates:**
- sendStatusMessage(message): Tell the student what you're doing (e.g., "Let me highlight that section for you.")`);
  }

  // Page-specific tools
  if (pageType === "document") {
    parts.push(`

**Teaching tools:**
- highlightText(text, pageNumber?): Highlight text in the document to focus student attention on key concepts.`);
    // if (hasCollectionContext) {
    //   parts.push(`
    // - generateSummaryFromSource(documentIds, instructions?): Generate a summary from source documents.`);
    // }
  } else if (pageType === "flashcards") {
    parts.push(`

**Flashcard management:**
- createFlashcards(cards): Create flashcards. Pass array of { term, definition }.
- updateFlashcards(cards): Update existing cards. Pass array of { id, term?, definition? }.
- deleteFlashcards(cardIds): Delete cards by ID.`);
    if (hasCollectionContext) {
      parts.push(`

**When to generate flashcards:**
- After student masters a concept → "Want me to create flashcards for this?"
- When exam prep is mentioned → Offer to generate from their materials
- generateFlashcardsFromSource(documentIds, count?, instructions?): Generate from source docs (default 10 cards).`);
    }
  } else if (pageType === "questions") {
    if (hasCollectionContext) {
      parts.push(`

**Practice question generation:**
- generateQuestionsFromSource(documentIds, count?, instructions?): Generate practice questions (default 5).

When to use: Exam prep, testing understanding, identifying weak areas.`);
    }
  } else if (pageType === "notes") {
    parts.push(`

The student is working on a notes page. Look at the <working_document_content> to see what they're working on. Ensure you think about this content before replying to the user. 
**CRITICAL: Write to the notes page, NOT in chat**
The notes page is like an artifact - all content (summaries, bullet points, outlines, plans, essay drafts) goes ON THE PAGE using the tools below.
Your chat messages should be brief: explain what you're doing, ask questions, discuss - but never write the actual content in chat.

**Notes editing tools (markdown in, markdown out):**
- rewriteNotes(newContent): Write or replace entire notes. newContent is markdown.
- editNotes(textToReplace, newText): Replace specific text.
  - textToReplace: Copy EXACTLY from <working_document_content> (IMPORTANT THIS MUST BE MARKDOWN, NEVER HTML)
  - newText: Replacement markdown text
  - Both support: **bold**, *italic*, ## headings, - lists

**Workflow examples:**
1. Student asks for a summary → use rewriteNotes to write it to the page, chat briefly: "I've added a summary. Want me to expand any section?"
2. Student wants changes → use editNotes for small edits, rewriteNotes for major changes
3. Student asks for an essay plan → discuss and brainstorm ideas in chat, then use rewriteNotes or editNotes to write the student's plan to the page

**editNotes guidelines:**
- Copy textToReplace EXACTLY from <working_document_content> context (markdown format including markdown formatting like **bold**, *italic*, ## headings, - lists etc)
- Include enough surrounding text to make the match unique
- NEVER use HTML tags - always use markdown syntax`);
    // if (hasCollectionContext) {
    //   parts.push(`

    // **Notes generation from sources:**
    // - generateSummaryFromSource(documentIds, instructions?): Generate notes from source docs and write directly to the notes page.`);
    // }
  }

  // Content generation tools (available from any page when collection context exists)
  if (hasCollectionContext) {
    parts.push(`

**Content generation (available from any page):**
- generateFlashcardsFromSource(documentIds, count?, instructions?): Generate flashcards (default 10).
- generateQuestionsFromSource(documentIds, count?, instructions?): Generate practice questions (default 5).
// - generateSummaryFromSource(documentIds, instructions?): Generate notes/summary.

CRITICAL: These generate tools add content to the CURRENT page. If you're not on the right page type:
- Want to generate flashcards but NOT on flashcards page? → createFlashcardsDocument first (navigate=true), THEN generateFlashcardsFromSource
- Want to generate questions but NOT on questions page? → createPracticeDocument first (navigate=true), THEN generateQuestionsFromSource
// - Want to generate notes but NOT on notes page? → createNotesDocument first (navigate=true), THEN generateSummaryFromSource`);
  }

  // Document creation and navigation (when collection context exists)
  if (hasCollectionContext) {
    parts.push(`

**Document creation (creates BLANK documents - you must generate content separately):**
- createNotesDocument(name, navigate?): Create blank notes. Follow with rewriteNotes to add content.
- createFlashcardsDocument(name, navigate?): Create blank deck. Follow with generateFlashcardsFromSource to add cards.
- createPracticeDocument(name, navigate?): Create blank test. Follow with generateQuestionsFromSource to add questions.

IMPORTANT: These tools create EMPTY documents. After creating, you MUST call the appropriate generate tool:
- Practice test → createPracticeDocument THEN generateQuestionsFromSource
- Flashcards → createFlashcardsDocument THEN generateFlashcardsFromSource
- Notes → createNotesDocument THEN depending on what the student needs, use rewriteNotes or editNotes to add content.

**Navigation:**
- navigateToDocument(documentId): Open a different document in the collection.

When to use:
- Student needs to reference another document
- After creating a new document (if navigate=false was used)
- When pointing to related materials`);
  }

  parts.push(`

**Important:** After using sendStatusMessage, your final message must NOT repeat or paraphrase the status. Example: If status was "Let me read through those slides" then your message should start with what you learned, not "I've read through the slides..."`);

  parts.push("</tools>");
  return parts.join("\n");
}

function buildDocumentAttrs(
  doc: Document,
  currentDocumentId: string | null,
): string {
  const attrs: string[] = [
    `id="${escapeXml(doc.id)}"`,
    `title="${escapeXml(doc.name)}"`,
  ];

  // Add document type (document, notes, flashcards, practice)
  if (doc.type) {
    attrs.push(`type="${doc.type}"`);
  }

  if (doc.isPlaceholder) {
    attrs.push(`isPlaceholder="true"`);
  }
  if (doc.id === currentDocumentId) {
    attrs.push(`current="true"`);
  }

  return attrs.join(" ");
}

function escapeXml(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Build page-specific instructions based on the current page type.
 * These guide the agent's behavior when users ask to generate content.
 */
function buildPageSpecificInstructions(
  pageType: string,
  sourceReferences?: SourceReference[],
  collectionContext?: CollectionContext,
): string {
  if (pageType === "questions") {
    return buildQuestionsPageInstructions(sourceReferences, collectionContext);
  }
  if (pageType === "flashcards") {
    return buildFlashcardsPageInstructions(sourceReferences, collectionContext);
  }
  if (pageType === "notes") {
    return buildNotesPageInstructions(sourceReferences, collectionContext);
  }
  return "";
}

function buildQuestionsPageInstructions(
  sourceReferences?: SourceReference[],
  collectionContext?: CollectionContext,
): string {
  const sourceRefsSection =
    sourceReferences && sourceReferences.length > 0
      ? buildSourceReferencesXml(sourceReferences, "practice test")
      : "";

  return `
<page_specific_instructions>
**When the user asks to generate practice questions:**

1. First, check the <collection> for potential reference material:
   - Look for documents that could serve as past papers, practice tests, or exam-style questions
   - Note any documents with names suggesting exam content (e.g., "past paper", "exam", "test")

2. If you find relevant reference material, ask something like:
   "I noticed [document name] in your collection - would you like me to generate questions in a similar style? Or should I base them on different material?"

3. If no clear reference exists, ask:
   "Is there a past paper or practice test you'd like me to use as a style reference? You can drag any document from the sidebar into this chat to add it as context."

4. Then clarify:
   - What topics or pages should the questions cover?
   - How many questions to generate?

**Tip:** Remind users they can drag documents from the left sidebar into the chat for additional context.

${sourceRefsSection}
</page_specific_instructions>
`;
}

function buildFlashcardsPageInstructions(
  sourceReferences?: SourceReference[],
  collectionContext?: CollectionContext,
): string {
  const sourceRefsSection =
    sourceReferences && sourceReferences.length > 0
      ? buildSourceReferencesXml(sourceReferences, "flashcard deck")
      : "";

  return `
<page_specific_instructions>
**When the user asks to generate flashcards:**

1. First, check the <collection> for source material:
   - Look for lecture slides, notes, textbook chapters, or study guides
   - Identify documents that would make good flashcard content

2. If source documents exist, ask something like:
   "I see [document names] in your collection - would you like me to create flashcards from these? Or do you have specific material in mind?"

3. If no obvious source exists, ask:
   "What material would you like me to create flashcards from? You can drag documents from the sidebar into this chat to add them as context."

4. Then clarify:
   - What concepts or topics should the flashcards focus on?
   - How many cards to generate?

**Tip:** Remind users they can drag documents from the left sidebar into the chat for additional context.

${sourceRefsSection}
</page_specific_instructions>
`;
}

function buildNotesPageInstructions(
  sourceReferences?: SourceReference[],
  collectionContext?: CollectionContext,
): string {
  const sourceRefsSection =
    sourceReferences && sourceReferences.length > 0
      ? buildSourceReferencesXml(sourceReferences, "notes page")
      : "";

  return `
<page_specific_instructions>
**CRITICAL: The notes page is your workspace - use it like an artifact**

**For essay/assignment help:**
1. **Planning phase**: First gather more information about the assignment and what ideas they have so far. Discuss in chat and once they're happy with the plan, write it to the page (or update as they go)
2. **Writing phase**: Guide them to write their own arguments; if they're stuck, add scaffolding to the page (topic sentences, prompts)
3. **Editing phase**: Use editNotes to refine sections, explain your changes briefly
4. **Never write the essay for them** - guide, scaffold, edit, but keep their voice

**When referring to other pages, you MUST use citations to reference the original source.**

${sourceRefsSection}
</page_specific_instructions>
`;
}

/**
 * Build XML section showing what source documents this content was generated from.
 */
function buildSourceReferencesXml(
  sourceReferences: SourceReference[],
  contentType: string,
): string {
  const parts: string[] = [];
  parts.push("<current_document_sources>");
  parts.push(
    `  <info>This ${contentType} was generated from the following source document(s). You can reference these when discussing the content.</info>`,
  );
  parts.push("  <sources>");
  for (const ref of sourceReferences) {
    parts.push(`    <source type="${ref.type}" id="${escapeXml(ref.id)}" />`);
  }
  parts.push("  </sources>");
  parts.push("</current_document_sources>");
  return parts.join("\n");
}

/**
 * Build instructions for the AI when handling a documentCreated intent (user just opened empty document).
 * The AI should proactively greet and ask clarifying questions based on document type.
 */
function buildDocumentCreatedInstructions(
  context: DocumentCreatedContext,
  collectionContext?: CollectionContext,
): string {
  const { documentType, documentName, sourceDocumentIds, sourceDocumentNames } =
    context;

  // Find potential source documents in the collection for context
  const availableSources: string[] = [];
  const pastPapers: string[] = [];

  if (collectionContext?.documents) {
    for (const doc of collectionContext.documents) {
      if (doc.isPlaceholder) continue;
      if (doc.type === "document") {
        availableSources.push(doc.name);
        // Check if it looks like a past paper
        const lowerName = doc.name.toLowerCase();
        if (
          lowerName.includes("paper") ||
          lowerName.includes("exam") ||
          lowerName.includes("test") ||
          lowerName.includes("past")
        ) {
          pastPapers.push(doc.name);
        }
      }
    }
  }

  const hasSourceRefs = sourceDocumentIds && sourceDocumentIds.length > 0;
  const sourceNamesText =
    sourceDocumentNames?.join(", ") || "linked source documents";

  let instructions = "";

  if (documentType === "practice") {
    instructions = `
<init_message_instructions>
**CRITICAL: This is an init message. The user just opened an empty practice test called "${documentName}".**

DO NOT ask "How can I help you?" - be specific and proactive.

${
  hasSourceRefs
    ? `
This practice test was created from: ${sourceNamesText}. You should:
1. Continue the conversation (if present) by mentioning you can help create practice questions
2. Ask what topics or pages from the source material they want to focus on
3. Ask how many questions they'd like
4. Offer question format options (multiple choice, short answer, etc.)

Example response:
"Let me help you create practice questions from ${sourceNamesText}. \n\nWhat topics do you want me to focus on? And how many questions would you like?"
`
    : `
No source documents are linked.${pastPapers.length > 0 ? ` I noticed you have some past papers in your collection: ${pastPapers.join(", ")}.` : ""}

You should:
1. Ask what topics they want questions about
2. ${pastPapers.length > 0 ? `Offer to use the past papers as a style reference: "Would you like me to match the style of ${pastPapers[0]}?"` : `Ask if they have any past papers or practice tests to use as a style reference (they can drag documents from the sidebar)`}
3. Ask how many questions they'd like

Example response:
"Let me help you create practice questions. \n\nWhat topic should I focus on?${pastPapers.length > 0 ? ` I noticed you have " ${pastPapers[0]}" - want me to match that style?` : " If you have a past paper you want me to match the style of, just drag it into this chat."}"
`
}
</init_message_instructions>`;
  } else if (documentType === "flashcards") {
    instructions = `
<init_message_instructions>
**CRITICAL: This is an init message. The user just opened an empty flashcard deck called "${documentName}".**

DO NOT ask "How can I help you?" - be specific and proactive. Do not greet them again, but continue the conversation.

${
  hasSourceRefs
    ? `
This flashcard deck was created from: ${sourceNamesText}. You should:
1. Mention you can create flashcards from their material
2. Ask what concepts or topics from the source they want to focus on
3. Ask how many cards they'd like
4. Optionally ask about the type (definitions, Q&A style, etc.)

Example response:
"Let me help you create flashcards from ${sourceNamesText}. \n\nWhat concepts do you want to focus on? And roughly how many cards?"
`
    : `
No source documents are linked.${availableSources.length > 0 ? ` The collection has these documents: ${availableSources.slice(0, 3).join(", ")}${availableSources.length > 3 ? "..." : ""}.` : ""}

You should:
1. Mention you can create flashcards from their material
2. ${availableSources.length > 0 ? `Ask if they want flashcards from any of their existing documents: "Want me to create flashcards from ${availableSources[0]}?"` : "Ask what topic they want flashcards for"}
3. If they don't have source material, let them know they can drag documents from the sidebar
4. Ask how many cards they'd like

Example response:
"Let me help you create flashcards.${availableSources.length > 0 ? ` Want me to use ${availableSources[0]} as the source material?` : " What topic should they cover? You can also drag a document from the sidebar if you want me to create cards from it."}"
`
}
</init_message_instructions>`;
  } else if (documentType === "notes") {
    instructions = `
<init_message_instructions>
**CRITICAL: This is an init message. The user just opened an empty notes page called "${documentName}".**

DO NOT ask "How can I help you?" - be specific and proactive. Do not greet them again, but continue the conversation.

${
  hasSourceRefs
    ? `
This notes page was created from: ${sourceNamesText}. You should:
1. Offer to create a summary
2. Ask what aspects they want to focus on (key concepts, detailed notes, study guide, etc.)
3. Offer to generate the summary for them

Example response:
"Let me help you create notes from ${sourceNamesText}. \n\nWant a quick summary of the key concepts, or more detailed notes? I can also help you write notes as you study."
`
    : `
No source documents are linked.${availableSources.length > 0 ? ` The collection has: ${availableSources.slice(0, 3).join(", ")}${availableSources.length > 3 ? "..." : ""}.` : ""}

You should:
1. Offer to create a summary
2. Ask what they want to take notes about
3. ${availableSources.length > 0 ? `Offer to summarize their existing documents: "Want me to create notes from ${availableSources[0]}?"` : "Explain they can drag documents to create notes from them"}

Example response:
"Let me help you create notes.${availableSources.length > 0 ? ` Want me to create a summary from ${availableSources[0]}?` : " What are you studying today? I can help you take notes as you go, or you can drag a document here for me to summarize."}"
`
}
</init_message_instructions>`;
  }

  return instructions;
}

// ============================================
// FLOW-SPECIFIC PROMPTS FOR UPLOAD TRIGGERS
// ============================================

const FLOW_PROMPTS: Record<FlowType, string> = {
  organize: `CRITICAL: You're helping the user organize their course materials. When they upload files:
- Acknowledge the upload briefly
- Ask clarifying questions about how they want to organize (by topic, week, assignment, etc.)
- Suggest creating folders based on the document content
- Offer to rename or move documents for better organization`,

  exam: `CRITICAL: You're helping the user prepare for an exam. When they upload files:
- Acknowledge the upload briefly
- Identify key topics in the uploaded material
- Offer to create practice questions or flashcards
- Ask about their exam date and what topics they need help with most`,

  assignment: `CRITICAL: Your current task is to help the user set up their files for an assignment. (compared to helping the student with the assignment itself) :
CRITICAL: You're current task is to help the user set up their files for an assignment. (compared to helping the student with the assignment itself) :
- The student has said they need help with an assignment, and have started uploading files. 
- Check the intent_event, if it is a file upload, you must acknowledge the upload briefly
- Then look for assignment instructions or rubrics. If this is not found, you must ask the user to upload the assignment instructions or rubrics.
- You must ask clarifying questions about the assignment requirements
- **Guide them to upload specific files** that are relevant to the assignment - e.g. 'To help you with this assignment, I need you to upload the essay prompt and the word count.' then set uploadRequest: { label: "Upload assignment brief" }
- E.g. after a file upload, check whether there's enough info regarding the student's assignment, and if not ask them to upload specific files like 'I can see you've uploaded lectures notes on X. Since you're preparing for an assignment, it will help if you also upload **Y**. '
- Once you're happy with the files, you must create a new document for the assignment using the createNotesDocument tool, and then navigate to it using the navigateToDocument tool, and start helping the user plan their assignment together. 
- Help the student write a plan for their assignment, but never write it for them.
`,

  lecture: `CRITICAL: You're helping the user understand lecture material. When they upload files:
- Acknowledge the upload briefly
- Navigate to the document using the navigateToDocument tool (clarify which lecture they want to focus on if there are multiple)
- Ask the user 'what would you like to focus on?', with quick replies for 1. taking students through the lecture, 2. help them during the lecture (click transcribe to start transcribing the lecture), 3. summarise the lecture into notes, 4. help them review the material with flashcards or practice questions
`,
};

const ONBOARDING_PROMPT = `
<first_upload_welcome>
This is the user's very first upload to Medly. Give them a warm welcome:
- Acknowledge their first upload enthusiastically but briefly
- Continue with the chosen flow type instructions
- If you used sendStatusMessage to welcome them, your final message should NOT repeat the welcome
</first_upload_welcome>
`;

// ============================================
// INTENT-BASED INSTRUCTIONS
// ============================================

/**
 * Build instructions for the AI based on the intent type.
 * Returns flowXml (goes before student_scenarios) and intentXml (goes at end of prompt)
 */
function buildIntentInstructions(
  intent: ChatIntent,
  collectionContext?: CollectionContext,
): { flowXml: string; intentXml: string } {
  switch (intent.type) {
    case "fileUploaded":
      return buildFileUploadedInstructions(intent.context, collectionContext);
    case "documentCreated":
      return {
        flowXml: "",
        intentXml: buildDocumentCreatedInstructions(
          intent.context,
          collectionContext,
        ),
      };
    case "questionWrong":
      return {
        flowXml: "",
        intentXml: buildQuestionWrongInstructions(intent.context),
      };
    case "flashcardStruggle":
      return {
        flowXml: "",
        intentXml: buildFlashcardStruggleInstructions(intent.context),
      };
    case "sessionStart":
      return {
        flowXml: "",
        intentXml: buildSessionStartInstructions(intent.context),
      };
    default:
      return { flowXml: "", intentXml: "" };
  }
}

/**
 * Build instructions for fileUploaded intent.
 * Returns flowXml (flow instructions + onboarding) and intentXml (upload event details)
 */
function buildFileUploadedInstructions(
  context: FileUploadedContext,
  collectionContext?: CollectionContext,
): { flowXml: string; intentXml: string } {
  const flowParts: string[] = [];
  const intentParts: string[] = [];

  // Flow-specific prompt (if setup mode active) - goes early in prompt
  if (
    context.setupContext?.isSetupModeActive &&
    context.setupContext.flowType
  ) {
    flowParts.push(
      `<flow_instructions type="${context.setupContext.flowType}" priority="critical">`,
    );
    flowParts.push(FLOW_PROMPTS[context.setupContext.flowType]);
    flowParts.push("</flow_instructions>");
  }

  // Onboarding prompt (if first-ever upload) - goes with flow instructions
  if (context.setupContext?.isFirstEverUpload) {
    flowParts.push(ONBOARDING_PROMPT);
  }

  // Upload event details - goes at end of prompt
  intentParts.push('<intent_event type="fileUploaded">');
  intentParts.push("  <uploaded_documents>");
  for (const doc of context.uploadedDocuments) {
    intentParts.push(
      `    <document id="${escapeXml(doc.documentId)}" name="${escapeXml(doc.documentName)}">`,
    );
    intentParts.push(
      `      <text_preview>${escapeXml(doc.extractedTextPreview)}</text_preview>`,
    );
    intentParts.push("    </document>");
  }
  intentParts.push("  </uploaded_documents>");
  intentParts.push("");
  intentParts.push("  <instructions>");
  intentParts.push(
    "  A file upload just completed. This is NOT a user message - it's a system event.",
  );
  intentParts.push("  Respond based on your flow-specific instructions above.");
  intentParts.push("  Keep your response brief and actionable.");
  intentParts.push(
    "  IMPORTANT: Set unlockNextUpload: true in your response to allow immediate follow-up uploads.",
  );
  intentParts.push("  </instructions>");
  intentParts.push("</intent_event>");

  return {
    flowXml: flowParts.join("\n"),
    intentXml: intentParts.join("\n"),
  };
}

/**
 * Build instructions for questionWrong intent (future use)
 */
function buildQuestionWrongInstructions(context: {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  attemptCount: number;
  topic?: string;
}): string {
  const parts: string[] = [];
  parts.push('<intent_event type="questionWrong">');
  parts.push(`  <question_id>${escapeXml(context.questionId)}</question_id>`);
  parts.push(`  <user_answer>${escapeXml(context.userAnswer)}</user_answer>`);
  parts.push(
    `  <correct_answer>${escapeXml(context.correctAnswer)}</correct_answer>`,
  );
  parts.push(`  <attempt_count>${context.attemptCount}</attempt_count>`);
  if (context.topic) {
    parts.push(`  <topic>${escapeXml(context.topic)}</topic>`);
  }
  parts.push("  <instructions>");
  parts.push(
    "  The student just got this question wrong. Help them understand why their answer was incorrect.",
  );
  parts.push(
    "  Use Socratic method - guide them to the right answer through questions.",
  );
  parts.push(
    "  Don't just give them the answer; help them understand the concept.",
  );
  parts.push("  </instructions>");
  parts.push("</intent_event>");
  return parts.join("\n");
}

/**
 * Build instructions for flashcardStruggle intent (future use)
 */
function buildFlashcardStruggleInstructions(context: {
  cardId: string;
  term: string;
  againCount: number;
  lastInterval?: number;
}): string {
  const parts: string[] = [];
  parts.push('<intent_event type="flashcardStruggle">');
  parts.push(`  <card_id>${escapeXml(context.cardId)}</card_id>`);
  parts.push(`  <term>${escapeXml(context.term)}</term>`);
  parts.push(`  <again_count>${context.againCount}</again_count>`);
  parts.push("  <instructions>");
  parts.push(
    "  The student is struggling with this flashcard (marked 'Again' multiple times).",
  );
  parts.push("  Offer to help them understand the concept better.");
  parts.push(
    "  Suggest mnemonics, connections to other concepts, or alternative explanations.",
  );
  parts.push("  </instructions>");
  parts.push("</intent_event>");
  return parts.join("\n");
}

/**
 * Build instructions for sessionStart intent (future use)
 */
function buildSessionStartInstructions(context: {
  documentId: string;
  lastVisited?: string;
  resumeContext?: string;
}): string {
  const parts: string[] = [];
  parts.push('<intent_event type="sessionStart">');
  parts.push(`  <document_id>${escapeXml(context.documentId)}</document_id>`);
  if (context.lastVisited) {
    parts.push(
      `  <last_visited>${escapeXml(context.lastVisited)}</last_visited>`,
    );
  }
  if (context.resumeContext) {
    parts.push(
      `  <resume_context>${escapeXml(context.resumeContext)}</resume_context>`,
    );
  }
  parts.push("  <instructions>");
  parts.push(
    "  The student just opened this document. Welcome them back briefly.",
  );
  parts.push(
    "  If there's resume context, offer to pick up where they left off.",
  );
  parts.push("  </instructions>");
  parts.push("</intent_event>");
  return parts.join("\n");
}
