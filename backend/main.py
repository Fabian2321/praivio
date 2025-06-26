from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import os
import logging
import json
from datetime import datetime
import sqlite3
from pathlib import Path
from fastapi.responses import FileResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Praivio API",
    description="API für Praivio - Sichere, lokale KI-Plattform für datensensible Institutionen",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security
security = HTTPBearer()

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

# Pydantic models
class TextGenerationRequest(BaseModel):
    prompt: str
    model: str = "llama2"
    max_tokens: int = 1000
    temperature: float = 0.7
    template: Optional[str] = None
    context: Optional[str] = None

class TextGenerationResponse(BaseModel):
    generated_text: str
    model_used: str
    tokens_used: int
    processing_time: float
    timestamp: datetime

class ModelInfo(BaseModel):
    name: str
    size: str
    parameters: str
    status: str

class User(BaseModel):
    username: str
    role: str
    organization: str

# Database initialization
def init_database():
    """Initialize SQLite database with tables"""
    db_path = Path("./data")
    db_path.mkdir(exist_ok=True)
    
    conn = sqlite3.connect("./data/app.db")
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            organization TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS text_generations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            prompt TEXT NOT NULL,
            generated_text TEXT NOT NULL,
            model_used TEXT NOT NULL,
            tokens_used INTEGER,
            processing_time REAL,
            template_used TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Dependency for authentication (simplified for MVP)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Simple authentication - in production, implement proper JWT validation"""
    # For MVP, accept any valid token format
    if not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    # Mock user for demo - replace with proper JWT validation
    return User(username="demo_user", role="admin", organization="demo_clinic")

# Ollama client
async def get_ollama_client():
    return httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=60.0)

# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Praivio API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List available LLM models"""
    try:
        async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL) as client:
            response = await client.get("/api/tags")
            if response.status_code == 200:
                models_data = response.json()
                models = []
                for model in models_data.get("models", []):
                    # Format size as human readable string
                    size_bytes = model.get("size", 0)
                    if size_bytes > 1024**3:
                        size_str = f"{size_bytes / (1024**3):.1f} GB"
                    elif size_bytes > 1024**2:
                        size_str = f"{size_bytes / (1024**2):.1f} MB"
                    elif size_bytes > 1024:
                        size_str = f"{size_bytes / 1024:.1f} KB"
                    else:
                        size_str = f"{size_bytes} B"
                    
                    # Get parameters from details
                    details = model.get("details", {})
                    parameters = details.get("parameter_size", "Unknown")
                    
                    models.append(ModelInfo(
                        name=model["name"],
                        size=size_str,
                        parameters=parameters,
                        status="available"
                    ))
                return models
            else:
                logger.error(f"Failed to fetch models: {response.status_code}")
                return []
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return []

@app.post("/generate", response_model=TextGenerationResponse)
async def generate_text(
    request: TextGenerationRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate text using local LLM"""
    start_time = datetime.now()
    
    try:
        # Prepare prompt with template if provided
        prompt = request.prompt
        if request.template:
            prompt = request.template.format(
                prompt=request.prompt,
                context=request.context or ""
            )
        
        # Call Ollama API
        async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=60.0) as client:
            payload = {
                "model": request.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": request.max_tokens,
                    "temperature": request.temperature
                }
            }
            
            response = await client.post("/api/generate", json=payload)
            
            logger.info(f"Ollama response status: {response.status_code}")
            logger.info(f"Ollama response text: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                generated_text = result.get("response", "")
                tokens_used = result.get("eval_count", 0)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                # Log generation for audit
                conn = sqlite3.connect("./data/app.db")
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO text_generations 
                    (user_id, prompt, generated_text, model_used, tokens_used, processing_time, template_used)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (1, request.prompt, generated_text, request.model, tokens_used, processing_time, request.template))
                conn.commit()
                conn.close()
                
                return TextGenerationResponse(
                    generated_text=generated_text,
                    model_used=request.model,
                    tokens_used=tokens_used,
                    processing_time=processing_time,
                    timestamp=datetime.now()
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"LLM generation failed: {response.text}"
                )
                
    except httpx.ReadTimeout as e:
        logger.error(f"Ollama timeout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Text generation timed out. Please try again with a shorter prompt or different model."
        )
    except Exception as e:
        logger.error(f"Error in text generation: {e}")
        logger.error(f"Full error details: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/templates")
async def get_templates():
    """Get available text templates for different use cases"""
    templates = {
        "medical": {
            "arztbericht": "Patient: {context}\n\nBefund: {prompt}\n\nArztbericht:",
            "befundvorlage": "Untersuchung: {context}\n\nErgebnis: {prompt}\n\nBefund:",
            "anamnese": "Patientendaten: {context}\n\nAnamnese: {prompt}\n\nDokumentation:"
        },
        "legal": {
            "vertragsanalyse": "Vertragstext: {context}\n\nAnalyseauftrag: {prompt}\n\nAnalyse:",
            "textentwurf": "Anforderungen: {context}\n\nEntwurf für: {prompt}\n\nText:",
            "dokumentenprüfung": "Dokument: {context}\n\nPrüfauftrag: {prompt}\n\nPrüfung:"
        },
        "government": {
            "bericht": "Sachverhalt: {context}\n\nBerichtauftrag: {prompt}\n\nBericht:",
            "protokoll": "Sitzung: {context}\n\nProtokollierung: {prompt}\n\nProtokoll:",
            "dokumentation": "Vorgang: {context}\n\nDokumentation: {prompt}\n\nDokument:"
        }
    }
    return templates

@app.get("/stats")
async def get_statistics(current_user: User = Depends(get_current_user)):
    """Get usage statistics"""
    try:
        conn = sqlite3.connect("./data/app.db")
        cursor = conn.cursor()
        
        # Total generations
        cursor.execute("SELECT COUNT(*) FROM text_generations")
        total_generations = cursor.fetchone()[0]
        
        # Total tokens used
        cursor.execute("SELECT SUM(tokens_used) FROM text_generations")
        total_tokens = cursor.fetchone()[0] or 0
        
        # Average processing time
        cursor.execute("SELECT AVG(processing_time) FROM text_generations")
        avg_processing_time = cursor.fetchone()[0] or 0
        
        # Most used models
        cursor.execute("""
            SELECT model_used, COUNT(*) as count 
            FROM text_generations 
            GROUP BY model_used 
            ORDER BY count DESC
        """)
        model_usage = cursor.fetchall()
        
        conn.close()
        
        return {
            "total_generations": total_generations,
            "total_tokens_used": total_tokens,
            "average_processing_time": round(avg_processing_time, 2),
            "model_usage": [{"model": model, "count": count} for model, count in model_usage]
        }
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )

@app.get("/favicon.ico")
async def favicon():
    favicon_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "favicon.ico")
    favicon_path = os.path.abspath(favicon_path)
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    else:
        # Return 204 No Content if not found
        from fastapi import Response
        return Response(status_code=204)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 