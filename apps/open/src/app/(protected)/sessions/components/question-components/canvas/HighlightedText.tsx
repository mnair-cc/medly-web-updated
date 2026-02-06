import { Highlight } from "@/app/types/types";

// Utility function to escape regex special characters
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const HighlightedText = ({
  text,
  questionAnnotations,
}: {
  text: string;
  questionAnnotations: Highlight[] | string;
}) => {
  if (!text) return null;

  let processedText = text;

  // First apply annotations if they exist in the current question
  if (questionAnnotations) {
    let annotations;

    // Handle annotations based on type
    if (typeof questionAnnotations === "string") {
      // Parse string format
      const strongMatch = questionAnnotations.match(/strong=\[(.*?)\]/);
      const weakMatch = questionAnnotations.match(/weak=\[(.*?)\]/);

      const parseArray = (matchResult: RegExpMatchArray | null): string[] => {
        if (!matchResult || !matchResult[1]) return [];
        return matchResult[1]
          .split(",")
          .map((item) =>
            item.trim().replace(/^'|'$/g, "").replace(/^"|"$/g, "")
          )
          .filter((item) => item.length > 0);
      };

      annotations = {
        strong: parseArray(strongMatch),
        weak: parseArray(weakMatch),
      };
    }
    // Handle annotations as direct object
    else if (typeof questionAnnotations === "object") {
      // Handle both direct object and array of objects cases
      if (Array.isArray(questionAnnotations)) {
        if (questionAnnotations.length > 0) {
          annotations = questionAnnotations[0];
        }
      } else {
        // Direct object with strong/weak properties
        annotations = questionAnnotations;
      }
    }

    // Apply strong highlights (bold)
    if (annotations?.strong && annotations.strong.length > 0) {
      annotations.strong.forEach((strongText) => {
        if (processedText.includes(strongText)) {
          const regex = new RegExp(escapeRegExp(strongText), "g");
          processedText = processedText.replace(regex, `**${strongText}**`);
        }
      });
    }

    // Apply weak highlights (code formatting)
    if (annotations?.weak && annotations.weak.length > 0) {
      annotations.weak.forEach((weakText) => {
        if (processedText.includes(weakText)) {
          // Avoid conflicting with strong formatting
          const regex = new RegExp(
            `(\\*\\*)?${escapeRegExp(weakText)}(\\*\\*)?`,
            "g"
          );
          processedText = processedText.replace(regex, (match, p1, p2) => {
            // If already wrapped in **, keep it that way
            if (p1 && p2) return match;
            return `\`${weakText}\``;
          });
        }
      });
    }
  }

  // Process the text with highlighting markers (both original and newly added)
  const parts = [];
  let currentIndex = 0;

  // Find all matches for both ** and ` patterns
  const regex = /(\*\*.*?\*\*)|(`.*?`)/g;
  let match;

  while ((match = regex.exec(processedText)) !== null) {
    // Add text before this match
    if (match.index > currentIndex) {
      parts.push({
        type: "text",
        content: processedText.substring(currentIndex, match.index),
      });
    }

    // Process the matched content
    const content = match[0];
    if (content.startsWith("**") && content.endsWith("**")) {
      // Bold text
      parts.push({
        type: "bold",
        content: content.substring(2, content.length - 2),
      });
    } else if (content.startsWith("`") && content.endsWith("`")) {
      // Code text
      parts.push({
        type: "code",
        content: content.substring(1, content.length - 1),
      });
    }

    currentIndex = match.index + content.length;
  }

  // Add any remaining text
  if (currentIndex < processedText.length) {
    parts.push({
      type: "text",
      content: processedText.substring(currentIndex),
    });
  }

  // Render the parts with appropriate styling
  return parts.map((part, i) => {
    if (part.type === "bold") {
      return (
        <span key={i} className="bg-[#E9FFD4] py-0.5 px-1 -m-1 rounded-[4px]">
          {part.content}
        </span>
      );
    } else if (part.type === "code") {
      return (
        <span
          key={i}
          className="bg-[#FFE0E0] py-0.5 px-1 -m-1 rounded-[4px] underline decoration-dotted underline-offset-4 decoration-red-500 decoration-2"
        >
          {part.content}
        </span>
      );
    }
    return <span key={i}>{part.content}</span>;
  });
};
