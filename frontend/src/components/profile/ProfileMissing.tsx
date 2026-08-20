"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface ProfileMissingProps {
  profile: any;
}

export function ProfileMissing({ profile }: ProfileMissingProps) {
  if (!profile) return null;

  const variables = profile.variables || {};
  const tableInfo = profile.table || {};

  const missingData = Object.entries(variables)
    .map(([name, v]: [string, any]) => ({
      name,
      n_missing: v.n_missing || 0,
      p_missing: v.p_missing || 0,
      type: v.type || "unknown",
    }))
    .filter((v) => v.n_missing > 0)
    .sort((a, b) => b.p_missing - a.p_missing);

  const totalMissing = tableInfo.n_cells_missing || 0;
  const totalCells = tableInfo.n_cells || 1;
  const missingPct = tableInfo.p_cells_missing || 0;

  if (missingData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No missing values detected in this dataset.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Missing Values Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="text-sm font-medium text-destructive">Total Missing Cells</div>
              <div className="text-3xl font-bold text-destructive">{totalMissing.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-orange/10 rounded-lg border border-orange/20">
              <div className="text-sm font-medium text-orange">Missing Percentage</div>
              <div className="text-3xl font-bold text-orange">{missingPct.toFixed(2)}%</div>
            </div>
            <div className="p-4 bg-blue/10 rounded-lg border border-blue/20">
              <div className="text-sm font-medium text-blue">Variables with Missing</div>
              <div className="text-3xl font-bold text-blue">{missingData.length}</div>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm font-medium w-32">Overall</span>
              <Progress value={missingPct} className="flex-1" max={100} />
              <span className="text-sm font-mono w-16 text-right">{missingPct.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Values by Variable */}
      <Card>
        <CardHeader>
          <CardTitle>Missing Values by Variable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Missing Count</TableHead>
                  <TableHead>Missing %</TableHead>
                  <TableHead>Visualization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingData.map((v) => (
                  <TableRow key={v.name}>
                    <TableCell className="font-mono text-sm">{v.name}</TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{v.type.toLowerCase()}</span>
                    </TableCell>
                    <TableCell className="font-mono">{v.n_missing.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-destructive">{v.p_missing.toFixed(2)}%</TableCell>
                    <TableCell>
                      <div className="w-48">
                        <Progress value={v.p_missing} className="h-2" max={100} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}