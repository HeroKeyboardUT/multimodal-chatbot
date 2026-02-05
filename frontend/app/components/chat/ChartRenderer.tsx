"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from "recharts";
import { ChartConfig, CHART_COLORS, TOOLTIP_STYLE } from "./types";

interface ChartRendererProps {
  config: ChartConfig;
}

/**
 * Auto-detect keys from data if not specified
 */
function detectKeys(
  data: Record<string, unknown>[],
  type: string,
): { xKey: string; yKey: string } {
  if (!data || data.length === 0) {
    return { xKey: "name", yKey: "value" };
  }

  const firstItem = data[0];
  const keys = Object.keys(firstItem);

  // Common x-axis keys (categorical/label)
  const xKeyPriority = [
    "range",
    "name",
    "label",
    "category",
    "x",
    "month",
    "date",
    "time",
  ];
  // Common y-axis keys (numeric/value)
  const yKeyPriority = [
    "count",
    "frequency",
    "value",
    "y",
    "amount",
    "total",
    "sum",
  ];

  // For histogram, prioritize range/count
  if (type === "histogram") {
    const hasRange = keys.includes("range");
    const hasCount = keys.includes("count");
    if (hasRange && hasCount) {
      return { xKey: "range", yKey: "count" };
    }
  }

  // Find best x key
  const detectedX =
    keys.find((k) => xKeyPriority.includes(k.toLowerCase())) || keys[0];

  // Find best y key (must be numeric)
  let detectedY = keys.find((k) => {
    if (k === detectedX) return false;
    const val = firstItem[k];
    return typeof val === "number" || !isNaN(Number(val));
  });

  if (!detectedY) {
    detectedY =
      yKeyPriority.find((k) => keys.includes(k)) || keys[1] || "value";
  }

  return { xKey: detectedX, yKey: detectedY };
}

/**
 * Dynamic Chart Renderer - renders any chart type based on config
 */
