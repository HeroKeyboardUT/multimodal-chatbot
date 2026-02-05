"""
Image API Routes
Handles image upload and processing for vision-based chat
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import base64

from database.repository import (
    create_conversation,
    get_conversation,
    set_active_image,
    add_message,
    get_active_image,
    clear_image_context
)
from services.llm_service import get_llm_service

router = APIRouter(prefix="/api/image", tags=["Image"])

# Allowed image types
ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None)
):
    """
    Upload an image to chat about.
    
    - Accepts PNG, JPG, WEBP, GIF formats
    - Maximum size: 10MB
    - Returns a preview URL and session ID
    
    After uploading, user can ask questions about the image in the chat.
    """
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Supported types: PNG, JPG, WEBP, GIF"
        )
    
    # Read and validate size
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_SIZE // 1024 // 1024}MB"
        )
    
    # Convert to base64
    base64_image = base64.b64encode(content).decode("utf-8")
    image_data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Get or create session
    if session_id:
        conv = get_conversation(session_id)
        if not conv:
            conv = create_conversation()
            session_id = conv["id"]
    else:
        conv = create_conversation()
        session_id = conv["id"]
    
    # Store image in conversation context
    filename = file.filename or "uploaded_image"
    set_active_image(session_id, base64_image, filename)
    
    # Use LLM to analyze image automatically
    llm_service = get_llm_service()
    analysis = await llm_service.analyze_image(base64_image, "Describe this image briefly.")
    
    # Add messages
    add_message(session_id, role="user", content=f"[Uploaded image: {filename}]", image_url=image_data_url)
    add_message(session_id, role="assistant", content=analysis)
    
    return {
        "message": f"Image '{filename}' uploaded successfully",
        "session_id": session_id,
        "analysis": analysis,
        "image_preview": image_data_url,
        "filename": filename
    }


@router.delete("/clear/{session_id}")
async def clear_image(session_id: str):
    """Clear the active image from a session"""
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    clear_image_context(session_id)
    return {"message": "Image cleared successfully"}

