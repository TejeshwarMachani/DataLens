"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Share2, Download, Loader2, LayoutDashboard, MoreVertical, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ResponsiveReactGridLayout, { WidthProvider } from "react-grid-layout";
import { useDashboard, useDeleteDashboard, useCreateShareToken, useRemoveShareToken } from "@/hooks/useDashboards";
import { toast } from "sonner";

const ResponsiveGridLayout = WidthProvider(ResponsiveReactGridLayout);

export default function DashboardViewPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params.id as string;

  const { data: dashboard, isLoading, error, refetch } = useDashboard(dashboardId);
  const deleteMutation = useDeleteDashboard();
  const createShareMutation = useCreateShareToken();
  const removeShareMutation = useRemoveShareToken();

  const dashboardData = dashboard?.data;
  const [isPublic, setIsPublic] = useState(dashboardData?.is_public || false);
  const [shareToken, setShareToken] = useState(dashboardData?.share_token || null);

  const layout = (dashboardData?.items || []).map((item: any) => ({
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this dashboard? This action cannot be undone.")) {
      deleteMutation.mutate(dashboardId, {
        onSuccess: () => {
          toast.success("Dashboard deleted");
          router.push("/dashboards");
          router.refresh();
        },
        onError: () => {
          toast.error("Failed to delete dashboard");
        },
      });
    }
  };

  const handleCreateShare = async () => {
    try {
      const result = await createShareMutation.mutateAsync({ id: dashboardId });
      setShareToken(result.data.share_token);
      setIsPublic(true);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to create share link");
    }
  };

  const handleRemoveShare = async () => {
    try {
      await removeShareMutation.mutateAsync(dashboardId);
      setShareToken(null);
      setIsPublic(false);
      toast.success("Share link removed!");
    } catch (error) {
      toast.error("Failed to remove share link");
    }
  };

  const copyShareLink = () => {
    if (shareToken) {
      const url = `${window.location.origin}/dashboards/share/${shareToken}`;
      navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    }
  };

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
            <select className="border rounded px-2 py-1 text-sm bg-background">
              <option>All</option>
            </select>
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
          <LayoutDashboard className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Dashboard Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The dashboard you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/dashboards")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboards" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{dashboardData.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {isPublic && <Badge variant="default">Public</Badge>}
              <span className="text-sm text-muted-foreground">
                {dashboardData.items?.length || 0} item{dashboardData.items?.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboards/builder?edit=${dashboardId}`}>
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
              {isPublic && shareToken && (
                <>
                  <DropdownMenuItem onClick={copyShareLink} className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Copy Share Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/dashboards/share/${shareToken}`, "_blank")} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Shared View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRemoveShare} className="flex items-center gap-2 text-destructive">
                    <Share2 className="h-4 w-4" />
                    Remove Share Link
                  </DropdownMenuItem>
                </>
              )}
              {!isPublic && (
                <DropdownMenuItem onClick={handleCreateShare} className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Create Share Link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent          </DropdownMenu>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <Card>
        <CardContent className="pt-0">
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
                  <LayoutDashboard className="h-16 w-16 mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Empty Dashboard</h3>
                  <p className="text-sm mb-4">This dashboard has no items yet.</p>
                  <Button asChild variant="outline">
                    <Link href={`/dashboards/builder?edit=${dashboardId}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Edit Dashboard
                    </Link>
                  </Button>
                </div>
              )}
            </ResponsiveGridLayout>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple chart preview for dashboard view
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
    return <div className="flex items-center justify-center h-full"><LayoutDashboard className="h-8 w-8 text-muted-foreground" /></div>;
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
import { Plus } from "lucide-react";