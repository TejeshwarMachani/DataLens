"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryApi } from "@/lib/api";
import type { QueryRequest, QueryResponse, NLQueryRequest, NLQueryResponse, NLQueryHistory } from "@/types/api";

// Query keys
export const queryKeys = {
  all: ["query"] as const,
  execute: (request: QueryRequest) => [...queryKeys.all, "execute", request] as const,
  nlQuery: (request: NLQueryRequest) => [...queryKeys.all, "nl-query", request] as const,
  nlQueryHistory: (datasetId: string) => [...queryKeys.all, "nl-query-history", datasetId] as const,
};

// Execute SQL query mutation (not cached, always fresh)
export function useExecuteSQL() {
  return useMutation({
    mutationFn: (request: QueryRequest) => queryApi.execute(request.sql, request.dataset_id, request.limit, request.offset),
  });
}

// Execute NL query mutation
export function useExecuteNLQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: NLQueryRequest) => queryApi.nlQuery(request.question, request.dataset_id, request.chart_suggestion, request.model),
    onSuccess: (_, variables) => {
      // Invalidate history to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.nlQueryHistory(variables.dataset_id) });
    },
  });
}

// Get NL query history for a dataset
export function useNLQueryHistory(datasetId: string | null, page = 1, pageSize = 20) {
  return useQuery<NLQueryHistory>({
    queryKey: [...queryKeys.nlQueryHistory(datasetId || ""), page, pageSize],
    queryFn: () => queryApi.getNLQueryHistory(datasetId!, page, pageSize),
    enabled: !!datasetId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook for NL query - provides both history and execute mutation
export function useNLQuery(datasetId?: string, page = 1, pageSize = 20) {
  const history = useNLQueryHistory(datasetId || null, page, pageSize);
  const executeQuery = useExecuteNLQuery();

  return {
    ...history,
    executeQuery,
  };
}

// Hook for live SQL execution (for SQL editor with auto-run)
export function useLiveSQL(datasetId: string | null, sql: string, enabled = false, debounceMs = 500) {
  // This would need a custom implementation with useEffect for debouncing
  // For now, return a mutation that can be triggered manually
  return useExecuteSQL();
}

// Helper to format query results for display
export function formatQueryResponse(response: QueryResponse): {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
} {
  return {
    columns: response.columns,
    rows: response.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      response.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    }),
    rowCount: response.row_count,
    truncated: response.truncated,
  };
}

// Export types for convenience
export type { QueryRequest, QueryResponse, NLQueryRequest, NLQueryResponse, NLQueryHistory };