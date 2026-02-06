# Citations System Specification

## Overview

Unified citation system for referencing document sources across chat, flashcards, and notes. Citations enable AI-generated content to link back to specific pages and text segments in source documents.

## Citation Format

### Markdown Format (AI-generated)

```
[Display Text](cite:documentId:pageIndex|sourceSegment)
```

**Components:**
- `Display Text` - User-visible label (e.g., "Slide 5", "Chapter 2")
- `documentId` - Firebase document ID
- `pageIndex` - 0-indexed page number
- `sourceSegment` - Text snippet for highlighting (may contain colons)

**Example:**
```
According to [Slide 5](cite:abc123def:4|The mitochondria is the powerhouse of the cell), energy production...
```

### HTML Format (Rendered)

```html
<span
  class="citation-chat"
  data-document-id="abc123def"
  data-page-index="4"
  data-source-segment="The mitochondria is the powerhouse of the cell"
>
  Slide 5
</span>
```

## Type Definition

```typescript
interface Citation {
  documentId: string;
  pageIndex: number;      // 0-indexed
  sourceSegment: string;  // Text for highlighting
}
```

## Components

### CitationChip

Reusable UI component for displaying citations.

```tsx
<CitationChip
  citation={citation}
  displayText="Slide 5"
  onClick={(citation) => navigateToCitation(citation)}
  variant="chat" // or "flashcard" | "notes"
/>
```

### CitationPreview

PDF preview modal showing the cited page with highlighted text.

```tsx
<CitationPreview
  pdfUrl="https://..."
  pageNumber={5}          // 1-based for display
  sourceText="highlighted text"
  documentId="abc123def"  // Optional, for cross-document support
/>
```

## Parsing Utilities

### parseCitationMarkdown

Extract citations from markdown content.

```typescript
const citations = parseCitationMarkdown(content);
// Returns: ParsedCitation[]
```

### replaceCitationsWithHtml

Convert citation markdown to HTML for rendering.

```typescript
const html = replaceCitationsWithHtml(content, undefined, "citation-chat");
```

### citationToMarkdown

Create citation markdown from structured data.

```typescript
const md = citationToMarkdown(citation, "Slide 5");
// Returns: "[Slide 5](cite:docId:4|text)"
```

## Usage by Surface

### Chat Messages

1. AI generates citations in markdown format with documentId
2. `MOChatThread.tsx` converts to HTML via `replaceCitationsWithHtml`
3. Click handler reads data attributes, navigates to document page
4. Hover shows `CitationPreview` modal

### Flashcards

1. Uses `FlashcardSourceReference` type (same structure as `Citation`)
2. `FlashcardMarkdown.tsx` renders `[n]` references mapped to `sourceReferences[]`
3. Click navigates to source document

### Notes (TipTap)

1. `citation.ts` TipTap mark stores data attributes (including documentId)
2. Click handler reads attributes from DOM element
3. Navigation same as chat

## Files

| File | Purpose |
|------|---------|
| `types.ts` | `Citation`, `ParsedCitation` interfaces |
| `parseCitation.ts` | Parsing and conversion utilities |
| `CitationChip.tsx` | Reusable citation UI component |
| `CitationPreview.tsx` | PDF preview with text highlighting |
| `index.ts` | Module exports |
