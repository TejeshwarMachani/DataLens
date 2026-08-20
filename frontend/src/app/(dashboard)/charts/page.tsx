"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, BarChart2, MoreVertical, Trash2, Edit, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCharts, useDeleteChart } from "@/hooks/useCharts";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ChartsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("");

  const { data: chartsResponse, isLoading, refetch } = useCharts(datasetFilter || undefined, page, 20);
  const deleteMutation = useDeleteChart();

  const charts = chartsResponse?.data?.items || [];
  const total = chartsResponse?.data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this chart? This action cannot be undone.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Chart deleted");
        refetch();
      } catch (error) {
        toast.error("Failed to delete chart");
      }
    }
  };

  if (isLoading && page === 1) {
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
          <p className="text-muted-foreground mt-1">
            Manage your saved charts across all datasets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/datasets">
              <Plus className="h-4 w-4 mr-2" />
              Create Chart
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search charts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Select value={datasetFilter} onValueChange={setDatasetFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Datasets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Datasets</SelectItem>
                  {/* Dataset options would be populated here */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Charts</CardTitle>
          <CardDescription>
            {total} chart{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {charts.length === 0 ? (
            <div className="text-center py-12">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No charts yet</h3>
              <p className="text-muted-foreground mb-4">Create your first chart from a dataset</p>
              <Button asChild>
                <Link href="/datasets">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Datasets
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chart</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Dataset</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charts.map((chart: any) => (
                    <TableRow key={chart.id}>
                      <TableCell>
                        <Link href={`/charts/${chart.id}`} className="font-medium hover:text-primary transition-colors">
                          {chart.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{chart.chart_type}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {chart.dataset?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground max-w-xs truncate">
                        {chart.description || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(chart.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/charts/${chart.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/charts/${chart.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(chart.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
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