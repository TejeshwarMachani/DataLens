"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import type { Dashboard, DashboardList, DashboardCreate, DashboardUpdate, DashboardItemConfig, DashboardItemCreate, DashboardItemUpdate, ShareCreate, ShareResponse } from "@/types/api";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  lists: () => [...dashboardKeys.all, "list"] as const,
  list: (page = 1, pageSize = 20) => [...dashboardKeys.lists(), { page, pageSize }] as const,
  details: () => [...dashboardKeys.all, "detail"] as const,
  detail: (id: string) => [...dashboardKeys.details(), id] as const,
  shared: (token: string) => [...dashboardKeys.all, "shared", token] as const,
};

export function useDashboards(params?: { id?: string; page?: number; pageSize?: number }) {
  const queryClient = useQueryClient();

  if (params?.id) {
    // Single dashboard
    const { data, isLoading, error, refetch } = useQuery({
      queryKey: dashboardKeys.detail(params.id),
      queryFn: () => dashboardApi.get(params.id!),
      enabled: !!params.id,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });

    const updateDashboard = useMutation({
      mutationFn: (dashboard: DashboardUpdate) => dashboardApi.update(params.id!, dashboard),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(params.id!) });
        queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      },
    });

    const deleteDashboard = useMutation({
      mutationFn: () => dashboardApi.delete(params.id!),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
      },
    });

    return { data, isLoading, error, refetch, updateDashboard, deleteDashboard };
  }

  // List dashboards
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: dashboardKeys.list(page, pageSize),
    queryFn: () => dashboardApi.list(page, pageSize),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createDashboard = useMutation({
    mutationFn: (dashboard: DashboardCreate) => dashboardApi.create(dashboard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });

  return { data, isLoading, error, refetch, createDashboard };
}

export function useSharedDashboard(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.shared(token || ""),
    queryFn: () => dashboardApi.getShared(token!),
    enabled: !!token,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateShare(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expiresAt?: string) => dashboardApi.createShare(dashboardId, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

export function useRemoveShare(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dashboardApi.removeShare(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

export function useDashboardItems(dashboardId: string) {
  return useQuery({
    queryKey: [...dashboardKeys.detail(dashboardId), "items"],
    queryFn: async () => {
      // Items are included in the dashboard response
      const response = await dashboardApi.get(dashboardId);
      return response.data.items || [];
    },
    enabled: !!dashboardId,
  });
}

export function useAddDashboardItem(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: DashboardItemCreate) =>
      dashboardApi.addItem(dashboardId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

export function useUpdateDashboardItem(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, item }: { itemId: string; item: DashboardItemUpdate }) =>
      dashboardApi.updateItem(dashboardId, itemId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}

export function useDeleteDashboardItem(dashboardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => dashboardApi.deleteItem(dashboardId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(dashboardId) });
    },
  });
}