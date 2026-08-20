"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Save, Grid, Layers, Trash2, Share2, Settings, Loader2, X, Eye, Download, Copy, ArrowUpDown, ArrowLeftRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Toaster } from "sonner";
import ResponsiveReactGridLayout, { WidthProvider } from "react-grid-layout";
import { useDashboards, useCreateDashboard, useUpdateDashboard, useAddDashboardItem, useUpdateDashboardItem, useDeleteDashboardItem, useCreateShareToken, useRemoveShareToken, DASHBOARD_ITEM_TYPES, DashboardItem } from "@/hooks/useDashboards";
import { useCharts } from "@/hooks/useCharts";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const ResponsiveGridLayout = WidthProvider(ResponsiveReactGridLayout);

type BuilderItem = DashboardItem & { isNew?: boolean };

export default function DashboardBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const queryClient = useQueryClient();

  const [dashboardName, setDashboardName] = useState("");
  const [layout, setLayout] = useState<BuilderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<BuilderItem["item_type"]>("chart");
  const [selectedChartId, setSelectedChartId] = useState("");
  const [textContent, setTextContent] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [kpiMetric, setKpiMetric] = useState("");
  const [kpiAggregation, setKpiAggregation] = useState("sum");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  const { data: dashboardsResponse } = useDashboards(1, 100);
  const { data: chartsResponse } = useCharts(undefined, 1, 100);
  const createDashboardMutation = useCreateDashboard();
  const updateDashboardMutation = useUpdateDashboard();
  const addItemMutation = useAddDashboardItem();
  const updateItemMutation = useUpdateDashboardItem();
  const deleteItemMutation = useDeleteDashboardItem();
  const createShareMutation = useCreateShareToken();
  const removeShareMutation = useRemoveShareToken();

  const allDashboards = dashboardsResponse?.data?.items || [];
  const allCharts = chartsResponse?.data?.items || [];

  const currentDashboard = editId ? allDashboards.find(d => d.id === editId) : null;

  // Initialize layout from existing dashboard
  useEffect(() => {
    if (currentDashboard && currentDashboard.items) {
      setDashboardName(currentDashboard.name);
      setIsPublic(currentDashboard.is_public);
      setShareToken(currentDashboard.share_token);
      const items = currentDashboard.items.map((item: any) => ({
        ...item,
        config_json: item.config_json,
        i: item.id,
        x: item.config_json.x,
        y: item.config_json.y,
        w: item.config_json.w,
        h: item.config_json.h,
        minW: item.config_json.min_w || 2,
        minH: item.config_json.min_h || 2,
        maxW: item.config_json.max_w,
        maxH: item.config_json.max_h,
      }));
      setLayout(items);
    } else {
      // New dashboard - empty layout
      setLayout([]);
      setDashboardName("");
      setIsPublic(false);
      setShareToken(null);
    }
  }, [currentDashboard]);

  const handleLayoutChange = useCallback((newLayout: any[]) => {
    setLayout(newLayout.map(item => ({
      ...item,
      config_json: {
        ...item.config_json,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }
    })));
  }, []);

  const handleSave = async () => {
    if (!dashboardName.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }

    setIsSaving(true);
    try {
      const items = layout.map(item => ({
        item_type: item.item_type,
        config_json: item.config_json,
        order: item.config_json.order || 0,
      }));

      if (editId) {
        await updateDashboardMutation.mutateAsync({
          id: editId,
          data: {
            name: dashboardName,
            layout_json: { items },
            is_public: isPublic,
          },
        });
        toast.success("Dashboard updated!");
      } else {
        const result = await createDashboardMutation.mutateAsync({
          name: dashboardName,
          layout_json: { items },
          is_public: isPublic,
        });
        toast.success("Dashboard created!");
        router.push(`/dashboards/${result.data.id}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to save dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (selectedItemType === "chart" && !selectedChartId) {
      toast.error("Please select a chart");
      return;
    }

    // Find next available position
    const occupied = new Set(layout.map(item => `${item.x},${item.y}`));
    let x = 0, y = 0;
    while (occupied.has(`${x},${y}`)) {
      x += 6;
      if (x >= 12) {
        x = 0;
        y += 4;
      }
    }

    const newItem: BuilderItem = {
      id: `temp-${Date.now()}`,
      dashboard_id: editId || "",
      item_type: selectedItemType,
      config_json: {
        item_type: selectedItemType,
        chart_id: selectedItemType === "chart" ? selectedChartId : undefined,
        content: selectedItemType === "text" ? textContent : undefined,
        filter_column: selectedItemType === "filter" ? filterColumn : undefined,
        filter_type: selectedItemType === "filter" ? "select" : undefined,
        metric: selectedItemType === "kpi" ? kpiMetric : undefined,
        aggregation: selectedItemType === "kpi" ? kpiAggregation : undefined,
        x, y, w: 6, h: 4,
        min_w: 2, min_h: 2,
      },
      order: layout.length,
      isNew: true,
    };

    setLayout(prev => [...prev, newItem]);
    setShowAddItem(false);
    setSelectedItemType("chart");
    setSelectedChartId("");
    setTextContent("");
    setFilterColumn("");
    setKpiMetric("");
  };

  const handleRemoveItem = (itemId: string) => {
    setLayout(prev => prev.filter(item => item.id !== itemId));
    if (!itemId.startsWith("temp-") && editId) {
      deleteItemMutation.mutate({ dashboardId: editId, itemId });
    }
  };

  const handleItemResize = (itemId: string, newConfig: any) => {
    setLayout(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, config_json: { ...item.config_json, ...newConfig } }
        : item
    ));
  };

  const handleCreateShare = async () => {
    if (!editId) return;
    try {
      const result = await createShareMutation.mutateAsync({ id: editId });
      setShareToken(result.data.share_token);
      setIsPublic(true);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to create share link");
    }
  };

  const handleRemoveShare = async () => {
    if (!editId) return;
    try {
      await removeShareMutation.mutateAsync(editId);
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

  const renderItemContent = (item: BuilderItem) => {
    switch (item.item_type) {
      case "chart":
        const chart = allCharts.find(c => c.id === item.config_json.chart_id);
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
              <span className="font-medium truncate">{chart?.name || "Select a chart"}</span>
              <Badge variant="outline" className="text-xs">{chart?.chart_type || "chart"}</Badge>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {chart ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <ChartPreview chart={chart} />
                </div>
              ) : (
                <Plus className="h-8 w-8" />
              )}
            </div>
          </div>
        );
      case "text":
        return (
          <div className="h-full p-3 overflow-auto">
            <div className="prose prose-sm max-w-none">{item.config_json.content || "Add text content"}</div>
          </div>
        );
      case "filter":
        return (
          <div className="h-full p-3 flex flex-col gap-2">
            <Label className="text-xs font-medium">{item.config_json.filter_column || "Select column"}</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter values" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "kpi":
        return (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="text-3xl font-bold text-primary">{item.config_json.metric || "0"}</div>
            <div className="text-sm text-muted-foreground">{item.config_json.metric || "Select metric"}</div>
            <Badge variant="secondary" className="mt-1 text-xs">{item.config_json.aggregation || "sum"}</Badge>
          </div>
        );
      default:
        return null;
    }
  };

  const ItemComponent = ({ item, onRemove, onResize }: { item: BuilderItem; onRemove: (id: string) => void; onResize: (id: string, config: any) => void }) => {
    const typeConfig = DASHBOARD_ITEM_TYPES.find(t => t.type === item.item_type);
    return (
      <div
        className={`bg-card border rounded-lg shadow-sm ${item.isNew ? "ring-2 ring-primary" : ""}`}
        data-grid={{ x: item.x, y: item.y, w: item.w, h: item.h, minW: item.minW || 2, minH: item.minH || 2, maxW: item.maxW, maxH: item.maxH, i: item.id }}
      >
        <div className="absolute top-1 right-1 flex gap-1 z-10 opacity-0 hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onResize(item.id, { w: Math.min(item.w + 1, 12) )} title="Widen">
            <ArrowLeftRight className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onResize(item.id, { w: Math.max(item.w - 1, 2) )} title="Narrow">
            <ArrowLeftRight className="h-3 w-3 rotate-90" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onResize(item.id, { h: Math.min(item.h + 1, 10) )} title="Taller">
            <ArrowUpDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onResize(item.id, { h: Math.max(item.h - 1, 2) )} title="Shorter">
            <ArrowUpDown className="h-3 w-3 rotate-90" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="absolute top-1 left-1 z-10">
          <Badge variant="outline" className="text-xs">{typeConfig?.label || item.item_type}</Badge>
        </div>
        <div className="h-full relative pt-6">{renderItemContent(item)}</div>
      </div>
    );
  };

  if (editId && !currentDashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading dashboard...</p>
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Builder</h1>
              {editId && <Badge variant="secondary">Editing</Badge>}
              {!editId && <Badge variant="outline">New</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">
              Drag and drop items to build your dashboard. Resize with handles.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboards")}>
            <X className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          {editId && isPublic && (
            <Button variant="outline" onClick={copyShareLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          )}
          {editId && (
            <Button variant="outline" onClick={() => setShowShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Dashboard
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dashboard Name & Settings */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dashboard-name">Dashboard Name</Label>
              <Input
                id="dashboard-name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Untitled Dashboard"
                className="max-w-md"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">Public (shareable link)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Builder Canvas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Canvas</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <div className="flex items-center gap-1 border rounded px-2 py-1 text-xs text-muted-foreground">
              <Grid className="h-3 w-3" />
              <span>12-column grid</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative" style={{ minHeight: "600px" }}>
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={30}
              compactType="vertical"
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              useCSSTransforms={true}
            >
              {layout.map((item, index) => (
                <ItemComponent
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  onResize={handleItemResize}
                />
              ))}
              {layout.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Grid className="h-16 w-16 mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">Empty Dashboard</h3>
                  <p className="text-sm mb-4">Click "Add Item" to start building</p>
                  <Button onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              )}
            </ResponsiveGridLayout>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Dashboard Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {DASHBOARD_ITEM_TYPES.map((type) => (
              <Button
                key={type.type}
                variant={selectedItemType === type.type ? "default" : "outline"}
                onClick={() => setSelectedItemType(type.type)}
                className="h-24 flex-col gap-2 p-4"
              >
                <span className="text-3xl">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground">{type.description}</span>
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-4 border-t pt-4">
            {selectedItemType === "chart" && (
              <div className="space-y-2">
                <Label>Select Chart</Label>
                <Select value={selectedChartId} onValueChange={setSelectedChartId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a chart" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCharts.map((chart: any) => (
                      <SelectItem key={chart.id} value={chart.id}>
                        {chart.name} ({chart.chart_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedItemType === "text" && (
              <div className="space-y-2">
                <Label>Text Content (Markdown supported)</Label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter markdown text..."
                  className="w-full p-2 border rounded min-h-[100px] font-mono text-sm"
                  rows={5}
                />
              </div>
            )}
            {selectedItemType === "filter" && (
              <div className="space-y-2">
                <Label>Filter Column</Label>
                <Input value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)} placeholder="column_name" />
              </div>
            )}
            {selectedItemType === "kpi" && (
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Metric Column</Label>
                  <Input value={kpiMetric} onChange={(e) => setKpiMetric(e.target.value)} placeholder="revenue" />
                </div>
                <div className="space-y-2">
                  <Label>Aggregation</Label>
                  <Select value={kpiAggregation} onValueChange={setKpiAggregation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="mean">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={selectedItemType === "chart" && !selectedChartId}>
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {shareToken ? (
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/dashboards/share/${shareToken}`} readOnly />
                  <Button variant="outline" onClick={copyShareLink} size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={handleRemoveShare} className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Remove Share Link
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">This dashboard is private. Create a share link to allow anyone with the link to view it.</p>
                <Button onClick={handleCreateShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple chart preview component
function ChartPreview({ chart }: { chart: any }) {
  const [Plot, setPlot] = useState<any>(null);

  useEffect(() => {
    import("react-plotly.js").then(({ default: P }) => {
      setPlot(P);
    });
  }, []);

  if (!Plot || !chart.plotly_json) {
    return <div className="flex items-center justify-center h-full"><div className="text-muted-foreground">Loading...</div></div>;
  }

  return (
    <Plot
      data={chart.plotly_json.data}
      layout={chart.plotly_json.layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

import { useState, useEffect, useRef } from "react";