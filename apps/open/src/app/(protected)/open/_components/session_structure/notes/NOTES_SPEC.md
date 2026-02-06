# NotesPage TODO

## Current Extensions (extensions.ts)

- StarterKit (headings h1-h3, lists, blockquote, code blocks)
- TiptapLink
- TaskList/TaskItem (checkboxes)
- HorizontalRule
- Color/TextStyle
- Highlight (multicolor)
- Citation (custom)
- Typography
- GlobalAttributes (custom author tracking)
- ReplaceAnimation (custom)
- slashCommand

## Missing Features

### 1. Table Support
- [ ] Add `@tiptap/extension-table`
- [ ] Add `@tiptap/extension-table-row`
- [ ] Add `@tiptap/extension-table-cell`
- [ ] Add `@tiptap/extension-table-header`
- [ ] Add slash command for inserting tables
- [ ] Style tables to match Notion aesthetic
- [ ] Add table toolbar (add/remove rows/cols, merge cells)

### 2. Image Support
- [ ] Add `@tiptap/extension-image` or novel's Image extension
- [ ] Image upload handler (where to store? S3/Firebase Storage?)
- [ ] Drag & drop image support
- [ ] Paste image from clipboard
- [ ] Image resizing
- [ ] Image alignment options
- [ ] Slash command for inserting images

## Nice to Have

- [ ] Math/LaTeX support (`@tiptap/extension-mathematics`)
- [ ] Emoji picker
- [ ] Callout blocks (info, warning, tip)
- [ ] Toggle/collapsible blocks
- [ ] Columns layout

---

## AI Editing System

String-based editing tools for AI agents, similar to Claude Code's approach. AI reads/writes markdown, middleware handles Tiptap operations and animations.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    load     ┌──────────┐    read     ┌──────────┐        │
│   │ Firestore│───────────▶│  Tiptap  │───────────▶│    AI    │          │
│   │   (md)   │            │  Editor  │  markdown   │  Agent   │         │
│   └──────────┘            └──────────┘            └──────────┘          │
│        ▲                       ▲                       │                │
│        │                       │                       │                │
│        │ save                  │ middleware            │ edit           │
│        │ (md)                  │ (animations)          │ commands       │
│        │                       │                       │                │
│        │                  ┌────┴─────┐                 │                │
│        └──────────────────│editNotes │◀────────────────┘                │
│                           │middleware│                                  │
│                           └──────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key principle:** AI never touches Tiptap directly. Simple edit commands in, animations out.

### Current State vs Target

| Layer | Current | Target |
|-------|---------|--------|
| Storage (Firestore) | HTML string | Markdown string |
| AI reads | HTML (`getHTML()`) | Markdown (`getMarkdown()`) |
| AI outputs | `{ textToReplace, newText }` | Same - no change |
| Text matching | HTML string, then plain text | Plain text only |
| Animations | ✅ Works | ✅ Preserved |
| Formatting in edits | HTML tags | Markdown syntax |

### AI Interface

#### What AI Reads

```ts
// Context provided to AI agent
{
  notesMarkdown: string,     // Full document as markdown
  notesPlainText: string,    // Plain text (fallback for matching)
  headings: string[],        // Document structure
  documentName: string,
}
```

#### What AI Outputs

Simple edit commands - AI doesn't know about Tiptap:

```ts
// Single edit
{
  tool: "editNotes",
  textToReplace: string,  // Exact text to find (plain text)
  newText: string,        // Replacement (markdown allowed)
}

// Multiple edits (sequential)
{
  tool: "editNotesMultiple",
  edits: Array<{ textToReplace: string, newText: string }>
}

// Full rewrite
{
  tool: "rewriteNotes",
  newContent: string,     // Full markdown document
}
```

### Edit Operations

#### 1. Replace Text

Find exact text, replace with new content.

```ts
// Plain text replacement
{ textToReplace: "old text", newText: "new text" }

// With markdown formatting
{ textToReplace: "important", newText: "**important**" }

// Multi-line
{
  textToReplace: "## Old Section\n\nOld content",
  newText: "## New Section\n\nNew content with **bold**"
}
```

#### 2. Insert After (include anchor in newText)

```ts
// Insert paragraph after heading
{
  textToReplace: "# Introduction",
  newText: "# Introduction\n\nNew paragraph inserted here."
}

// Insert bullet point
{
  textToReplace: "- First item",
  newText: "- First item\n- New item inserted"
}
```

#### 3. Insert Before (include anchor in newText)

```ts
// Insert section before conclusion
{
  textToReplace: "# Conclusion",
  newText: "# New Section\n\nContent here.\n\n# Conclusion"
}
```

#### 4. Delete (replace with context or empty)

