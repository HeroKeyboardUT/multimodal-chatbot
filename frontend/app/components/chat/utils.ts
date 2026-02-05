/**
 * Chart utility functions
 */
import { ChartConfig } from "./types";

/**
 * Clean chart data - remove invalid entries like "..." or incomplete objects
 */
export function cleanChartData(data: unknown[]): Record<string, unknown>[] {
  return data.filter((item): item is Record<string, unknown> => {
    if (item === null || item === undefined) return false;
    if (typeof item === "string" && item.includes("...")) return false;
    if (typeof item !== "object") return false;
    // Check if object has any "..." values
    const values = Object.values(item as Record<string, unknown>);
    if (values.some((v) => typeof v === "string" && v.includes("...")))
      return false;
    // Must have at least one key-value pair
    return Object.keys(item as Record<string, unknown>).length > 0;
  }) as Record<string, unknown>[];
}

/**
 * Try to fix truncated JSON (common when streaming)
 */
export function tryParseChartJSON(jsonString: string): unknown | null {
  // First, try parsing as-is
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
      parsed.data = cleanChartData(parsed.data);
    }
    return parsed;
  } catch {
    // Try to fix common truncation issues
  }

  let fixed = jsonString.trim();

  // Remove entries containing "..." from data array
  fixed = fixed.replace(/,?\s*\{[^}]*\.{3,}[^}]*\}/g, "");
  fixed = fixed.replace(/,?\s*"\.{3,}"\s*/g, "");

  // Remove any trailing "..." or ellipsis
  fixed = fixed.replace(/,?\s*\.{3,}\s*$/g, "");
  fixed = fixed.replace(/,?\s*"\.{3,}"\s*$/g, "");

  // Remove trailing incomplete entries
  fixed = fixed.replace(/,\s*\{[^}]*$/, "");
  fixed = fixed.replace(/,\s*"[^"]*$/, "");
  fixed = fixed.replace(/,\s*\d+\.?\d*$/, "");

  // Remove trailing comma
  fixed = fixed.replace(/,\s*$/, "");

  // Count brackets to see what's missing
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  // Add missing closing brackets and braces
  for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += "]";
  for (let i = 0; i < openBraces - closeBraces; i++) fixed += "}";

  try {
    const parsed = JSON.parse(fixed);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
      parsed.data = cleanChartData(parsed.data);
    }
    return parsed;
  } catch {
    // Try more aggressive fixing
    return tryAggressiveFix(fixed);
  }
}

function tryAggressiveFix(fixed: string): unknown | null {
  const dataMatch = fixed.match(/"data"\s*:\s*\[/);
  if (!dataMatch || dataMatch.index === undefined) return null;

  try {
    const dataStart = dataMatch.index + dataMatch[0].length;
    let depth = 1;
    let lastValidEnd = dataStart;

    for (let i = dataStart; i < fixed.length; i++) {
      if (fixed[i] === "[") depth++;
      else if (fixed[i] === "]") {
        depth--;
        if (depth === 0) {
          lastValidEnd = i;
          break;
        }
      } else if (fixed[i] === "}" && depth === 1) {
        lastValidEnd = i + 1;
      }
    }

    // Find complete JSON objects in data array
    const dataContent = fixed.substring(dataStart, lastValidEnd);
    const completeObjects: string[] = [];
    const objMatches = dataContent.matchAll(/\{[^{}]*\}/g);

    for (const m of objMatches) {
      try {
        JSON.parse(m[0]);
        completeObjects.push(m[0]);
      } catch {
        // Skip incomplete objects
      }
    }

    if (completeObjects.length > 0) {
      const reconstructed =
        fixed.substring(0, dataStart) + completeObjects.join(",") + "]}";
      const parsed = JSON.parse(reconstructed);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
        parsed.data = cleanChartData(parsed.data);
      }
      return parsed;
    }
  } catch {
    // Give up
  }

  return null;
}

/**
 * Check if JSON is a chart config
 */
export function isChartConfig(data: unknown): data is ChartConfig {
  const validTypes = [
    "bar",
    "line",
    "area",
    "pie",
    "scatter",
    "radar",
    "composed",
    "histogram",
  ];

  return (
    data !== null &&
    typeof data === "object" &&
    "type" in data &&
    "data" in data &&
    Array.isArray((data as ChartConfig).data) &&
    validTypes.includes((data as ChartConfig).type)
  );
}

/**
 * Pre-process content to convert LaTeX formats
 */
export function preprocessMathContent(content: string): string {
  let processed = content;

  // Convert \[ ... \] to $$ ... $$ (display math)
  processed = processed.replace(
    /\\\[([^\]]+)\\\]/g,
    (_, math) => `$$${math}$$`,
  );

  // Convert [ \begin{...} ... \end{...} ] to $$ ... $$
  processed = processed.replace(
    /\[\s*(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})\s*\]/g,
    (_, math) => `$$${math}$$`,
  );

  // Convert \( ... \) to $ ... $ (inline math)
  processed = processed.replace(/\\\(([^)]+)\\\)/g, (_, math) => `$${math}$`);

  return processed;
}

/**
 * Extract and convert inline chart JSON to proper code blocks
 */
export function preprocessChartContent(
  content: string,
  tryParse: typeof tryParseChartJSON,
  checkConfig: typeof isChartConfig,
): string {
  if (content.includes("```chart")) return content;

  const chartPattern =
    /\{\s*"type"\s*:\s*"(?:bar|line|area|pie|scatter|radar|histogram|composed)"[^}]*"data"\s*:\s*\[[^\]]*\][^}]*\}/g;

  let processed = content;
  const matches = content.match(chartPattern);

  if (matches) {
    for (const match of matches) {
      const beforeMatch = content.substring(0, content.indexOf(match));
      const openCodeBlocks = (beforeMatch.match(/```/g) || []).length;
      if (openCodeBlocks % 2 === 1) continue;

      const parsed = tryParse(match);
      if (parsed && checkConfig(parsed)) {
        processed = processed.replace(
          match,
          `\n\`\`\`chart\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n`,
        );
      }
    }
  }

  return processed;
}
