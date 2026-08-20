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

interface ProfileVariablesProps {
  profile: any;
}

export function ProfileVariables({ profile }: ProfileVariablesProps) {
  if (!profile) return null;

  const variables = profile.variables || {};
  const variableEntries = Object.entries(variables).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variable Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variable</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Distinct</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead>Std Dev</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variableEntries.map(([name, v]: [string, any]) => (
                <TableRow key={name}>
                  <TableCell className="font-mono text-sm">{name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {v.type?.toLowerCase() || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.n_missing !== undefined ? (
                      <>
                        {v.n_missing} ({(v.p_missing || 0).toFixed(1)}%)
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{v.n_distinct?.toLocaleString() || "—"}</TableCell>
                  <TableCell>{v.mean !== undefined ? v.mean.toFixed(2) : "—"}</TableCell>
                  <TableCell>{v.std !== undefined ? v.std.toFixed(2) : "—"}</TableCell>
                  <TableCell>{v.min !== undefined ? v.min : "—"}</TableCell>
                  <TableCell>{v.max !== undefined ? v.max : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}