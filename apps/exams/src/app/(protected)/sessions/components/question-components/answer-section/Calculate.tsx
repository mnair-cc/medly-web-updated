import { QuestionWithMarkingResult } from "@/app/types/types";
import "katex/dist/katex.min.css";
import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";

// Register the MathField web component
import "mathlive";

const Calculate = ({
  isMarking,
  userAnswer,
  setUserAnswer,
  onPressPrimaryButton,
  setIsTextareaFocused,
  currentQuestionWithMarkingResult,
}: {
  isMarking: boolean;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;

  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  onPressPrimaryButton: () => void;
  setIsTextareaFocused: (focused: boolean) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
}) => {
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const [mode, setMode] = useState<"text" | "math">("math");

  // Initialize and customize the mathfield when it's mounted
  useEffect(() => {
    if (mathfieldRef.current) {
      // Configure mathfield options
      mathfieldRef.current.smartFence = true;
      mathfieldRef.current.mathModeSpace = "\\:";
      mathfieldRef.current.focus();

      // Add event listener for keydown to handle Enter key
      // mathfieldRef.current.addEventListener('keydown', (e) => {
      //   if (e.key === 'Enter' && !e.shiftKey) {
      //     e.preventDefault();
      //     mathfieldRef.current?.insert('\\newline');
      //   }
      // });
    }

    // Clean up event listener on unmount
    // return () => {
    //   if (mathfieldRef.current) {
    //     mathfieldRef.current.removeEventListener('keydown', (e) => {
    //       if (e.key === 'Enter' && !e.shiftKey) {
    //         e.preventDefault();
    //         mathfieldRef.current?.insert('\\newline');
    //       }
    //     });
    //   }
    // };
  }, []);

  // Reset the mathfield when the question changes
  useEffect(() => {
    if (!currentQuestionWithMarkingResult.annotatedAnswer) {
      setUserAnswer("");
      if (mathfieldRef.current) {
        mathfieldRef.current.value = "";
        mathfieldRef.current.placeholder = "Answer";
        mathfieldRef.current.focus();
      }
    }
  }, [currentQuestionWithMarkingResult.id, setUserAnswer]);

  useEffect(() => {
    if (mathfieldRef.current && typeof userAnswer === "string") {
      mathfieldRef.current.value = userAnswer;
    }
  }, [userAnswer]);

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

  // if (!currentQuestionWithMarkingResult.annotatedAnswer && isMarking) {
  //   return (
  //     <div className="px-4 md:px-6 pt-2 md:pt-4 bg-white">
  //       <div className="flex flex-col gap-2">
  //         <div className="outline-none resize-none pb-8 bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 mb-2 text-gray-500 text-[17px] md:text-[17px]">
  //           {typeof userAnswer === "string" && userAnswer}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!currentQuestionWithMarkingResult.annotatedAnswer) {
  return (
    <div className="px-4 md:px-6 pt-2 md:pt-4">
      <div className="flex flex-col gap-2 w-[100%] justify-center items-center mb-2">
        <style jsx>{`
          math-field::part(virtual-keyboard-toggle) {
            display: none;
          }
          math-field::part(menu-toggle) {
            display: none;
          }
          math-field::placeholder {
            color: #9ca3af;
            opacity: 1;
          }
        `}</style>
        {mode === "math" ? (
          <math-field
            ref={mathfieldRef}
            id="userAnswer"
            style={{
              fontSize: "18px",
              padding: "16px",
              backgroundColor: "#F7F7FB",
              border: "1px solid #EFEFF6",
              borderRadius: "16px",
              width: "100%",
              overflowX: "scroll",
              whiteSpace: "normal",
            }}
            onInput={(evt) => setUserAnswer(evt.target.value)}
            onFocus={() => {
              setIsTextareaFocused(true);
              if (mathfieldRef.current) {
                mathfieldRef.current.executeCommand("toggleVirtualKeyboard"); // required to prevent keyboard not showing inputs
              }
            }}
            onBlur={() => setIsTextareaFocused(false)}
            virtual-keyboard-mode="manual"
            disabled={
              isMarking || currentQuestionWithMarkingResult.annotatedAnswer
            }
            smart-fence="true"
            multiline
          >
            {currentQuestionWithMarkingResult.userAnswer?.length > 0
              ? currentQuestionWithMarkingResult.userAnswer
              : userAnswer}
          </math-field>
        ) : (
          <textarea
            className="outline-none resize-none bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 overflow-y-hidden text-[15px] md:text-[15px] w-full"
            style={{ height: "auto" }}
            // maxLength={1024}
            // maxLength={}
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

            // autoFocus={true}
          />
        )}

        <div className="absolute right-10">
          <button
            className="p-2"
            title={mode === "math" ? "Switch to text" : "Switch to math"}
            onClick={() => setMode(mode === "math" ? "text" : "math")}
          >
            {mode === "math" ? (
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.29688 20.2373C4.89453 20.2373 5.21094 19.9912 5.4043 19.3584L6.3623 16.6514H11.3721L12.3301 19.3584C12.5234 19.9912 12.8398 20.2373 13.4375 20.2373C14.0703 20.2373 14.4746 19.8594 14.4746 19.2705C14.4746 19.0508 14.4395 18.8662 14.3516 18.6201L10.4844 8.16113C10.2119 7.39648 9.70215 7.03613 8.87598 7.03613C8.08496 7.03613 7.5752 7.39648 7.31152 8.15234L3.41797 18.6729C3.33008 18.9014 3.29492 19.0947 3.29492 19.2881C3.29492 19.877 3.67285 20.2373 4.29688 20.2373ZM6.87207 14.999L8.84961 9.30371H8.90234L10.8799 14.999H6.87207ZM19.6338 20.3076C21.1455 20.3076 22.2969 19.6045 22.833 18.3477H22.9033V19.4111C22.9121 19.9824 23.2812 20.3164 23.791 20.3164C24.3271 20.3164 24.6963 19.9648 24.6963 19.376V11.1582C24.6963 10.5605 24.3271 10.209 23.791 10.209C23.2725 10.209 22.9033 10.5605 22.9033 11.1582V12.2129H22.833C22.2969 10.9736 21.1016 10.2266 19.6338 10.2266C17.1904 10.2266 15.5908 12.2305 15.5908 15.2627C15.5908 18.3125 17.1904 20.3076 19.6338 20.3076ZM20.1611 18.752C18.5264 18.752 17.498 17.4072 17.498 15.2715C17.498 13.1357 18.5264 11.7822 20.1611 11.7822C21.7871 11.7822 22.8594 13.1709 22.8594 15.2803C22.8594 17.4072 21.8047 18.752 20.1611 18.752Z"
                  fill="#1C1C1E"
                />
              </svg>
            ) : (
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.7627 20.2461C14.123 20.2461 14.3779 20.0439 14.3779 19.6924C14.3779 19.5342 14.3428 19.4375 14.2285 19.1914C13.2266 17.4863 12.6816 15.667 12.6816 13.6719C12.6816 11.7383 13.2002 9.83984 14.2285 8.13477C14.3428 7.88867 14.3779 7.79199 14.3779 7.63379C14.3779 7.2998 14.123 7.08008 13.7627 7.08008C13.3848 7.08008 13.0859 7.26465 12.7432 7.73926C11.4863 9.37402 10.8623 11.4219 10.8623 13.6631C10.8623 15.9131 11.4775 17.917 12.7432 19.5869C13.0771 20.0703 13.3848 20.2461 13.7627 20.2461ZM23.6592 20.2461C24.0371 20.2461 24.3447 20.0703 24.6787 19.5869C25.9531 17.917 26.5596 15.9131 26.5596 13.6631C26.5596 11.4219 25.9268 9.37402 24.6787 7.73926C24.3447 7.25586 24.0371 7.08008 23.6592 7.08008C23.2988 7.08008 23.0439 7.2998 23.0439 7.63379C23.0439 7.79199 23.0791 7.88867 23.1934 8.13477C24.2217 9.83984 24.7402 11.7383 24.7402 13.6719C24.7402 15.667 24.1953 17.4863 23.1934 19.1914C23.0791 19.4375 23.0439 19.5342 23.0439 19.6924C23.0439 20.0264 23.2988 20.2461 23.6592 20.2461ZM2.80273 20.2373C4.63965 20.2373 5.49219 19.4727 5.92285 17.4336L6.88965 12.8105H8.46289C9.00781 12.8105 9.37695 12.5117 9.37695 11.9932C9.37695 11.5361 9.06934 11.2637 8.6123 11.2637H7.22363L7.45215 10.1562C7.67188 9.10156 7.99707 8.68848 8.91113 8.68848C9.06055 8.68848 9.19238 8.67969 9.29785 8.6709C9.78125 8.60938 10.0186 8.36328 10.0186 7.9502C10.0186 7.36133 9.55273 7.08887 8.59473 7.08887C6.78418 7.08887 5.87891 7.92383 5.47461 9.88379L5.18457 11.2637H4.1123C3.55859 11.2637 3.18945 11.5625 3.18945 12.0723C3.18945 12.5381 3.49707 12.8105 3.96289 12.8105H4.85938L3.93652 17.1611C3.70801 18.2422 3.37402 18.6377 2.47754 18.6377C2.36328 18.6377 2.24023 18.6377 2.15234 18.6465C1.67773 18.7168 1.43164 18.9893 1.43164 19.3848C1.43164 19.9648 1.89746 20.2373 2.80273 20.2373ZM15.9072 18.0928C16.25 18.0928 16.4697 17.9785 16.7422 17.5742L18.6406 14.8408H18.6758L20.6182 17.627C20.8818 17.9873 21.1016 18.0928 21.4004 18.0928C21.9189 18.0928 22.2705 17.75 22.2705 17.2754C22.2705 17.0732 22.209 16.8887 22.0684 16.6953L19.8359 13.6543L22.0508 10.6924C22.209 10.4814 22.2793 10.2969 22.2793 10.0684C22.2793 9.59375 21.9102 9.27734 21.4443 9.27734C21.0664 9.27734 20.8555 9.46191 20.627 9.80469L18.8164 12.4854H18.7725L16.9443 9.7959C16.7158 9.44434 16.4873 9.27734 16.0742 9.27734C15.5732 9.27734 15.1953 9.65527 15.1953 10.1123C15.1953 10.3936 15.2832 10.5781 15.4238 10.7627L17.5684 13.6367L15.3184 16.7217C15.1426 16.9414 15.0986 17.126 15.0986 17.3457C15.0986 17.7764 15.459 18.0928 15.9072 18.0928Z"
                  fill="#1C1C1E"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  // }

  // if (currentQuestionWithMarkingResult.annotatedAnswer) {
  //   return (
  //     <div className="px-4 md:px-6 pt-2 md:pt-4">
  //       <div className="outline-none resize-none pb-8 bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 mb-2 text-[17px] md:text-[17px]">
  //         {
  //           <ReactMarkdown
  //             remarkPlugins={[
  //               remarkGfm,
  //               [remarkMath, { singleDollarTextMath: true }],
  //               remarkGemoji,
  //               supersub,
  //             ]}
  //             rehypePlugins={[rehypeKatex, rehypeRaw]}
  //             className={markdownStyles}
  //           >
  //             {preprocessLaTeX('$$' + currentQuestionWithMarkingResult.userAnswer + '$$')}
  //           </ReactMarkdown>
  //         }
  //       </div>
  //     </div>
  //   );
  // }

  return null;
};

export default Calculate;
