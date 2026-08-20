"use client";

import { useParams, useRouter } from "next/navigation";
import { ChartBuilder } from "@/components/charts/ChartBuilder";
import { useCharts } from "@/hooks/useCharts";
import { useDatasets } from "@/hooks/useDatasets";
import { toast } from "sonner";

export default function ChartEditPage() {
  const params = useParams();
  const datasetId = params.id as string;
  const chartId = params.chartId as string;
  const router = useRouter();

  const { data: dataset } = useDatasets({ params: { id: datasetId } });
  const { data: chartsList } = useCharts({ params: { id: datasetId } });
  const updateChart = useCharts({ params: { id: datasetId } }).updateChart;

  const currentChart = chartsList?.items?.find((c: any) => c.id === chartId);

  const handleSave = async (spec: any, name: string) => {
    try {
      await updateChart.mutateAsync({
        id: chartId,
        name,
        chart_type: spec.mark,
        spec_json: spec,
      });
      toast.success("Chart updated successfully");
      router.push(`/datasets/${datasetId}/charts/${chartId}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update chart");
      throw error;
    }
  };

  const handleClose = () => {
    router.push(`/datasets/${datasetId}/charts/${chartId}`);
  };

  if (!currentChart) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] overflow-hidden">
      <ChartBuilder
        datasetId={datasetId}
        initialSpec={currentChart.spec_json}
        onSave={handleSave}
        onClose={handleClose}
      />
    </div>
  );
}