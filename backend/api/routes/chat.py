"""
Chat API Routes
Handles multi-turn conversations with optional image/CSV context
"""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import json

from database.repository import (
    create_conversation,
    get_conversation,
    get_all_conversations,
    delete_conversation,
    add_message,
    get_messages,
    get_message_history_for_llm,
    get_active_image,
    get_active_csv,
    get_csv_summary,
    get_conversation_context,
    clear_all_context
)
from services.llm_service import get_llm_service
from schemas.models import (
    ChatRequest,
    ChatResponse,
    ConversationListItem,
    SuccessResponse,
    ContextInfo
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])

frontend_url = os.getenv(
    "FRONTEND_URL",
    "localhost:3000"
).rstrip("/")

# ============ STREAMING ENDPOINT ============

@router.post("/stream")
async def send_message_stream(request: ChatRequest):
    """
    Send a message and receive AI response with streaming.
    Returns Server-Sent Events (SSE) for real-time updates.
    """
    llm_service = get_llm_service()
    
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
    
    # Save user message
    add_message(session_id, role="user", content=request.message)
    
    # Get context for LLM
    active_image = get_active_image(session_id)
    active_csv = get_active_csv(session_id)
    csv_summary = get_csv_summary(session_id)
    history = get_message_history_for_llm(session_id)
    
    # Use pasted image if provided, otherwise use stored image
    image_to_use = request.image_base64 or active_image
    
    async def generate():
        full_response = ""
        
        # Send session_id first
        yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
        
        try:
            async for chunk in llm_service.generate_response_stream(
                message=request.message,
                history=history[:-1],
                image_base64=image_to_use,
                csv_context=active_csv,
                csv_summary=csv_summary
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Save complete response to database
            add_message(session_id, role="assistant", content=full_response)
            
            # Send done signal
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            # SSE headers
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",

        # CORS headers
        "Access-Control-Allow-Origin": frontend_url,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
        }
    )


# ============ MAIN CHAT ENDPOINTS (used by frontend) ============


@router.post("/session")
async def create_session():
    """Create a new chat session"""
    conv = create_conversation()
    return {
        "session_id": conv["id"],
        "created_at": conv["created_at"]
    }


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session"""
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "messages": conv["messages"]
    }


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    if not get_conversation(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    delete_conversation(session_id)
    return {"message": "Session deleted successfully"}


# ============ EXTENDED ENDPOINTS ============


@router.get("/conversations", response_model=list[ConversationListItem])
async def list_conversations():
    """
    Get list of all conversations.
    Returns basic info for sidebar display.
    """
    conversations = get_all_conversations()
    return conversations


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str):
    """
    Get full details of a session including all messages and context.
    """
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": conv["id"],
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"],
        "messages": conv["messages"],
        "context": get_conversation_context(session_id)
    }


@router.delete("/sessions/{session_id}", response_model=SuccessResponse)
async def delete_session_endpoint(session_id: str):
    """
    Delete a session and all its messages.
    """
    if not get_conversation(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    
    delete_conversation(session_id)
    return SuccessResponse(message="Session deleted successfully")


@router.post("/sessions", response_model=dict)
async def create_new_session():
    """
    Create a new empty session.
    """
    conv = create_conversation()
    return {
        "id": conv["id"],
        "created_at": conv["created_at"],
        "message": "New session created"
    }


@router.get("/sessions/{session_id}/context", response_model=ContextInfo)
async def get_context_info(session_id: str):
    """
    Get information about the current context (image/CSV) of a session.
    """
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    context = get_conversation_context(session_id)
    return ContextInfo(**context)


@router.delete("/sessions/{session_id}/context", response_model=SuccessResponse)
async def clear_context(session_id: str):
    """
    Clear all context (image and CSV) from a session.
    Useful when user wants to start fresh without creating a new session.
    """
    conv = get_conversation(session_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Session not found")
    
    clear_all_context(session_id)
    
    # Add system message
    add_message(
        session_id,
        role="assistant",
        content="Context cleared. You can now upload a new image or CSV, or continue chatting."
    )
    
    return SuccessResponse(message="Context cleared successfully")
