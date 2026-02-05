"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Any
from datetime import datetime


# ============ CHAT SCHEMAS ============
class ChatRequest(BaseModel):
    """Request body for sending a chat message"""
    message: str = Field(..., min_length=1, max_length=10000, description="User message")
    session_id: Optional[str] = Field(None, description="Chat session ID")
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")


class MessageSchema(BaseModel):
    """Single message in a conversation"""
    id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: str
    image_url: Optional[str] = None
    csv_data: Optional[dict] = None
    chart_data: Optional[dict] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    reply: str
    session_id: str  # Unified naming
    message_id: str
    timestamp: str


class ConversationListItem(BaseModel):
    """Item in conversation list"""
    id: str
    created_at: str
    updated_at: str
    message_count: int
    preview: str
    has_image: bool
    has_csv: bool


# ============ IMAGE SCHEMAS ============
class ImageUploadResponse(BaseModel):
    """Response from image upload endpoint"""
    session_id: str  # Unified naming
    message: str
    image_preview: str  # Data URL for frontend display
    filename: str


# ============ CSV SCHEMAS ============
class CSVUrlRequest(BaseModel):
    """Request body for loading CSV from URL"""
    url: str = Field(..., description="URL to CSV file (e.g., raw GitHub link)")
    session_id: Optional[str] = Field(None, description="Chat session ID")


class CSVSummary(BaseModel):
    """Summary statistics of a CSV file"""
    row_count: int
    column_count: int
    columns: List[str]
    numeric_columns: List[str]
    text_columns: List[str]
    missing_values: dict
    numeric_stats: Optional[dict] = None
    most_missing_column: Optional[str] = None
    most_missing_count: Optional[int] = None
    text_summary: str
    sample_rows: Optional[List[dict]] = None


class CSVUploadResponse(BaseModel):
    """Response from CSV upload/URL endpoint"""
    session_id: str  # Unified naming
    message: str
    filename: str
    summary: CSVSummary

# ============ GENERAL SCHEMAS ============
class SuccessResponse(BaseModel):
    """Standard success response"""
    message: str
    success: bool = True


class ContextInfo(BaseModel):
    """Information about current conversation context"""
    has_image: bool
    image_filename: Optional[str]
    has_csv: bool
    csv_filename: Optional[str]
    csv_summary: Optional[str]
