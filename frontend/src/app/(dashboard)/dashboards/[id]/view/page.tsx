"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutDashboard, ExternalLink, Fullscreen, Share2, Copy } from "lucide-react";
import { format } from "date-fns";
import { useDashboards } from "@/hooks/useDashboards";
import { useCharts } from "@/hooks/useCharts";
import { toast } from "sonner";
import { PlotlyChart } from "@/components/charts/PlotlyChart";

interface DashboardItem {
  id: string;
  chart_id: string;
  chart_name: string;
  chart_type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  spec?: any;
  config?: any;
  data?: any[];
  columns?: string[];
}

export default function DashboardPublicViewPage() {
  const params = useParams();
  const dashboardId = params.id as string;

  const { data: dashboard, isLoading } = useDashboards({ params: { id: dashboardId } });
  const { data: chartsData } = useCharts();

  const [items, setItems] = useState<DashboardItem[]>([]);
  const [chartDataMap, setChartDataMap] = useState<Map<string, { data: any[], columns: string[] }>>(new Map());

  // Load dashboard items and chart specs
  useEffect(() => {
    if (dashboard && chartsData) {
      const chartMap = new Map(chartsData.items?.map((c: any) => [c.id, c]) || []);
      const layout = dashboard.layout || [];
      const loadedItems: DashboardItem[] = layout.map((item: any, index: number) => {
        const chart = chartMap.get(item.chart_id);
        return {
          id: item.id || `item-${index}`,
          chart_id: item.chart_id,
          chart_name: chart?.name || "Unknown Chart",
          chart_type: chart?.chart_type || "bar",
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          spec: chart?.spec_json,
          config: chart?.config,
        };
      });
      setItems(loadedItems);
    }
  }, [dashboard, chartsData]);

  // Fetch chart data for each item
  useEffect(() => {
    if (items.length > 0) {
      const fetchData = async () => {
        const newDataMap = new Map();
        for (const item of items) {
          try {
            const response = await fetch(`/api/dashboards/${dashboardId}/charts/${item.chart_id}/data`);
            if (response.ok) {
              const data = await response.json();
              newDataMap.set(item.id, { data: data.data || [], columns: data.columns || [] });
            }
          } catch (error) {
            console.error(`Failed to load data for chart ${item.chart_id}:`, error);
          }
        }
        setChartDataMap(newDataMap);
      };
      fetchData();
    }
  }, [items, dashboardId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const chartTypeIcons: Record<string, string> = {
    bar: "📊",
    line: "📈",
    scatter: "📉",
    pie: "🥧",
    area: "📈",
    histogram: "📊",
    box: "📦",
    violin: "🎻",
    heatmap: "🔥",
  };

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <LayoutDashboard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Not Found</h1>
          <p className="text-gray-600">This dashboard doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!dashboard.is_shared) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <LayoutDashboard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Private Dashboard</h1>
          <p className="text-gray-600">This dashboard is not shared publicly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-gray-600 mt-1">{dashboard.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {dashboard.item_count || items.length} charts • Updated {format(new Date(dashboard.updated_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length > 0 ? (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: "repeat(12, 1fr)",
              gridAutoRows: "minmax(200px, auto)",
            }}
          >
            {items.map((item) => {
              const chartData = chartDataMap.get(item.id);
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                  style={{
                    gridColumn: `span ${item.w} / span ${item.w}`,
                    gridRow: `span ${item.h}`,
                    minHeight: "300px",
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <span className="text-2xl">{chartTypeIcons[item.chart_type] || "📊"}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.chart_name}</CardTitle>
                        <Badge variant="secondary">{item.chart_type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Fullscreen className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div
                      className="w-full h-full"
                      style={{ minHeight: "250px" }}
                    >
                      {item.spec && chartData?.data?.length > 0 ? (
                        <PlotlyChart
                          spec={item.spec}
                          data={chartData.data}
                          height={Math.max(250, item.h * 50)}
                        />
                      ) : item.spec ? (
                        <div className="flex items-center justify-center h-full p-4 text-gray-500 text-sm">
                          <div className="text-center">
                            <p className="font-medium mb-2">Loading chart data...</p>
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Chart specification not loaded
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <LayoutDashboard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Empty Dashboard</h3>
            <p className="text-gray-500">No charts have been added to this dashboard yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
          <p>Shared via DataLens</p>
          <p className="mt-1">Build your own dashboards at <a href="/" className="text-primary hover:underline">DataLens</a></p>
        </div>
      </main>
    </div>
  );
}