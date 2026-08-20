import { NextRequest, NextResponse } from "next/server";
import { chartApi, datasetApi } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { dashboardId: string; columnName: string } }
) {
  try {
    // Get the dashboard to find a chart to determine the dataset
    const dashboardResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/dashboards/${params.dashboardId}`);
    if (!dashboardResponse.ok) {
      return NextResponse.json({ values: [] }, { status: 404 });
    }
    const dashboard = await dashboardResponse.json();

    // Get the first chart to find the dataset
    if (!dashboard.items || dashboard.items.length === 0) {
      return NextResponse.json({ values: [] });
    }

    const firstChartItem = dashboard.items.find((item: any) => item.item_type === "chart" && item.chart_id);
    if (!firstChartItem) {
      return NextResponse.json({ values: [] });
    }

    const chartResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/charts/${firstChartItem.chart_id}`);
    if (!chartResponse.ok) {
      return NextResponse.json({ values: [] }, { status: 404 });
    }
    const chart = await chartResponse.json();

    // Query distinct values for the column
    const sql = `SELECT DISTINCT "${params.columnName}" FROM ${chart.duckdb_view_name || `dataset_${chart.dataset_id}`} WHERE "${params.columnName}" IS NOT NULL ORDER BY 1 LIMIT 1000`;

    const queryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/query/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, dataset_id: chart.dataset_id, limit: 1000 }),
    });

    if (!queryResponse.ok) {
      return NextResponse.json({ values: [] }, { status: 500 });
    }

    const queryData = await queryResponse.json();
    const values = queryData.rows?.map((row: any[]) => row[0]) || [];

    return NextResponse.json({ values });
  } catch (error: any) {
    console.error("Failed to fetch column values:", error);
    return NextResponse.json({ values: [] }, { status: 500 });
  }
}