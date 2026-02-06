import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

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

interface FeedbackPointsProps {
    feedbackPoints: { text: string, mark: number }[];
}

const FeedbackPoints: React.FC<FeedbackPointsProps> = ({
    feedbackPoints,
}) => {
    return (
        <div className="space-y-2">
            {feedbackPoints.map((point, index) => {
                // Determine the state of this step based on mark
                let stepState: 'completed' | 'incomplete' | 'failed';

                if (point.mark === 1) {
                    stepState = 'completed';
                } else if (point.mark === -1) {
                    stepState = 'failed';
                } else {
                    stepState = 'incomplete';
                }

                return (
                    <div key={index} className="flex items-start gap-2">
                        <div className="flex ">
                            {stepState === 'completed' ? (
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 20 19"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M19.0879 9.6543C19.0879 14.6289 14.9746 18.7422 9.99121 18.7422C5.0166 18.7422 0.90332 14.6289 0.90332 9.6543C0.90332 4.67969 5.00781 0.566406 9.98242 0.566406C14.9658 0.566406 19.0879 4.67969 19.0879 9.6543Z"
                                        fill="#E4FFB7"
                                    />
                                    <path
                                        d="M9.79785 13.1348C9.61328 13.4248 9.34082 13.583 9.01562 13.583C8.69043 13.583 8.43555 13.4424 8.19824 13.1436L6.12402 10.6211C5.97461 10.4277 5.89551 10.2344 5.89551 10.0234C5.89551 9.58398 6.23828 9.23242 6.67773 9.23242C6.93262 9.23242 7.14355 9.3291 7.35449 9.60156L8.98926 11.667L12.4873 6.08594C12.6719 5.78711 12.9092 5.6377 13.1729 5.6377C13.5947 5.6377 13.9814 5.92773 13.9814 6.36719C13.9814 6.56934 13.8848 6.78027 13.7617 6.96484L9.79785 13.1348Z"
                                        fill="#7CC500"
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
                        <div className="flex-1">
                            <ReactMarkdown
                                className="text-base md:text-[15px] font-rounded-semibold"
                                remarkPlugins={[
                                    remarkGfm,
                                    [remarkMath, { singleDollarTextMath: true }],
                                ]}
                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                            >
                                {capitalizeFirstLetter(processLatexFunctions(point.text))}
                            </ReactMarkdown>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FeedbackPoints; 