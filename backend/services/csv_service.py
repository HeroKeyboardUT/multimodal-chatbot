"""
CSV Service - Handles CSV parsing, analysis, and chart data generation
"""
import pandas as pd
from io import StringIO
from typing import Tuple, Dict, Any, List, Optional
import json


class CSVService:
    MAX_ROWS_DISPLAY = 100  # Maximum rows to send to frontend
    MAX_ROWS_CONTEXT = 1000  # Maximum rows to keep in memory
    
    def parse_csv(self, content: str, filename: str = "data.csv") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Parse CSV content and return data structure + summary
        
        Args:
            content: CSV content as string
            filename: Original filename
            
        Returns:
            Tuple of (csv_data dict, summary dict)
        """
        try:
            df = pd.read_csv(
                StringIO(content),
            )
        except pd.errors.ParserError:
            # Fallback: Thử đọc bằng engine python (chậm hơn nhưng flexible hơn)
            try:
                df = pd.read_csv(StringIO(content), engine='python', on_bad_lines='skip')
            except Exception as e:
                raise ValueError(f"File nát quá cứu không nổi: {str(e)}")
        except Exception as e:
            raise ValueError(f"Lỗi parse CSV: {str(e)}")

        print(df)
        
        # Limit rows for memory
        if len(df) > self.MAX_ROWS_CONTEXT:
            df_full = df.copy()
            df = df.head(self.MAX_ROWS_CONTEXT)
            truncated = True
        else:
            df_full = df
            truncated = False
        
        # Identify column types
        numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
        text_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
        datetime_columns = df.select_dtypes(include=['datetime']).columns.tolist()
        
        # Generate numeric statistics
        numeric_stats = {}
        for col in numeric_columns:
            col_data = df[col].dropna()
            if len(col_data) > 0:
                numeric_stats[col] = {
                    "mean": round(float(col_data.mean()), 2),
                    "median": round(float(col_data.median()), 2),
                    "min": round(float(col_data.min()), 2),
                    "max": round(float(col_data.max()), 2),
                    "std": round(float(col_data.std()), 2) if len(col_data) > 1 else 0,
                    "count": int(col_data.count()),
                    "missing": int(df[col].isnull().sum())
                }
        
        # Missing values analysis
        missing_values = df.isnull().sum().to_dict()
        missing_values = {k: int(v) for k, v in missing_values.items()}
        
        # Find most missing column
        most_missing_col = None
        most_missing_count = 0
        for col, count in missing_values.items():
            if count > most_missing_count:
                most_missing_count = count
                most_missing_col = col
        
        # Sample rows for display and context
        sample_rows = df.head(self.MAX_ROWS_DISPLAY).fillna("").to_dict(orient="records")
        
        # Clean sample rows (convert any remaining NaN)
        for row in sample_rows:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None
                elif isinstance(value, float) and value != value:  # NaN check
                    row[key] = None
        
        # Build CSV data structure
        csv_data = {
            "filename": filename,
            "columns": df.columns.tolist(),
            "row_count": len(df_full),
            "displayed_rows": len(df),
            "truncated": truncated,
            "numeric_columns": numeric_columns,
            "text_columns": text_columns,
            "datetime_columns": datetime_columns,
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "sample_rows": sample_rows,
            "numeric_stats": numeric_stats,
            "missing_values": missing_values
        }
        
        # Build summary
        text_summary = self._generate_text_summary(df_full, filename, numeric_columns, text_columns, missing_values)
        
        summary = {
            "row_count": len(df_full),
            "column_count": len(df.columns),
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_columns,
            "text_columns": text_columns,
            "missing_values": missing_values,
            "numeric_stats": numeric_stats,
            "most_missing_column": most_missing_col,
            "most_missing_count": most_missing_count,
            "text_summary": text_summary,
            "sample_rows": sample_rows[:5]  # Just first 5 for summary
        }
        
        return csv_data, summary
    
    def _generate_text_summary(
        self,
        df: pd.DataFrame,
        filename: str,
        numeric_columns: List[str],
        text_columns: List[str],
        missing_values: Dict[str, int]
    ) -> str:
        """Generate human-readable text summary of the dataset"""
        lines = [
            f"**Dataset: {filename}**",
            f"- **Total rows**: {len(df):,}",
            f"- **Total columns**: {len(df.columns)}",
            "",
            f"**Numeric columns** ({len(numeric_columns)}): {', '.join(numeric_columns) if numeric_columns else 'None'}",
            f"**Text columns** ({len(text_columns)}): {', '.join(text_columns) if text_columns else 'None'}",
        ]
        
        # Missing values info
        cols_with_missing = {k: v for k, v in missing_values.items() if v > 0}
        if cols_with_missing:
            lines.append("")
            lines.append("**Missing values:**")
            for col, count in sorted(cols_with_missing.items(), key=lambda x: -x[1])[:5]:
                pct = (count / len(df)) * 100
                lines.append(f"  - {col}: {count:,} ({pct:.1f}%)")
        else:
            lines.append("")
            lines.append("**Missing values:** None")
        
        return "\n".join(lines)
    
# Singleton instance
_csv_service: Optional[CSVService] = None


def get_csv_service() -> CSVService:
    """Get or create CSV service instance"""
    global _csv_service
    if _csv_service is None:
        _csv_service = CSVService()
    return _csv_service
