import { serialize, parse } from "tiptap-markdown";
import type { Editor } from "@tiptap/core";
import { defaultExtensions } from "../extensions";
import { replaceCitationsWithHtml, citationToMarkdown } from "../../citations";

/**
 * Markdown utility functions for notes editing.
 * Uses tiptap-markdown for serialization/parsing.
 */

const markdownOptions = {
  html: true, // Allow HTML in markdown for citations/highlights
  bulletListMarker: "-",
};

/**
 * Get markdown representation of editor content for AI context.
 * This is allowed to be "lossy" (e.g. stripping leftover HTML) to keep the AI
 * input clean and stable.
 */
export function getMarkdown(editor: Editor): string {
  if (!editor) return "";
  try {
    let markdown = serialize(editor.schema, editor.state.doc, {
      extensions: defaultExtensions,
      ...markdownOptions,
    });
    // Convert any serialized citation HTML spans back to Medly citation markdown
    markdown = convertCitationSpansToMarkdown(markdown);
    // Clean up any leftover HTML noise before returning to AI
    return stripInternalAttributes(markdown, { stripUnknownHtmlTags: true });
  } catch (error) {
    console.warn("Failed to serialize markdown (AI view), falling back:", error);
    try {
      // Best-effort fallback: convert HTML → markdown-ish so we keep formatting signals.
      const html = editor.getHTML();
      const withCitations = convertCitationSpansToMarkdown(html);
      const cleaned = stripInternalAttributes(withCitations, {
        stripUnknownHtmlTags: true,
      });
      return cleaned || editor.getText();
    } catch {
      return editor.getText();
    }
  }
}

/**
 * Get markdown representation of editor content for persistence.
 * This should preserve formatting as much as possible.
 *
 * Note: we still normalize citations into Medly markdown so storage is consistent:
 *   [Slide 5](cite:docId:4|...)
 */
export function getStorageMarkdown(editor: Editor): string {
  if (!editor) return "";
  try {
    let markdown = serialize(editor.schema, editor.state.doc, {
      extensions: defaultExtensions,
      ...markdownOptions,
    });
    markdown = convertCitationSpansToMarkdown(markdown);
    // Normalize common HTML-ish outputs to markdown syntax (lists/paragraphs/bold/etc),
    // but keep unknown HTML tags if they exist (e.g. highlight marks) to avoid data loss.
    return stripInternalAttributes(markdown.trim(), { stripUnknownHtmlTags: false });
  } catch (error) {
    console.warn("Failed to serialize markdown (storage), falling back:", error);
    // Fallback: store a markdown-ish version derived from HTML (keeps lists/bold/headings reasonably)
    try {
      const html = editor.getHTML();
      const withCitations = convertCitationSpansToMarkdown(html);
      const cleaned = stripInternalAttributes(withCitations, {
        stripUnknownHtmlTags: false,
      });
      return cleaned || editor.getText();
    } catch {
      return editor.getText();
    }
  }
}

/**
 * Convert serialized citation HTML spans into Medly citation markdown:
 *   <span class="citation" data-document-id="..." data-page-index="..." data-source-segment="...">Slide 5</span>
 * → [Slide 5](cite:documentId:pageIndex|sourceSegment)
 *
 * We intentionally do this with a lightweight string/attribute parser (not DOM parsing),
 * because markdown can contain raw "<" characters that shouldn't be interpreted as HTML.
 */
