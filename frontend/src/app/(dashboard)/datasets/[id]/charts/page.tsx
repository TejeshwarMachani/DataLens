"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, BarChart2, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Download, Copy } from "lucide-react";
import { format } from "date-fns";
import { useCharts } from "@/hooks/useCharts";
import { toast } from "sonner";

export default function ChartsListPage() {
  const params = useParams();
  const datasetId = params.id as string;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: chartsData, isLoading, refetch } = useCharts({ params: { id: datasetId } });
  const deleteChart = useCharts({ params: { id: datasetId } }).deleteChart;

  const charts = chartsData?.items || [];
  const total = chartsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredCharts = charts.filter(
    (chart) => chart.name.toLowerCase().includes(search.toLowerCase()) ||
               chart.chart_type.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (chartId: string, chartName: string) => {
    if (!confirm(`Are you sure you want to delete "${chartName}"?`)) return;
    try {
      await deleteChart.mutateAsync(chartId);
      toast.success("Chart deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete chart");
    }
  };

  const chartTypeIcons: Record<string, any> = {
    bar: BarChart2,
    line: BarChart2,
    scatter: BarChart2,
    pie: BarChart2,
    area: BarChart2,
    histogram: BarChart2,
    box: BarChart2,
  };

  if (isLoading && charts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charts</h1>
          <p className="text-muted-foreground mt-1">Visualizations for this dataset</p>
        </div>
        <Link href={`/datasets/${datasetId}/charts/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Chart
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search charts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Charts Table */}
      <Card>
        <CardContent className="p-0">
          {filteredCharts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chart</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCharts.map((chart) => {
                    const Icon = chartTypeIcons[chart.chart_type] || BarChart2;
                    return (
                      <TableRow key={chart.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{chart.name}</p>
                              <p className="text-sm text-muted-foreground">{chart.chart_type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{chart.chart_type}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(chart.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/datasets/${datasetId}/charts/${chart.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/datasets/${datasetId}/charts/${chart.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(chart.id, chart.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No charts yet</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "No charts match your search." : "Create your first visualization for this dataset."}
              </p>
              {!search && (
                <Link href={`/datasets/${datasetId}/charts/new`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Chart
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}