export function ChartRenderer({ config }: ChartRendererProps) {
  const {
    type,
    title,
    data,
    nameKey = "name",
    valueKey = "value",
    colors = CHART_COLORS,
    stacked = false,
    series,
    xLabel,
    yLabel,
    showGrid = true,
    showLegend = true,
  } = config;

  // Auto-detect keys if not specified or use provided ones
  const detected = detectKeys(data, type);
  const xKey = config.xKey || detected.xKey;
  const yKey = config.yKey || detected.yKey;

  const yKeys = Array.isArray(yKey) ? yKey : [yKey];

  const renderChart = () => {
    switch (type) {
      case "bar":
        return renderBarChart();
      case "histogram":
        return renderHistogram();
      case "line":
        return renderLineChart();
      case "area":
        return renderAreaChart();
      case "pie":
        return renderPieChart();
      case "scatter":
        return renderScatterChart();
      case "radar":
        return renderRadarChart();
      case "composed":
        return renderComposedChart();
      default:
        return null;
    }
  };

  // Histogram with special styling for frequency distribution
  const renderHistogram = () => (
    <BarChart data={data} barCategoryGap="1%">
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        dataKey={xKey}
        stroke="#888"
        fontSize={11}
        angle={0}
        textAnchor="end"
        height={60}
        label={
          xLabel
            ? { value: xLabel, position: "insideBottom", offset: -10 }
            : undefined
        }
      />
      <YAxis
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : { value: "Frequency", angle: -90, position: "insideLeft" }
        }
      />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        formatter={(value) => [String(value), "Count"]}
      />
      {showLegend && <Legend />}
      {yKeys.map((key, i) => (
        <Bar
          key={key}
          dataKey={key}
          fill={colors[i % colors.length]}
          name={key === "count" ? "Frequency" : key}
        />
      ))}
    </BarChart>
  );

  const renderBarChart = () => (
    <BarChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        dataKey={xKey}
        stroke="#888"
        fontSize={12}
        label={
          xLabel ? { value: xLabel, position: "bottom", offset: -5 } : undefined
        }
      />
      <YAxis
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : undefined
        }
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
      {series
        ? series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color || colors[i % colors.length]}
              stackId={stacked ? "stack" : undefined}
            />
          ))
        : yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
    </BarChart>
  );

  const renderLineChart = () => (
    <LineChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        dataKey={xKey}
        stroke="#888"
        fontSize={12}
        label={
          xLabel ? { value: xLabel, position: "bottom", offset: -5 } : undefined
        }
      />
      <YAxis
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : undefined
        }
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
      {series
        ? series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color || colors[i % colors.length]}
              strokeWidth={2}
              dot={{ fill: s.color || colors[i % colors.length], r: 4 }}
            />
          ))
        : yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[i % colors.length], r: 4 }}
            />
          ))}
    </LineChart>
  );

  const renderAreaChart = () => (
    <AreaChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        dataKey={xKey}
        stroke="#888"
        fontSize={12}
        label={
          xLabel ? { value: xLabel, position: "bottom", offset: -5 } : undefined
        }
      />
      <YAxis
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : undefined
        }
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
      {series
        ? series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color || colors[i % colors.length]}
              stroke={s.color || colors[i % colors.length]}
              fillOpacity={0.6}
              stackId={stacked ? "stack" : undefined}
            />
          ))
        : yKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              fill={colors[i % colors.length]}
              stroke={colors[i % colors.length]}
              fillOpacity={0.6}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
    </AreaChart>
  );

  const renderPieChart = () => (
    <PieChart>
      <Pie
        data={data}
        dataKey={valueKey}
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        outerRadius={100}
        label={({ payload, percent }) => {
          const name = payload?.[nameKey] ?? payload?.name ?? "N/A";
          return `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`;
        }}
        labelLine={true}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
    </PieChart>
  );

  const renderScatterChart = () => (
    <ScatterChart>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        type="number"
        dataKey={xKey}
        name={xKey}
        stroke="#888"
        fontSize={12}
        label={
          xLabel ? { value: xLabel, position: "bottom", offset: -5 } : undefined
        }
      />
      <YAxis
        type="number"
        dataKey={yKeys[0]}
        name={yKeys[0]}
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : undefined
        }
      />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        cursor={{ strokeDasharray: "3 3" }}
      />
      {showLegend && <Legend />}
      <Scatter name={title || "Data"} data={data} fill={colors[0]}>
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Scatter>
    </ScatterChart>
  );

  const renderRadarChart = () => (
    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
      <PolarGrid stroke="#444" />
      <PolarAngleAxis dataKey={xKey} stroke="#888" fontSize={12} />
      <PolarRadiusAxis stroke="#888" fontSize={10} angle={90} />
      {yKeys.map((key, i) => (
        <Radar
          key={key}
          name={key}
          dataKey={key}
          stroke={colors[i % colors.length]}
          fill={colors[i % colors.length]}
          fillOpacity={0.4}
          strokeWidth={2}
        />
      ))}
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
    </RadarChart>
  );

  const renderComposedChart = () => (
    <ComposedChart data={data}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#444" />}
      <XAxis
        dataKey={xKey}
        stroke="#888"
        fontSize={12}
        label={
          xLabel ? { value: xLabel, position: "bottom", offset: -5 } : undefined
        }
      />
      <YAxis
        stroke="#888"
        fontSize={12}
        label={
          yLabel
            ? { value: yLabel, angle: -90, position: "insideLeft" }
            : undefined
        }
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      {showLegend && <Legend />}
      {series?.map((s, i) => {
        const color = s.color || colors[i % colors.length];
        switch (s.type) {
          case "line":
            return (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                stroke={color}
                strokeWidth={2}
              />
            );
          case "area":
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                fill={color}
                stroke={color}
                fillOpacity={0.6}
              />
            );
          case "bar":
          default:
            return (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                fill={color}
              />
            );
        }
      })}
    </ComposedChart>
  );

  const chartContent = renderChart();

  if (!chartContent) {
    return (
      <div className="my-3 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-400 text-sm">Unknown chart type: {type}</p>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
      {title && (
        <h4 className="text-sm font-semibold text-center mb-3 text-neutral-800 dark:text-neutral-200">
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {chartContent}
      </ResponsiveContainer>
    </div>
  );
}
