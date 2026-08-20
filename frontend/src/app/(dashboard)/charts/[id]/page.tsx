"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Download, Share2, Trash2, Loader2, BarChart2, Eye, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChart, useRenderChart } from "@/hooks/useCharts";
import { toast } from "sonner";

export default function ChartViewPage() {
  const params = useParams();
  const router = useRouter();
  const chartId = params.id as string;

  const { data: chart, isLoading, error, refetch } = useChart(chartId);
  const { data: renderData, isLoading: renderLoading, refetch: refetchRender } = useRenderChart(chartId, 1000);

  const chartData = chart?.data;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this chart? This action cannot be undone.")) {
      // Delete mutation would be called here
      router.push("/datasets");
      router.refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !chartData) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/datasets/${chartData.dataset_id}`} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{chartData.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">{chartData.chart_type}</Badge>
              {chartData.description && <span className="text-sm text-muted-foreground">{chartData.description}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/charts/${chartId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/datasets/${chartData.dataset_id}/charts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Chart
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent          </DropdownMenu>
        </div>
      </div>

      {/* Chart Render */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Visualization</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PNG
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export SVG
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : renderData?.plotly_json ? (
            <div style={{ width: "100%", height: "500px" }}>
              <PlotlyChart plotlyJson={renderData.plotly_json} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center">
                <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No data to display</p>
                <Button onClick={() => refetchRender()}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Spec */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Specification</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded overflow-x-auto text-xs max-h-96">
            {JSON.stringify(chartData.spec_json, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Data Table */}
      {renderData?.data && renderData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data ({renderData.data.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {renderData.columns.map((col: string) => (
                      <th key={col} className="text-left p-2 font-mono text-xs text-muted-foreground">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renderData.data.slice(0, 100).map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      {renderData.columns.map((col: string) => (
                        <td key={col} className="p-2 font-mono text-xs max-w-xs truncate">
                          {row[col] === null ? <span className="text-muted-foreground">NULL</span> : String(row[col]).slice(0, 100)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderData.data.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing 100 of {renderData.data.length} rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SQL */}
      {renderData?.sql && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated SQL</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(renderData.sql!)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded overflow-x-auto text-xs font-mono">
              {renderData.sql}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Plotly chart renderer
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

import { Copy, RotateCcw, Plus } from "lucide-react";