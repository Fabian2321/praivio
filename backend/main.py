from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
import httpx
import os
import logging
import json
from datetime import datetime
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any

# Import our new modules
from security import SecurityManager, AuditLogger, RateLimiter
from auth import AuthManager
from models import *
from database import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Praivio API",
    description="API für Praivio - Sichere, lokale KI-Plattform für datensensible Institutionen",
    version="2.0.0"
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

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

# Initialize managers
security_manager = SecurityManager(SECRET_KEY)
db_manager = DatabaseManager()
auth_manager = AuthManager(security_manager, db_manager)
audit_logger = AuditLogger(db_manager.get_connection().__enter__())
rate_limiter = RateLimiter()

# Security
security = HTTPBearer()

# Middleware für Request-Logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    # Log request
    user_id = None
    if "authorization" in request.headers:
        try:
            token = request.headers["authorization"].replace("Bearer ", "")
            payload = auth_manager.verify_token(token)
            if payload:
                user_id = payload.get('user_id')
        except:
            pass
    
    response = await call_next(request)
    
    # Log response
    processing_time = (datetime.now() - start_time).total_seconds()
    
    audit_logger.log_user_action(
        user_id=user_id,
        action="API_REQUEST",
        details=f"{request.method} {request.url.path} - {response.status_code}",
        ip_address=request.client.host if request.client else "unknown",
        success=response.status_code < 400
    )
    
    return response

# Dependency für Rate Limiting
async def check_rate_limit(request: Request, user: Dict[str, Any] = Depends(auth_manager.get_current_user)):
    if not rate_limiter.is_allowed(str(user['id']), request.url.path):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    return user

# API Endpoints
@app.get("/", response_model=HealthCheckResponse)
async def root():
    """Health check endpoint"""
    # Check services
    services = {}
    
    # Check database
    try:
        db_manager.get_connection().__enter__()
        services["database"] = "healthy"
    except:
        services["database"] = "unhealthy"
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL) as client:
            response = await client.get("/api/tags")
            services["ollama"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        services["ollama"] = "unhealthy"
    
    return HealthCheckResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.now(),
        services=services,
        database=services.get("database", "unknown"),
        ollama=services.get("ollama", "unknown")
    )

@app.post("/auth/login", response_model=TokenResponse)
async def login(user_credentials: UserLogin, request: Request):
    """Benutzer-Login"""
    try:
        user = auth_manager.authenticate_user(user_credentials.username, user_credentials.password)
        if not user:
            audit_logger.log_user_action(
                user_id=None,
                action="LOGIN_FAILED",
                details=f"Failed login attempt for user: {user_credentials.username}",
                ip_address=request.client.host if request.client else "unknown",
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create access token
        access_token = auth_manager.create_access_token(user)
        
        audit_logger.log_user_action(
            user_id=user['id'],
            action="LOGIN_SUCCESS",
            details=f"Successful login for user: {user['username']}",
            ip_address=request.client.host if request.client else "unknown",
            success=True
        )
        
        return TokenResponse(
            access_token=access_token,
            expires_in=3600,
            user=UserResponse(**user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/auth/logout")
async def logout(request: Request, current_user: Dict[str, Any] = Depends(auth_manager.get_current_user)):
    """Benutzer-Logout"""
    try:
        # Invalidate current session
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        if token:
            # In a real implementation, you would add the token to a blacklist
            pass
        
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="LOGOUT",
            details=f"User logout: {current_user['username']}",
            ip_address=request.client.host if request.client else "unknown",
            success=True
        )
        
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

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
    api_request: Request,
    current_user: Dict[str, Any] = Depends(check_rate_limit)
):
    """Generate text using local LLM"""
    start_time = datetime.now()
    
    try:
        # Sanitize input
        sanitized_prompt = security_manager.sanitize_input(request.prompt)
        if request.context:
            sanitized_context = security_manager.sanitize_input(request.context)
        else:
            sanitized_context = None
        
        # Prepare prompt with template if provided
        prompt = sanitized_prompt
        if request.template:
            templates = await get_templates()
            if request.template in templates:
                prompt = templates[request.template] + "\n\n" + sanitized_prompt
        
        # Add context if provided
        if sanitized_context:
            prompt = f"Context: {sanitized_context}\n\nRequest: {prompt}"
        
        # Call Ollama API
        async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL) as client:
            ollama_request = {
                "model": request.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens
                }
            }
            
            response = await client.post("/api/generate", json=ollama_request)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="LLM service error"
                )
            
            result = response.json()
            generated_text = result.get("response", "")
            tokens_used = result.get("eval_count", 0)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Save to database
        generation_id = db_manager.save_text_generation(
            user_id=current_user['id'],
            prompt=sanitized_prompt,
            generated_text=generated_text,
            model_used=request.model,
            tokens_used=tokens_used,
            processing_time=processing_time,
            template_used=request.template,
            context=sanitized_context
        )
        
        # Log audit event
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="TEXT_GENERATION",
            details=f"Generated text using model {request.model}, {tokens_used} tokens",
            ip_address=api_request.client.host if api_request.client else "unknown",
            success=True
        )
        
        return TextGenerationResponse(
            id=generation_id,
            generated_text=generated_text,
            model_used=request.model,
            tokens_used=tokens_used,
            processing_time=processing_time,
            template_used=request.template,
            created_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text generation error: {e}")
        
        # Log failed generation
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="TEXT_GENERATION_FAILED",
            details=f"Failed to generate text: {str(e)}",
            ip_address=api_request.client.host if api_request.client else "unknown",
            success=False
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Text generation failed"
        )

