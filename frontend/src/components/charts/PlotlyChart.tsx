"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Plot from "react-plotly.js";
import type { ChartSpec } from "@/hooks/useCharts";

export interface PlotlyChartRef {
  update: (spec: ChartSpec, data: any[]) => void;
  resize: () => void;
  downloadImage: (format?: "png" | "svg") => void;
  toImage: (format?: "png" | "svg") => Promise<string>;
}

export function usePlotlyChart(initialSpec?: ChartSpec, initialData: any[] = []) {
  const ref = useRef<PlotlyChartRef>(null);
  const [plotlyData, setPlotlyData] = useState<any[]>([]);
  const [plotlyLayout, setPlotlyLayout] = useState<any>({});
  const [plotlyConfig, setPlotlyConfig] = useState<any>({
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "resetScale2d"],
    responsive: true,
  });

  const updateChart = useCallback((spec: ChartSpec, data: any[]) => {
    if (!spec || !data) return;

    // Convert spec + data to Plotly format
    const { data: traces, layout } = specToPlotly(spec, data);
    setPlotlyData(traces);
    setPlotlyLayout(layout);
  }, []);

  const resize = useCallback(() => {
    if (ref.current?.resize) {
      ref.current.resize();
    }
  }, []);

  const downloadImage = useCallback((format: "png" | "svg" = "png") => {
    const plotDiv = document.querySelector(".plotly-graph-div") as any;
    if (plotDiv && window.Plotly) {
      window.Plotly.downloadImage(plotDiv, {
        format,
        filename: `chart_${Date.now()}`,
        height: plotDiv.clientHeight,
        width: plotDiv.clientWidth,
      });
    }
  }, []);

  const toImage = useCallback(async (format: "png" | "svg" = "png"): Promise<string> => {
    const plotDiv = document.querySelector(".plotly-graph-div") as any;
    if (plotDiv && window.Plotly) {
      return new Promise((resolve) => {
        window.Plotly.toImage(plotDiv, {
          format,
          height: plotDiv.clientHeight,
          width: plotDiv.clientWidth,
        }).then((url: string) => resolve(url));
      });
    }
    return "";
  }, []);

  // Initialize ref
  useEffect(() => {
    ref.current = {
      update: updateChart,
      resize,
      downloadImage,
      toImage,
    };
  }, [updateChart, resize, downloadImage, toImage]);

  // Initial render
  useEffect(() => {
    if (initialSpec && initialData.length > 0) {
      updateChart(initialSpec, initialData);
    }
  }, [initialSpec, initialData, updateChart]);

  return { ref, plotlyData, plotlyLayout, plotlyConfig };
}

