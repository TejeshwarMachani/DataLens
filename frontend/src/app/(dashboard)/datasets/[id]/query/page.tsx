"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Loader2,
  Database,
  Code2,
  Download,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Sparkles,
  BarChart2,
  Maximize2,
  Minimize2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { useNLQuery } from "@/hooks/useQuery";
import { useDatasets } from "@/hooks/useDatasets";
import { useCharts } from "@/hooks/useCharts";
import { toast } from "sonner";
import { PlotlyChart } from "@/components/charts/PlotlyChart";

export default function NLQueryPage() {
  const params = useParams();
  const datasetId = params.id as string;

  const { data: dataset } = useDatasets({ params: { id: datasetId } });
  const { data: nlQueryHistory, executeQuery } = useNLQuery(datasetId);
  const createChart = useCharts({ params: { id: datasetId } }).createChart;

  const [question, setQuestion] = useState("");
  const [model, setModel] = useState<"openai" | "ollama">("openai");
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<"result" | "sql" | "explanation" | "chart">("result");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chartSpec, setChartSpec] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartColumns, setChartColumns] = useState<string[]>([]);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);

  const history = nlQueryHistory?.items || [];
  const latestQuery = history[0];

  const handleExecute = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsExecuting(true);
    setChartSpec(null);
    setChartData([]);
    try {
      await executeQuery.mutateAsync({
        dataset_id: datasetId,
        question,
        chart_suggestion: true,
        model,
      });
      setQuestion("");
      setActiveTab("result");
      toast.success("Query executed successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to execute query");
    } finally {
      setIsExecuting(false);
    }
  };

  // Check if latest query has chart suggestion
  useEffect(() => {
    if (latestQuery?.chart_spec) {
      setChartSpec(latestQuery.chart_spec);
      setChartData(latestQuery.data || []);
      setChartColumns(latestQuery.columns || []);
      setActiveTab("chart");
    }
  }, [latestQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadSQL = (sql: string) => {
    const blob = new Blob([sql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResults = (data: any[]) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => JSON.stringify(row[header] ?? "")).join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  const saveChartFromSuggestion = async () => {
    if (!chartSpec || !latestQuery?.sql_query) return;

    const name = question || `Chart from query: ${latestQuery.question.substring(0, 50)}...`;
    try {
      await createChart.mutateAsync({
        name,
        dataset_id: datasetId,
        chart_type: chartSpec.mark,
        spec_json: chartSpec,
      });
      toast.success("Chart saved to your charts");
    } catch (error) {
      toast.error("Failed to save chart");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Natural Language Query</h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about your data in plain English
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <Sparkles className="h-4 w-4 mr-2" />
                OpenAI (GPT-4)
              </SelectItem>
              <SelectItem value="ollama">
                <Database className="h-4 w-4 mr-2" />
                Ollama (Local)
              </SelectItem>
            </SelectContent          </Select>
        </div>
      </div>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
          <CardDescription>
            Type your question in natural language. The system will convert it to SQL and execute it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., What are the top 10 customers by revenue? Show me sales by region for the last quarter."
              className="flex-1 min-h-[100px] font-mono text-sm"
              rows={4}
            />
            <Button
              onClick={handleExecute}
              disabled={isExecuting || !question.trim()}
              className="h-fit self-start px-6"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd> to execute
            <kbd className="px-2 py-1 bg-muted rounded">Shift+Enter</kbd> for new line
          </div>

          {/* Example Questions */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Example questions
            </summary>
            <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
              {[
                "Show me the top 10 products by sales",
                "What is the average order value by region?",
                "Count of customers by signup month",
                "Total revenue by quarter for 2023",
                "Find customers who haven't ordered in 90 days",
              ].map((ex, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left hover:bg-primary/10"
                  onClick={() => setQuestion(ex)}
                >
                  {ex}
                </Button>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Results */}
      {latestQuery && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Latest Query Result</CardTitle>
              <Badge variant={latestQuery.status === "success" ? "default" : "destructive"}>
                {latestQuery.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(latestQuery.created_at), "MMM d, h:mm a")}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="result">Results</TabsTrigger>
                <TabsTrigger value="sql">SQL Query</TabsTrigger>
                <TabsTrigger value="explanation">Explanation</TabsTrigger>
                <TabsTrigger value="chart" disabled={!chartSpec}>
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Chart
                </TabsTrigger>
              </TabsList>

              <TabsContent value="result" className="space-y-4">
                {latestQuery.status === "success" && latestQuery.data && latestQuery.data.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">
                        {latestQuery.data.length} row{latestQuery.data.length !== 1 ? "s" : ""} returned
                        {latestQuery.row_count && latestQuery.row_count > latestQuery.data.length && (
                          <span> (showing first {latestQuery.data.length})</span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => downloadResults(latestQuery.data!)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download CSV
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(latestQuery.data[0]).map((key) => (
                              <TableHead key={key} className="font-mono text-sm">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {latestQuery.data.slice(0, 100).map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {Object.values(row).map((value, cellIndex) => (
                                <TableCell key={cellIndex} className="font-mono text-sm">
                                  {value ?? "NULL"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {latestQuery.data.length > 100 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Showing 100 of {latestQuery.data.length} rows. Download CSV for full results.
                      </p>
                    )}
                  </>
                ) : latestQuery.status === "success" && (!latestQuery.data || latestQuery.data.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p>Query executed successfully but returned no results.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-destructive">
                    <XCircle className="h-12 w-12 mx-auto mb-3" />
                    <p className="font-medium">Query failed</p>
                    <p className="text-sm mt-1">{latestQuery.error_message || "Unknown error"}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sql" className="space-y-4">
                {latestQuery.sql_query && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Generated SQL</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(latestQuery.sql_query!)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadSQL(latestQuery.sql_query!)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    <pre className="bg-muted p-4 rounded overflow-auto max-h-96">
                      <code className="text-sm font-mono">{latestQuery.sql_query}</code>
                    </pre>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code2 className="h-12 w-12 mx-auto mb-3" />
                    <p>No SQL query generated</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="explanation" className="space-y-4">
                {latestQuery.explanation ? (
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{latestQuery.explanation}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3" />
                    <p>No explanation available</p>
                  </div>
                )}
              </TabsContent>

              {/* Chart Suggestion Tab */}
              <TabsContent value="chart" className="space-y-4">
                {chartSpec && chartData.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">Suggested Visualization</h3>
                        <p className="text-sm text-muted-foreground">
                          Based on your query, here's a suggested chart type: <span className="font-mono capitalize">{chartSpec.mark}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={saveChartFromSuggestion}>
                          <Save className="h-4 w-4 mr-1" />
                          Save as Chart
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsChartFullscreen(true)}>
                          <Maximize2 className="h-4 w-4 mr-1" />
                          Fullscreen
                        </Button>
                      </div>
                    </div>
                    <div
                      className={isChartFullscreen ? "fixed inset-0 z-50 bg-background p-4" : ""}
                      style={{ height: isChartFullscreen ? "calc(100vh - 120px)" : "500px" }}
                    >
                      <PlotlyChart
                        spec={chartSpec}
                        data={chartData}
                        height={isChartFullscreen ? "100%" : 500}
                      />
                    </div>
                    {isChartFullscreen && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="fixed top-4 right-4 z-50"
                        onClick={() => setIsChartFullscreen(false)}
                      >
                        <Minimize2 className="h-6 w-6" />
                      </Button>
                    )}
                  </>
                ) : chartSpec && chartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart2 className="h-12 w-12 mx-auto mb-3" />
                    <p>Chart spec generated but no data to display</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3" />
                    <p>No chart suggestion available for this query</p>
                    <p className="text-sm mt-1">Try asking for comparisons, trends, or distributions</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Query History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(1).map((query: any) => (
                    <TableRow key={query.id}>
                      <TableCell className="max-w-xs truncate">
                        <code className="text-sm">{query.question}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={query.status === "success" ? "default" : "destructive"}>
                          {query.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{query.model}</Badge>
                      </TableCell>
                      <TableCell>{query.row_count || 0}</TableCell>
                      <TableCell>{format(new Date(query.created_at), "MMM d, h:mm a")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setQuestion(query.question);
                            toast.success("Question loaded");
                          }}
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}