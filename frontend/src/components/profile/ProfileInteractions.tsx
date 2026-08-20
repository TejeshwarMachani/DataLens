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

interface ProfileInteractionsProps {
  profile: any;
}

export function ProfileInteractions({ profile }: ProfileInteractionsProps) {
  if (!profile) return null;

  const interactions = profile.interactions || [];

  if (!interactions || interactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No significant variable interactions detected.
          <p className="mt-2 text-sm">Interactions are computed for pairs of variables with notable joint distributions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variable Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable 1</TableHead>
                  <TableHead>Variable 2</TableHead>
                  <TableHead>Interaction Strength</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((interaction: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{interaction.var1}</TableCell>
                    <TableCell className="font-mono text-sm">{interaction.var2}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(interaction.strength || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">
                          {(interaction.strength * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{interaction.type || "unknown"}</span>
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