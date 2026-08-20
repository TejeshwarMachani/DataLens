"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, MoreVertical, Download, Eye, Trash2, BarChart2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { UploadZone } from "@/components/upload/UploadZone";
import { useDatasets, useDeleteDataset, useUploadDataset, useDatasetStatusPoll, isDatasetReady, isDatasetError } from "@/hooks/useDatasets";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DatasetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const { data: datasetsResponse, isLoading, refetch } = useDatasets(page, 10);
  const deleteMutation = useDeleteDataset();
  const uploadMutation = useUploadDataset();

  const datasets = datasetsResponse?.data?.items || [];
  const total = datasetsResponse?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const handleUploadComplete = (datasetId: string) => {
    setShowUpload(false);
    refetch();
    toast.success("Dataset uploaded! Processing in background...");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Dataset deleted");
        refetch();
      } catch (error) {
        toast.error("Failed to delete dataset");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      uploaded: "secondary",
      profiling: "default",
      ready: "default",
      error: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
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
          <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your data files. Upload CSV, Excel, Parquet, or JSON files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Upload Dataset</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Datasets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Datasets</CardTitle>
          <CardDescription>
            {total} dataset{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No datasets yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first dataset to get started</p>
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Rows</TableHead>
                    <TableHead className="hidden md:table-cell">Columns</TableHead>
                    <TableHead className="hidden lg:table-cell">Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">
                        <Link href={`/datasets/${dataset.id}`} className="hover:text-primary transition-colors">
                          {dataset.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {dataset.file_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {dataset.rows ? dataset.rows.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {dataset.columns ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {dataset.size_bytes
                          ? (dataset.size_bytes / (1024 * 1024)).toFixed(2) + " MB"
                          : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(dataset.created_at), "MMM d, yyyy")}
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
                              <Link href={`/datasets/${dataset.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            {isDatasetReady(dataset) && (
                              <DropdownMenuItem asChild>
                                <Link href={`/datasets/${dataset.id}/charts/new`}>
                                  <BarChart2 className="h-4 w-4 mr-2" />
                                  Create Chart
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/datasets/${dataset.id}/query`}>
                                <Search className="h-4 w-4 mr-2" />
                                Query
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(dataset.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

import { Database, X } from "lucide-react";