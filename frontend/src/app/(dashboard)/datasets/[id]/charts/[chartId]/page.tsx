"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart2, LineChart, PieChart, ScatterChart, Edit, Download, Copy, Code2, ArrowLeft, Share2, Fullscreen, Maximize2, Minimize2 } from "lucide-react";
import { format } from "date-fns";
import { useCharts } from "@/hooks/useCharts";
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import { toast } from "sonner";

export default function ChartViewPage() {
  const params = useParams();
  const datasetId = params.id as string;
  const chartId = params.chartId as string;

  const { data: chartsList } = useCharts({ params: { id: datasetId } });
  const renderChart = useCharts({ params: { id: datasetId } }).renderChart;

  const currentChart = chartsList?.items?.find((c: any) => c.id === chartId);

  const [plotlyData, setPlotlyData] = useState<any>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartTypeIcons: Record<string, any> = {
    bar: BarChart2,
    line: LineChart,
    scatter: ScatterChart,
    pie: PieChart,
    area: LineChart,
    histogram: BarChart2,
    box: BarChart2,
  };

  // Load chart data on mount
  useEffect(() => {
    if (currentChart) {
      loadChartData();
    }
  }, [currentChart]);

  const loadChartData = async () => {
    setIsLoadingChart(true);
    try {
      const response = await renderChart.mutateAsync({
        id: chartId,
        limit: 10000,
      });
      setPlotlyData(response.data);
    } catch (error) {
      toast.error("Failed to load chart data");
    } finally {
      setIsLoadingChart(false);
    }
  };

  const handleCopySpec = () => {
    navigator.clipboard.writeText(JSON.stringify(currentChart?.spec_json, null, 2));
    toast.success("Spec copied to clipboard");
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([JSON.stringify(currentChart?.spec_json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentChart?.name || "chart"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async (format: "png" | "svg" = "png") => {
    try {
      const plotDiv = document.querySelector(".plotly-graph-div") as any;
      if (plotDiv && window.Plotly) {
        window.Plotly.downloadImage(plotDiv, {
          format,
          filename: `${currentChart?.name || "chart"}_${Date.now()}`,
          height: plotDiv.clientHeight,
          width: plotDiv.clientWidth,
        });
      }
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  if (!currentChart) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const Icon = chartTypeIcons[currentChart.chart_type] || BarChart2;

  return (
    <div className={`space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6 overflow-auto" : ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <Link href={`/datasets/${datasetId}/charts`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{currentChart.name}</h1>
            <p className="text-muted-foreground mt-1">
              {currentChart.chart_type} chart • Created {format(new Date(currentChart.created_at), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/datasets/${datasetId}/charts/${chartId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleCopySpec}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Spec
          </Button>
          <Button variant="outline" onClick={handleDownloadSpec}>
            <Download className="h-4 w-4 mr-2" />
            Download Spec
          </Button>
          <Button variant="outline" onClick={() => handleDownloadImage("png")}>
            <Download className="h-4 w-4 mr-2" />
            PNG
          </Button>
          <Button variant="outline" onClick={() => handleDownloadImage("svg")}>
            <Code2 className="h-4 w-4 mr-2" />
            SVG
          </Button>
          <Button variant="outline" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Chart Renderer */}
      <Card className={isFullscreen ? "fixed inset-0 z-50 m-4 rounded-lg shadow-2xl" : ""}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{currentChart.name}</CardTitle>
              <Badge variant="secondary">{currentChart.chart_type}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCopySpec}>
              <Code2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownloadSpec}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleDownloadImage("png")}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={isFullscreen ? "h-[calc(100vh-160px)]" : ""}>
          {plotlyData ? (
            <div className="w-full h-full" style={{ height: isFullscreen ? "100%" : currentChart.config?.height || 500 }}>
              <PlotlyChart
                spec={currentChart.spec_json}
                data={plotlyData.data || []}
                height={isFullscreen ? "100%" : currentChart.config?.height || 500}
              />
            </div>
          ) : isLoadingChart ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading chart...</span>
            </div>
          ) : (
            <Button variant="outline" onClick={loadChartData} className="mx-auto mt-8">
              <Loader2 className="h-4 w-4 mr-2" />
              Load Chart Data
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Chart Configuration & Spec */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Width</label>
              <p className="mt-1 font-mono">{currentChart.config?.width || 800}px</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Height</label>
              <p className="mt-1 font-mono">{currentChart.config?.height || 400}px</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Show Legend</label>
              <p className="mt-1">{currentChart.config?.showLegend ? "Yes" : "No"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Show Grid</label>
              <p className="mt-1">{currentChart.config?.showGrid ? "Yes" : "No"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
              <p className="mt-1 font-mono capitalize">{currentChart.chart_type}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vega-Lite Specification</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="spec" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="spec">Spec</TabsTrigger>
                <TabsTrigger value="data">Data Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="spec">
                <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(currentChart.spec_json, null, 2)}
                </pre>
              </TabsContent>
              <TabsContent value="data">
                {plotlyData?.data && plotlyData.data.length > 0 ? (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {plotlyData.columns?.map((col: string) => (
                            <th key={col} className="text-left p-2 font-mono font-medium text-muted-foreground">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plotlyData.data.slice(0, 20).map((row: any, rowIndex: number) => (
                          <tr key={rowIndex} className="border-b">
                            {plotlyData.columns?.map((col: string) => (
                              <td key={col} className="p-2 font-mono text-sm">{row[col] ?? "NULL"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {plotlyData.data.length > 20 && (
                      <p className="text-sm text-muted-foreground text-center py-2 mt-2">
                        Showing 20 of {plotlyData.data.length} rows
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data loaded</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}