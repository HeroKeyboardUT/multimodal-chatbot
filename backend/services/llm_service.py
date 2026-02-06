"""
LLM Service - Handles communication with Groq API
Supports text chat, image analysis, and CSV data analysis
"""
from typing import List, Optional, Dict, Any, AsyncGenerator
import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        # Groq API is compatible with OpenAI SDK
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        # Groq models - llama-4-scout supports vision
        self.model = "meta-llama/llama-4-scout-17b-16e-instruct"
        self.vision_model = "meta-llama/llama-4-scout-17b-16e-instruct"  # Model for vision
        self.fallback_model = "llama-3.3-70b-versatile"  # Fallback for text-only
        
        # Llama 4 Scout supports vision
        self.supports_vision = True
    
    
    async def generate_response_stream(
        self,
        message: str,
        history: List[dict],
        image_base64: Optional[str] = None,
        csv_context: Optional[dict] = None,
        csv_summary: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Generate AI response with streaming.
        Yields chunks of text as they're generated.
        """
        # Build system prompt
        system_prompt = self._build_system_prompt(csv_context, csv_summary)
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (limit to save tokens)
        for msg in history[-15:]:
            if msg["content"].startswith("[Uploaded") or msg["content"].startswith("[Loaded"):
                continue
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Build current message
        if image_base64 and self.supports_vision:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": message},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}",
                            "detail": "auto"
                        }
                    }
                ]
            })
        else:
            messages.append({"role": "user", "content": message})
        
        # Call API with streaming
        try:
            # Use vision model if image is provided
            model_to_use = self.vision_model if (image_base64 and self.supports_vision) else self.model
            
            stream = await self.client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                max_tokens=2000,
                temperature=0.7,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            # print(f"[LLM] Error with primary model: {str(e)}")
            # Try fallback model with streaming (text only)
            try:
                # Remove image from messages for fallback
                fallback_messages = []
                for msg in messages:
                    if isinstance(msg.get("content"), list):
                        # Extract text only
                        text_content = next((c["text"] for c in msg["content"] if c["type"] == "text"), "")
                        fallback_messages.append({"role": msg["role"], "content": f"[Ảnh đã được gửi nhưng model không thể xử lý]\n{text_content}"})
                    else:
                        fallback_messages.append(msg)
                
                stream = await self.client.chat.completions.create(
                    model=self.fallback_model,
                    messages=fallback_messages,
                    max_tokens=2000,
                    temperature=0.7,
                    stream=True
                )
                
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                        
            except Exception as fallback_error:
                yield f"I apologize, but I encountered an error: {str(e)}"
    
    def _build_system_prompt(
        self, 
        csv_context: Optional[dict], 
        csv_summary: Optional[str]
    ) -> str:
        """Build system prompt with context about available data"""
        base_prompt = """You are a helpful AI assistant with the following capabilities:

1. **General Conversation**: Engage in helpful, friendly conversations.

2. **Image Analysis**: When an image is provided, you can describe it, answer questions about it, and provide insights.

3. **CSV Data Analysis**: When CSV data is loaded, you can:
   - Summarize the dataset
   - Explain column meanings
   - Provide statistics (mean, median, min, max, std, etc.)
   - Identify patterns, trends, and issues (like missing values)
   - Answer specific questions about the data
   - Compare columns and provide insights

4. **Data Visualization**: When the user asks for a chart, plot, histogram, or visualization, you MUST output a JSON code block with language "chart" following this EXACT format:

```chart
{
  "type": "bar",
  "title": "Chart Title",
  "data": [
    {"name": "Category A", "value": 100},
    {"name": "Category B", "value": 200}
  ],
  "xKey": "name",
  "yKey": "value"
}
```

**CRITICAL RULES - MUST FOLLOW:**
1. ALWAYS use ```chart as the language tag
2. **NEVER use "..." or ellipsis in data array** - this breaks the chart!
3. Data array must contain ONLY complete, valid JSON objects
4. **LIMIT data to 10-20 points maximum** - aggregate/sample if needed
5. Each data object must have all required keys (e.g., {"name": "X", "value": 100})
6. Supported types: "bar", "line", "area", "pie", "scatter", "radar", "histogram", "composed"
7. For large datasets: group into bins/categories, show top N, or sample representative points

**HISTOGRAM EXAMPLE** (for frequency distribution):
```chart
{
  "type": "histogram",
  "title": "Distribution of Max_Power (W)",
  "data": [
    {"range": "0-50", "count": 234},
    {"range": "51-100", "count": 456},
    {"range": "101-150", "count": 389},
    {"range": "151-200", "count": 312},
    {"range": "201-300", "count": 287},
    {"range": "301-500", "count": 156},
    {"range": "501+", "count": 47}
  ],
  "xKey": "range",
  "yKey": "count",
  "xLabel": "Power Range (W)",
  "yLabel": "Frequency"
}
```

**BAR CHART EXAMPLE:**
```chart
{
  "type": "bar",
  "title": "Top 10 GPUs by Power",
  "data": [
    {"name": "RTX 4090", "value": 450},
    {"name": "RTX 4080", "value": 320}
  ],
  "xKey": "name",
  "yKey": "value"
}
```

**LINE CHART EXAMPLE:**
```chart
{
  "type": "line",
  "title": "Trend Over Time",
  "data": [
    {"month": "Jan", "sales": 100, "profit": 20},
    {"month": "Feb", "sales": 150, "profit": 35}
  ],
  "xKey": "month",
  "yKey": ["sales", "profit"]
}
```

**PIE CHART EXAMPLE:**
```chart
{
  "type": "pie",
  "title": "Market Share",
  "data": [
    {"name": "NVIDIA", "value": 80},
    {"name": "AMD", "value": 15},
    {"name": "Intel", "value": 5}
  ],
  "nameKey": "name",
  "valueKey": "value"
}
```

**SCATTER CHART EXAMPLE** (for correlation between two numeric variables):
```chart
{
  "type": "scatter",
  "title": "Power vs Clock Speed",
  "data": [
    {"power": 141, "clock": 1189},
    {"power": 215, "clock": 1250},
    {"power": 200, "clock": 1100},
    {"power": 45, "clock": 800},
    {"power": 100, "clock": 950}
  ],
  "xKey": "power",
  "yKey": "clock",
  "xLabel": "Power (W)",
  "yLabel": "Clock (MHz)"
}
```

**AREA CHART EXAMPLE** (like line but filled):
```chart
{
  "type": "area",
  "title": "Memory Usage Over Time",
  "data": [
    {"time": "0s", "usage": 20},
    {"time": "10s", "usage": 45},
    {"time": "20s", "usage": 60},
    {"time": "30s", "usage": 35}
  ],
  "xKey": "time",
  "yKey": "usage",
  "yLabel": "Usage (%)"
}
```

**RADAR CHART EXAMPLE** (for comparing multiple metrics):
```chart
{
  "type": "radar",
  "title": "GPU Performance Comparison",
  "data": [
    {"metric": "Power", "RTX4090": 90, "RTX4080": 70},
    {"metric": "Speed", "RTX4090": 95, "RTX4080": 80},
    {"metric": "Memory", "RTX4090": 85, "RTX4080": 75},
    {"metric": "Cooling", "RTX4090": 60, "RTX4080": 70},
    {"metric": "Price", "RTX4090": 40, "RTX4080": 60}
  ],
  "xKey": "metric",
  "yKey": ["RTX4090", "RTX4080"]
}
```

**COMPOSED CHART EXAMPLE** (mix bar, line, area):
```chart
{
  "type": "composed",
  "title": "Revenue Analysis",
  "data": [
    {"month": "Jan", "revenue": 1000, "growth": 5},
    {"month": "Feb", "revenue": 1200, "growth": 20}
  ],
  "xKey": "month",
  "series": [
    {"dataKey": "revenue", "type": "bar", "name": "Revenue"},
    {"dataKey": "growth", "type": "line", "name": "Growth %"}
  ]
}
```

**IMPORTANT GUIDELINES:**
- Be concise but thorough
- Use markdown formatting for better readability
- When discussing data, reference specific column names and actual values
- Present statistics in clear, formatted tables when appropriate
- If asked about specific columns, provide detailed analysis
- When user asks for chart/plot/histogram/visualization:
  * ALWAYS output the chart JSON in ```chart code block
  * NEVER use "..." or ellipsis in data - include ALL data points
  * For histogram: calculate frequency bins from the data and show count per bin
  * For scatter: both xKey and yKey must point to NUMERIC fields
  * For radar: xKey is the category/metric name, yKey is array of numeric series
  * Limit data to reasonable size (10-20 data points for readability)
- Always be helpful and accurate
- Respond in the same language as the user's question"""

        if csv_context and csv_summary:
            # Build detailed CSV context
            columns_info = ", ".join(csv_context.get('columns', []))
            numeric_cols = csv_context.get('numeric_columns', [])
            text_cols = csv_context.get('text_columns', [])
            numeric_stats = csv_context.get('numeric_stats', {})
            missing_values = csv_context.get('missing_values', {})
            sample_rows = csv_context.get('sample_rows', [])
            
            csv_info = f"""

**Currently Loaded CSV Data:**
- **Filename**: {csv_context.get('filename', 'Unknown')}
- **Total Rows**: {csv_context.get('row_count', 'Unknown'):,}
- **Total Columns**: {csv_context.get('column_count', len(csv_context.get('columns', [])))}
- **All Columns**: {columns_info}
- **Numeric Columns** ({len(numeric_cols)}): {', '.join(numeric_cols) if numeric_cols else 'None'}
- **Text Columns** ({len(text_cols)}): {', '.join(text_cols) if text_cols else 'None'}

**Numeric Statistics:**"""

            # Add numeric stats for each column
            for col, stats in numeric_stats.items():
                csv_info += f"""
- **{col}**:
  - Mean: {stats.get('mean', 'N/A')}, Median: {stats.get('median', 'N/A')}
  - Min: {stats.get('min', 'N/A')}, Max: {stats.get('max', 'N/A')}
  - Std: {stats.get('std', 'N/A')}, Count: {stats.get('count', 'N/A')}
  - Missing: {stats.get('missing', 0)}"""

            # Add missing values summary
            cols_with_missing = {k: v for k, v in missing_values.items() if v > 0}
            if cols_with_missing:
                csv_info += "\n\n**Missing Values:**"
                for col, count in sorted(cols_with_missing.items(), key=lambda x: -x[1])[:5]:
                    row_count = csv_context.get('row_count', 1)
                    pct = (count / row_count * 100) if row_count > 0 else 0
                    csv_info += f"\n- {col}: {count:,} ({pct:.1f}%)"
            else:
                csv_info += "\n\n**Missing Values:** None"

            # Add sample data (first 5 rows for context)
            if sample_rows:
                csv_info += f"\n\n**Sample Data (first {min(5, len(sample_rows))} rows):**\n"
                csv_info += "```json\n"
                csv_info += json.dumps(sample_rows[:5], indent=2, ensure_ascii=False)
                csv_info += "\n```"

            csv_info += f"""

**Summary:** {csv_summary}

When the user asks about "the data", "the dataset", "the CSV", "dữ liệu", etc., refer to this loaded data.
Use the actual statistics provided above to answer questions accurately.
For questions about specific columns, use the exact values from numeric_stats."""
            
            base_prompt += csv_info
        
        return base_prompt
    
    async def analyze_image(self, image_base64: str, question: str = None) -> str:
        """Specifically analyze an image"""
        if not self.supports_vision:
            return "**Lưu ý:** Model hiện tại chưa hỗ trợ phân tích hình ảnh. Ảnh đã được upload nhưng tôi không thể xem được nội dung."
        
        prompt = question or "Hãy mô tả chi tiết hình ảnh này. Bạn thấy gì trong ảnh?"
        
        messages = [
            {
                "role": "system",
                "content": "Bạn là chuyên gia phân tích hình ảnh. Mô tả ảnh chính xác và chi tiết bằng tiếng Việt."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1500
            )
            return response.choices[0].message.content
        except Exception as e:
            # Fallback to text model if vision fails
            return f"Lỗi phân tích ảnh: {str(e)}"
    
    async def analyze_csv_question(
        self,
        question: str,
        csv_data: dict,
        csv_summary: str
    ) -> Dict[str, Any]:
        """
        Analyze a question about CSV data and determine if it needs a chart
        Returns response and optional chart data
        """
        # Check if user is asking for a chart/visualization
        chart_keywords = ["plot", "chart", "graph", "histogram", "visualize", "show me", "draw"]
        needs_chart = any(keyword in question.lower() for keyword in chart_keywords)
        
        prompt = f"""You are a data analyst. Answer the following question about this dataset.

**Dataset Info:**
- Columns: {csv_data.get('columns', [])}
- Row count: {csv_data.get('row_count', 0)}
- Numeric columns: {csv_data.get('numeric_columns', [])}
- Text columns: {csv_data.get('text_columns', [])}
- Summary: {csv_summary}

**Numeric Statistics:**
{json.dumps(csv_data.get('numeric_stats', {}), indent=2)}

**Sample Data (first 5 rows):**
{json.dumps(csv_data.get('sample_rows', [])[:5], indent=2)}

**Question:** {question}

Provide a clear, helpful answer. Use markdown formatting.
If the question asks for statistics, provide specific numbers from the data.
If the question asks for a visualization, describe what the chart would show."""

        messages = [
            {"role": "system", "content": "You are a helpful data analyst assistant."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1500,
                temperature=0.5
            )
            
            return {
                "answer": response.choices[0].message.content,
                "needs_chart": needs_chart
            }
        except Exception as e:
            return {
                "answer": f"Error analyzing data: {str(e)}",
                "needs_chart": False
            }


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
