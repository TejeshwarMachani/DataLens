"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chartApi } from "@/lib/api";
import type { Chart, ChartList, ChartCreate, ChartUpdate, ChartRenderRequest, ChartRenderResponse, ChartSpec } from "@/types/api";

// Query keys
export const chartKeys = {
  all: ["charts"] as const,
  lists: () => [...chartKeys.all, "list"] as const,
  list: (datasetId?: string, page = 1, pageSize = 20) => [...chartKeys.lists(), { datasetId, page, pageSize }] as const,
  details: () => [...chartKeys.all, "detail"] as const,
  detail: (id: string) => [...chartKeys.details(), id] as const,
  render: (id: string, limit?: number) => [...chartKeys.detail(id), "render", { limit }] as const,
};

// List charts with pagination
export function useCharts(datasetId?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: chartKeys.list(datasetId, page, pageSize),
    queryFn: () => chartApi.list(datasetId, page, pageSize),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Get single chart
export function useChart(id: string | null) {
  return useQuery({
    queryKey: chartKeys.detail(id || ""),
    queryFn: () => chartApi.get(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Create chart mutation
export function useCreateChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChartCreate) => chartApi.create(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: chartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chartKeys.list(variables.dataset_id) });
    },
  });
}

// Update chart mutation
export function useUpdateChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChartUpdate }) => chartApi.update(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: chartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: chartKeys.lists() });
    },
  });
}

// Delete chart mutation
export function useDeleteChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chartApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chartKeys.lists() });
    },
  });
}

// Render chart (saved chart) - mutation for on-demand rendering
export function useRenderChart() {
  return useMutation({
    mutationFn: ({ id, limit }: { id: string; limit?: number }) => chartApi.render(id, limit),
  });
}

// Render chart spec (unsaved - for live preview)
export function useRenderChartSpec() {
  return useMutation({
    mutationFn: (request: ChartRenderRequest) => chartApi.renderSpec(request.spec, request.dataset_id, request.limit),
  });
}

// Helper to build ChartSpec from UI state
export function buildChartSpec(
  mark: ChartSpec["mark"],
  encodings: Record<string, ChartSpec["encoding"][string]>,
  options?: { transform?: ChartSpec["transform"]; width?: number; height?: number; title?: string }
): ChartSpec {
  return {
    mark,
    encoding: encodings,
    transform: options?.transform,
    width: options?.width,
    height: options?.height,
    title: options?.title,
  };
}

// Available chart marks with labels
export const CHART_MARKS: { value: ChartSpec["mark"]; label: string; icon: string }[] = [
  { value: "bar", label: "Bar Chart", icon: "📊" },
  { value: "line", label: "Line Chart", icon: "📈" },
  { value: "point", label: "Scatter Plot", icon: "🔵" },
  { value: "area", label: "Area Chart", icon: "📈" },
  { value: "heatmap", label: "Heatmap", icon: "🔥" },
  { value: "pie", label: "Pie Chart", icon: "🥧" },
  { value: "box", label: "Box Plot", icon: "📦" },
  { value: "violin", label: "Violin Plot", icon: "🎻" },
  { value: "histogram", label: "Histogram", icon: "📊" },
];

// Encoding channels available per mark type
export const ENCODING_CHANNELS: Record<ChartSpec["mark"], string[]> = {
  bar: ["x", "y", "color", "facet", "tooltip"],
  line: ["x", "y", "color", "facet", "tooltip"],
  point: ["x", "y", "color", "size", "facet", "tooltip"],
  area: ["x", "y", "color", "facet", "tooltip"],
  heatmap: ["x", "y", "color", "facet", "tooltip"],
  pie: ["theta", "color", "facet", "tooltip"],
  box: ["x", "y", "color", "facet", "tooltip"],
  violin: ["x", "y", "color", "facet", "tooltip"],
  histogram: ["x", "color", "facet", "tooltip"],
};

// Field types for encoding
export const FIELD_TYPES: ChartSpec["encoding"][string]["type"][] = [
  "quantitative",
  "ordinal",
  "nominal",
  "temporal",
];

// Aggregation options
export const AGGREGATIONS: ChartSpec["encoding"][string]["aggregate"][] = [
  "sum",
  "mean",
  "count",
  "min",
  "max",
];

// Time units
export const TIME_UNITS: ChartSpec["encoding"][string]["time_unit"][] = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
];