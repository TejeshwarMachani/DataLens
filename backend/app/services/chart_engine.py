import json
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, Any, List, Optional
import logging

from app.schemas import ChartSpec, EncodingField

logger = logging.getLogger(__name__)


class ChartEngine:
    """Convert Vega-Lite inspired spec to Plotly JSON."""

    MARK_TO_PLOTLY = {
        "bar": "bar",
        "line": "scatter",
        "point": "scatter",
        "scatter": "scatter",
        "area": "scatter",
        "rect": "heatmap",
        "heatmap": "heatmap",
        "arc": "pie",
        "pie": "pie",
        "text": "scatter",
    }

    def __init__(self):
        self.color_sequence = px.colors.qualitative.Plotly

    def spec_to_plotly(self, spec: ChartSpec, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert chart spec + data to Plotly figure JSON."""
        if not data:
            return self._empty_figure()

        df = self._data_to_dataframe(data)

        # Build figure based on mark type
        mark = spec.mark.lower()

        if mark in ["bar", "column"]:
            fig = self._build_bar(df, spec)
        elif mark in ["line"]:
            fig = self._build_line(df, spec)
        elif mark in ["point", "scatter"]:
            fig = self._build_scatter(df, spec)
        elif mark in ["area"]:
            fig = self._build_area(df, spec)
        elif mark in ["heatmap", "rect"]:
            fig = self._build_heatmap(df, spec)
        elif mark in ["pie", "arc"]:
            fig = self._build_pie(df, spec)
        elif mark in ["box"]:
            fig = self._build_box(df, spec)
        elif mark in ["violin"]:
            fig = self._build_violin(df, spec)
        elif mark in ["histogram"]:
            fig = self._build_histogram(df, spec)
        else:
            fig = self._build_scatter(df, spec)  # Default

        # Apply layout config
        self._apply_layout(fig, spec)

        # Convert to JSON
        return fig.to_plotly_json()

    def _data_to_dataframe(self, data: List[Dict[str, Any]]):
        import pandas as pd
        return pd.DataFrame(data)

    def _get_field(self, spec: ChartSpec, channel: str) -> Optional[EncodingField]:
        """Get encoding field for a channel."""
        return spec.encoding.get(channel)

    def _apply_transform(self, df, spec: ChartSpec):
        """Apply transform operations (filter, aggregate, etc.)."""
        if not spec.transform:
            return df

        for t in spec.transform:
            if t.get("filter"):
                # Simple filter: {"filter": "datum.value > 10"}
                expr = t["filter"]
                # This is simplified - real implementation would parse the expression
                pass
            elif t.get("aggregate"):
                # Aggregate transform
                pass
            elif t.get("calculate"):
                # Calculate new field
                pass

        return df

    def _build_bar(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        x = x_field.field if x_field else df.columns[0]
        y = y_field.field if y_field else df.columns[1] if len(df.columns) > 1 else None

        if color_field:
            fig = px.bar(df, x=x, y=y, color=color_field.field, title=spec.title)
        else:
            fig = px.bar(df, x=x, y=y, title=spec.title)

        return fig

    def _build_line(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        x = x_field.field if x_field else df.columns[0]
        y = y_field.field if y_field else df.columns[1] if len(df.columns) > 1 else None

        if color_field:
            fig = px.line(df, x=x, y=y, color=color_field.field, title=spec.title)
        else:
            fig = px.line(df, x=x, y=y, title=spec.title)

        return fig

    def _build_scatter(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")
        size_field = self._get_field(spec, "size")

        x = x_field.field if x_field else df.columns[0]
        y = y_field.field if y_field else df.columns[1] if len(df.columns) > 1 else None

        fig = px.scatter(
            df, x=x, y=y,
            color=color_field.field if color_field else None,
            size=size_field.field if size_field else None,
            title=spec.title
        )
        return fig

    def _build_area(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        x = x_field.field if x_field else df.columns[0]
        y = y_field.field if y_field else df.columns[1] if len(df.columns) > 1 else None

        if color_field:
            fig = px.area(df, x=x, y=y, color=color_field.field, title=spec.title)
        else:
            fig = px.area(df, x=x, y=y, title=spec.title)
        return fig

    def _build_heatmap(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        # For heatmap, we need x, y, and color (value)
        if not (x_field and y_field and color_field):
            return self._empty_figure()

        fig = px.density_heatmap(
            df,
            x=x_field.field,
            y=y_field.field,
            z=color_field.field,
            title=spec.title
        )
        return fig

    def _build_pie(self, df, spec: ChartSpec):
        theta_field = self._get_field(spec, "theta") or self._get_field(spec, "x")
        color_field = self._get_field(spec, "color")

        if not theta_field:
            return self._empty_figure()

        fig = px.pie(
            df,
            values=theta_field.field,
            names=color_field.field if color_field else df.columns[0],
            title=spec.title
        )
        return fig

    def _build_box(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        y = y_field.field if y_field else df.columns[0]
        x = x_field.field if x_field else None

        fig = px.box(df, x=x, y=y, color=color_field.field if color_field else None, title=spec.title)
        return fig

    def _build_violin(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        y_field = self._get_field(spec, "y")
        color_field = self._get_field(spec, "color")

        y = y_field.field if y_field else df.columns[0]
        x = x_field.field if x_field else None

        fig = px.violin(df, x=x, y=y, color=color_field.field if color_field else None, title=spec.title, box=True)
        return fig

    def _build_histogram(self, df, spec: ChartSpec):
        x_field = self._get_field(spec, "x")
        color_field = self._get_field(spec, "color")

        x = x_field.field if x_field else df.columns[0]

        fig = px.histogram(df, x=x, color=color_field.field if color_field else None, title=spec.title)
        return fig

    def _apply_layout(self, fig, spec: ChartSpec):
        """Apply layout configuration from spec."""
        if spec.width:
            fig.update_layout(width=spec.width)
        if spec.height:
            fig.update_layout(height=spec.height)

        if spec.config:
            # Apply config options
            pass

        # Default layout improvements
        fig.update_layout(
            template="plotly_white",
            margin=dict(l=50, r=30, t=50, b=50),
            hovermode="closest",
        )

    def _empty_figure(self) -> Dict[str, Any]:
        """Return empty Plotly figure."""
        fig = go.Figure()
        fig.update_layout(
            template="plotly_white",
            annotations=[{
                "text": "No data to display",
                "xref": "paper",
                "yref": "paper",
                "x": 0.5,
                "y": 0.5,
                "showarrow": False,
            }]
        )
        return fig.to_plotly_json()


chart_engine = ChartEngine()