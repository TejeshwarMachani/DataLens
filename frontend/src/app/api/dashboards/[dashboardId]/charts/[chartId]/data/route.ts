import { NextRequest, NextResponse } from "next/server";
import { chartApi } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { dashboardId: string; chartId: string } }
) {
  try {
    // Get the chart to retrieve its spec and dataset_id
    const chartResponse = await chartApi.get(params.chartId);
    const chart = chartResponse.data;

    // Render the chart to get data
    const renderResponse = await chartApi.render(params.chartId, 10000);

    return NextResponse.json({
      data: renderResponse.data.data || [],
      columns: renderResponse.data.columns || [],
      spec: chart.spec_json,
      config: chart.config,
    });
  } catch (error: any) {
    console.error("Failed to fetch chart data:", error);
    return NextResponse.json(
      { error: error.response?.data?.detail || "Failed to fetch chart data" },
      { status: error.response?.status || 500 }
    );
  }
}