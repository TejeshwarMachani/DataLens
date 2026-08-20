import pandas as pd
import duckdb
import uuid
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.duckdb import get_duckdb_conn, register_dataset
from app.models import Dataset, Profile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

# Try to import ydata_profiling, fall back to basic profiling if not available
YDATA_PROFILING_AVAILABLE = False
yp = None
try:
    import ydata_profiling as _yp
    yp = _yp
    YDATA_PROFILING_AVAILABLE = True
except ImportError:
    logger.warning("ydata_profiling not available, using basic profiling fallback")
except Exception as e:
    logger.warning(f"ydata_profiling import failed: {e}, using basic profiling fallback")


class ProfilerService:
    """Service for generating data profiles using ydata-profiling or basic pandas profiling."""

    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def profile_dataset(self, dataset: Dataset, db: AsyncSession) -> Profile:
        """
        Generate a profile report for a dataset.
        Updates dataset status and stores profile in database.
        """
        try:
            # Update dataset status
            dataset.status = "profiling"
            await db.commit()

            # Load data into pandas via DuckDB
            with get_duckdb_conn() as conn:
                df = conn.execute(f"SELECT * FROM {dataset.duckdb_view_name}").fetchdf()

            if df.empty:
                raise ValueError("Dataset is empty")

            # Generate profile report
            if YDATA_PROFILING_AVAILABLE:
                profile = yp.ProfileReport(
                    df,
                    title=f"Profile Report: {dataset.name}",
                    explorative=True,
                    minimal=False,
                    html={"style": {"theme": "flatly"}},
                )
                profile_json = json.loads(profile.to_json())

                # Save HTML report
                html_dir = self.upload_dir / "profiles"
                html_dir.mkdir(parents=True, exist_ok=True)
                html_filename = f"profile_{dataset.id}.html"
                html_path = html_dir / html_filename
                profile.to_file(str(html_path))
            else:
                # Basic profiling fallback using pandas
                profile_json = self._generate_basic_profile(df)
                html_dir = self.upload_dir / "profiles"
                html_dir.mkdir(parents=True, exist_ok=True)
                html_filename = f"profile_{dataset.id}.html"
                html_path = html_dir / html_filename
                # Create a basic HTML report
                self._create_basic_html_report(df, profile_json, str(html_path), dataset.name)

            # Create Profile record
            profile_record = Profile(
                dataset_id=dataset.id,
                profile_json=profile_json,
                html_report_path=str(html_path),
            )
            db.add(profile_record)

            # Update dataset status
            dataset.status = "ready"
            dataset.rows = len(df)
            dataset.columns = len(df.columns)
            await db.commit()
            await db.refresh(profile_record)

            logger.info(f"Profile generated for dataset {dataset.id}")
            return profile_record

        except Exception as e:
            logger.error(f"Profiling failed for dataset {dataset.id}: {e}")
            dataset.status = "error"
            dataset.error_message = str(e)
            await db.commit()
            raise

    def _generate_basic_profile(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a basic profile using pandas describe and info."""
        profile = {
            "table": {
                "n_var": len(df.columns),
                "n": len(df),
                "n_cells_missing": df.isnull().sum().sum(),
                "p_cells_missing": round(df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100, 2) if len(df) > 0 and len(df.columns) > 0 else 0,
                "n_duplicates": int(df.duplicated().sum()),
                "p_duplicates": round(df.duplicated().sum() / len(df) * 100, 2) if len(df) > 0 else 0,
                "memory_size": int(df.memory_usage(deep=True).sum()),
            },
            "variables": {},
            "correlations": {}
        }

        # Variable info
        for col in df.columns:
            col_data = df[col]
            col_type = str(col_data.dtype)

            # Determine type category
            if pd.api.types.is_numeric_dtype(col_data):
                vtype = "Numeric"
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                vtype = "DateTime"
            elif pd.api.types.is_bool_dtype(col_data):
                vtype = "Boolean"
            else:
                vtype = "Categorical"

            n_missing = int(col_data.isnull().sum())
            p_missing = round(n_missing / len(df) * 100, 2) if len(df) > 0 else 0
            n_unique = int(col_data.nunique())
            p_unique = round(n_unique / len(df) * 100, 2) if len(df) > 0 else 0

            var_info = {
                "type": vtype,
                "n_missing": n_missing,
                "p_missing": p_missing,
                "n_unique": n_unique,
                "p_unique": p_unique,
            }

            # Add numeric stats
            if pd.api.types.is_numeric_dtype(col_data):
                desc = col_data.describe()
                var_info.update({
                    "mean": float(desc.get("mean", 0)) if not pd.isna(desc.get("mean")) else 0,
                    "std": float(desc.get("std", 0)) if not pd.isna(desc.get("std")) else 0,
                    "min": float(desc.get("min", 0)) if not pd.isna(desc.get("min")) else 0,
                    "max": float(desc.get("max", 0)) if not pd.isna(desc.get("max")) else 0,
                    "median": float(col_data.median()) if not pd.isna(col_data.median()) else 0,
                    "q1": float(col_data.quantile(0.25)) if not pd.isna(col_data.quantile(0.25)) else 0,
                    "q3": float(col_data.quantile(0.75)) if not pd.isna(col_data.quantile(0.75)) else 0,
                })

            # Add categorical stats
            if vtype == "Categorical":
                top_values = col_data.value_counts().head(5)
                var_info["top_values"] = {str(k): int(v) for k, v in top_values.items()}

            profile["variables"][col] = var_info

        # Add basic correlation for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            profile["correlations"]["pearson"] = corr_matrix.to_dict()

        return profile

    def _create_basic_html_report(self, df: pd.DataFrame, profile_json: Dict, html_path: str, title: str):
        """Create a basic HTML report."""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Profile Report: {title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .section {{ margin-bottom: 40px; }}
            </style>
        </head>
        <body>
            <h1>Profile Report: {title}</h1>
            <div class="section">
                <h2>Dataset Overview</h2>
                <table>
                    <tr><th>Metric</th><th>Value</th></tr>
                    <tr><td>Rows</td><td>{profile_json['table']['n']}</td></tr>
                    <tr><td>Columns</td><td>{profile_json['table']['n_var']}</td></tr>
                    <tr><td>Missing Cells</td><td>{profile_json['table']['n_cells_missing']} ({profile_json['table']['p_cells_missing']}%)</td></tr>
                    <tr><td>Duplicate Rows</td><td>{profile_json['table']['n_duplicates']} ({profile_json['table']['p_duplicates']}%)</td></tr>
                </table>
            </div>
            <div class="section">
                <h2>Variables</h2>
                <table>
                    <tr><th>Column</th><th>Type</th><th>Missing</th><th>Unique</th></tr>
        """
        for col, info in profile_json["variables"].items():
            html_content += f"""
                    <tr>
                        <td>{col}</td>
                        <td>{info['type']}</td>
                        <td>{info['n_missing']} ({info['p_missing']}%)</td>
                        <td>{info['n_unique']} ({info['p_unique']}%)</td>
                    </tr>
            """
        html_content += """
                </table>
            </div>
        </body>
        </html>
        """
        with open(html_path, 'w') as f:
            f.write(html_content)

    async def get_profile(self, dataset_id: uuid.UUID, db: AsyncSession) -> Optional[Profile]:
        """Retrieve profile for a dataset."""
        result = await db.execute(
            select(Profile).where(Profile.dataset_id == dataset_id)
        )
        return result.scalar_one_or_none()

    async def delete_profile(self, dataset_id: uuid.UUID, db: AsyncSession) -> bool:
        """Delete profile for a dataset."""
        profile = await self.get_profile(dataset_id, db)
        if profile:
            # Delete HTML file
            if profile.html_report_path and os.path.exists(profile.html_report_path):
                os.remove(profile.html_report_path)
            await db.delete(profile)
            await db.commit()
            return True
        return False

    def generate_summary_stats(self, profile_json: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key summary statistics from profile JSON."""
        if not profile_json:
            return {}

        summary = profile_json.get("table", {})
        variables = profile_json.get("variables", {})

        # Variable type counts
        type_counts = {}
        for var_name, var_info in variables.items():
            vtype = var_info.get("type", "Unknown")
            type_counts[vtype] = type_counts.get(vtype, 0) + 1

        # Missing values summary
        missing_vars = []
        for var_name, var_info in variables.items():
            missing_pct = var_info.get("p_missing", 0)
            if missing_pct > 0:
                missing_vars.append({
                    "name": var_name,
                    "missing_count": var_info.get("n_missing", 0),
                    "missing_pct": round(missing_pct, 2),
                })
        missing_vars.sort(key=lambda x: x["missing_pct"], reverse=True)

        # High correlation pairs
        correlations = profile_json.get("correlations", {})
        high_corr = []
        for method, corr_data in correlations.items():
            if isinstance(corr_data, dict):
                for pair, value in corr_data.items():
                    if isinstance(value, (int, float)) and abs(value) > 0.7:
                        high_corr.append({
                            "columns": pair,
                            "correlation": round(value, 3),
                            "method": method,
                        })

        return {
            "n_variables": summary.get("n_var", 0),
            "n_observations": summary.get("n", 0),
            "missing_cells": summary.get("n_cells_missing", 0),
            "missing_cells_pct": round(summary.get("p_cells_missing", 0), 2),
            "duplicate_rows": summary.get("n_duplicates", 0),
            "duplicate_rows_pct": round(summary.get("p_duplicates", 0), 2),
            "variable_types": type_counts,
            "top_missing": missing_vars[:10],
            "high_correlations": high_corr[:10],
        }


profiler_service = ProfilerService()