@app.get("/templates")
async def get_templates():
    """Get available templates"""
    templates = {
        "medical": {
            "arztbericht": "Erstelle einen strukturierten Arztbericht basierend auf den folgenden Informationen:",
            "befund": "Formuliere einen medizinischen Befund für:",
            "anamnese": "Erstelle eine strukturierte Anamnese für:",
            "entlassungsbrief": "Verfasse einen Entlassungsbrief für:"
        },
        "legal": {
            "vertragsanalyse": "Analysiere den folgenden Vertrag und erstelle eine Zusammenfassung der wichtigsten Punkte:",
            "rechtsgutachten": "Erstelle ein Rechtsgutachten zu folgendem Sachverhalt:",
            "klageschrift": "Verfasse eine Klageschrift für:",
            "vertragsentwurf": "Erstelle einen Vertragsentwurf für:"
        },
        "government": {
            "bericht": "Erstelle einen behördlichen Bericht zu:",
            "protokoll": "Verfasse ein Protokoll zu:",
            "entscheidung": "Formuliere eine behördliche Entscheidung zu:",
            "dokumentation": "Erstelle eine Dokumentation zu:"
        }
    }
    return templates

@app.get("/stats", response_model=StatisticsResponse)
async def get_statistics(current_user: Dict[str, Any] = Depends(auth_manager.get_current_user)):
    """Get system statistics"""
    try:
        stats = db_manager.get_statistics(current_user['id'])
        
        # Get additional stats
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Average processing time
            cursor.execute("""
                SELECT AVG(processing_time) FROM text_generations 
                WHERE user_id = ?
            """, (current_user['id'],))
            avg_time = cursor.fetchone()[0]
            
            # Most used model
            cursor.execute("""
                SELECT model_used, COUNT(*) as count 
                FROM text_generations 
                WHERE user_id = ?
                GROUP BY model_used 
                ORDER BY count DESC 
                LIMIT 1
            """, (current_user['id'],))
            model_result = cursor.fetchone()
            
            # Most used template
            cursor.execute("""
                SELECT template_used, COUNT(*) as count 
                FROM text_generations 
                WHERE user_id = ? AND template_used IS NOT NULL
                GROUP BY template_used 
                ORDER BY count DESC 
                LIMIT 1
            """, (current_user['id'],))
            template_result = cursor.fetchone()
        
        return StatisticsResponse(
            total_generations=stats['total_generations'],
            total_tokens=stats['total_tokens'],
            active_users=stats['active_users'],
            audit_events_today=stats['audit_events_today'],
            average_processing_time=avg_time,
            most_used_model=model_result[0] if model_result else None,
            most_used_template=template_result[0] if template_result else None
        )
        
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )

@app.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(auth_manager.require_permission("admin"))
):
    """Get audit logs (admin only)"""
    try:
        logs = db_manager.get_audit_logs(limit=limit)
        return [AuditLogResponse(**log) for log in logs]
    except Exception as e:
        logger.error(f"Audit logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit logs"
        )

@app.get("/user/generations", response_model=List[TextGenerationResponse])
async def get_user_generations(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(auth_manager.get_current_user)
):
    """Get user's text generations"""
    try:
        generations = db_manager.get_user_generations(current_user['id'], limit)
        return [TextGenerationResponse(**gen) for gen in generations]
    except Exception as e:
        logger.error(f"User generations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user generations"
        )

@app.get("/favicon.ico")
async def favicon():
    """Serve favicon"""
    return FileResponse("favicon.ico")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 