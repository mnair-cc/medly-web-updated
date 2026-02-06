import { QuestionWithMarkingResult } from "@/app/types/types";

const Lined = ({
  isMarking,
  userAnswer,
  setUserAnswer,
  onPressPrimaryButton,
  setIsTextareaFocused,
  currentQuestionWithMarkingResult,
  type = 'box',
}: {
  isMarking: boolean;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;

  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  onPressPrimaryButton: () => void;
  setIsTextareaFocused: (focused: boolean) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  type: 'box' | 'lined'
}) => {

  // Helper function to escape special regex characters
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const markdownStyles = `
  [&_h1]:text-2xl
  [&_h1]:mb-4
  [&_h1]:font-bold

  [&_table]:table-fixed 
  [&_table]:border
  [&_table]:border-[#f2f2f7]
  [&_table]:rounded-[16px]
  [&_table]:my-8
  [&_table]:mx-auto
  
  [&_table_td]:px-4
  [&_table_td]:border-r
  [&_table_td]:border-[#f2f2f7]
  [&_table_td]:text-center
  [&_table_td:last-child]:border-r-0
  
  [&_table_th]:px-4
  [&_table_th]:border-b
  [&_table_th]:border-r
  [&_table_th]:bg-[#F8F8FB]
  [&_table_th]:border-[#f2f2f7]
  [&_table_th]:font-medium
  [&_table_th]:text-center
  [&_table_th:last-child]:border-r-0
  
  [&_table_tr:last-child_td]:border-b-0
  
  [&_img]:py-4 
  [&_img]:max-h-[400px] 
  [&_img]:mx-auto

  [&_p]:mb-4
  [&_br]:mb-4
`;
  const formatTextWithHighlighting = (text: string) => {
    if (!text) return null;

    let processedText = text;

    // First apply annotations if they exist in the current question
    if (currentQuestionWithMarkingResult.annotations) {
      let annotations;

      // Handle annotations based on type
      if (typeof currentQuestionWithMarkingResult.annotations === 'string') {
        // Parse string format
        const annotationsString = currentQuestionWithMarkingResult.annotations as string;
        const strongMatch = annotationsString.match(/strong=\[(.*?)\]/);
        const weakMatch = annotationsString.match(/weak=\[(.*?)\]/);

        const parseArray = (matchResult: RegExpMatchArray | null): string[] => {
          if (!matchResult || !matchResult[1]) return [];
          return matchResult[1]
            .split(',')
            .map(item => item.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, ''))
            .filter(item => item.length > 0);
        };

        annotations = {
          strong: parseArray(strongMatch),
          weak: parseArray(weakMatch)
        };
      }
      // Handle annotations as direct object
      else if (typeof currentQuestionWithMarkingResult.annotations === 'object') {
        // Handle both direct object and array of objects cases
        if (Array.isArray(currentQuestionWithMarkingResult.annotations)) {
          if (currentQuestionWithMarkingResult.annotations.length > 0) {
            annotations = currentQuestionWithMarkingResult.annotations[0];
          }
        } else {
          // Direct object with strong/weak properties
          annotations = currentQuestionWithMarkingResult.annotations;
        }
        
        // Filter out empty strings from both strong and weak arrays
        if (annotations) {
          if (annotations.strong && Array.isArray(annotations.strong)) {
            annotations.strong = annotations.strong.filter(item => item !== "" && item.length > 0);
          }
          if (annotations.weak && Array.isArray(annotations.weak)) {
            annotations.weak = annotations.weak.filter(item => item !== "" && item.length > 0);
          }
        }
      }

      // Apply strong highlights (bold)
      if (annotations?.strong && annotations.strong.length > 0) {
        annotations.strong.forEach(strongText => {
          if (processedText.includes(strongText)) {
            // Use regex with escaped text to replace all occurrences
            const escapedStrongText = escapeRegExp(strongText);
            const regex = new RegExp(escapedStrongText, 'g');
            processedText = processedText.replace(regex, `**${strongText}**`);
          }
        });
      }

      // Apply weak highlights (code formatting)
      if (annotations?.weak && annotations.weak.length > 0) {
        annotations.weak.forEach(weakText => {
          if (processedText.includes(weakText)) {
            // Avoid conflicting with strong formatting
            const escapedWeakText = escapeRegExp(weakText);
            const regex = new RegExp(`(\\*\\*)?${escapedWeakText}(\\*\\*)?`, 'g');
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
          type: 'text',
          content: processedText.substring(currentIndex, match.index),
        });
      }

      // Process the matched content
      const content = match[0];
      if (content.startsWith('**') && content.endsWith('**')) {
        // Bold text
        parts.push({
          type: 'bold',
          content: content.substring(2, content.length - 2),
        });
      } else if (content.startsWith('`') && content.endsWith('`')) {
        // Code text
        parts.push({
          type: 'code',
          content: content.substring(1, content.length - 1),
        });
      }

      currentIndex = match.index + content.length;
    }

    // Add any remaining text
    if (currentIndex < processedText.length) {
      parts.push({
        type: 'text',
        content: processedText.substring(currentIndex),
      });
    }

    // Render the parts with appropriate styling
    return parts.map((part, i) => {
      if (part.type === 'bold') {
        return <span key={i} className="bg-[#E6FFBC] py-0.5 px-1 -m-1 rounded-[4px]">{part.content}</span>;
      } else if (part.type === 'code') {
        return (<span key={i} className="bg-[#FFC0C0] py-0.5 px-1 -m-1 rounded-[4px]">{part.content}</span>);
      }
      return <span key={i}>{part.content}</span>;
    });
  };

  if (!currentQuestionWithMarkingResult.markingTable) {
    return (
      <div className="px-4 md:px-6 pt-2 md:pt-4 ">
        <div className="flex flex-col gap-2">
          {type === 'lined' ? (
            <textarea
              className="outline-none resize-none p-4 md:mb-2 overflow-y-hidden text-[18px] md:text-[18px] font-['Shantell_Sans'] font-[500] w-full"
              style={{
                minHeight: `${(currentQuestionWithMarkingResult.maxMark || 1) *
                  (currentQuestionWithMarkingResult.legacyId?.includes("Maths") ? 4 : 2) * 30}px`,
                backgroundColor: "transparent",
                backgroundImage: "linear-gradient(#F0F0F0 1px, transparent 1px)",
                backgroundSize: "100% 30px",
                backgroundPosition: "0 29px",
                lineHeight: "30px",
                paddingTop: "0px",
              }}
              id="userAnswer"
              name="userAnswer"
              placeholder="Write your answer here"
              value={typeof userAnswer === "string" ? userAnswer : ""}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                // Auto-resize logic
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  if (typeof userAnswer === "string" && userAnswer.length > 0) {
                    onPressPrimaryButton();
                  }
                }
              }}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
            />
          ) : (
            <textarea
              className="outline-none resize-none bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 md:mb-2 overflow-y-hidden text-[18px] md:text-[18px] font-['Shantell_Sans'] font-[500] w-full"
              style={{ height: "auto" }}
              id="userAnswer"
              name="userAnswer"
              placeholder="Your answer"
              value={typeof userAnswer === "string" ? userAnswer : ""}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                // Auto-resize logic
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  if (typeof userAnswer === "string" && userAnswer.length > 0) {
                    onPressPrimaryButton();
                  }
                }
              }}
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
            />
          )}
        </div>
      </div>
    );
  }

  if (currentQuestionWithMarkingResult.markingTable) {
    return (
      <div className="px-4 md:px-6 pt-2 md:pt-4">
        {type === 'lined' ? (
          <div
            className="outline-none resize-none p-4 md:mb-2 overflow-y-hidden text-[18px] md:text-[18px] font-['Shantell_Sans'] font-[500] w-full"
            style={{
              minHeight: `${(currentQuestionWithMarkingResult.maxMark || 1) *
                (currentQuestionWithMarkingResult.legacyId?.includes("Maths") ? 4 : 2) * 30}px`,
              backgroundColor: "transparent",
              backgroundImage: "linear-gradient(#F0F0F0 1px, transparent 1px)",
              backgroundSize: "100% 30px",
              backgroundPosition: "0 29px",
              lineHeight: "30px",
              paddingTop: "0px",
              whiteSpace: "pre-wrap",
            }}
          >
            {typeof userAnswer === "string" && formatTextWithHighlighting(userAnswer)}
          </div>
        ) : (
          <div className="outline-none resize-none pb-8 bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 mb-2 text-[18px] md:text-[18px] font-['Shantell_Sans'] font-[500] w-full">
            {typeof currentQuestionWithMarkingResult.annotatedAnswer === "string" &&
              currentQuestionWithMarkingResult.annotatedAnswer.length >=
              0.75 * (typeof currentQuestionWithMarkingResult.userAnswer === "string" ?
                currentQuestionWithMarkingResult.userAnswer.length : 0) ? (
              currentQuestionWithMarkingResult.annotatedAnswer
                .split(/(\*\*.*?\*\*|`.*?`)/)
                .map((part: string, index: number) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <span key={index} className="bg-[#FFC0C0] py-0.5 px-1 -m-1">
                        {part.slice(2, -2)}
                      </span>
                    );
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                      <span key={index} className="bg-[#E6FFBC] py-0.5 px-1 -m-1">
                        {part.slice(1, -1)}
                      </span>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })
            ) : (
              <span>{typeof currentQuestionWithMarkingResult.userAnswer === "string" &&
                currentQuestionWithMarkingResult.userAnswer}</span>
            )}
          </div>
        )}
      </div>
    );
  }
};

export default Lined;