export function PlotlyChart({ spec, data, height = 400, className = "" }: {
  spec: ChartSpec;
  data: any[];
  height?: number | string;
  className?: string;
}) {
  const { ref, plotlyData, plotlyLayout, plotlyConfig } = usePlotlyChart(spec, data);

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <Plot
        ref={ref as any}
        data={plotlyData}
        layout={plotlyLayout}
        config={plotlyConfig}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

// Convert Vega-Lite inspired spec to Plotly format
function specToPlotly(spec: ChartSpec, data: any[]): { data: any[]; layout: any } {
  if (!data || data.length === 0) {
    return {
      data: [],
      layout: {
        annotations: [{
          text: "No data to display",
          xref: "paper",
          yref: "paper",
          x: 0.5,
          y: 0.5,
          showarrow: false,
          font: { size: 16, color: "#9ca3af" },
        }],
        template: "plotly_white",
        margin: { l: 50, r: 30, t: 50, b: 50 },
      },
    };
  }

  const df = data;
  const encoding = spec.encoding || {};
  const mark = spec.mark || "bar";

  // Get field names
  const xField = encoding.x?.field;
  const yField = encoding.y?.field;
  const colorField = encoding.color?.field;
  const sizeField = encoding.size?.field;
  const facetField = encoding.facet?.field || encoding.column?.field;
  const tooltipFields = encoding.tooltip ?
    (Array.isArray(encoding.tooltip) ? encoding.tooltip.map(t => t.field) : [encoding.tooltip.field])
    : [];

  const traces: any[] = [];
  const layout: any = {
    template: "plotly_white",
    margin: { l: 50, r: 30, t: 50, b: 50 },
    hovermode: "closest",
    showlegend: true,
    title: spec.title || "",
    xaxis: { title: encoding.x?.title || encoding.x?.field || "" },
    yaxis: { title: encoding.y?.title || encoding.y?.field || "" },
  };

  // Handle faceting
  if (facetField) {
    const facetValues = [...new Set(df.map((d: any) => d[facetField]))];
    // For simplicity, we'll just use color encoding for facets in this version
    // Full faceting would require subplots
  }

  // Group by color if specified
  const groups = colorField
    ? [...new Set(df.map((d: any) => d[colorField]))]
    : [null];

  groups.forEach((group, groupIndex) => {
    const groupData = colorField
      ? df.filter((d: any) => d[colorField] === group)
      : df;

    const trace = createTrace(mark, groupData, {
      x: xField,
      y: yField,
      color: colorField,
      size: sizeField,
      group: group,
      groupIndex,
      encoding,
      tooltipFields,
    });

    if (trace) {
      traces.push(trace);
    }
  });

  // Apply config
  if (spec.config) {
    if (spec.config.legend?.disable) {
      layout.showlegend = false;
    }
    if (spec.config.axis?.grid === false) {
      layout.xaxis.showgrid = false;
      layout.yaxis.showgrid = false;
    }
  }

  if (spec.width) layout.width = spec.width;
  if (spec.height) layout.height = spec.height;

  return { data: traces, layout };
}

function createTrace(
  mark: string,
  data: any[],
  options: {
    x?: string;
    y?: string;
    color?: string;
    size?: string;
    group: any;
    groupIndex: number;
    encoding: Record<string, any>;
    tooltipFields: string[];
  }
): any {
  const { x, y, color, size, group, groupIndex, encoding, tooltipFields } = options;
  const colorPalette = [
    "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  ];

  const baseTrace: any = {
    name: group !== null ? String(group) : undefined,
    marker: {
      color: color ? undefined : colorPalette[groupIndex % colorPalette.length],
      size: 8,
      opacity: 0.8,
    },
    hovertemplate: buildHoverTemplate(tooltipFields, encoding),
    hoverinfo: "text",
  };

  const xValues = x ? data.map((d) => d[x]) : data.map((_, i) => i);
  const yValues = y ? data.map((d) => d[y]) : [];

  switch (mark) {
    case "bar":
      return {
        ...baseTrace,
        type: "bar",
        x: xValues,
        y: yValues,
        marker: {
          ...baseTrace.marker,
          color: color
            ? data.map((d) => d[color])
            : colorPalette[groupIndex % colorPalette.length],
        },
      };

    case "line":
      return {
        ...baseTrace,
        type: "scatter",
        mode: "lines+markers",
        x: xValues,
        y: yValues,
        line: { width: 2, color: baseTrace.marker.color },
        marker: { ...baseTrace.marker, size: 6 },
      };

    case "point":
    case "scatter":
      return {
        ...baseTrace,
        type: "scatter",
        mode: "markers",
        x: xValues,
        y: yValues,
        marker: {
          ...baseTrace.marker,
          size: size ? data.map((d) => Math.max(4, Math.min(30, Number(d[size]) || 8))) : 8,
          color: color
            ? data.map((d) => d[color])
            : colorPalette[groupIndex % colorPalette.length],
          colorscale: "Viridis",
          showscale: !!color && !encoding.color?.type?.includes("nominal"),
          colorbar: color && !encoding.color?.type?.includes("nominal") ? { title: color } : undefined,
        },
      };

    case "area":
      return {
        ...baseTrace,
        type: "scatter",
        mode: "lines",
        fill: "tozeroy",
        x: xValues,
        y: yValues,
        line: { width: 1, color: baseTrace.marker.color },
        fillcolor: `${baseTrace.marker.color}33`, // 20% opacity
      };

    case "pie":
    case "arc":
      const thetaField = encoding.theta?.field || x;
      const thetaValues = thetaField ? data.map((d) => d[thetaField]) : [];
      const labels = color ? data.map((d) => d[color]) : xValues;

      return {
        ...baseTrace,
        type: "pie",
        values: thetaValues,
        labels: labels,
        textinfo: "label+percent",
        textposition: "inside",
        marker: {
          colors: color
            ? data.map((d) => d[color])
            : colorPalette.slice(0, data.length),
        },
      };

    case "heatmap":
    case "rect":
      if (!x || !y || !color) return null;
      // For heatmap, we need to pivot data
      const xCategories = [...new Set(data.map((d) => d[x]))];
      const yCategories = [...new Set(data.map((d) => d[y]))];
      const zMatrix = yCategories.map((yCat) =>
        xCategories.map((xCat) => {
          const row = data.find((d) => d[x] === xCat && d[y] === yCat);
          return row ? Number(row[color]) : 0;
        })
      );

      return {
        ...baseTrace,
        type: "heatmap",
        z: zMatrix,
        x: xCategories,
        y: yCategories,
        colorscale: "Viridis",
        colorbar: { title: color },
        hovertemplate: `${x}: %{x}<br>${y}: %{y}<br>${color}: %{z}<extra></extra>`,
      };

    case "box":
      return {
        ...baseTrace,
        type: "box",
        x: x ? xValues : undefined,
        y: yValues,
        name: group !== null ? String(group) : undefined,
        marker: { color: baseTrace.marker.color },
        boxpoints: "outliers",
      };

    case "violin":
      return {
        ...baseTrace,
        type: "violin",
        x: x ? xValues : undefined,
        y: yValues,
        name: group !== null ? String(group) : undefined,
        marker: { color: baseTrace.marker.color },
        box: { visible: true },
        meanline: { visible: true },
      };

    case "histogram":
      return {
        ...baseTrace,
        type: "histogram",
        x: xValues,
        name: group !== null ? String(group) : undefined,
        marker: { color: baseTrace.marker.color },
        opacity: 0.7,
      };

    default:
      return {
        ...baseTrace,
        type: "scatter",
        mode: "markers",
        x: xValues,
        y: yValues,
      };
  }
}

function buildHoverTemplate(tooltipFields: string[], encoding: Record<string, any>): string {
  if (tooltipFields.length === 0) {
    // Default: show x, y, and color if available
    const fields = [];
    if (encoding.x?.field) fields.push(`${encoding.x.title || encoding.x.field}: %{x}`);
    if (encoding.y?.field) fields.push(`${encoding.y.title || encoding.y.field}: %{y}`);
    if (encoding.color?.field) fields.push(`${encoding.color.title || encoding.color.field}: %{marker.color}`);
    return fields.join("<br>") + "<extra></extra>";
  }

  return tooltipFields
    .map((field) => {
      const enc = encoding[field];
      const label = enc?.title || field;
      return `${label}: %{customdata[${tooltipFields.indexOf(field)}]}`;
    })
    .join("<br>") + "<extra></extra>";
}