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

interface ProfileCorrelationsProps {
  profile: any;
}

export function ProfileCorrelations({ profile }: ProfileCorrelationsProps) {
  if (!profile) return null;

  const correlations = profile.correlations || {};
  const pearson = correlations.pearson || {};
  const spearman = correlations.spearman || {};

  const hasCorrelations = Object.keys(pearson).length > 0 || Object.keys(spearman).length > 0;

  if (!hasCorrelations) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No correlation data available. Correlations are computed for numeric variables only.
        </CardContent>
      </Card>
    );
  }

  // Get variable names from pearson correlation matrix
  const variables = Object.keys(pearson).sort();

  return (
    <div className="space-y-6">
      {/* Pearson Correlation */}
      {Object.keys(pearson).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pearson Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    {variables.map((v) => (
                      <TableHead key={v} className="font-mono text-sm">{v}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variables.map((rowVar) => (
                    <TableRow key={rowVar}>
                      <TableCell className="font-mono text-sm font-medium">{rowVar}</TableCell>
                      {variables.map((colVar) => (
                        <TableCell key={colVar}>
                          {rowVar === colVar ? (
                            <span className="font-bold">1.00</span>
                          ) : (
                            pearson[rowVar]?.[colVar] !== undefined
                              ? pearson[rowVar][colVar].toFixed(2)
                              : "—"
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spearman Correlation */}
      {Object.keys(spearman).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spearman Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    {variables.map((v) => (
                      <TableHead key={v} className="font-mono text-sm">{v}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variables.map((rowVar) => (
                    <TableRow key={rowVar}>
                      <TableCell className="font-mono text-sm font-medium">{rowVar}</TableCell>
                      {variables.map((colVar) => (
                        <TableCell key={colVar}>
                          {rowVar === colVar ? (
                            <span className="font-bold">1.00</span>
                          ) : (
                            spearman[rowVar]?.[colVar] !== undefined
                              ? spearman[rowVar][colVar].toFixed(2)
                              : "—"
                          )}
                        </TableCell>
                      ))}
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