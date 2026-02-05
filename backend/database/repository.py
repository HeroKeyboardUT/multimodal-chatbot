"""
Database Repository - CRUD operations using SQLAlchemy
Replaces in-memory database with persistent SQLite storage
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
import uuid
import json

from .models import Conversation, Message, ImageContext, CSVContext, SessionLocal


# ============ HELPER ============
def get_db_session() -> Session:
    """Get a new database session"""
    return SessionLocal()


# ============ CONVERSATION OPERATIONS ============

def create_conversation(db: Session = None) -> dict:
    """Create a new conversation"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conv_id = str(uuid.uuid4())
        conversation = Conversation(
            id=conv_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        return {
            "id": conversation.id,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
            "messages": [],
            "context": {
                "active_image": None,
                "image_filename": None,
                "active_csv": None,
                "csv_filename": None,
                "csv_summary": None
            }
        }
    finally:
        if close_db:
            db.close()


def get_conversation(conv_id: str, db: Session = None) -> Optional[dict]:
    """Get conversation by ID"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conversation:
            return None
        
        # Get messages
        messages = [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "image_url": msg.image_url,
                "csv_data": msg.csv_info,
                "chart_data": msg.chart_data
            }
            for msg in conversation.messages
        ]
        
        # Get image context
        active_image = None
        if conversation.image_context:
            active_image = conversation.image_context.image_base64
        
        # Get CSV context
        active_csv = None
        if conversation.csv_context:
            active_csv = {
                "filename": conversation.csv_context.filename,
                "row_count": conversation.csv_context.row_count,
                "column_count": conversation.csv_context.column_count,
                "columns": conversation.csv_context.columns or [],
                "numeric_columns": conversation.csv_context.numeric_columns or [],
                "text_columns": conversation.csv_context.text_columns or [],
                "data": conversation.csv_context.csv_data
            }
        
        return {
            "id": conversation.id,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
            "messages": messages,
            "context": {
                "active_image": active_image,
                "image_filename": conversation.image_filename,
                "active_csv": active_csv,
                "csv_filename": conversation.csv_filename,
                "csv_summary": conversation.csv_summary
            }
        }
    finally:
        if close_db:
            db.close()


def get_all_conversations(db: Session = None) -> List[dict]:
    """Get all conversations for sidebar display"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversations = db.query(Conversation).order_by(desc(Conversation.updated_at)).all()
        
        result = []
        for conv in conversations:
            # Get preview from first user message
            preview = "New conversation"
            for msg in conv.messages:
                if msg.role == "user" and not msg.content.startswith("["):
                    preview = msg.content[:50] + ("..." if len(msg.content) > 50 else "")
                    break
            
            result.append({
                "id": conv.id,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": len(conv.messages),
                "preview": preview,
                "has_image": conv.has_active_image,
                "has_csv": conv.has_active_csv
            })
        
        return result
    finally:
        if close_db:
            db.close()


def delete_conversation(conv_id: str, db: Session = None) -> bool:
    """Delete a conversation"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if conversation:
            db.delete(conversation)
            db.commit()
            return True
        return False
    finally:
        if close_db:
            db.close()


def update_conversation_timestamp(conv_id: str, db: Session = None):
    """Update the updated_at timestamp"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if conversation:
            conversation.updated_at = datetime.utcnow()
            db.commit()
    finally:
        if close_db:
            db.close()


# ============ MESSAGE OPERATIONS ============

def add_message(
    conv_id: str,
    role: str,
    content: str,
    image_url: str = None,
    csv_data: dict = None,
    chart_data: dict = None,
    db: Session = None
) -> dict:
    """Add a message to a conversation"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conversation:
            raise ValueError(f"Conversation {conv_id} not found")
        
        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv_id,
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            image_url=image_url,
            csv_info=csv_data,
            chart_data=chart_data
        )
        
        db.add(message)
        conversation.updated_at = datetime.utcnow()
        
        # Update title from first user message
        if not conversation.title and role == "user" and not content.startswith("["):
            conversation.title = content[:100]
        
        db.commit()
        db.refresh(message)
        
        return {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
            "image_url": message.image_url,
            "csv_data": message.csv_info,
            "chart_data": message.chart_data
        }
    finally:
        if close_db:
            db.close()


def get_messages(conv_id: str, db: Session = None) -> List[dict]:
    """Get all messages of a conversation"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        messages = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.timestamp).all()
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "image_url": msg.image_url,
                "csv_data": msg.csv_info,
                "chart_data": msg.chart_data
            }
            for msg in messages
        ]
    finally:
        if close_db:
            db.close()


def get_message_history_for_llm(conv_id: str, limit: int = 20, db: Session = None) -> List[dict]:
    """Get message history formatted for LLM API"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        messages = db.query(Message)\
            .filter(Message.conversation_id == conv_id)\
            .order_by(desc(Message.timestamp))\
            .limit(limit)\
            .all()
        
        # Reverse to get chronological order
        messages = list(reversed(messages))
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
    finally:
        if close_db:
            db.close()


# ============ IMAGE CONTEXT OPERATIONS ============

def set_active_image(conv_id: str, image_base64: str, filename: str, db: Session = None):
    """Store the active image being discussed"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conversation:
            return
        
        # Remove existing image context
        existing = db.query(ImageContext).filter(ImageContext.conversation_id == conv_id).first()
        if existing:
            db.delete(existing)
        
        # Add new image context
        image_context = ImageContext(
            conversation_id=conv_id,
            image_base64=image_base64,
            filename=filename,
            uploaded_at=datetime.utcnow()
        )
        db.add(image_context)
        
        # Update conversation flags
        conversation.has_active_image = True
        conversation.image_filename = filename
        conversation.updated_at = datetime.utcnow()
        
        db.commit()
    finally:
        if close_db:
            db.close()


