"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Loader2, Trash2, LayoutDashboard, ArrowLeft, X, Edit, ExternalLink, RotateCcw, Maximize2, Filter, SlidersHorizontal, Calendar, Hash, Type } from "lucide-react";
import { useDashboards } from "@/hooks/useDashboards";
import { useCharts } from "@/hooks/useCharts";
import { toast } from "sonner";
import { Responsive, WidthProvider } from "react-grid-layout";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardItem {
  id: string;
  chart_id: string;
  chart_name: string;
  chart_type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
  // Filter properties
  filter_column?: string;
  filter_type?: "select" | "multi_select" | "date_range" | "number_range";
}

interface ChartOption {
  id: string;
  name: string;
  chart_type: string;
}

interface FilterTypeOption {
  type: "select" | "multi_select" | "date_range" | "number_range";
  label: string;
  icon: any;
}

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

export default function DashboardEditPage() {
  const params = useParams();
  const dashboardId = params.id as string;
  const router = useRouter();

  const { data: dashboard, isLoading: dashboardLoading } = useDashboards({ params: { id: dashboardId } });
  const { data: chartsData } = useCharts();
  const updateDashboard = useDashboards().updateDashboard;
  const deleteDashboard = useDashboards().deleteDashboard;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [availableCharts, setAvailableCharts] = useState<ChartOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterType, setFilterType] = useState<"select" | "multi_select" | "date_range" | "number_range">("select");
  const [filterLabel, setFilterLabel] = useState("");

  // Load available charts
  useEffect(() => {
    const charts = chartsData?.items || [];
    setAvailableCharts(charts.map((c: any) => ({ id: c.id, name: c.name, chart_type: c.chart_type })));
  }, [chartsData]);

  // Initialize form with existing dashboard data
  useEffect(() => {
    if (dashboard && !initialized) {
      setName(dashboard.name);
      setDescription(dashboard.description || "");
      setIsShared(dashboard.is_shared);

      const chartMap = new Map(chartsData?.items?.map((c: any) => [c.id, c]) || []);
      const layoutData = dashboard.layout || [];
      const loadedItems: DashboardItem[] = layoutData.map((item: any, index: number) => {
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
          minW: 2,
          minH: 2,
        };
      });
      setItems(loadedItems);
      setLayout(loadedItems.map(item => ({
        i: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: 2,
        minH: 2,
      })));
      setInitialized(true);
    }
  }, [dashboard, chartsData, initialized]);

  // Sync layout changes back to items
  const onLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    setItems(prevItems => {
      const layoutMap = new Map(newLayout.map(l => [l.i, l]));
      return prevItems.map(item => {
        const layoutItem = layoutMap.get(item.id);
        if (layoutItem) {
          return { ...item, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
        }
        return item;
      });
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }

    setIsSaving(true);
    try {
      const layoutToSave = items.map((item) => {
        const baseItem: any = {
          id: item.id,
          chart_id: item.chart_id,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          item_type: item.chart_type === "filter" ? "filter" : "chart",
        };
        // Add filter-specific config
        if (item.chart_type === "filter") {
          baseItem.filter_column = item.filter_column;
          baseItem.filter_type = item.filter_type;
        }
        return baseItem;
      });

      await updateDashboard.mutateAsync({
        id: dashboardId,
        name,
        description,
        is_shared: isShared,
        layout: layoutToSave,
      });
      toast.success("Dashboard updated successfully");
      router.push(`/dashboards/${dashboardId}`);
    } catch (error) {
      toast.error("Failed to update dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDashboard.mutateAsync(dashboardId);
      toast.success("Dashboard deleted");
      router.push("/dashboards");
    } catch (error) {
      toast.error("Failed to delete dashboard");
    }
  };

  const handleAddChart = (chart: ChartOption) => {
    // Find the next available position
    const maxY = items.length > 0 ? Math.max(...items.map(i => i.y + i.h)) : 0;
    const newItem: DashboardItem = {
      id: `item-${Date.now()}`,
      chart_id: chart.id,
      chart_name: chart.name,
      chart_type: chart.chart_type,
      x: 0,
      y: maxY,
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
    };
    const newLayoutItem: LayoutItem = {
      i: newItem.id,
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
      minW: 2,
      minH: 2,
    };
    setItems([...items, newItem]);
    setLayout([...layout, newLayoutItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
    setLayout(layout.filter((l) => l.i !== itemId));
  };

  const handleResetLayout = () => {
    if (!confirm("Reset layout to auto-arrange all charts?")) return;
    // Auto-arrange in a grid pattern
    const cols = 2;
    const newLayout = items.map((item, index) => ({
      i: item.id,
      x: (index % cols) * 6,
      y: Math.floor(index / cols) * 4,
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
    }));
    setLayout(newLayout);
    setItems(items.map((item, index) => ({
      ...item,
      x: (index % cols) * 6,
      y: Math.floor(index / cols) * 4,
      w: 6,
      h: 4,
    })));
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

  const filterTypeOptions: FilterTypeOption[] = [
    { type: "select", label: "Single Select", icon: ChevronDown },
    { type: "multi_select", label: "Multi Select", icon: ChevronDown },
    { type: "date_range", label: "Date Range", icon: Calendar },
    { type: "number_range", label: "Number Range", icon: Hash },
  ];

  const handleAddFilter = () => {
    if (!filterColumn.trim()) {
      toast.error("Please enter a column name");
      return;
    }
    const newItem: DashboardItem = {
      id: `filter-${Date.now()}`,
      chart_id: "",
      chart_name: filterLabel || filterColumn,
      chart_type: "filter",
      x: 0,
      y: items.length > 0 ? Math.max(...items.map(i => i.y + i.h)) : 0,
      w: 3,
      h: 2,
      minW: 2,
      minH: 2,
      filter_column: filterColumn,
      filter_type: filterType,
    };
    const newLayoutItem: LayoutItem = {
      i: newItem.id,
      x: newItem.x,
      y: newItem.y,
      w: newItem.w,
      h: newItem.h,
      minW: 2,
      minH: 2,
    };
    setItems([...items, newItem]);
    setLayout([...layout, newLayoutItem]);
    setShowAddFilter(false);
    setFilterColumn("");
    setFilterLabel("");
    setFilterType("select");
  };

  if (dashboardLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <LayoutDashboard className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Dashboard not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboards/${dashboardId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Dashboard</h1>
            <p className="text-muted-foreground mt-1">Modify your dashboard layout and settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Auto-Arrange
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dashboard Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dashboard Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Share publicly</Label>
                <Switch checked={isShared} onCheckedChange={setIsShared} />
              </div>
              {isShared && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  This dashboard will be accessible via a public link.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Charts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableCharts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutDashboard className="h-12 w-12 mx-auto mb-3" />
                  <p>No charts available</p>
                  <p className="text-sm mt-1">Create charts from your datasets first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableCharts.map((chart) => (
                    <Button
                      key={chart.id}
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => handleAddChart(chart)}
                    >
                      <span className="text-2xl">{chartTypeIcons[chart.chart_type] || "📊"}</span>
                      <div className="text-left flex-1">
                        <p className="font-medium">{chart.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{chart.chart_type}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent          </Card>

          {/* Add Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Add Global Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAddFilter ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Column Name</Label>
                    <Input
                      value={filterColumn}
                      onChange={(e) => setFilterColumn(e.target.value)}
                      placeholder="e.g., region, category, order_date"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Display Label (optional)</Label>
                    <Input
                      value={filterLabel}
                      onChange={(e) => setFilterLabel(e.target.value)}
                      placeholder="Leave empty to use column name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Filter Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filterTypeOptions.map((opt) => (
                          <SelectItem key={opt.type} value={opt.type}>
                            <opt.icon className="h-4 w-4 mr-2" />
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddFilter} className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddFilter(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowAddFilter(true)}>
                  <Filter className="h-4 w-4" />
                  Add Filter
                </Button>
              )}
            </CardContent          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Drag</strong> charts to reposition</p>
              <p>• <strong>Resize</strong> from bottom-right corner</p>
              <p>• <strong>Click X</strong> to remove a chart</p>
              <p>• <strong>Auto-Arrange</strong> to reset layout</p>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard Canvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveGridLayout
                className="layout"
                layouts={layout}
                onLayoutChange={onLayoutChange}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={50}
                verticalCompact={true}
                draggableHandle=".drag-handle"
                minRows={10}
                preventCollision={true}
                useCSSTransforms={true}
              >
                {items.map((item) => {
                  const isFilter = item.chart_type === "filter";
                  const filterTypeIcons: Record<string, any> = {
                    select: ChevronDown,
                    multi_select: ChevronDown,
                    date_range: Calendar,
                    number_range: Hash,
                  };
                  const FilterIcon = isFilter ? (filterTypeIcons[item.filter_type] || SlidersHorizontal) : null;

                  return (
                    <div
                      key={item.id}
                      data-grid={{
                        x: item.x,
                        y: item.y,
                        w: item.w,
                        h: item.h,
                        minW: item.minW,
                        minH: item.minH,
                        i: item.id,
                      }}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between p-2 bg-gray-50 border-b drag-handle cursor-move">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          {isFilter ? (
                            <FilterIcon className="h-5 w-5 text-primary" />
                          ) : (
                            <span className="text-2xl">{chartTypeIcons[item.chart_type] || "📊"}</span>
                          )}
                          <span className="font-medium text-sm truncate max-w-[150px]">{item.chart_name}</span>
                          {isFilter && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {item.filter_type?.replace("_", " ") || "filter"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!isFilter && item.chart_id && (
                            <Link href={`/datasets/${item.chart_id}/charts/${item.chart_id}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 text-center text-muted-foreground text-sm min-h-[120px] flex items-center justify-center">
                        <div className="text-center">
                          <p className="font-medium mb-1">{item.chart_name}</p>
                          {isFilter ? (
                            <>
                              <p className="text-xs text-primary mb-1">Global Filter</p>
                              <p className="text-xs">{item.filter_type?.replace("_", " ") || "filter"}</p>
                              <p className="text-xs text-gray-400 mt-1">Column: {item.filter_column}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs">{item.chart_type} chart</p>
                              <div className="mt-2 text-xs text-gray-400">
                                {item.w} × {item.h} grid units
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Resize handle */}
                      <div
                        className="react-resizable-handle react-resizable-handle-se"
                        style={{
                          position: "absolute",
                          right: 0,
                          bottom: 0,
                          width: "16px",
                          height: "16px",
                          cursor: "se-resize",
                          background: "linear-gradient(-45deg, transparent 50%, #ccc 50%)",
                        }}
                      />
                    </div>
                  );
                })}
              </ResponsiveGridLayout>

              {items.length === 0 && (
                <div className="grid gap-4" style={{
                  gridTemplateColumns: "repeat(12, 1fr)",
                  minHeight: "500px",
                  background: "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  border: "2px dashed #ddd",
                  borderRadius: "8px",
                  padding: "16px",
                }}>
                  <div className="col-span-12 text-center py-12 text-muted-foreground">
                    <LayoutDashboard className="h-12 w-12 mx-auto mb-3" />
                    <p>Drag charts from the sidebar to build your dashboard</p>
                    <p className="text-sm mt-1">Click a chart in the sidebar to add it</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Layout Grid Legend */}
          <Card>
            <CardContent className="py-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Grid: 12 columns × auto rows</span>
                <span>Drag to reposition</span>
                <span>Resize from corner</span>
              </div>
            </CardContent          </Card>
        </div>
      </div>
    </div>
  );
}