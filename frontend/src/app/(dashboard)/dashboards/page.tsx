"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, LayoutDashboard, MoreVertical, Trash2, Share2, ExternalLink, Edit, Loader2 } from "lucide-react";
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
import { useDashboards, useDeleteDashboard, useCreateShareToken, useRemoveShareToken, DASHBOARD_ITEM_TYPES } from "@/hooks/useDashboards";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DashboardsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");

  const { data: dashboardsResponse, isLoading, refetch } = useDashboards(page, 10);
  const deleteMutation = useDeleteDashboard();
  const createShareMutation = useCreateShareToken();
  const removeShareMutation = useRemoveShareToken();

  const dashboards = dashboardsResponse?.data?.items || [];
  const total = dashboardsResponse?.data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }
    try {
      // We'll create an empty dashboard and then redirect to builder
      // For now just close modal and navigate
      setShowCreate(false);
      router.push(`/dashboards/builder`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to create dashboard");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this dashboard? This action cannot be undone.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Dashboard deleted");
        refetch();
      } catch (error) {
        toast.error("Failed to delete dashboard");
      }
    }
  };

  const handleShare = async (id: string, currentlyPublic: boolean) => {
    if (currentlyPublic) {
      try {
        await removeShareMutation.mutateAsync(id);
        toast.success("Share link removed");
        refetch();
      } catch (error) {
        toast.error("Failed to remove share link");
      }
    } else {
      try {
        const result = await createShareMutation.mutateAsync({ id });
        toast.success("Share link created!");
        navigator.clipboard.writeText(`${window.location.origin}/dashboards/share/${result.data.share_token}`);
        refetch();
      } catch (error) {
        toast.error("Failed to create share link");
      }
    }
  };

  const handleShareClick = (token: string) => {
    const url = `${window.location.origin}/dashboards/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share URL copied to clipboard!");
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-muted-foreground mt-1">
            Build and share interactive dashboards with your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dashboard
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboards/builder">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Builder
            </Link>
          </Button>
        </div>
      </div>

      {/* Create Dashboard Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Create Dashboard</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-name">Dashboard Name</Label>
                <Input
                  id="dashboard-name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="My Dashboard"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreateDashboard}>Create</Button>
              </div>
            </div          </div>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dashboards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dashboards Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Your Dashboards</CardTitle>
          <CardDescription>
            {total} dashboard{total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboards.length === 0 ? (
            <div className="text-center py-12">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No dashboards yet</h3>
              <p className="text-muted-foreground mb-4">Create your first dashboard to visualize your data</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dashboard
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboards/builder">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Open Builder
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dashboards.map((dashboard: any) => (
                <Card key={dashboard.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{dashboard.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {dashboard.items?.length || 0} item{dashboard.items?.length !== 1 ? "s" : ""}
                          {dashboard.is_public && <Badge variant="secondary" className="ml-2">Public</Badge>}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboards/${dashboard.id}`}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboards/builder?edit=${dashboard.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {dashboard.share_token && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleShareClick(dashboard.share_token!)}
                                className="flex items-center gap-2"
                              >
                                <Share2 className="h-4 w-4" />
                                Copy Share Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleShare(dashboard.id, true)}
                                className="flex items-center gap-2 text-destructive"
                              >
                                <Share2 className="h-4 w-4" />
                                Remove Share Link
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleShare(dashboard.id, false)}
                              className="flex items-center gap-2"
                            >
                              <Share2 className="h-4 w-4" />
                              Create Share Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(dashboard.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(dashboard.updated_at), "MMM d, yyyy")}
                    </p>
                    {dashboard.items && dashboard.items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {dashboard.items.slice(0, 5).map((item: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {DASHBOARD_ITEM_TYPES.find(t => t.type === item.item_type)?.label || item.item_type}
                          </Badge>
                        ))}
                        {dashboard.items.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{dashboard.items.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
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

import { Label } from "@/components/ui/label";
import { X } from "lucide-react";