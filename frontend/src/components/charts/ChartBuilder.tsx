"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider, SliderThumb } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  BarChart2,
  LineChart,
  PieChart,
  ScatterChart,
  Save,
  Plus,
  Trash2,
  ArrowUpDown,
  Settings,
  Eye,
  Code2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";
import { useCharts } from "@/hooks/useCharts";
import { useDatasetSchema, useDatasetSample } from "@/hooks/useDatasets";
import { ChartSpec, EncodingField, CHART_MARKS, ENCODING_CHANNELS, buildChartSpec } from "@/hooks/useCharts";
import { PlotlyChart, usePlotlyChart } from "./PlotlyChart";
import { ColumnSelector } from "./ColumnSelector";

interface ChartBuilderProps {
  datasetId: string;
  initialSpec?: ChartSpec;
  onSave?: (spec: ChartSpec, name: string) => Promise<void>;
  onClose?: () => void;
}

interface ColumnInfo {
  name: string;
  type: string;
  dtype?: string;
  sampleValues?: unknown[];
}

export function ChartBuilder({
  datasetId,
  initialSpec,
  onSave,
  onClose,
}: ChartBuilderProps) {
  const { data: schema } = useDatasetSchema(datasetId);
  const { data: sample } = useDatasetSample(datasetId, 5);
  const createChart = useCharts({ params: { id: datasetId } }).createChart;
  const updateChart = useCharts({ params: { id: datasetId } }).updateChart;
  const renderChartSpec = useCharts({ params: { id: datasetId } }).renderChartSpec;

  // Chart configuration state
  const [chartName, setChartName] = useState(initialSpec?.title || "");
  const [chartType, setChartType] = useState<ChartSpec["mark"]>(initialSpec?.mark || "bar");
  const [encodings, setEncodings] = useState<Record<string, EncodingField>>(initialSpec?.encoding || {});
  const [transforms, setTransforms] = useState<ChartSpec["transform"]>(initialSpec?.transform || []);
  const [width, setWidth] = useState(initialSpec?.width || 800);
  const [height, setHeight] = useState(initialSpec?.height || 400);
  const [showLegend, setShowLegend] = useState(initialSpec?.config?.legend?.disable !== true);
  const [showGrid, setShowGrid] = useState(initialSpec?.config?.axis?.grid !== false);
  const [specPreview, setSpecPreview] = useState<ChartSpec | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "preview" | "code">("builder");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Extract columns from schema
  const columns = schema?.columns || [];
  const columnNames = columns.map((c: any) => c.name);

  // Generate spec from current state
  const generateSpec = useCallback((): ChartSpec => {
    return buildChartSpec(chartType, encodings, {
      transform: transforms,
      width,
      height,
      title: chartName,
    });
  }, [chartType, encodings, transforms, width, height, chartName]);

  // Generate preview
  const handleGeneratePreview = async () => {
    if (!chartName.trim()) {
      toast.error("Please enter a chart name");
      return;
    }

    setIsGenerating(true);
    setPreviewError(null);

    try {
      const spec = generateSpec();
      setSpecPreview(spec);

      // Render preview with sample data
      const response = await renderChartSpec.mutateAsync({
        spec,
        dataset_id: datasetId,
        limit: 1000,
      });

      setPreviewData(response.data.data || []);
      setActiveTab("preview");
      toast.success("Preview generated");
    } catch (error: any) {
      const message = error?.response?.data?.detail || "Failed to generate preview";
      setPreviewError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle encoding change
  const handleEncodingChange = (channel: string, field: EncodingField | null) => {
    setEncodings((prev) => {
      const next = { ...prev };
      if (field) {
        next[channel] = field;
      } else {
        delete next[channel];
      }
      return next;
    });
  };

  // Handle transform change
  const handleTransformChange = (index: number, transform: any) => {
    const newTransforms = [...transforms];
    newTransforms[index] = transform;
    setTransforms(newTransforms);
  };

  // Handle save
  const handleSaveChart = async () => {
    if (!chartName.trim()) {
      toast.error("Please enter a chart name");
      return;
    }

    setIsSaving(true);
    try {
      const spec = generateSpec();

      if (onSave) {
        await onSave(spec, chartName);
      } else {
        await createChart.mutateAsync({
          name: chartName,
          dataset_id: datasetId,
          chart_type: chartType,
          spec_json: spec,
          config: { width, height, showLegend, showGrid },
        });
        toast.success("Chart saved successfully");
      }
    } catch (error) {
      toast.error("Failed to save chart");
    } finally {
      setIsSaving(false);
    }
  };

  const availableChannels = ENCODING_CHANNELS[chartType] || [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Chart</h1>
            <p className="text-muted-foreground mt-1">Build a visualization for this dataset</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setActiveTab("code")}>
            <Code2 className="h-4 w-4 mr-2" />
            View Spec
          </Button>
          <Button onClick={handleSaveChart} disabled={isSaving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Chart"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] flex-1 min-h-0">
        {/* Configuration Panel */}
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-4">
          {/* Chart Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                placeholder="Enter chart name"
              />
            </CardContent>
          </Card>

          {/* Chart Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={chartType}
                onValueChange={(value) => setChartType(value as ChartSpec["mark"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_MARKS.map((mark) => (
                    <SelectItem key={mark} value={mark}>
                      {mark.charAt(0).toUpperCase() + mark.slice(1)} Chart
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Encoding Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Encoding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableChannels.map((channel) => (
                <ColumnSelector
                  key={channel}
                  columns={columns}
                  onSelect={(field) => handleEncodingChange(channel, field)}
                  selectedField={encodings[channel]}
                  label={channel.charAt(0).toUpperCase() + channel.slice(1)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Transform Configuration */}
          {transforms.map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">Transform {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Operation</Label>
                  <Select
                    onValueChange={(value) => {
                      const newTransforms = [...transforms];
                      newTransforms[index] = {
                        ...newTransforms[index],
                        operation: value as any,
                      };
                      setTransforms(newTransforms);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filter">Filter</SelectItem>
                      <SelectItem value="aggregate">Aggregate</SelectItem>
                    </SelectContent>
                  </Select>
                  {transforms[index]?.operation === "filter" && (
                    <div>
                      <Label>Filter Condition</Label>
                      <Input
                        placeholder="Enter filter condition"
                        onChange={(e) => {
                          const newTransforms = [...transforms];
                          newTransforms[index] = {
                            ...newTransforms[index],
                            condition: e.target.value,
                          };
                          setTransforms(newTransforms);
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Chart Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Width: {width}px</Label>
                <Slider
                  value={[width]}
                  onValueChange={(value) => setWidth(value[0])}
                  min={400}
                  max={1200}
                  step={50}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Height: {height}px</Label>
                <Slider
                  value={[height]}
                  onValueChange={(value) => setHeight(value[0])}
                  min={200}
                  max={800}
                  step={50}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showLegend"
                  checked={showLegend}
                  onCheckedChange={setShowLegend}
                />
                <Label htmlFor="showLegend">Show Legend</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showGrid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
                <Label htmlFor="showGrid">Show Grid</Label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleGeneratePreview}
              disabled={isGenerating || !chartName.trim()}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Preview"}
            </Button>
            <Button
              onClick={handleSaveChart}
              disabled={isSaving}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="min-h-0 flex-1 flex flex-col space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="builder" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Chart Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Configure your chart in the panel to see preview here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preview" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Chart Preview</CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  {previewError && (
                    <div className="text-destructive text-center py-8">
                      Error: {previewError}
                    </div>
                  )}
                  {previewData.length > 0 && !previewError && (
                    <PlotlyChart data={previewData} spec={specPreview} />
                  )}
                  {!previewData.length && !previewError && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      Click &quot;Generate Preview&quot; to see chart here
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="code" className="flex-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Chart Specification</CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                    <code>{JSON.stringify(specPreview, null, 2)}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}