"""
Chat Application Backend
Multi-turn conversation with Image and CSV analysis support

Features:
- Multi-turn conversation history
- Image upload and vision-based Q&A
- CSV upload/URL loading with data analysis
- Streaming-ready architecture
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from api.routes.chat import router as chat_router
from api.routes.image import router as image_router
from api.routes.csv import router as csv_router

# Create FastAPI app
app = FastAPI(
    title="Chat Application API",
    description="""
    A lightweight chat application that supports:
    - Multi-turn conversations
    - Image upload and analysis (PNG/JPG)
    - CSV data analysis (file upload or URL)
    
    ## Features
    
    ### Core Chat
    - Persist and display conversation history
    - Show who said what and when
    - Markdown support in responses
    
    ### Image Chat
    - Upload images (PNG, JPG, WEBP, GIF)
    - Ask questions about uploaded images
    - GPT-4 Vision powered analysis
    
    ### CSV Data Chat
    - Upload CSV files or load from URL
    - Get dataset summaries and statistics
    - Ask questions about the data
    - Generate simple charts (histogram, bar)
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_type": type(exc).__name__
        }
    )


# Include routers
app.include_router(chat_router)
app.include_router(image_router)
app.include_router(csv_router)


# Health check endpoints
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - basic health check"""
    return {
        "status": "running",
        "message": "Chat Application API is running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    openai_configured = bool(os.getenv("OPENAI_API_KEY"))
    return {
        "status": "healthy",
        "openai_configured": openai_configured,
        "version": "1.0.0"
    }


@app.get("/api/health", tags=["Health"])
async def api_health():
    """API health check for frontend"""
    return {"status": "ok"}


# if __name__ == "__main__":
#     # Get port from environment or default to 8000
#     port = int(os.getenv("PORT", 8000))
    
#     uvicorn.run(
#         "main:app",
#         port=port,
#         reload=True,  # Auto-reload on code changes
#         log_level="info"
#     )

