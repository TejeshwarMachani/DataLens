"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Badge as LucideBadge, Download, Eye, Trash2, BarChart2, Loader2, Play, Database, FileText, Search, ChevronLeft, ChevronRight, Copy, AlertCircle, CheckCircle } from "lucide-react";
import { useDataset, useDatasetProfile, useProfileSummary, useDatasetSchema, useDatasetSample, useDatasetStatusPoll, useGenerateProfile, isDatasetReady, isDatasetError, isDatasetUploaded, isDatasetProfiling } from "@/hooks/useDatasets";
import { useCharts } from "@/hooks/useCharts";
import { useExecuteSQL, useNLQuery } from "@/hooks/useQuery";
import { formatQueryResponse } from "@/hooks/useQuery";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");
  const [sql, setSql] = useState("");
  const [nlQuestion, setNlQuestion] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [nlResult, setNlResult] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { data: dataset, isLoading: datasetLoading, error: datasetError, refetch: refetchDataset } = useDataset(datasetId);
  const { data: profile, isLoading: profileLoading } = useDatasetProfile(datasetId);
  const { data: profileSummary, isLoading: summaryLoading } = useProfileSummary(datasetId);
  const { data: schema, isLoading: schemaLoading } = useDatasetSchema(datasetId);
  const { data: sample, isLoading: sampleLoading } = useDatasetSample(datasetId, 50);
  const { data: chartsResponse, isLoading: chartsLoading } = useCharts(datasetId, 1, 20);
  const { mutate: generateProfile, isPending: profileGenerating } = useGenerateProfile();
  const executeSQLMutation = useExecuteSQL();
  const nlQueryMutation = useNLQuery();

  // Poll dataset status until ready
  const { data: statusData } = useDatasetStatusPoll(datasetId, !!datasetId);

  // Use the latest status data
  const currentDataset = statusData || dataset;

  const charts = chartsResponse?.data?.items || [];

  const handleGenerateProfile = () => {
    generateProfile(datasetId, {
      onSuccess: () => {
        toast.success("Profile generation started");
      },
      onError: () => {
        toast.error("Failed to generate profile");
      },
    });
  };

  const handleExecuteSQL = async () => {
    if (!sql.trim()) return;
    try {
      const result = await executeSQLMutation.mutateAsync({
        sql,
        dataset_id: datasetId,
        limit: 1000,
      });
      setQueryResult(formatQueryResponse(result.data));
    } catch (error) {
      toast.error("Query failed");
    }
  };

  const handleNLQuery = async () => {
    if (!nlQuestion.trim()) return;
    try {
      const result = await nlQueryMutation.mutateAsync({
        question: nlQuestion,
        dataset_id: datasetId,
        chart_suggestion: true,
      });
      setNlResult(result.data);
      if (result.data?.sql) {
        setSql(result.data.sql);
      }
    } catch (error) {
      toast.error("Natural language query failed");
    }
  };

  const handleViewProfile = () => {
    if (profile?.data?.html_report_path) {
      window.open(`/api/datasets/${datasetId}/profile/html`, "_blank");
    }
  };

  const handleDeleteDataset = () => {
    if (confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      // The delete mutation is in useDatasets hook, we need to call it from parent
      // For now, redirect to datasets list after delete
      router.push("/datasets");
      router.refresh();
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard");
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

  if (datasetLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (datasetError || !currentDataset) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Dataset not found</h3>
        <p className="text-muted-foreground mb-4">The dataset you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push("/datasets")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Datasets
        </Button>
      </div>
    );
  }

  const ds = currentDataset;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/datasets" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{ds.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{ds.file_type.toUpperCase()}</Badge>
              {getStatusBadge(ds.status)}
              {ds.rows && <span className="text-sm text-muted-foreground">{ds.rows.toLocaleString()} rows</span>}
              {ds.columns && <span className="text-sm text-muted-foreground">• {ds.columns} columns</span>}
              {ds.size_bytes && <span className="text-sm text-muted-foreground">• {(ds.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDatasetReady(ds) && (
            <Button asChild variant="outline">
              <Link href={`/datasets/${ds.id}/charts/new`}>
                <BarChart2 className="h-4 w-4 mr-2" />
                Create Chart
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <LucideBadge className="h-4 w-4 mr-2" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/datasets/${ds.id}/query`}>
                  <Search className="h-4 w-4 mr-2" />
                  Open in Query
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteDataset}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Dataset
              </DropdownMenuItem>
            </DropdownMenuContent          </DropdownMenu>
        </div>
      </div>

      {/* Status indicator for non-ready datasets */}
      {!isDatasetReady(ds) && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <div>
                <p className="font-medium">
                  {isDatasetUploaded(ds) && "Dataset uploaded. Processing..."}
                  {isDatasetProfiling(ds) && "Generating profile report..."}
                  {isDatasetError(ds) && "Error processing dataset"}
                </p>
                {ds.error_message && <p className="text-sm text-muted-foreground">{ds.error_message}</p>}
              </div>
              {isDatasetUploaded(ds) && !profileGenerating && (
                <Button size="sm" onClick={handleGenerateProfile}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile" disabled={!isDatasetReady(ds)}>Profile</TabsTrigger>
          <TabsTrigger value="charts">Charts ({charts.length})</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Dataset Info Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rows</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ds.rows?.toLocaleString() ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Columns</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ds.columns ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">File Size</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ds.size_bytes ? `${(ds.size_bytes / (1024 * 1024)).toFixed(2)} MB` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sm">{format(new Date(ds.created_at), "MMM d, yyyy")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Column Info */}
          {schema?.data && (
            <Card>
              <CardHeader>
                <CardTitle>Column Information</CardTitle>
                <CardDescription>Inferred types and statistics from the uploaded data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Semantic Type</TableHead>
                        <TableHead className="hidden md:table-cell">Missing</TableHead>
                        <TableHead className="hidden md:table-cell">Unique</TableHead>
                        <TableHead className="hidden lg:table-cell">Sample Values</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schema.data.columns.map((col: any) => (
                        <TableRow key={col.name}>
                          <TableCell className="font-mono font-medium">{col.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{col.type}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">{col.extra || "unknown"}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {col.null ? "Yes" : "No"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">—</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {col.default ? String(col.default).slice(0, 50) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sample Data */}
          {sample?.data && sample.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Data</CardTitle>
                <CardDescription>First 50 rows of the dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {sample.data[0] && Object.keys(sample.data[0]).map((key) => (
                          <TableHead key={key} className="font-mono text-xs">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sample.data.slice(0, 20).map((row: any, i: number) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val, j) => (
                            <TableCell key={j} className="font-mono text-xs max-w-xs truncate">
                              {val === null ? <span className="text-muted-foreground">NULL</span> : String(val).slice(0, 100)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {sample.data.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing 20 of {sample.data.length} sample rows
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {!isDatasetReady(ds) ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Profile not available</h3>
                <p className="text-muted-foreground mb-4">
                  Generate a profile report to see detailed statistics, distributions, correlations, and data quality metrics.
                </p>
                <Button onClick={handleGenerateProfile} disabled={profileGenerating}>
                  {profileGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Profile
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : profileLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !profile?.data ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No profile generated</h3>
                <p className="text-muted-foreground mb-4">
                  Click the button below to generate a comprehensive profile report.
                </p>
                <Button onClick={handleGenerateProfile} disabled={profileGenerating}>
                  {profileGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Profile
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Profile Report</h2>
                  <p className="text-muted-foreground">Generated on {format(new Date(profile.data.created_at), "MMM d, yyyy HH:mm")}</p>
                </div>
                <Button onClick={handleViewProfile}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Report
                </Button>
              </div>

              {/* Profile Summary Stats */}
              {profileSummary?.data && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Variables</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{profileSummary.data.n_variables}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Observations</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{profileSummary.data.n_observations.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Missing Cells</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{profileSummary.data.missing_cells.toLocaleString()} ({profileSummary.data.missing_cells_pct}%)</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Duplicate Rows</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{profileSummary.data.duplicate_rows.toLocaleString()} ({profileSummary.data.duplicate_rows_pct}%)</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Variable Types */}
              {profileSummary?.data?.variable_types && Object.keys(profileSummary.data.variable_types).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Variable Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profileSummary.data.variable_types).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Missing */}
              {profileSummary?.data?.top_missing && profileSummary.data.top_missing.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Missing Values</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Column</TableHead>
                            <TableHead>Missing Count</TableHead>
                            <TableHead>Missing %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profileSummary.data.top_missing.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{item.name}</TableCell>
                              <TableCell>{item.missing_count.toLocaleString()}</TableCell>
                              <TableCell>{item.missing_pct}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* High Correlations */}
              {profileSummary?.data?.high_correlations && profileSummary.data.high_correlations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>High Correlations (|r| > 0.7)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Columns</TableHead>
                            <TableHead>Correlation</TableHead>
                            <TableHead>Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profileSummary.data.high_correlations.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{item.columns}</TableCell>
                              <TableCell>{item.correlation}</TableCell>
                              <TableCell>{item.method}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          {charts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No charts yet</h3>
                <p className="text-muted-foreground mb-4">Create your first chart to visualize this dataset</p>
                <Button asChild>
                  <Link href={`/datasets/${ds.id}/charts/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Chart
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {charts.map((chart: any) => (
                <Card key={chart.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {chart.plotly_json && (
                      <div className="aspect-video bg-muted">
                        {/* Plotly chart would render here */}
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <BarChart2 className="h-8 w-8" />
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-medium mb-1">{chart.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2 capitalize">{chart.chart_type}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/charts/${chart.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/charts/${chart.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Query Tab */}
        <TabsContent value="query" className="space-y-6">
          {/* SQL Editor */}
          <Card>
            <CardHeader>
              <CardTitle>SQL Editor</CardTitle>
              <CardDescription>Write and execute SQL queries directly on your dataset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="SELECT * FROM dataset_xxx LIMIT 100"
                  className="font-mono text-sm min-h-[200px] resize-y"
                  rows={10}
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleExecuteSQL} disabled={executeSQLMutation.isPending || !sql.trim()}>
                    {executeSQLMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Query
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={copySql} disabled={!sql.trim()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>
              </div>

              {/* Query Results */}
              {queryResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {queryResult.rowCount} rows {queryResult.truncated ? "(truncated)" : ""}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryResult.columns.map((col: string) => (
                            <TableHead key={col} className="font-mono text-xs">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResult.rows.slice(0, 100).map((row: any, i: number) => (
                          <TableRow key={i}>
                            {queryResult.columns.map((col: string) => (
                              <TableCell key={col} className="font-mono text-xs max-w-xs truncate">
                                {row[col] === null ? <span className="text-muted-foreground">NULL</span> : String(row[col]).slice(0, 100)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Natural Language Query */}
          <Card>
            <CardHeader>
              <CardTitle>Natural Language Query</CardTitle>
              <CardDescription>Ask questions in plain English - AI will generate SQL and visualize results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Textarea
                  value={nlQuestion}
                  onChange={(e) => setNlQuestion(e.target.value)}
                  placeholder="e.g., 'Show me the top 10 customers by revenue' or 'What is the average order value by month?'"
                  className="min-h-[80px] resize-y"
                  rows={3}
                />
                <Button onClick={handleNLQuery} disabled={nlQueryMutation.isPending || !nlQuestion.trim()}>
                  {nlQueryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Ask Question
                      </>
                    )}
                </Button>
              </div>

              {/* NL Query Results */}
              {nlResult && (
                <div className="space-y-4">
                  {nlResult.sql && (
                    <div>
                      <h4 className="font-medium mb-2">Generated SQL</h4>
                      <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                        {nlResult.sql}
                      </div>
                    </div>
                  )}
                  {nlResult.answer && (
                    <div>
                      <h4 className="font-medium mb-2">Answer</h4>
                      <p className="text-muted-foreground">{nlResult.answer}</p>
                    </div>
                  )}
                  {nlResult.data && nlResult.data.length > 0 && nlResult.columns && (
                    <div>
                      <h4 className="font-medium mb-2">Results</h4>
                      <div className="overflow-x-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {nlResult.columns.map((col: string) => (
                                <TableHead key={col} className="font-mono text-xs">{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nlResult.data.slice(0, 100).map((row: any, i: number) => (
                              <TableRow key={i}>
                                {nlResult.columns.map((col: string) => (
                                  <TableCell key={col} className="font-mono text-xs max-w-xs truncate">
                                    {row[col] === null ? <span className="text-muted-foreground">NULL</span> : String(row[col]).slice(0, 100)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  {nlResult.chart_spec && (
                    <div>
                      <h4 className="font-medium mb-2">Suggested Visualization</h4>
                      <div className="aspect-video bg-muted rounded border">
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <BarChart2 className="h-8 w-8" />
                          <span className="ml-2">Chart preview would render here</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}