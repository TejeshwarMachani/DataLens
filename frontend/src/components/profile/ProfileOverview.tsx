"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProfileOverviewProps {
  profile: any;
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  if (!profile) return null;

  const tableInfo = profile.table || {};
  const variables = profile.variables || {};

  const numericVars = Object.entries(variables).filter(([_, v]: [string, any]) => v.type === "Numeric");
  const categoricalVars = Object.entries(variables).filter(([_, v]: [string, any]) => v.type === "Categorical");
  const dateVars = Object.entries(variables).filter(([_, v]: [string, any]) => v.type === "DateTime");
  const textVars = Object.entries(variables).filter(([_, v]: [string, any]) => v.type === "Text");

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tableInfo.n || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tableInfo.n_obs?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Cells</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {tableInfo.n_cells_missing?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(tableInfo.p_cells_missing || 0).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variable Types */}
      <Card>
        <CardHeader>
          <CardTitle>Variable Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">{numericVars.length}</div>
              <div className="text-sm text-blue-600">Numeric</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-600">{categoricalVars.length}</div>
              <div className="text-sm text-green-600">Categorical</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">{dateVars.length}</div>
              <div className="text-sm text-purple-600">DateTime</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-2xl font-bold text-orange-600">{textVars.length}</div>
              <div className="text-sm text-orange-600">Text</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Total Cells</TableCell>
                <TableCell>{tableInfo.n_cells?.toLocaleString() || 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Duplicate Rows</TableCell>
                <TableCell>{tableInfo.n_duplicates?.toLocaleString() || 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Duplicate %</TableCell>
                <TableCell>{(tableInfo.p_duplicates || 0).toFixed(2)}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Distinct Rows</TableCell>
                <TableCell>{tableInfo.n_distinct?.toLocaleString() || 0}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Memory Size</TableCell>
                <TableCell>{tableInfo.memory_size ? formatBytes(tableInfo.memory_size) : "N/A"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}