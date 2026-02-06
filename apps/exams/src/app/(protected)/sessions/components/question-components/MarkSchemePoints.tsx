import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";

const MarkSchemePoints = ({ markScheme }: { markScheme: string[] }) => {
  return (
    <div>
      <ol className="flex flex-col gap-2">
        {markScheme.map((explanation, index) => (
          <li key={index} className="flex gap-2">
            <ReactMarkdown
              className="text-base md:text-sm"
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: true }],
              ]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
            >
              {`${index + 1}.\u00A0${explanation}`}
            </ReactMarkdown>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default MarkSchemePoints;
