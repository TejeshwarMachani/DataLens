"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EncodingField } from "@/hooks/useCharts";

interface ColumnSelectorProps {
  channel: string;
  label: string;
  columns: Array<{ name: string; type: string; dtype?: string }>;
  currentEncoding: EncodingField | undefined;
  onChange: (field: EncodingField | null) => void;
  chartType: string;
  required?: boolean;
}

export function ColumnSelector({
  channel,
  label,
  columns,
  currentEncoding,
  onChange,
  chartType,
  required = false,
}: ColumnSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter columns based on channel and chart type
  const getCompatibleColumns = () => {
    // For now, return all columns - in a more advanced version we'd filter by type
    return columns;
  };

  const handleSelectChange = (value: string) => {
    if (!value) {
      if (required) return;
      onChange(null);
      return;
    }

    const column = columns.find((c) => c.name === value);
    if (!column) return;

    // Infer field type from column dtype
    const fieldType = inferFieldType(column.dtype || column.type);

    onChange({
      field: value,
      type: fieldType,
      title: value,
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (required) return;
    onChange(null);
  };

  const compatibleColumns = getCompatibleColumns();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
        {currentEncoding && !required && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Select
        value={currentEncoding?.field || ""}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={required ? "Select a column..." : "Select column (optional)"} />
        </SelectTrigger>
        <SelectContent>
          {!required && (
            <SelectItem value="">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
          )}
          {compatibleColumns.map((col) => (
            <SelectItem key={col.name} value={col.name}>
              <div className="flex items-center justify-between w-full">
                <span>{col.name}</span>
                <span className="text-xs text-muted-foreground">{col.type}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentEncoding && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Type: {currentEncoding.type}</span>
          {currentEncoding.aggregate && (
            <span className="px-2 py-0.5 bg-secondary rounded text-[10px]">
              {currentEncoding.aggregate.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function inferFieldType(dtype: string): "quantitative" | "ordinal" | "nominal" | "temporal" {
  const lower = dtype.toLowerCase();
  if (lower.includes("int") || lower.includes("float") || lower.includes("double") || lower.includes("numeric")) {
    return "quantitative";
  }
  if (lower.includes("date") || lower.includes("time") || lower.includes("timestamp")) {
    return "temporal";
  }
  if (lower.includes("bool")) {
    return "nominal";
  }
  // Default to nominal for strings/categories
  return "nominal";
}