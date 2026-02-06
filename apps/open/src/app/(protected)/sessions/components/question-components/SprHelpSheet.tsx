import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const SprHelpSheet = () => {
  return (
    <div className="px-10 pt-5">
      <h1 className="text-lg font-bold mb-4">
        Student-produced response directions
      </h1>
      <ul className="list-disc pl-5 mt-4 text-base space-y-2">
        <li>
          If you find <strong>more than one correct answer</strong>, enter only
          one answer.
        </li>
        <li>
          You can enter up to 5 characters for a <strong>positive</strong>{" "}
          answer and up to 6 characters (including the negative sign) for a{" "}
          <strong>negative</strong> answer.
        </li>
        <li>
          If your answer is a <strong>fraction</strong> that doesn&apos;t fit in
          the provided space, enter the decimal equivalent.
        </li>
        <li>
          If your answer is a <strong>decimal</strong> that doesn&apos;t fit in
          the provided space, enter it by truncating or rounding at the fourth
          digit.
        </li>
        <li>
          If your answer is a <strong>mixed number</strong> (such as 3½), enter
          it as an improper fraction (7/2) or its decimal equivalent (3.5).
        </li>
        <li>
          Don&apos;t enter <strong>symbols</strong> such as a percent sign,
          comma, or dollar sign.
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-4 text-center">Examples</h2>

      <table className="w-full border-collapse border border-gray-400 text-base">
        <thead>
          <tr>
            <th className="border border-gray-400 p-3 bg-gray-100 font-bold text-base">
              Answer
            </th>
            <th className="border border-gray-400 p-3 bg-gray-100 font-bold text-base">
              Acceptable ways to enter answer
            </th>
            <th className="border border-gray-400 p-3 bg-gray-100 font-bold text-base">
              Unacceptable: will NOT receive credit
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 p-3 text-center font-bold text-lg">
              3.5
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">3.5</div>
              <div className="py-1">3.50</div>
              <div className="py-1">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  className="inline-block text-base"
                >
                  {`$\\frac{7}{2}$`}
                </ReactMarkdown>
              </div>
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  className="inline-block text-base"
                >
                  {`$\\frac{31}{2}$`}
                </ReactMarkdown>
              </div>
              <div className="py-1">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  className="inline-block text-base"
                >
                  {`$3\\frac{1}{2}$`}
                </ReactMarkdown>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-3 text-center font-bold text-lg">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
                className="inline-block text-lg"
              >
                {`$\\frac{2}{3}$`}
              </ReactMarkdown>
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  className="inline-block text-base"
                >
                  {`$\\frac{2}{3}$`}
                </ReactMarkdown>
              </div>
              <div className="py-1">.6666</div>
              <div className="py-1">.6667</div>
              <div className="py-1">0.666</div>
              <div className="py-1">0.667</div>
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">0.66</div>
              <div className="py-1">.66</div>
              <div className="py-1">0.67</div>
              <div className="py-1">.67</div>
            </td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-3 text-center font-bold text-lg">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
                className="inline-block text-lg"
              >
                {`$-\\frac{1}{3}$`}
              </ReactMarkdown>
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  className="inline-block text-base"
                >
                  {`$-\\frac{1}{3}$`}
                </ReactMarkdown>
              </div>
              <div className="py-1">-.3333</div>
              <div className="py-1">-0.333</div>
            </td>
            <td className="border border-gray-400 p-3 text-center text-base">
              <div className="py-1">-.33</div>
              <div className="py-1">-0.33</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SprHelpSheet;
