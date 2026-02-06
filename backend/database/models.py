"""
SQLAlchemy Database Models and Setup
Using SQLite for persistent storage
"""
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("POSTGRES_URL")

# Logic xử lý connection string và arguments
connect_args = {}

if DATABASE_URL:
    # Fix cái vụ postgres:// cũ rích nếu có
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
else:
    # Nếu chạy local không có env thì dùng SQLite
    DATABASE_URL = "sqlite:///./chat_app.db"
    # Chỉ SQLite mới cần cái này
    connect_args = {"check_same_thread": False}

# Create engine chuẩn chỉ
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

Base = declarative_base()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ============ DATABASE MODELS ============

class Conversation(Base):
    """Conversation/Session model"""
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    title = Column(String(255), nullable=True)  # Auto-generated from first message
    
    # Context flags
    has_active_image = Column(Boolean, default=False)
    image_filename = Column(String(255), nullable=True)
    has_active_csv = Column(Boolean, default=False)
    csv_filename = Column(String(255), nullable=True)
    csv_summary = Column(Text, nullable=True)
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    image_context = relationship("ImageContext", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    csv_context = relationship("CSVContext", back_populates="conversation", uselist=False, cascade="all, delete-orphan")


class Message(Base):
    """Message model"""
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Optional metadata
    image_url = Column(Text, nullable=True)  # Data URL for image messages
    csv_info = Column(JSON, nullable=True)   # Info about CSV upload
    chart_data = Column(JSON, nullable=True) # Data for chart visualization
    
    # Relationship
    conversation = relationship("Conversation", back_populates="messages")


class ImageContext(Base):
    """Stores active image for a conversation"""
    __tablename__ = "image_contexts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), unique=True, nullable=False)
    image_base64 = Column(Text, nullable=False)  # Base64 encoded image
    filename = Column(String(255), nullable=True)
    content_type = Column(String(50), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    conversation = relationship("Conversation", back_populates="image_context")


class CSVContext(Base):
    """Stores active CSV data for a conversation"""
    __tablename__ = "csv_contexts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), unique=True, nullable=False)
    filename = Column(String(255), nullable=True)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    columns = Column(JSON, nullable=True)        # List of column names
    numeric_columns = Column(JSON, nullable=True)
    text_columns = Column(JSON, nullable=True)
    csv_data = Column(JSON, nullable=True)       # Actual data (limited rows for context)
    summary_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    conversation = relationship("Conversation", back_populates="csv_context")


# ============ DATABASE INITIALIZATION ============

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize database on import
init_db()
