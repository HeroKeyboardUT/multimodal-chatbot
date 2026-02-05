"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Eye } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";
import { CopyButton } from "./CopyButton";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
});

/**
 * Mermaid diagram renderer
 */
export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError("");
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to render diagram";
        setError(errorMessage);
      }
    };
    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="my-3 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
        <p className="text-red-400 text-sm">Mermaid Error: {error}</p>
        <pre className="mt-2 text-xs text-neutral-400 overflow-x-auto">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-neutral-900 rounded-lg overflow-x-auto">
      <div
        ref={containerRef}
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

/**
 * SVG content renderer
 */
export function SVGRenderer({ code }: { code: string }) {
  if (!code.trim().startsWith("<svg")) {
    return (
      <div className="my-3 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-400 text-sm">Invalid SVG content</p>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-x-auto">
      <div
        className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: code }}
      />
    </div>
  );
}

/**
 * HTML preview with toggle
 */
export function HTMLPreview({ code }: { code: string }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="my-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md transition-colors"
        >
          {showPreview ? (
            <Eye className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {showPreview ? "Show Code" : "Preview HTML"}
        </button>
      </div>

      {showPreview ? (
        <div className="border border-neutral-600 rounded-lg overflow-hidden">
          <iframe
            srcDoc={code}
            className="w-full min-h-50 bg-white"
            sandbox="allow-scripts"
            title="HTML Preview"
          />
        </div>
      ) : (
        <div className="relative group">
          <CopyButton code={code} />
          <SyntaxHighlighter
            style={oneDark}
            language="html"
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              padding: "1rem",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

/**
 * JSON viewer component
 */
export function JSONViewer({ data, title }: { data: unknown; title?: string }) {
  const jsonString =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return (
    <div className="my-3">
      {title && (
        <div className="px-3 py-1.5 text-xs font-mono text-neutral-400 bg-[#2d2d2d] rounded-t-lg border-b border-neutral-700">
          {title}
        </div>
      )}
      <div className="relative group">
        <CopyButton code={jsonString} />
        <SyntaxHighlighter
          style={oneDark}
          language="json"
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: title ? "0 0 0.5rem 0.5rem" : "0.5rem",
            fontSize: "0.875rem",
            padding: "1rem",
          }}
        >
          {jsonString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/**
 * Code block with syntax highlighting
 */
export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="relative group my-3">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-xs font-mono text-neutral-400 bg-[#2d2d2d] rounded-tl-lg rounded-br-lg border-b border-r border-neutral-700 z-10">
          {language}
        </div>
      )}
      <CopyButton code={code} />
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          padding: language ? "2.5rem 1rem 1rem 1rem" : "1rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
