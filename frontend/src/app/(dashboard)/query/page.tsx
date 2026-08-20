"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Play, Download, Copy, Loader2, Database, Table, Search, Save, History, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table as TableComp,
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
import { useDataset, useDatasetSchema, useDatasetSample } from "@/hooks/useDatasets";
import { useExecuteSQL, useNLQuery, formatQueryResponse } from "@/hooks/useQuery";
import { useDatasets } from "@/hooks/useDatasets";
import { format } from "date-fns";
import { toast } from "sonner";

export default function QueryPage() {
  const router = useRouter();
  const params = useParams();
  const datasetId = params.id as string;

  const [sql, setSql] = useState("");
  const [nlQuestion, setNlQuestion] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [nlResult, setNlResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("sql");
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasetId || "");
  const [history, setHistory] = useState<string[]>([]);

  const { data: dataset, isLoading: datasetLoading } = useDataset(selectedDatasetId || undefined);
  const { data: schema } = useDatasetSchema(selectedDatasetId || undefined);
  const { data: sample } = useDatasetSample(selectedDatasetId || undefined, 10);
  const { data: datasetsResponse } = useDatasets(1, 100);

  const executeSQLMutation = useExecuteSQL();
  const nlQueryMutation = useNLQuery();

  const allDatasets = datasetsResponse?.data?.items || [];
  const currentDataset = dataset?.data;

  const handleExecuteSQL = async () => {
    if (!sql.trim() || !selectedDatasetId) return;
    try {
      const result = await executeSQLMutation.mutateAsync({
        sql,
        dataset_id: selectedDatasetId,
        limit: 1000,
      });
      const formatted = formatQueryResponse(result.data);
      setQueryResult(formatted);
      // Add to history
      setHistory(prev => [sql, ...prev.filter(s => s !== sql)].slice(0, 20));
    } catch (error) {
      toast.error("Query failed");
    }
  };

  const handleNLQuery = async () => {
    if (!nlQuestion.trim() || !selectedDatasetId) return;
    try {
      const result = await nlQueryMutation.mutateAsync({
        question: nlQuestion,
        dataset_id: selectedDatasetId,
        chart_suggestion: true,
      });
      setNlResult(result.data);
      if (result.data?.sql) {
        setSql(result.data.sql);
        setActiveTab("sql");
      }
    } catch (error) {
      toast.error("Natural language query failed");
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard");
  };

  const loadFromHistory = (query: string) => {
    setSql(query);
    setActiveTab("sql");
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const insertTableName = () => {
    if (currentDataset) {
      const tableName = currentDataset.duckdb_view_name;
      setSql(prev => prev + (prev.endsWith(" ") ? "" : " ") + tableName);
    }
  };

  if (datasetLoading && selectedDatasetId) {
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
        <div className="flex items-center gap-4">
          <Link href="/datasets" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Query</h1>
            <p className="text-muted-foreground mt-1">
              Write SQL or ask questions in natural language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              {allDatasets.map((ds: any) => (
                <SelectItem key={ds.id} value={ds.id} disabled={ds.status !== "ready"}>
                  {ds.name} {ds.status !== "ready" && <Badge variant="secondary" className="ml-1">{ds.status}</Badge>}
                </SelectItem>
              ))}
            </SelectContent          </Select>
        </div>
      </div>

      {/* Dataset Info Bar */}
      {currentDataset && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">{currentDataset.name}</span>
                <Badge variant="secondary" className="text-xs">{currentDataset.file_type.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Table className="h-3 w-3" />
                <span>{currentDataset.rows?.toLocaleString() || "—"} rows</span>
                <span>•</span>
                <span>{currentDataset.columns || "—"} columns</span>
              </div>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={insertTableName}>
                <Database className="h-4 w-4 mr-1" />
                Insert Table Name
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schema Sidebar */}
      {schema?.data && (
        <Card className="sticky top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Schema</CardTitle>
            <CardDescription>Click a column to insert it into the query</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {schema.data.columns.map((col: any) => (
                <Button
                  key={col.name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs"
                  onClick={() => setSql(prev => prev + (prev.endsWith(" ") ? "" : " ") + col.name)}
                >
                  <code className="font-mono">{col.name}</code>
                  <Badge variant="outline" className="text-xs">{col.type}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sql">
            <Database className="h-4 w-4 mr-2" />
            SQL Editor
          </TabsTrigger>
          <TabsTrigger value="nl">
            <Search className="h-4 w-4 mr-2" />
            Natural Language
          </TabsTrigger>
        </TabsList>

        {/* SQL Editor Tab */}
        <TabsContent value="sql" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            {/* Editor */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>SQL Query</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copySql} disabled={!sql.trim()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button onClick={handleExecuteSQL} disabled={executeSQLMutation.isPending || !sql.trim() || !selectedDatasetId}>
                    {executeSQLMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run (Ctrl+Enter)
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="SELECT * FROM dataset_xxx LIMIT 100"
                  className="font-mono text-sm min-h-[400px] resize-y border-0 focus:ring-0 p-4"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      handleExecuteSQL();
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Sidebar - History & Sample Data */}
            <div className="space-y-4">
              {/* Query History */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">History</CardTitle>
                  {history.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={clearHistory}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No queries yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {history.map((query, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left p-2 h-auto"
                          onClick={() => loadFromHistory(query)}
                        >
                          <code className="text-xs font-mono block truncate">{query.slice(0, 100)}</code>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sample Data */}
              {sample?.data && sample.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sample Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-64">
                      <TableComp>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(sample.data[0]).map((key) => (
                              <TableHead key={key} className="font-mono text-xs">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sample.data.slice(0, 10).map((row: any, i: number) => (
                            <TableRow key={i}>
                              {Object.values(row).map((val, j) => (
                                <TableCell key={j} className="font-mono text-xs max-w-xs truncate">
                                  {val === null ? <span className="text-muted-foreground">NULL</span> : String(val).slice(0, 50)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </TableComp>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Results */}
          {queryResult && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{queryResult.rowCount} rows</Badge>
                  {queryResult.truncated && <Badge variant="outline">Truncated</Badge>}
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <TableComp>
                    <TableHeader>
                      <TableRow>
                        {queryResult.columns.map((col: string) => (
                          <TableHead key={col} className="font-mono text-xs">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResult.rows.map((row: any, i: number) => (
                        <TableRow key={i}>
                          {queryResult.columns.map((col: string) => (
                            <TableCell key={col} className="font-mono text-xs max-w-xs truncate">
                              {row[col] === null ? <span className="text-muted-foreground">NULL</span> : String(row[col]).slice(0, 100)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableComp>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Natural Language Tab */}
        <TabsContent value="nl" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <Card>
              <CardHeader>
                <CardTitle>Ask a Question</CardTitle>
                <CardDescription>Type your question in plain English</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={nlQuestion}
                  onChange={(e) => setNlQuestion(e.target.value)}
                  placeholder="e.g., 'Show me the top 10 customers by revenue' or 'What is the average order value by month?'"
                  className="min-h-[120px] resize-y"
                  rows={4}
                />
                <Button onClick={handleNLQuery} disabled={nlQueryMutation.isPending || !nlQuestion.trim() || !selectedDatasetId} className="w-full">
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
              </CardContent>
            </Card>

            {/* NL Query Results */}
            <div className="space-y-4">
              {nlResult && (
                <>
                  {nlResult.sql && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Generated SQL</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => { setSql(nlResult.sql!); setActiveTab("sql"); copySql(); }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to SQL Editor
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                          {nlResult.sql}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {nlResult.answer && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Answer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{nlResult.answer}</p>
                      </CardContent>
                    </Card>
                  )}
                  {nlResult.data && nlResult.data.length > 0 && nlResult.columns && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto max-h-96">
                          <TableComp>
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
                          </TableComp>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {nlResult.chart_spec && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Suggested Visualization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-muted rounded border">
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <BarChart2 className="h-8 w-8 mr-2" />
                            <span>Chart preview would render here</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Example Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Example Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Show me the first 10 rows",
                      "Count total rows",
                      "Show me column statistics",
                      "What are the unique values in each column?",
                      "Find rows with missing values",
                      "Show me correlations between numeric columns",
                    ].map((q, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => { setNlQuestion(q); handleNLQuery(); }}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { BarChart2 } from "lucide-react";