function convertCitationSpansToMarkdown(markdown: string): string {
  if (!markdown || !markdown.includes("<span")) return markdown;

  const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;

  return markdown.replace(spanRegex, (full, attrsRaw: string, inner: string) => {
    // Only rewrite spans that include "citation" in class and have required data attrs
    const classMatch = attrsRaw.match(/\bclass=(["'])([\s\S]*?)\1/i);
    const classValue = classMatch?.[2] ?? "";
    if (!/\bcitation\b/i.test(classValue)) return full;

    const attrs: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9_-]+)=(["'])([\s\S]*?)\2/g;
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = attrRegex.exec(attrsRaw)) !== null) {
      attrs[m[1]] = m[3];
    }

    const documentId = attrs["data-document-id"];
    const pageIndexStr = attrs["data-page-index"];
    const sourceSegment = attrs["data-source-segment"];
    if (!documentId || !pageIndexStr || !sourceSegment) return full;

    const pageIndex = Number.parseInt(pageIndexStr, 10);
    if (!Number.isFinite(pageIndex)) return full;

    // Strip any nested tags from display text
    const displayText = inner.replace(/<[^>]+>/g, "").trim() || "Source";

    return citationToMarkdown(
      { documentId, pageIndex, sourceSegment },
      displayText,
    );
  });
}

/**
 * Strip internal HTML attributes from markdown output and convert
 * leftover HTML block tags back to markdown syntax.
 *
 * These attributes (from GlobalAttributes extension) are for internal tracking
 * and confuse the AI if included in context.
 *
 * NOTE: Keeps citation spans (data-document-id, etc.) as those are needed for AI.
 */
function stripInternalAttributes(
  markdown: string,
  opts: { stripUnknownHtmlTags?: boolean } = {},
): string {
  const { stripUnknownHtmlTags = true } = opts;
  let result = markdown;

  // Convert lists WITH attributes to markdown.
  // Note: Ordered markdown commonly uses "1." for every item; renderers renumber automatically.
  const convertList = (inner: string, marker: string) => {
    // Convert li tags that may include attributes.
    const items = inner
      .replace(/<\/?p[^>]*>/gi, "") // paragraphs inside list items
      .replace(/<li[^>]*>\s*/gi, `${marker} `)
      .replace(/\s*<\/li>/gi, "\n");
    return items.trim();
  };

  result = result.replace(/<ol[^>]*>\s*([\s\S]*?)\s*<\/ol>/gi, (_m, inner) => {
    const converted = convertList(String(inner), "1.");
    return converted ? `${converted}\n` : "";
  });
  result = result.replace(/<ul[^>]*>\s*([\s\S]*?)\s*<\/ul>/gi, (_m, inner) => {
    const converted = convertList(String(inner), "-");
    return converted ? `${converted}\n` : "";
  });

  // Convert inline HTML tags to markdown FIRST (before block tags, as they may be nested)
  // Bold: <strong>text</strong> or <b>text</b> → **text**
  result = result.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  // Italic: <em>text</em> or <i>text</i> → *text*
  result = result.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  // Code: <code>text</code> → `text`
  result = result.replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`");
  // Strikethrough: <s>text</s> or <del>text</del> → ~~text~~
  result = result.replace(/<(?:s|del|strike)>([\s\S]*?)<\/(?:s|del|strike)>/gi, "~~$1~~");
  // Links: <a href="url">text</a> → [text](url)
  result = result.replace(/<a\s+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Convert leftover HTML block tags to markdown (after attrs stripped)
  // Headings: <h1>text</h1> → # text
  result = result.replace(/<h1>\s*([\s\S]*?)\s*<\/h1>/gi, "# $1");
  result = result.replace(/<h2>\s*([\s\S]*?)\s*<\/h2>/gi, "## $1");
  result = result.replace(/<h3>\s*([\s\S]*?)\s*<\/h3>/gi, "### $1");
  result = result.replace(/<h4>\s*([\s\S]*?)\s*<\/h4>/gi, "#### $1");
  result = result.replace(/<h5>\s*([\s\S]*?)\s*<\/h5>/gi, "##### $1");
  result = result.replace(/<h6>\s*([\s\S]*?)\s*<\/h6>/gi, "###### $1");

  // Paragraphs (may contain attributes): <p ...>text</p> → text (with newlines)
  result = result.replace(/<p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi, "$1\n");

  if (stripUnknownHtmlTags) {
    // Strip any remaining HTML tags (except citation spans which have data- attributes)
    // This catches any other tags we might have missed.
    result = result.replace(/<(?!span\s+[^>]*data-)[^>]+>/gi, "");
  }

  // Clean up empty lines and normalize whitespace
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

/**
 * Normalize list items to ensure they have paragraph content.
 * TipTap's listItem schema requires `content: 'paragraph block*'`, meaning
 * list items MUST start with a paragraph. Markdown-it generates "tight lists"
 * with `<li>text</li>` instead of `<li><p>text</p></li>`, which causes
 * "Invalid content for node listItem" errors.
 *
 * Uses DOM parsing to handle nested lists correctly.
 */
function normalizeListItems(html: string): string {
  if (!html.includes("<li")) return html;

  // SSR safety check - document is only available in browser
  if (typeof document === "undefined") return html;

  // Use DOM parsing to correctly handle nested lists
  const template = document.createElement("template");
  template.innerHTML = html;

  const blockTags = new Set(["P", "DIV", "UL", "OL", "BLOCKQUOTE", "PRE", "H1", "H2", "H3", "H4", "H5", "H6"]);

  // Process all li elements
  const listItems = template.content.querySelectorAll("li");
  listItems.forEach((li) => {
    // Check if the first child is already a block element
    const firstChild = li.firstElementChild;
    if (firstChild && blockTags.has(firstChild.tagName)) {
      return; // Already has block content
    }

    // Collect all inline content until we hit a block element
    const inlineNodes: Node[] = [];
    let node = li.firstChild;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (blockTags.has(el.tagName)) {
          break; // Stop at block element
        }
      }
      inlineNodes.push(node);
      node = node.nextSibling;
    }

    // If there's inline content to wrap, wrap it in a <p>
    if (inlineNodes.length > 0) {
      const p = document.createElement("p");
      // Move inline nodes into the paragraph
      inlineNodes.forEach((n) => p.appendChild(n));
      // Insert paragraph at the beginning of li
      li.insertBefore(p, li.firstChild);
    }
  });

  return template.innerHTML;
}

/**
 * Parse markdown string to ProseMirror-compatible HTML
 * tiptap-markdown parse signature: parse(schema, content, options)
 */
export function parseMarkdown(editor: Editor, markdown: string): string {
  if (!editor || !markdown) return "";
  try {
    // Pre-convert Medly citation markdown to HTML spans so TipTap can parse it
    // into the `citation` mark via `citation.ts` (parseHTML: span.citation).
    //
    // NOTE: We use className="citation" to match NotesPage event handlers.
    const withCitationHtml = replaceCitationsWithHtml(markdown, undefined, "citation");

    // parse returns HTML that can be used with setContent/insertContentAt
    const parsed = parse(editor.schema, withCitationHtml, {
      extensions: defaultExtensions,
      ...markdownOptions,
    });

    // Normalize list items to ensure they have paragraph content
    // (fixes "Invalid content for node listItem" errors from tight lists)
    return normalizeListItems(parsed);
  } catch (error) {
    console.warn("Failed to parse markdown:", error);
    // Fallback: wrap in paragraph if plain text
    return `<p>${markdown}</p>`;
  }
}

/**
 * Detect if content is markdown (vs HTML or plain text)
 */
export function isMarkdown(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();

  // If it starts with HTML tag, it's not markdown
  if (trimmed.startsWith("<")) return false;

  // Check for common markdown patterns anywhere in content (multiline mode for line-start patterns)
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headings (at start of any line)
    /\*\*[^*]+\*\*/, // Bold anywhere
    /(?<!\*)\*[^*]+\*(?!\*)/, // Italic anywhere (not bold)
    /^[-*+]\s/m, // Unordered list (at start of any line)
    /^\d+\.\s/m, // Ordered list (at start of any line)
    /\[[^\]]+\]\([^)]+\)/, // Links anywhere
    /^```/m, // Code blocks (at start of any line)
    /^>\s/m, // Blockquotes (at start of any line)
    /^---$/m, // Horizontal rule (full line)
    /==[^=]+==/,  // Highlights anywhere
  ];

  return markdownPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Convert content to HTML for editor insertion
 * Handles markdown, HTML, and plain text
 * @param wrapPlainText - If true, wrap plain text in <p> tags (for block insertion). Default false for inline.
 */
export function contentToHtml(editor: Editor, content: string, wrapPlainText = false): string {
  if (!content) return "";
  const trimmed = content.trim();

  let result: string;

  // Already HTML
  if (trimmed.startsWith("<")) {
    // Normalize list items even for pre-existing HTML
    result = normalizeListItems(content);
  } else if (isMarkdown(trimmed)) {
    // Parse markdown to HTML (normalizeListItems is called inside parseMarkdown)
    result = parseMarkdown(editor, content);
  } else {
    // Plain text - return as-is for inline insertion, or wrap in <p> for block insertion
    result = wrapPlainText ? `<p>${content}</p>` : content;
  }

  // Convert citation markdown to HTML spans (class="citation" for NotesPage handlers)
  return replaceCitationsWithHtml(result, undefined, "citation");
}
