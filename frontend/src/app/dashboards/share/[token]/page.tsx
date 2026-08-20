"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, BarChart2, Loader2, ExternalLink, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ResponsiveReactGridLayout, { WidthProvider } from "react-grid-layout";
import { useSharedDashboard } from "@/hooks/useDashboards";
import { toast } from "sonner";

const ResponsiveGridLayout = WidthProvider(ResponsiveReactGridLayout);

export default function SharedDashboardPage() {
  const params = useParams();
  const token = params.token as string;

  const { data: dashboard, isLoading, error } = useSharedDashboard(token);

  const dashboardData = dashboard?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center p-8">
          <BarChart2 className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Dashboard Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This shared dashboard doesn't exist or the link has expired.
          </p>
          <Button asChild>
            <a href="/login">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Go to DataLens
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const layout = (dashboardData.items || []).map((item: any) => ({
    i: item.id,
    x: item.config_json.x,
    y: item.config_json.y,
    w: item.config_json.w,
    h: item.config_json.h,
    minW: item.config_json.min_w || 2,
    minH: item.config_json.min_h || 2,
    maxW: item.config_json.max_w,
    maxH: item.config_json.max_h,
    ...item,
  }));

  const renderItemContent = (item: any) => {
    switch (item.item_type) {
      case "chart":
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
              <span className="font-medium truncate">{item.config_json.chart_name || "Chart"}</span>
              <Badge variant="outline" className="text-xs">{item.config_json.chart_type || "chart"}</Badge>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div style={{ width: "100%", height: "100%" }}>
                <ChartPreview chart={item} />
              </div>
            </div>
          </div>
        );
      case "text":
        return (
          <div className="h-full p-3 overflow-auto">
            <div className="prose prose-sm max-w-none">{item.config_json.content || ""}</div>
          </div>
        );
      case "filter":
        return (
          <div className="h-full p-3 flex flex-col gap-2">
            <Label className="text-xs font-medium">{item.config_json.filter_column || "Filter"}</Label>
            <select className="border rounded px-2 py-1 text-sm bg-background" disabled>
              <option>All</option>
            </select>
            <p className="text-xs text-muted-foreground">Filters are disabled in shared view</p>
          </div>
        );
      case "kpi":
        return (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="text-3xl font-bold text-primary">{item.config_json.value || "—"}</div>
            <div className="text-sm text-muted-foreground">{item.config_json.metric || "Metric"}</div>
            <Badge variant="secondary" className="mt-1 text-xs">{item.config_json.aggregation || "sum"}</Badge>
          </div>
        );
      default:
        return null;
    }
  };

  const ItemComponent = ({ item }: { item: any }) => {
    return (
      <div
        className="bg-card border rounded-lg shadow-sm"
        data-grid={{ x: item.x, y: item.y, w: item.w, h: item.h, minW: item.minW || 2, minH: item.minH || 2, maxW: item.maxW, maxH: item.maxH, i: item.id }}
      >
        <div className="absolute top-1 left-1 z-10">
          <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
        </div>
        <div className="h-full relative pt-6">{renderItemContent(item)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 font-bold text-xl text-muted-foreground hover:text-foreground">
              <BarChart2 className="h-6 w-6 text-primary" />
              <span>DataLens</span>
            </a>
            <span className="text-sm text-muted-foreground">Shared Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/login">
                <ExternalLink className="h-4 w-4 mr-2" />
                Sign In
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href="/register">
                <Share2 className="h-4 w-4 mr-2" />
                Get DataLens
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{dashboardData.name}</h1>
          <p className="text-muted-foreground mt-1">
            {dashboardData.items?.length || 0} item{dashboardData.items?.length !== 1 ? "s" : ""} • Shared publicly
          </p>
        </div>

        <div className="relative" style={{ minHeight: "600px" }}>
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            compactType="vertical"
            draggableHandle={false}
            useCSSTransforms={true}
          >
            {layout.map((item, index) => (
              <ItemComponent key={item.id} item={item} />
            ))}
            {layout.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart2 className="h-16 w-16 mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">Empty Dashboard</h3>
                <p className="text-sm">This dashboard has no items yet.</p>
              </div>
            )}
          </ResponsiveGridLayout>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Viewed via DataLens shared link</p>
          <p className="mt-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="/register">
                Create your own dashboards with DataLens
              </a>
            </Button>
          </p>
        </div>
      </main>
    </div>
  );
}

// Simple chart preview for shared view
function ChartPreview({ chart }: { chart: any }) {
  const [Plot, setPlot] = useState<any>(null);
  const plotlyJsonRef = useRef(chart.config_json.plotly_json);

  useEffect(() => {
    plotlyJsonRef.current = chart.config_json.plotly_json;
  }, [chart.config_json.plotly_json]);

  useEffect(() => {
    import("react-plotly.js").then(({ default: P }) => {
      setPlot(P);
    });
  }, []);

  if (!Plot || !plotlyJsonRef.current) {
    return <div className="flex items-center justify-center h-full"><BarChart2 className="h-8 w-8 text-muted-foreground" /></div>;
  }

  return (
    <Plot
      data={plotlyJsonRef.current.data}
      layout={plotlyJsonRef.current.layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";