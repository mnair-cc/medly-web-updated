import type { Citation, ParsedCitation } from "./types";

/**
 * Regex for citation format: [displayText](cite:documentId:pageIndex|sourceSegment)
 * Groups: 1=displayText, 2=documentId, 3=pageIndex, 4=sourceSegment
 */
const CITATION_REGEX = /\[([^\]]+)\]\(cite:([^:]+):(\d+)\|([^)]+)\)/g;

/**
 * Parse citation markdown and extract all citations.
 */
export function parseCitationMarkdown(content: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const regex = new RegExp(CITATION_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    citations.push({
      displayText: match[1],
      documentId: match[2],
      pageIndex: parseInt(match[3], 10),
      sourceSegment: match[4],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      rawMatch: match[0],
    });
  }

  return citations;
}

/**
 * Convert a Citation to markdown format.
 */
export function citationToMarkdown(
  citation: Citation,
  displayText: string
): string {
  return `[${displayText}](cite:${citation.documentId}:${citation.pageIndex}|${citation.sourceSegment})`;
}

/**
 * Convert a Citation to HTML data attributes.
 */
export function citationToHtmlAttrs(citation: Citation): Record<string, string> {
  return {
    "data-document-id": citation.documentId,
    "data-page-index": String(citation.pageIndex),
    "data-source-segment": citation.sourceSegment,
  };
}

/**
 * Parse HTML data attributes back into a Citation.
 */
export function parseCitationFromHtml(element: HTMLElement): Citation | null {
  const documentId = element.getAttribute("data-document-id");
  const pageIndexStr = element.getAttribute("data-page-index");
  const sourceSegment = element.getAttribute("data-source-segment");

  if (!documentId || !pageIndexStr || !sourceSegment) {
    return null;
  }

  return {
    documentId,
    pageIndex: parseInt(pageIndexStr, 10),
    sourceSegment,
  };
}

/**
 * Replace citation markdown with HTML spans.
 * Used for rendering citations in chat messages.
 */
export function replaceCitationsWithHtml(
  content: string,
  _fallbackDocumentId?: string, // Kept for API compat but unused
  className = "citation-chat"
): string {
  return content.replace(
    CITATION_REGEX,
    (_, displayText, documentId, pageIndex, sourceSegment) => {
      const escapedSourceSegment = sourceSegment
        .replace(/"/g, "&quot;")
        .replace(/[\r\n]+/g, " ");
      return `<span class="${className} cursor-pointer text-[#595959] text-[10px] hover:bg-[rgba(0,0,0,0.08)] font-rounded-bold bg-[rgba(0,0,0,0.1)] rounded-full py-1 px-2 mr-1 whitespace-nowrap" data-document-id="${documentId}" data-page-index="${pageIndex}" data-source-segment="${escapedSourceSegment}">${displayText}</span>`;
    }
  );
}

/**
 * Check if content contains any citations.
 */
export function hasCitations(content: string): boolean {
  return CITATION_REGEX.test(content);
}
