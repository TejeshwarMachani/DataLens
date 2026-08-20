"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetApi } from "@/lib/api";
import type { Dataset, DatasetList, UploadResponse, Profile, ProfileSummary, ColumnInfo } from "@/types/api";

// Query keys
export const datasetKeys = {
  all: ["datasets"] as const,
  lists: () => [...datasetKeys.all, "list"] as const,
  list: (page: number, pageSize: number) => [...datasetKeys.lists(), { page, pageSize }] as const,
  details: () => [...datasetKeys.all, "detail"] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
  profile: (id: string) => [...datasetKeys.detail(id), "profile"] as const,
  profileSummary: (id: string) => [...datasetKeys.detail(id), "profileSummary"] as const,
  schema: (id: string) => [...datasetKeys.detail(id), "schema"] as const,
  sample: (id: string, limit: number) => [...datasetKeys.detail(id), "sample", { limit }] as const,
};

// List datasets with pagination
export function useDatasets(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: datasetKeys.list(page, pageSize),
    queryFn: () => datasetApi.list(page, pageSize),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Get single dataset
export function useDataset(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.detail(id || ""),
    queryFn: () => datasetApi.get(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Upload dataset mutation
export function useUploadDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      datasetApi.upload(file, onProgress),
    onSuccess: (response) => {
      // Invalidate datasets list to show new dataset
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      return response.data;
    },
  });
}

// Delete dataset mutation
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => datasetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}

// Get dataset profile
export function useDatasetProfile(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.profile(id || ""),
    queryFn: () => datasetApi.getProfile(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Generate profile mutation
export function useGenerateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => datasetApi.profile(id),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.profile(id) });
      queryClient.invalidateQueries({ queryKey: datasetKeys.profileSummary(id) });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(id) });
    },
  });
}

// Get profile summary
export function useProfileSummary(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.profileSummary(id || ""),
    queryFn: () => datasetApi.getProfileSummary(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Get dataset schema
export function useDatasetSchema(id: string | null) {
  return useQuery({
    queryKey: datasetKeys.schema(id || ""),
    queryFn: () => datasetApi.getSchema(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Get dataset sample
export function useDatasetSample(id: string | null, limit = 10) {
  return useQuery({
    queryKey: datasetKeys.sample(id || "", limit),
    queryFn: () => datasetApi.getSample(id!, limit),
    enabled: !!id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Poll dataset status until ready or error
export function useDatasetStatusPoll(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...datasetKeys.detail(id || ""), "status"],
    queryFn: () => datasetApi.get(id!),
    enabled: enabled && !!id,
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "ready" || data.status === "error") return false;
      return 2000;
    },
    refetchOnWindowFocus: false,
  });
}

// Type guards for dataset status
export function isDatasetReady(dataset: Dataset | undefined): boolean {
  return dataset?.status === "ready";
}

export function isDatasetError(dataset: Dataset | undefined): boolean {
  return dataset?.status === "error";
}

export function isDatasetUploaded(dataset: Dataset | undefined): boolean {
  return dataset?.status === "uploaded";
}

export function isDatasetProfiling(dataset: Dataset | undefined): boolean {
  return dataset?.status === "profiling";
}