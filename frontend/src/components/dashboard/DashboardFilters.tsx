"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Filter, ChevronDown, ChevronUp, Calendar, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

interface FilterConfig {
  id: string;
  filter_column: string;
  filter_type: "select" | "multi_select" | "date_range" | "number_range";
  label?: string;
  options?: string[];
}

interface FilterValue {
  [filterId: string]: string | string[] | { start: string; end: string } | { min: number; max: number };
}

interface DashboardFiltersProps {
  dashboardId: string;
  filters: FilterConfig[];
  datasetId?: string;
  onFiltersChange?: (values: FilterValue) => void;
}

export function DashboardFilters({ dashboardId, filters, datasetId, onFiltersChange }: DashboardFiltersProps) {
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState<Record<string, boolean>>({});

  // Fetch filter values from URL/localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem(`dashboard-filters-${dashboardId}`);
    if (savedFilters) {
      try {
        setFilterValues(JSON.parse(savedFilters));
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }

    // Fetch column options for select filters
    if (datasetId) {
      fetchColumnOptions();
    }
  }, [dashboardId, datasetId]);

  const fetchColumnOptions = async () => {
    const selectFilters = filters.filter(f => f.filter_type === "select" || f.filter_type === "multi_select");
    for (const filter of selectFilters) {
      setIsLoadingOptions(prev => ({ ...prev, [filter.id]: true }));
      try {
        const response = await fetch(`/api/dashboards/${dashboardId}/columns/${filter.filter_column}`);
        if (response.ok) {
          const data = await response.json();
          setColumnOptions(prev => ({ ...prev, [filter.id]: data.values || [] }));
        }
      } catch (error) {
        console.error(`Failed to fetch options for ${filter.filter_column}:`, error);
      } finally {
        setIsLoadingOptions(prev => ({ ...prev, [filter.id]: false }));
      }
    }
  };

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    const newValues = { ...filterValues, [filterId]: value };
    setFilterValues(newValues);
    localStorage.setItem(`dashboard-filters-${dashboardId}`, JSON.stringify(newValues));
    onFiltersChange?.(newValues);
  }, [dashboardId, filterValues, onFiltersChange]);

  const clearFilter = useCallback((filterId: string) => {
    const newValues = { ...filterValues };
    delete newValues[filterId];
    setFilterValues(newValues);
    localStorage.setItem(`dashboard-filters-${dashboardId}`, JSON.stringify(newValues));
    onFiltersChange?.(newValues);
  }, [dashboardId, filterValues, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setFilterValues({});
    localStorage.removeItem(`dashboard-filters-${dashboardId}`);
    onFiltersChange?.({});
  }, [dashboardId, onFiltersChange]);

  const hasActiveFilters = Object.keys(filterValues).length > 0;

  if (filters.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Filter className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No global filters configured</p>
          <p className="text-sm mt-1">Add filter items in dashboard edit mode</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Global Filters
        </CardTitle>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {filters.map((filter) => {
          const value = filterValues[filter.id];
          const isActive = value !== undefined && value !== "";
          const options = columnOptions[filter.id] || [];
          const loading = isLoadingOptions[filter.id];

          return (
            <div key={filter.id} className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="font-medium capitalize">
                    {filter.label || filter.filter_column}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {filter.filter_type.replace("_", " ")}
                  </Badge>
                </div>
                {isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-red-50"
                    onClick={() => clearFilter(filter.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {filter.filter_type === "select" && (
                <Select
                  value={value as string}
                  onValueChange={(val) => handleFilterChange(filter.id, val)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${filter.label || filter.filter_column}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                    {loading && <SelectItem disabled>Loading...</SelectItem>}
                    {options.length === 0 && !loading && (
                      <SelectItem disabled>No options available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}

              {filter.filter_type === "multi_select" && (
                <Select
                  value={(value as string[]) || []}
                  onValueChange={(val) => handleFilterChange(filter.id, val)}
                  multiple
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${filter.label || filter.filter_column}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                    {loading && <SelectItem disabled>Loading...</SelectItem>}
                    {options.length === 0 && !loading && (
                      <SelectItem disabled>No options available</SelectItem>
                    )}
                  </SelectContent                </Select>
              )}

              {filter.filter_type === "date_range" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={typeof value === "object" && value !== null && "start" in value ? (value as any).start : ""}
                      onChange={(e) => {
                        const current = (value as any) || { start: "", end: "" };
                        handleFilterChange(filter.id, { ...current, start: e.target.value });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={typeof value === "object" && value !== null && "end" in value ? (value as any).end : ""}
                      onChange={(e) => {
                        const current = (value as any) || { start: "", end: "" };
                        handleFilterChange(filter.id, { ...current, end: e.target.value });
                      }}
                    />
                  </div>
                </div>
              )}

              {filter.filter_type === "number_range" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Value</Label>
                    <Input
                      type="number"
                      step="any"
                      value={typeof value === "object" && value !== null && "min" in value ? (value as any).min : ""}
                      onChange={(e) => {
                        const current = (value as any) || { min: "", max: "" };
                        handleFilterChange(filter.id, { ...current, min: parseFloat(e.target.value) || "" });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Value</Label>
                    <Input
                      type="number"
                      step="any"
                      value={typeof value === "object" && value !== null && "max" in value ? (value as any).max : ""}
                      onChange={(e) => {
                        const current = (value as any) || { min: "", max: "" };
                        handleFilterChange(filter.id, { ...current, max: parseFloat(e.target.value) || "" });
                      }}
                    />
                  </div>
                </div>
              )}

              {isActive && (
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  Active:{" "}
                  {filter.filter_type === "multi_select"
                    ? (value as string[]).join(", ")
                    : filter.filter_type === "date_range"
                    ? `${(value as any)?.start || "—"} to ${(value as any)?.end || "—"}`
                    : filter.filter_type === "number_range"
                    ? `${(value as any)?.min ?? "—"} - ${(value as any)?.max ?? "—"}`
                    : String(value)}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Hook for managing dashboard filters
export function useDashboardFilters(dashboardId: string) {
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch(`/api/dashboards/${dashboardId}/filters`);
        if (response.ok) {
          const data = await response.json();
          setFilters(data.filters || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard filters:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilters();
  }, [dashboardId]);

  const updateFilterValue = useCallback((filterId: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }));
  }, []);

  return { filters, filterValues, updateFilterValue, isLoading };
}