def get_active_image(conv_id: str, db: Session = None) -> Optional[str]:
    """Get the active image (base64)"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        image_context = db.query(ImageContext).filter(ImageContext.conversation_id == conv_id).first()
        return image_context.image_base64 if image_context else None
    finally:
        if close_db:
            db.close()


def get_image_filename(conv_id: str, db: Session = None) -> Optional[str]:
    """Get the active image filename"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        return conversation.image_filename if conversation else None
    finally:
        if close_db:
            db.close()


def clear_image_context(conv_id: str, db: Session = None):
    """Clear image context"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        # Delete image context
        db.query(ImageContext).filter(ImageContext.conversation_id == conv_id).delete()
        
        # Update conversation flags
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if conversation:
            conversation.has_active_image = False
            conversation.image_filename = None
            conversation.updated_at = datetime.utcnow()
        
        db.commit()
    finally:
        if close_db:
            db.close()


# ============ CSV CONTEXT OPERATIONS ============

def set_active_csv(conv_id: str, csv_data: dict, filename: str, summary: str, db: Session = None):
    """Store the active CSV data being discussed"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conversation:
            print(f"[CSV] Conversation {conv_id} not found, cannot set CSV context")
            return
        
        # Remove existing CSV context
        existing = db.query(CSVContext).filter(CSVContext.conversation_id == conv_id).first()
        if existing:
            db.delete(existing)
            db.flush()  # Ensure deletion is processed
        
        # Prepare full CSV data for storage (include sample_rows, numeric_stats)
        full_csv_data = {
            "sample_rows": csv_data.get("sample_rows", []),
            "numeric_stats": csv_data.get("numeric_stats", {}),
            "missing_values": csv_data.get("missing_values", {}),
            "dtypes": csv_data.get("dtypes", {})
        }
        
        # Add new CSV context
        csv_context = CSVContext(
            conversation_id=conv_id,
            filename=filename,
            row_count=csv_data.get("row_count", 0),
            column_count=len(csv_data.get("columns", [])),
            columns=csv_data.get("columns", []),
            numeric_columns=csv_data.get("numeric_columns", []),
            text_columns=csv_data.get("text_columns", []),
            csv_data=full_csv_data,  # Store full data for analysis
            summary_text=summary,
            uploaded_at=datetime.utcnow()
        )
        db.add(csv_context)
        
        # Update conversation flags
        conversation.has_active_csv = True
        conversation.csv_filename = filename
        conversation.csv_summary = summary
        conversation.updated_at = datetime.utcnow()
        
        db.commit()
        print(f"[CSV] Successfully stored CSV context for conversation {conv_id}: {filename}")
    except Exception as e:
        print(f"[CSV] Error storing CSV context: {str(e)}")
        db.rollback()
        raise
    finally:
        if close_db:
            db.close()


def get_active_csv(conv_id: str, db: Session = None) -> Optional[dict]:
    """Get the active CSV data with full context for LLM"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        csv_context = db.query(CSVContext).filter(CSVContext.conversation_id == conv_id).first()
        if not csv_context:
            return None
        
        # Build complete CSV context for LLM
        csv_data = csv_context.csv_data or {}
        
        return {
            "filename": csv_context.filename,
            "row_count": csv_context.row_count,
            "column_count": csv_context.column_count,
            "columns": csv_context.columns or [],
            "numeric_columns": csv_context.numeric_columns or [],
            "text_columns": csv_context.text_columns or [],
            "sample_rows": csv_data.get("sample_rows", []),
            "numeric_stats": csv_data.get("numeric_stats", {}),
            "missing_values": csv_data.get("missing_values", {}),
            "dtypes": csv_data.get("dtypes", {})
        }
    finally:
        if close_db:
            db.close()


def get_csv_summary(conv_id: str, db: Session = None) -> Optional[str]:
    """Get the active CSV summary"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        return conversation.csv_summary if conversation else None
    finally:
        if close_db:
            db.close()


def clear_csv_context(conv_id: str, db: Session = None):
    """Clear CSV context"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        # Delete CSV context
        db.query(CSVContext).filter(CSVContext.conversation_id == conv_id).delete()
        
        # Update conversation flags
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if conversation:
            conversation.has_active_csv = False
            conversation.csv_filename = None
            conversation.csv_summary = None
            conversation.updated_at = datetime.utcnow()
        
        db.commit()
    finally:
        if close_db:
            db.close()


def clear_all_context(conv_id: str, db: Session = None):
    """Clear all context (image and CSV)"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        clear_image_context(conv_id, db)
        clear_csv_context(conv_id, db)
    finally:
        if close_db:
            db.close()


def get_conversation_context(conv_id: str, db: Session = None) -> dict:
    """Get full context info for a conversation"""
    close_db = False
    if db is None:
        db = get_db_session()
        close_db = True
    
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conversation:
            return {}
        
        return {
            "has_image": conversation.has_active_image,
            "image_filename": conversation.image_filename,
            "has_csv": conversation.has_active_csv,
            "csv_filename": conversation.csv_filename,
            "csv_summary": conversation.csv_summary
        }
    finally:
        if close_db:
            db.close()
