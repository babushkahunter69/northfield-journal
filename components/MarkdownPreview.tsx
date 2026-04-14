import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

export default function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  return (
    <div
      className={[
        "prose prose-neutral max-w-none",
        "prose-headings:font-semibold",
        "prose-table:w-full",
        "prose-th:border prose-th:px-3 prose-th:py-2",
        "prose-td:border prose-td:px-3 prose-td:py-2",
        "prose-li:marker:text-gray-500",
        className,
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}