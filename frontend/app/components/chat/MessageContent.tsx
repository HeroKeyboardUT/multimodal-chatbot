"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import {
  MermaidDiagram,
  SVGRenderer,
  HTMLPreview,
  JSONViewer,
  CodeBlock,
} from "./CodeRenderers";
import { ChartRenderer } from "./ChartRenderer";
import {
  tryParseChartJSON,
  isChartConfig,
  preprocessMathContent,
  preprocessChartContent,
} from "./utils";

interface MessageContentProps {
  content: string;
}

/**
 * Markdown table components
 */
const tableComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3 bg-neutral-800 rounded-lg border border-neutral-700">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-neutral-800">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-neutral-700">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="hover:bg-neutral-800/50 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-300 whitespace-nowrap border-b border-neutral-700">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2 text-sm text-neutral-200 whitespace-nowrap">
      {children}
    </td>
  ),
};

/**
 * Text formatting components
 */
const textComponents = {
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-outside ml-4 space-y-1 my-2 text-sm">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-outside ml-4 space-y-1 my-2 text-sm">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm">{children}</li>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 text-sm leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      className="text-neutral-600 dark:text-neutral-300 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

/**
 * Code block component with smart rendering
 */
function CodeComponent({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const isInline = !className;
  const codeString = String(children).replace(/\n$/, "");

  // Inline code
  if (isInline) {
    return (
      <code
        className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono text-neutral-800 dark:text-neutral-200"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Mermaid diagrams
  if (language === "mermaid") {
    return <MermaidDiagram code={codeString} />;
  }

  // SVG content
  if (language === "svg" || codeString.trim().startsWith("<svg")) {
    return <SVGRenderer code={codeString} />;
  }

  // HTML preview
  if (language === "html" && codeString.includes("<")) {
    return <HTMLPreview code={codeString} />;
  }

  // JSON/Chart handling
  if (
    language === "json" ||
    language === "tool-output" ||
    language === "chart"
  ) {
    const parsed = tryParseChartJSON(codeString);

    if (parsed !== null) {
      if (isChartConfig(parsed)) {
        return <ChartRenderer config={parsed} />;
      }
      return (
        <JSONViewer
          data={parsed}
          title={language === "tool-output" ? "Tool Output" : undefined}
        />
      );
    }
  }

  // Regular code block
  return <CodeBlock code={codeString} language={language} />;
}

/**
 * Message content renderer with Markdown support
 */
export function MessageContent({ content }: MessageContentProps) {
  const processedContent = preprocessChartContent(
    preprocessMathContent(content),
    tryParseChartJSON,
    isChartConfig,
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code: CodeComponent,
        pre: ({ children }) => <>{children}</>,
        ...tableComponents,
        ...textComponents,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
