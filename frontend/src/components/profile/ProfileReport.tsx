"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { datasetApi } from "@/lib/api";
import { toast } from "sonner";
import { ProfileOverview } from "./ProfileOverview";
import { ProfileVariables } from "./ProfileVariables";
import { ProfileCorrelations } from "./ProfileCorrelations";
import { ProfileInteractions } from "./ProfileInteractions";
import { ProfileMissing } from "./ProfileMissing";

interface ProfileReportProps {
  datasetId: string;
}

export function ProfileReport({ datasetId }: ProfileReportProps) {
  const [profile, setProfile] = useState<any>(null);
  const [htmlReport, setHtmlReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await datasetApi.getProfile(datasetId);
        setProfile(response.data);
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [datasetId]);

  const loadHtmlReport = async () => {
    if (htmlReport) return;
    setHtmlLoading(true);
    try {
      const response = await datasetApi.getProfileHtml(datasetId);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      setHtmlReport(url);
    } catch (error) {
      toast.error("Failed to load HTML report");
    } finally {
      setHtmlLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile report...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="font-medium mb-2">Profile Not Found</h3>
          <p className="text-muted-foreground mb-4">No profile report has been generated for this dataset.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Report</CardTitle>
          <CardDescription>
            Automated EDA report generated with ydata-profiling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="default" className="capitalize">
              {profile.status || "completed"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Generated: {profile.created_at ? new Date(profile.created_at).toLocaleString() : "Unknown"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHtmlReport}
              disabled={htmlLoading}
            >
              <Loader2 className={`h-4 w-4 ${htmlLoading ? "animate-spin" : ""} mr-2`} />
              {htmlReport ? "View Full HTML Report" : "Load HTML Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HTML Report iframe */}
      {htmlReport && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe
              ref={iframeRef}
              src={htmlReport}
              className="w-full"
              style={{ height: "800px" }}
              frameBorder="0"
              title="Profile Report"
            />
          </CardContent>
        </Card>
      )}

      {/* JSON-based tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="missing">Missing Values</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProfileOverview profile={profile.profile_json} />
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <ProfileVariables profile={profile.profile_json} />
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          <ProfileCorrelations profile={profile.profile_json} />
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <ProfileInteractions profile={profile.profile_json} />
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          <ProfileMissing profile={profile.profile_json} />
        </TabsContent>
      </Tabs>
    </div>
  );
}