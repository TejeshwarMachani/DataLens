"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BarChart2, Loader2, Save, Plus, X, Eye, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useDatasetSchema, useDatasetSample } from "@/hooks/useDatasets";
import { useChart, useRenderChartSpec, useUpdateChart, CHART_MARKS, ENCODING_CHANNELS, FIELD_TYPES, AGGREGATIONS, TIME_UNITS, buildChartSpec } from "@/hooks/useCharts";
import { ChartSpec } from "@/types/api";
import { toast } from "sonner";

export default function ChartEditPage() {
  const params = useParams();
  const router = useRouter();
  const chartId = params.id as string;

  const [chartName, setChartName] = useState("");
  const [chartType, setChartType] = useState<ChartSpec["mark"]>("bar");
  const [encodings, setEncodings] = useState<Record<string, ChartSpec["encoding"][string]>>({});
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(500);
  const [title, setTitle] = useState("");
  const [transform, setTransform] = useState<ChartSpec["transform"]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { data: chart, isLoading: chartLoading, error: chartError } = useChart(chartId);
  const { data: schema, isLoading: schemaLoading } = useDatasetSchema(chart?.data?.dataset_id || "");
  const { data: sample } = useDatasetSample(chart?.data?.dataset_id || "", 10);
  const renderSpecMutation = useRenderChartSpec();
  const updateChartMutation = useUpdateChart();

  const datasetId = chart?.data?.dataset_id;

  const columns = schema?.data?.columns || [];
  const availableFields = columns.map((c: any) => c.name);

  const getFieldType = (fieldName: string) => {
    const col = columns.find((c: any) => c.name === fieldName);
    if (!col) return "nominal";
    const type = col.type?.toLowerCase() || "";
    if (type.includes("int") || type.includes("float") || type.includes("double") || type.includes("numeric")) return "quantitative";
    if (type.includes("date") || type.includes("time")) return "temporal";
    if (type.includes("bool")) return "nominal";
    return "nominal";
  };

  // Initialize from existing chart
  useEffect(() => {
    if (chart?.data) {
      const c = chart.data;
      setChartName(c.name);
      setChartType(c.chart_type);
      setWidth(c.spec_json.width || 800);
      setHeight(c.spec_json.height || 500);
      setTitle(c.spec_json.title || "");
      setTransform(c.spec_json.transform || []);
      setEncodings(c.spec_json.encoding || {});
    }
  }, [chart?.data]);

  const handleEncodingChange = (channel: string, field: Partial<ChartSpec["encoding"][string]>) => {
    setEncodings(prev => {
      const current = prev[channel] || { field: "", type: "nominal" };
      if (!field.field) {
        const { [channel]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [channel]: { ...current, ...field, type: field.type || getFieldType(field.field) }
      };
    });
  };

  const buildSpec = useCallback((): ChartSpec => {
    return buildChartSpec(chartType, encodings, { width, height, title: title || undefined, transform: transform.length > 0 ? transform : undefined });
  }, [chartType, encodings, width, height, title, transform]);

  const handlePreview = async () => {
    const spec = buildSpec();
    if (!spec.encoding.x?.field && !spec.encoding.y?.field && !spec.encoding.theta?.field) {
      toast.error("Please select at least one field for X, Y, or Theta");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const result = await renderSpecMutation.mutateAsync({
        spec,
        dataset_id: datasetId!,
        limit: 1000,
      });
      setPreviewData(result.data);
    } catch (error) {
      toast.error("Failed to render chart preview");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    const spec = buildSpec();
    if (!chartName.trim()) {
      toast.error("Please enter a chart name");
      return;
    }
    if (!spec.encoding.x?.field && !spec.encoding.y?.field && !spec.encoding.theta?.field) {
      toast.error("Please select at least one field for X, Y, or Theta");
      return;
    }

    try {
      await updateChartMutation.mutateAsync({
        id: chartId,
        data: {
          name: chartName,
          spec_json: spec,
          chart_type: chartType,
        },
      });
      toast.success("Chart updated successfully!");
      router.push(`/charts/${chartId}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update chart");
    }
  };

  const getChannelsForType = (type: ChartSpec["mark"]) => {
    return ENCODING_CHANNELS[type] || ["x", "y", "color", "tooltip"];
  };

  const renderEncodingField = (channel: string) => {
    const channels = getChannelsForType(chartType);
    if (!channels.includes(channel)) return null;

    const encoding = encodings[channel];
    const isRequired = ["x", "y", "theta"].includes(channel);

    return (
      <div key={channel} className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium w-16 capitalize">{channel}</Label>
          {isRequired && <span className="text-xs text-destructive">*</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={encoding?.field || ""}
            onValueChange={(value) => handleEncodingChange(channel, { field: value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={`Select ${channel} field`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {availableFields.map((field: string) => (
                <SelectItem key={field} value={field}>{field}</SelectItem>
              ))}
            </SelectContent          </Select>

          {encoding?.field && (
            <>
              <Select
                value={encoding?.type || "nominal"}
                onValueChange={(value) => handleEncodingChange(channel, { type: value as any })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent              </Select>
            </>
          )}

          {encoding?.field && (encoding.type === "quantitative") && (
            <Select
              value={encoding?.aggregate || ""}
              onValueChange={(value) => handleEncodingChange(channel, { aggregate: value || undefined })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Aggregate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {AGGREGATIONS.map((agg) => (
                  <SelectItem key={agg} value={agg}>{agg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {encoding?.field && (encoding.type === "temporal") && (
            <Select
              value={encoding?.time_unit || ""}
              onValueChange={(value) => handleEncodingChange(channel, { time_unit: value || undefined })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {TIME_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {encoding?.field && (
            <Button variant="ghost" size="icon" onClick={() => handleEncodingChange(channel, { field: "" })}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (chartLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (chartError || !chart?.data) {
    return (
      <div className="text-center py-12">
        <BarChart2 className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Chart not found</h3>
        <p className="text-muted-foreground mb-4">The chart you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push("/datasets")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Datasets
        </Button>
      </div>
    );
  }

  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/charts/${chartId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Chart</h1>
          <p className="text-muted-foreground mt-1">Modify your visualization</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar - Controls */}
        <div className="space-y-6">
          {/* Chart Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chart-name">Chart Name</Label>
                <Input
                  id="chart-name"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  placeholder="My Chart"
                />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {CHART_MARKS.map((mark) => (
                    <Button
                      key={mark.value}
                      variant={chartType === mark.value ? "default" : "outline"}
                      onClick={() => setChartType(mark.value)}
                      className="h-20 flex-col gap-1"
                    >
                      <span className="text-2xl">{mark.icon}</span>
                      <span className="text-xs">{mark.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chart Title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width: {width}px</Label>
                  <Slider value={[width]} max={1200} min={400} step={50} onValueChange={([v]) => setWidth(v)} />
                </div>
                <div className="space-y-2">
                  <Label>Height: {height}px</Label>
                  <Slider value={[height]} max={1000} min={300} step={50} onValueChange={([v]) => setHeight(v)} />
                </div>
              </div>
            </CardContent          </Card>

          {/* Encodings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Encodings</CardTitle>
              <CardDescription>Drag fields to channels to define your chart</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getChannelsForType(chartType).map((channel) => renderEncodingField(channel))}
            </CardContent          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="space-y-2">
              <Button onClick={handlePreview} disabled={isPreviewLoading} className="w-full">
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating Preview...
                  </>
                ) : (
                  <>
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Update Preview
                  </>
                )}
              </Button>
              <Button onClick={handleSave} variant="default" className="w-full" disabled={updateChartMutation.isPending}>
                {updateChartMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/charts/${chartId}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Chart
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/datasets/${datasetId}`}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Dataset
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live Preview</CardTitle>
              <div className="flex items-center gap-2">
                {previewData && (
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isPreviewLoading ? (
                <div className="flex items-center justify-center h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : previewData?.plotly_json ? (
                <div
                  id="chart-preview"
                  style={{ width: "100%", height: "500px" }}
                >
                  <PlotlyChart plotlyJson={previewData.plotly_json} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <div className="text-center">
                    <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No preview yet</p>
                    <p className="text-sm">Configure your chart and click "Update Preview" to see it here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Spec */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated Vega-Lite Spec</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-x-auto text-xs max-h-64">
                {JSON.stringify(buildSpec(), null, 2)}
              </pre>
            </CardContent          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple Plotly chart renderer
function PlotlyChart({ plotlyJson }: { plotlyJson: any }) {
  const [Plot, setPlot] = useState<any>(null);
  const plotlyJsonRef = useRef(plotlyJson);

  useEffect(() => {
    plotlyJsonRef.current = plotlyJson;
  }, [plotlyJson]);

  useEffect(() => {
    import("react-plotly.js").then(({ default: P }) => {
      setPlot(P);
    });
  }, []);

  if (!Plot) {
    return <div className="flex items-center justify-center h-[500px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return <Plot data={plotlyJsonRef.current.data} layout={plotlyJsonRef.current.layout} config={{ displayModeBar: true, responsive: true }} style={{ width: "100%", height: "500px" }} />;
}