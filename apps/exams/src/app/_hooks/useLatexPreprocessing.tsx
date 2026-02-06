// Export the preprocessing function directly
// https://github.com/remarkjs/react-markdown/issues/785
export function preprocessLaTeX(content: string): string {
  // Step 1: Protect code blocks
  const codeBlocks: string[] = [];
  let processedContent = content.replace(
    /(```[\s\S]*?```|`[^`\n]+`)/g,
    (match, code) => {
      codeBlocks.push(code);
      return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`;
    },
  );

  // Step 2: Protect existing LaTeX expressions and convert \(...\) to $...$ and \[...\] to $$...$$ format
  const latexExpressions: string[] = [];
  processedContent = processedContent.replace(
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\?\\\((.*?)\\?\\\)|\$.*?\$)/g,
    (match, _, inlineContent) => {
      // Convert \[...\] or \\[...\\] to $$...$$ format (display math)
      if (match.startsWith("\\[") || match.startsWith("\\\\[")) {
        const displayContent = match
          .replace(/^\\+\[/, "") // Remove leading \[ or \\[
          .replace(/\\+\]$/, "") // Remove trailing \] or \\]
          .replace(/\\\\/g, "\\"); // Normalize double backslashes
        match = `$$${displayContent}$$`;
      }
      // Convert \(...\) or \\(...\\) to $...$ format (inline math)
      else if (match.startsWith("\\(") || match.startsWith("\\\\(")) {
        // Remove extra backslashes if present
        inlineContent = inlineContent.replace(/\\\\/g, "\\");
        match = `$${inlineContent}$`;
      }
      latexExpressions.push(match);
      return `<<LATEX_${latexExpressions.length - 1}>>`;
    },
  );

  // Step 3: Process custom block tags only (leave standard HTML like <svg> untouched)
  processedContent = processedContent.replace(
    /<(\w+)>([\s\S]*?)<\/\1>/g,
    (match, tagName, content) => {
      // Define a map with type and background color
      const styleMap: Record<string, string> = {
        key_terms: "#F2FBFF",
        comparison_table: "#F2FBFF",
        worked_example: "#F2FBFF",
        example: "#F2FBFF",
      };

      // Only transform if the tag is one of our known custom tags
      if (!Object.prototype.hasOwnProperty.call(styleMap, tagName)) {
        return match;
      }

      const backgroundColor = styleMap[tagName];
      return `<div style="background-color: ${backgroundColor}; border-radius: 6px; padding: 12px 16px; margin: 1rem 0; font-family: 'Helvetica Neue', sans-serif; font-size: 15px;"><h3 style="font-weight: 500; margin-top: 0; margin-bottom: 8px;">${
        tagName.charAt(0).toUpperCase() + tagName.slice(1).replace("_", " ")
      }</h3>${content}</div>`;
    },
  );

  // Step 4: Escape dollar signs that are likely currency indicators
  processedContent = processedContent.replace(/\$(?=\d)/g, "\\$");

  // Step 5: Convert bullet points from '• ' to '- '
  processedContent = processedContent.replace(/\n• /g, "\n- ");

  // Step 6: Process image captions and ensure proper spacing after SVG content
  // First, ensure there's proper spacing between SVG and markdown images
  processedContent = processedContent.replace(
    /(<\/svg>)\s*(!?\[.*?\]\(.*?\))/g,
    (match, svgEnd, markdownImg) => {
      return `${svgEnd}\n\n${markdownImg}`;
    },
  );

  // Process image captions - only display title if present, ignore alt text
  processedContent = processedContent.replace(
    /!\[(.*?)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (match, alt, src, title) => {
      if (title) {
        return `![${alt}](${src})\n<div style="font-style: italic; color: rgba(0,0,0,0.5); text-align: center; width: 70%; margin: -24px auto 32px; font-size: 14px; font-family: 'Helvetica Neue', sans-serif;">${title}</div>`;
      }
      return `![${alt}](${src})`;
    },
  );

  // Step 7: Restore LaTeX expressions
  processedContent = processedContent.replace(
    /<<LATEX_(\d+)>>/g,
    (_, index) => latexExpressions[parseInt(index)],
  );

  // Step 8: Restore code blocks
  processedContent = processedContent.replace(
    /<<CODE_BLOCK_(\d+)>>/g,
    (_, index) => codeBlocks[parseInt(index)],
  );
  return processedContent;
}

// Function to remove title caption divs from images
export function removeAltText(content: string): string {
  return content.replace(
    /!\[(.*?)\]\((.*?)\)\n<div style="font-style: italic; color: rgba\(0,0,0,0.5\); text-align: center; width: 70%; margin: -24px auto 32px; font-size: 14px; font-family: 'Helvetica Neue', sans-serif;">(.*?)<\/div>/g,
    (_, alt, src) => {
      return `![${alt}](${src})`;
    },
  );
}

// Keep the hook as well
export function useLatexPreprocessing() {
  return { preprocessLaTeX, removeAltText };
}