```ts
// Delete with context (more reliable)
{
  textToReplace: "Keep this. Delete this sentence. Keep that.",
  newText: "Keep this. Keep that."
}

// Delete standalone (if unique)
{ textToReplace: "text to delete", newText: "" }
```

### Middleware: editNotes Function

The `editNotes` function in NotesPage.tsx acts as middleware:

```
Input                    Middleware Steps                    Output
─────────────────────────────────────────────────────────────────────
textToReplace    ──▶    1. Find in doc (plain text)    ──▶  Animated
newText                 2. Get position range                replacement
                        3. Parse newText as markdown         in editor
                        4. Apply highlight decoration
                        5. Fade out old text
                        6. Insert new content
                        7. Fade in new text
                        8. Clear decorations
```

#### Position Finding (existing)

```ts
// Already exists in NotesPage.tsx
const findDocRanges = (text: string): { from: number; to: number }[] => {
  const results = [];
  const { doc } = editorInstance.state;
  doc.descendants((node, pos) => {
    if (node.isText) {
      const content = node.text || "";
      let index = content.indexOf(text);
      while (index !== -1) {
        results.push({ from: pos + index, to: pos + index + text.length });
        index = content.indexOf(text, index + text.length);
      }
    }
    return true;
  });
  return results;
};
```

#### Markdown Content Insertion (new)

```ts
// Parse markdown newText and insert as rich content
const insertMarkdownContent = (position: number, markdown: string) => {
  // Option A: Use tiptap-markdown's parser
  const content = editor.storage.markdown.parse(markdown);
  editor.commands.insertContentAt(position, content);

  // Option B: Convert markdown → HTML → insert
  const html = markdownToHtml(markdown);
  editor.commands.insertContentAt(position, html);
};
```

### String Matching Rules

Same as Claude Code's Edit tool:

1. **Must be unique** - `textToReplace` must appear exactly once
2. **Include context** - If not unique, add surrounding text
3. **Exact match** - Whitespace and formatting matter
4. **Plain text** - Match against rendered text, not markup

```ts
// ❌ Bad: "the" appears many times
{ textToReplace: "the", newText: "a" }

// ✅ Good: Include enough context
{ textToReplace: "the mitochondria is the powerhouse", newText: "mitochondria are the powerhouses" }
```

### Citations in Markdown

Citations use markdown link syntax (see CITATIONS_SPEC.md):

```markdown
According to [Slide 5](cite:abc123:4|source text here), the concept...
```

**Middleware handling:**
1. `tiptap-markdown` configured to recognize `cite:` protocol
2. Converts to Citation mark on parse
3. Serializes back to `cite:` link on save

### Animation Preservation

Animations work because:

1. **Position-based** - Decorations applied to ProseMirror positions, not storage format
2. **Plain text matching** - `findDocRanges` matches text in live doc
3. **Insertion API** - `insertContentAt` works with parsed content

Changing storage format (HTML → Markdown) doesn't affect animations because:
- Animations happen in the Tiptap layer
- Matching happens on plain text
- Storage format only affects load/save

### Implementation TODO

#### Phase 1: tiptap-markdown Setup
- [ ] Install `tiptap-markdown` package
- [ ] Add to extensions array in `extensions.ts`
- [ ] Configure serializer options
- [ ] Test `getMarkdown()` output

#### Phase 2: AI Context Update
- [ ] Change `collectNotesContext` to return markdown instead of HTML
- [ ] Update `notesHtml` → `notesMarkdown` in context collector
- [ ] Keep `notesPlainText` as fallback (`getText()`)

#### Phase 3: Edit Function Refactor
- [ ] Remove HTML string matching from `editNotes`
- [ ] Use plain text matching only (already exists for animations)
- [ ] Parse `newText` as markdown before insertion
- [ ] Test: plain text edits with animations
- [ ] Test: markdown formatting in newText

#### Phase 4: Storage Migration
- [ ] Update `updatePageNotes` to serialize as markdown
- [ ] Update load logic to parse markdown
- [ ] Update Document type comment in `content.ts`

#### Phase 5: Citation Round-trip
- [ ] Configure `tiptap-markdown` to handle `cite:` links
- [ ] Test: citation in markdown → Citation mark → markdown
- [ ] Verify citation hover/click still works

#### Phase 6: Custom Syntax (if needed)
- [ ] Highlights: `==highlighted==` syntax support
- [ ] Author tracking: decide on format (HTML comment, metadata, or skip)

### Files to Modify

| File | Changes |
|------|---------|
| `extensions.ts` | Add tiptap-markdown extension |
| `NotesPage.tsx` | Refactor editNotes, update context collector |
| `useSessionOpen.tsx` | No changes (just passes string) |
| `content.ts` | Update comment for pageNotes field |
| `MOChatLayoutClient.tsx` | Update context type if needed |
