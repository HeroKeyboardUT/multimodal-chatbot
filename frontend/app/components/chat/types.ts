/**
 * Chat component types
 */

export interface ChartSeries {
  dataKey: string;
  name?: string;
  type?: "bar" | "line" | "area";
  color?: string;
}

export interface ChartConfig {
  type:
    | "bar"
    | "line"
    | "area"
    | "pie"
    | "scatter"
    | "radar"
    | "composed"
    | "histogram";
  title?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string | string[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  stacked?: boolean;
  series?: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const CHART_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
  "#ff8042",
  "#8dd1e1",
];

export const TOOLTIP_STYLE = {
  backgroundColor: "#1f1f1f",
  border: "1px solid #333",
  fontSize: "12px",
  color: "#ffffff",
};
