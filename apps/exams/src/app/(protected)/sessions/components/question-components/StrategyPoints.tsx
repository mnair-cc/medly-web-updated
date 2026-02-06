import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { StrategyStep } from "@/app/types/types";

// Add a function to capitalize the first letter
export const capitalizeFirstLetter = (text: string): string => {
    if (!text || text.length === 0) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
};

export const processLatexFunctions = (text: string): string => {
    if (!text.match(/\$.*\$/)) {
        return text;
    }

    const replacements = [
        { pattern: /\frac/g, replacement: "\\frac" },
        { pattern: /\sqrt/g, replacement: "\\sqrt" },
        { pattern: /\sum/g, replacement: "\\sum" },
        { pattern: /\int/g, replacement: "\\int" },
        { pattern: /\lim/g, replacement: "\\lim" },
        { pattern: /\cos/g, replacement: "\\cos" },
        { pattern: /\tan/g, replacement: "\\tan" },
        { pattern: /\ln/g, replacement: "\\ln" },
        { pattern: /\exp/g, replacement: "\\exp" },
        { pattern: /\pi/g, replacement: "\\pi" },
        { pattern: /\theta/g, replacement: "\\theta" },
        { pattern: /\alpha/g, replacement: "\\alpha" },
        { pattern: /\beta/g, replacement: "\\beta" },
        { pattern: /\gamma/g, replacement: "\\gamma" },
        { pattern: /\delta/g, replacement: "\\delta" },
        { pattern: /\epsilon/g, replacement: "\\epsilon" },
        { pattern: /\omega/g, replacement: "\\omega" },
        { pattern: /\phi/g, replacement: "\\phi" },
        { pattern: /\infty/g, replacement: "\\infty" },
        { pattern: /\partial/g, replacement: "\\partial" },
        { pattern: /\nabla/g, replacement: "\\nabla" },
        { pattern: /\times/g, replacement: "\\times" },
        { pattern: /\div/g, replacement: "\\div" },
        { pattern: /\pm/g, replacement: "\\pm" },
        { pattern: /\leq/g, replacement: "\\leq" },
        { pattern: /\geq/g, replacement: "\\geq" },
        { pattern: /\neq/g, replacement: "\\neq" },
        { pattern: /\approx/g, replacement: "\\approx" },
        { pattern: /\rightarrow/g, replacement: "\\rightarrow" },
        { pattern: /\leftarrow/g, replacement: "\\leftarrow" },
        { pattern: /\leftrightarrow/g, replacement: "\\leftrightarrow" },
        { pattern: /\rightleftharpoons/g, replacement: "\\rightleftharpoons" },
        { pattern: /\ce/g, replacement: "\\ce" },
        { pattern: /\Delta/g, replacement: "\\Delta" },
        { pattern: /\degree/g, replacement: "\\degree" },
        { pattern: /\circ/g, replacement: "\\circ" },
        { pattern: /\lambda/g, replacement: "\\lambda" },
        { pattern: /\sigma/g, replacement: "\\sigma" },
        { pattern: /\nu/g, replacement: "\\nu" },
        { pattern: /\cdot/g, replacement: "\\cdot" },
        { pattern: /\to/g, replacement: "\\to" },
    ];

    return replacements.reduce(
        (processedText, { pattern, replacement }) =>
            processedText.replace(pattern, replacement),
        text
    );
};

interface StrategyPointsProps {
    strategySteps: StrategyStep[];
    currentStepIndex: number;
    isMarked: boolean;
    userMark: number;
}

const StrategyPoints: React.FC<StrategyPointsProps> = ({
    strategySteps,
    currentStepIndex,
    isMarked,
    userMark
}) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "15px" }}>
            {strategySteps.map((step, index) => {
                // Determine the state of this step
                let stepState: 'completed' | 'incomplete' | 'failed';

                if (isMarked && userMark > 0) {
                    // All steps are completed if marked with score > 0
                    stepState = 'completed';
                } else if (isMarked && userMark === 0 && index === strategySteps.length - 1) {
                    // Last step is failed if marked with score = 0
                    stepState = 'failed';
                } else {
                    // Normal progression logic
                    stepState = index < currentStepIndex ? 'completed' : 'incomplete';
                }

                return (
                    <div key={index} className="flex items-center gap-2">
                        <div className="flex ">
                            {stepState === 'completed' ? (
                                <svg
                                    width="28"
                                    height="28"
                                    viewBox="0 0 28 28"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M23.0879 13.6543C23.0879 18.6289 18.9746 22.7422 13.9912 22.7422C9.0166 22.7422 4.90332 18.6289 4.90332 13.6543C4.90332 8.67969 9.00781 4.56641 13.9824 4.56641C18.9658 4.56641 23.0879 8.67969 23.0879 13.6543Z"
                                        fill="#06B0FF"
                                    />
                                    <path
                                        d="M13.7979 17.1348C13.6133 17.4248 13.3408 17.583 13.0156 17.583C12.6904 17.583 12.4355 17.4424 12.1982 17.1436L10.124 14.6211C9.97461 14.4277 9.89551 14.2344 9.89551 14.0234C9.89551 13.584 10.2383 13.2324 10.6777 13.2324C10.9326 13.2324 11.1436 13.3291 11.3545 13.6016L12.9893 15.667L16.4873 10.0859C16.6719 9.78711 16.9092 9.6377 17.1729 9.6377C17.5947 9.6377 17.9814 9.92773 17.9814 10.3672C17.9814 10.5693 17.8848 10.7803 17.7617 10.9648L13.7979 17.1348Z"
                                        fill="white"
                                    />
                                </svg>
                            ) : stepState === 'failed' ? (
                                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM10.9941 17.4863C10.5283 17.4863 10.1592 17.1172 10.1592 16.6426C10.1592 16.4316 10.2471 16.2207 10.4141 16.0625L12.8047 13.6631L10.4141 11.2725C10.2471 11.1143 10.1592 10.9033 10.1592 10.6924C10.1592 10.2178 10.5283 9.85742 10.9941 9.85742C11.2402 9.85742 11.4336 9.93652 11.5918 10.0947L13.9912 12.4854L16.3994 10.0859C16.5752 9.91895 16.7598 9.83984 16.9971 9.83984C17.4629 9.83984 17.832 10.209 17.832 10.6748C17.832 10.8945 17.7441 11.0879 17.5771 11.2637L15.1865 13.6631L17.5771 16.0537C17.7354 16.2207 17.8232 16.4229 17.8232 16.6426C17.8232 17.1172 17.4541 17.4863 16.9795 17.4863C16.7422 17.4863 16.54 17.3984 16.373 17.2402L13.9912 14.8584L11.6094 17.2402C11.4512 17.4072 11.2402 17.4863 10.9941 17.4863Z" fill="#FF4B4C" />
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
                                        d="M13.9912 22.7422C18.9746 22.7422 23.0879 18.6289 23.0879 13.6543C23.0879 8.67969 18.9658 4.56641 13.9824 4.56641C9.00781 4.56641 4.90332 8.67969 4.90332 13.6543C4.90332 18.6289 9.0166 22.7422 13.9912 22.7422ZM10.5371 14.5332C9.9834 14.5332 9.58789 14.208 9.58789 13.6719C9.58789 13.1357 9.96582 12.793 10.5371 12.793H17.4453C18.0166 12.793 18.3857 13.1357 18.3857 13.6719C18.3857 14.208 17.999 14.5332 17.4453 14.5332H10.5371Z"
                                        fill="#F2F2F7"
                                    />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1 font-rounded-semibold">
                            {step.title}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StrategyPoints; 