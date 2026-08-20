import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { dashboardId: string } }
) {
  try {
    // Get the dashboard with items to extract filter configurations
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/dashboards/${params.dashboardId}`);
    if (!response.ok) {
      return NextResponse.json({ filters: [] }, { status: 404 });
    }
    const dashboard = await response.json();

    // Extract filter items from dashboard items
    const filterItems = dashboard.items?.filter((item: any) => item.item_type === "filter") || [];

    const filters = filterItems.map((item: any) => ({
      id: item.id,
      filter_column: item.config_json?.filter_column,
      filter_type: item.config_json?.filter_type,
      label: item.config_json?.label || item.config_json?.filter_column,
    }));

    return NextResponse.json({ filters });
  } catch (error: any) {
    console.error("Failed to fetch dashboard filters:", error);
    return NextResponse.json({ filters: [] }, { status: 500 });
  }
}