"""
CSV API Routes
Handles CSV file upload, URL loading, parsing, and data analysis
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import httpx

from database.repository import (
    create_conversation,
    get_conversation,
    set_active_csv,
    add_message,
    get_active_csv,
    get_csv_summary as get_csv_summary_from_db,
    clear_csv_context
)
from services.csv_service import get_csv_service
from services.llm_service import get_llm_service
from schemas.models import (
    CSVUrlRequest,
    CSVUploadResponse,
    CSVSummary,
)

router = APIRouter(prefix="/api/csv", tags=["CSV"])

MAX_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = [".csv"]


@router.post("/upload", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """
    Upload a CSV file for analysis.
    
    - Maximum size: 5MB
    - Returns summary statistics and session ID
    
    After uploading, user can ask questions about the data.
    """
    # Validate file extension
    filename = file.filename or "data.csv"
    if not any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )
    
    # Read and validate size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_SIZE // 1024 // 1024}MB"
        )
    
    # Decode content
    try:
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV.")
    
    # Parse CSV
    csv_service = get_csv_service()
    try:
        csv_data, summary = csv_service.parse_csv(content_str, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    
    # Get or create session
    if session_id:
        conv = get_conversation(session_id)
        if not conv:
            conv = create_conversation()
            session_id = conv["id"]
    else:
        conv = create_conversation()
        session_id = conv["id"]
    
    # Store CSV in conversation context
    set_active_csv(session_id, csv_data, filename, summary["text_summary"])
    
    # Add message showing CSV was uploaded
    add_message(
        session_id,
        role="user",
        content=f"[Uploaded CSV: {filename}]",
        csv_data={"filename": filename, "rows": summary["row_count"], "columns": summary["column_count"]}
    )
    
    # Add assistant acknowledgment with summary
    add_message(
        session_id,
        role="assistant",
        content=f"I've loaded the CSV file **{filename}**.\n\n{summary['text_summary']}\n\nYou can now ask me questions like:\n- \"Summarize the dataset\"\n- \"Show stats for [column name]\"\n- \"Which column has the most missing values?\"\n- \"Plot a histogram of [numeric column]\""
    )
    
    return CSVUploadResponse(
        session_id=session_id,
        message=f"CSV '{filename}' loaded successfully!",
        filename=filename,
        summary=CSVSummary(**summary)
    )


@router.post("/url", response_model=CSVUploadResponse)
async def load_csv_from_url(request: CSVUrlRequest):
    """
    Load a CSV file from a URL (e.g., raw GitHub link).
    
    - Supports any publicly accessible CSV URL
    - Maximum size: 5MB
    - Returns summary statistics and conversation ID
    """
    # Validate URL format
    url = request.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL. Must start with http:// or https://")
    
    # Fetch CSV from URL
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Check content length
            content_length = len(response.content)
            if content_length > MAX_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size is {MAX_SIZE // 1024 // 1024}MB"
                )
            
            content_str = response.text
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout. The URL took too long to respond.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    
    # Extract filename from URL
    filename = url.split("/")[-1].split("?")[0]
    if not filename.endswith(".csv"):
        filename = "data.csv"
    
    # Parse CSV
    csv_service = get_csv_service()
    try:
        csv_data, summary = csv_service.parse_csv(content_str, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV from URL: {str(e)}")
    
    # Get or create session
    session_id = request.session_id
    if session_id:
        conv = get_conversation(session_id)
        if not conv:
            conv = create_conversation()
            session_id = conv["id"]
    else:
        conv = create_conversation()
        session_id = conv["id"]
    
    # Store CSV in conversation context
    set_active_csv(session_id, csv_data, filename, summary["text_summary"])
    
    # Add message showing CSV was loaded
    add_message(
        session_id,
        role="user",
        content=f"[Loaded CSV from URL: {filename}]",
        csv_data={"filename": filename, "rows": summary["row_count"], "columns": summary["column_count"], "url": url}
    )
    
    # Add assistant acknowledgment with summary
    add_message(
        session_id,
        role="assistant",
        content=f"I've loaded the CSV file from the URL.\n\n**File:** {filename}\n\n{summary['text_summary']}\n\nYou can now ask me questions about this data!"
    )
    
    return CSVUploadResponse(
        session_id=session_id,
        message=f"CSV loaded from URL successfully!",
        filename=filename,
        summary=CSVSummary(**summary)
    )


@router.delete("/clear/{session_id}")
async def clear_csv(session_id: str):
    """Clear the active CSV from a session"""
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    clear_csv_context(session_id)
    return {"message": "CSV cleared successfully"}



