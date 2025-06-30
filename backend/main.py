from fastapi import FastAPI, HTTPException, Depends, status, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
import httpx
import os
import logging
import json
from datetime import datetime
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any
import asyncio

# Import our modules
from security import SecurityManager, RateLimiter
from supabase_auth import supabase_auth  # Use Supabase auth instead
from audit_logger import AuditLogger
from models import *
from database import DatabaseManager
from file_upload import file_upload_handler

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
audit_logger = AuditLogger(db_manager)
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
            payload = supabase_auth.verify_supabase_token(token)
            if payload:
                user_id = payload.get('sub')  # Supabase user ID
        except:
            pass
    
    response = await call_next(request)
    
    # Log response with proper audit logging
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
async def check_rate_limit(request: Request, user: Dict[str, Any] = Depends(supabase_auth.get_current_user)):
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

@app.post("/auth/logout")
async def logout(request: Request, current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)):
    """Benutzer-Logout"""
    try:
        audit_logger.log_logout(
            user_id=current_user['id'],
            email=current_user['email'],
            ip_address=request.client.host if request.client else "unknown"
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
    """Generate text using LLM"""
    start_time = datetime.now()
    logger.info(f"Starting text generation for user {current_user['id']} with model {request.model}")
    
    try:
        # Sanitize inputs
        logger.info("Sanitizing inputs...")
        sanitized_prompt = security_manager.sanitize_input(request.prompt)
        sanitized_context = security_manager.sanitize_input(request.context) if request.context else ""
        logger.info(f"Input sanitization complete. Prompt length: {len(sanitized_prompt)}")
        
        # Build prompt with template if provided
        prompt = sanitized_prompt
        if request.template and sanitized_context:
            # Get template instruction
            template_instruction = ""
            if request.template == "arztbericht":
                template_instruction = "Erstelle einen strukturierten Arztbericht basierend auf den folgenden Informationen:"
            elif request.template == "befund":
                template_instruction = "Formuliere einen medizinischen Befund für:"
            elif request.template == "anamnese":
                template_instruction = "Erstelle eine strukturierte Anamnese für:"
            elif request.template == "entlassungsbrief":
                template_instruction = "Verfasse einen Entlassungsbrief für:"
            elif request.template == "vertragsanalyse":
                template_instruction = "Analysiere den folgenden Vertrag und erstelle eine Zusammenfassung der wichtigsten Punkte:"
            elif request.template == "rechtsgutachten":
                template_instruction = "Erstelle ein Rechtsgutachten zu folgendem Sachverhalt:"
            elif request.template == "klageschrift":
                template_instruction = "Verfasse eine Klageschrift für:"
            elif request.template == "vertragsentwurf":
                template_instruction = "Erstelle einen Vertragsentwurf für:"
            elif request.template == "bericht":
                template_instruction = "Erstelle einen behördlichen Bericht zu:"
            elif request.template == "protokoll":
                template_instruction = "Verfasse ein Protokoll zu:"
            elif request.template == "entscheidung":
                template_instruction = "Formuliere eine behördliche Entscheidung zu:"
            elif request.template == "dokumentation":
                template_instruction = "Erstelle eine Dokumentation zu:"
            
            # Build final prompt with template
            if template_instruction:
                prompt = f"{template_instruction}\n\nContext: {sanitized_context}\n\nRequest: {prompt}"
            else:
                prompt = f"Context: {sanitized_context}\n\nRequest: {prompt}"
            
            logger.info(f"Template applied: {request.template}")
        
        # Call Ollama API
        logger.info(f"Preparing Ollama request for model: {request.model}")
        try:
            async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=300.0) as client:
                ollama_request = {
                    "model": request.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": request.temperature,
                        "num_predict": request.max_tokens,
                        "top_p": request.top_p,
                        "repeat_penalty": 1.0 + request.frequency_penalty if request.frequency_penalty > 0 else 1.0,
                        "presence_penalty": request.presence_penalty
                    }
                }
                
                logger.info(f"Sending request to Ollama at {OLLAMA_BASE_URL}/api/generate")
                response = await client.post("/api/generate", json=ollama_request)
                logger.info(f"Ollama response status: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"Ollama error response: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="LLM service error"
                    )
                
                logger.info("Parsing Ollama response...")
                result = response.json()
                generated_text = result.get("response", "")
                tokens_used = result.get("eval_count", 0)
                logger.info(f"Generated text length: {len(generated_text)}, tokens used: {tokens_used}")
                
        except httpx.TimeoutException as timeout_exc:
            logger.error(f"Ollama request timed out: {timeout_exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LLM service timeout"
            )
        except httpx.RequestError as req_exc:
            logger.error(f"Ollama request error: {req_exc}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LLM service connection error"
            )
        except Exception as ollama_exc:
            import traceback
            logger.error(f"Ollama call failed: {ollama_exc}")
            logger.error(f"Ollama traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ollama call failed"
            )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Text generation completed in {processing_time:.2f} seconds")
        
        # Save to database
        logger.info("Saving generation to database...")
        try:
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
            logger.info(f"Generation saved with ID: {generation_id}")
        except Exception as db_exc:
            logger.error(f"Database save error: {db_exc}")
            # Don't fail the request if database save fails
            generation_id = None
        
        # Log successful text generation
        logger.info("Logging successful generation to audit log...")
        try:
            audit_logger.log_text_generation(
                user_id=current_user['id'],
                model=request.model,
                tokens=tokens_used,
                ip_address=api_request.client.host if api_request.client else "unknown",
                success=True
            )
            logger.info("Audit logging completed")
        except Exception as audit_exc:
            logger.error(f"Audit logging error: {audit_exc}")
            # Don't fail the request if audit logging fails
        
        logger.info("Returning successful response")
        return TextGenerationResponse(
            id=generation_id,
            generated_text=generated_text,
            model_name=request.model,
            tokens_used=tokens_used,
            processing_time=processing_time,
            template_used=request.template,
            created_at=datetime.now()
        )
        
    except HTTPException:
        logger.info("Re-raising HTTPException")
        raise
    except Exception as e:
        import traceback
        logger.error(f"Text generation error: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Log failed text generation
        try:
            audit_logger.log_text_generation(
                user_id=current_user['id'],
                model=request.model,
                tokens=0,
                ip_address=api_request.client.host if api_request.client else "unknown",
                success=False
            )
        except Exception as audit_exc:
            logger.error(f"Failed audit logging error: {audit_exc}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Text generation failed"
        )

async def stream_ollama_response(model, prompt, options=None):
    print('TEST PRINT')
    if options is None:
        options = {}
    print(f"[Ollama/PRINT] Model: {model}")
    print(f"[Ollama/PRINT] Prompt length: {len(prompt)}")
    print(f"[Ollama/PRINT] Prompt: {prompt}")
    print(f"[Ollama/PRINT] Options: {options}")
    ollama_request = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": options
    }
    print(f"[Ollama/PRINT] Request JSON: {ollama_request}")
    logger.info(f"[Ollama] Model: {model}")
    logger.info(f"[Ollama] Prompt length: {len(prompt)}")
    logger.info(f"[Ollama] Prompt: {prompt}")
    logger.info(f"[Ollama] Options: {options}")
    logger.info(f"[Ollama] Request JSON: {ollama_request}")
    
    start_time = datetime.now()
    tokens_used = 0
    full_response = ""
    done_sent = False
    
    try:
        async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=300.0) as client:
            async with client.stream("POST", "/api/generate", json=ollama_request) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    print(f"[Ollama/PRINT] Error: {error_text}")
                    logger.error(f"[Ollama] Error: {error_text}")
                    yield f"data: {json.dumps({'error': 'LLM service error'})}\n\n"
                    return
                
                async for line in response.aiter_lines():
                    if line.strip():
                        # Parse the JSON data from Ollama
                        try:
                            data = json.loads(line)
                            
                            # Check if this is a done message
                            if data.get('done', False):
                                done_sent = True
                                # Extract token count from the done message
                                if 'eval_count' in data:
                                    tokens_used = data['eval_count']
                            
                            # Extract response text
                            if 'response' in data:
                                full_response += data['response']
                            
                            # Extract token count (update if available)
                            if 'eval_count' in data:
                                tokens_used = data['eval_count']
                            
                            # Forward the original data
                            yield f"data: {line}\n\n"
                            
                        except json.JSONDecodeError:
                            # If it's not valid JSON, just forward it as is
                            yield f"data: {line}\n\n"
                
                # Calculate processing time
                processing_time = (datetime.now() - start_time).total_seconds()
                
                # Send final data with tokens and processing time only if done wasn't already sent
                if not done_sent:
                    final_data = {
                        "done": True,
                        "tokens_used": tokens_used,
                        "processing_time": processing_time,
                        "generation_id": None  # No database save for unauthenticated requests
                    }
                    
                    yield f"data: {json.dumps(final_data)}\n\n"
                else:
                    # If done was already sent, send additional data with our calculated values
                    additional_data = {
                        "tokens_used": tokens_used,
                        "processing_time": processing_time,
                        "generation_id": None
                    }
                    
                    yield f"data: {json.dumps(additional_data)}\n\n"
                
    except Exception as e:
        print(f"[Ollama/PRINT] Exception: {e}")
        print(f"[Ollama/PRINT] Request JSON (on exception): {ollama_request}")
        logger.error(f"[Ollama] Exception: {e}")
        logger.error(f"[Ollama] Request JSON (on exception): {ollama_request}")
        yield f"data: {json.dumps({'error': 'Exception in backend'})}\n\n"
        return

@app.post("/generate/stream")
async def generate_text_stream(request: TextGenerationRequest, api_request: Request):
    """Einheitlicher Streaming-Endpoint für Einzelanfrage"""
    # KEIN current_user, KEIN supabase_auth, KEIN check_rate_limit!
    sanitized_prompt = security_manager.sanitize_input(request.prompt)
    sanitized_context = security_manager.sanitize_input(request.context) if request.context else ""
    prompt = sanitized_prompt
    if request.template and sanitized_context:
        template_instruction = ""
        if request.template == "arztbericht":
            template_instruction = "Erstelle einen strukturierten Arztbericht basierend auf den folgenden Informationen:"
        if template_instruction:
            prompt = f"{template_instruction}\n\nContext: {sanitized_context}\n\nRequest: {prompt}"
        else:
            prompt = f"Context: {sanitized_context}\n\nRequest: {prompt}"
    options = {
        "temperature": request.temperature,
        "num_predict": request.max_tokens,
        "top_p": request.top_p,
        "repeat_penalty": 1.0 + request.frequency_penalty if request.frequency_penalty > 0 else 1.0,
        "presence_penalty": request.presence_penalty
    }
    return StreamingResponse(
        stream_ollama_response(request.model, prompt, options),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

@app.post("/generate/stream/public")
async def generate_text_stream_public(request: TextGenerationRequest):
    """Öffentlicher Streaming-Endpoint für Einzelanfrage ohne Authentifizierung"""
    # Prompt bauen (ggf. mit Template)
    sanitized_prompt = security_manager.sanitize_input(request.prompt)
    sanitized_context = security_manager.sanitize_input(request.context) if request.context else ""
    prompt = sanitized_prompt
    if request.template and sanitized_context:
        template_instruction = ""
        # ... Template-Logik wie bisher ...
        if request.template == "arztbericht":
            template_instruction = "Erstelle einen strukturierten Arztbericht basierend auf den folgenden Informationen:"
        # ... weitere Templates ...
        if template_instruction:
            prompt = f"{template_instruction}\n\nContext: {sanitized_context}\n\nRequest: {prompt}"
        else:
            prompt = f"Context: {sanitized_context}\n\nRequest: {prompt}"
    options = {
        "temperature": request.temperature,
        "num_predict": request.max_tokens,
        "top_p": request.top_p,
        "repeat_penalty": 1.0 + request.frequency_penalty if request.frequency_penalty > 0 else 1.0,
        "presence_penalty": request.presence_penalty
    }
    return StreamingResponse(
        stream_ollama_response(request.model, prompt, options),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
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
async def get_statistics(current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)):
    """Get system statistics"""
    try:
        stats = db_manager.get_statistics(current_user['id'])
        
        return StatisticsResponse(
            total_generations=stats['total_generations'],
            total_tokens_used=stats['total_tokens_used'],
            active_users=stats['active_users'],
            audit_events_today=stats['audit_events_today'],
            average_processing_time=stats['average_processing_time'],
            success_rate=stats['success_rate'],
            generations_today=stats['generations_today'],
            usage_trend=stats['usage_trend'],
            model_usage=stats['model_usage'],
            template_usage=stats['template_usage']
        )
        
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )

@app.get("/stats-test")
async def get_statistics_test():
    """Get system statistics (test endpoint without auth)"""
    try:
        stats = db_manager.get_statistics()
        
        return StatisticsResponse(
            total_generations=stats['total_generations'],
            total_tokens_used=stats['total_tokens_used'],
            active_users=stats['active_users'],
            audit_events_today=stats['audit_events_today'],
            average_processing_time=stats['average_processing_time'],
            success_rate=stats['success_rate'],
            generations_today=stats['generations_today'],
            usage_trend=stats['usage_trend'],
            model_usage=stats['model_usage'],
            template_usage=stats['template_usage']
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
    current_user: Dict[str, Any] = Depends(supabase_auth.require_permission("admin"))
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
    current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)
):
    """Holt Generierungen des aktuellen Benutzers"""
    try:
        # Get user ID from Supabase user
        user_id = current_user.get('id')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )
        
        generations = db_manager.get_user_generations(user_id, limit)
        
        # Convert to response model
        response_generations = []
        for gen in generations:
            response_generations.append(TextGenerationResponse(
                id=gen['id'],
                generated_text=gen['generated_text'],
                model_name=gen['model_used'],
                tokens_used=gen['tokens_used'] or 0,
                processing_time=gen['processing_time'] or 0.0,
                template_used=gen['template_used'],
                created_at=datetime.fromisoformat(gen['created_at'])
            ))
        
        return response_generations
    except Exception as e:
        logger.error(f"Error fetching user generations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# Chat-Funktionalität Endpoints
@app.post("/chat/sessions", response_model=ChatSessionResponse)
async def create_chat_session(request: ChatSessionCreate):
    try:
        user_id = "testuser"  # Dummy-User für Test
        # Generate unique session ID
        import uuid
        session_id = f"chat_{uuid.uuid4().hex[:16]}"
        # Create chat session with system prompt
        db_manager.create_chat_session(session_id, user_id, request.title, request.model, request.system_prompt)
        
        # Update attached files with session_id if any
        if request.attached_files:
            try:
                for file_id in request.attached_files:
                    # Update file in Supabase to link it to this session
                    result = file_upload_handler.supabase.table('uploaded_files').update({
                        'session_id': session_id
                    }).eq('id', file_id).eq('user_id', user_id).execute()
                    
                    if result.error:
                        logger.warning(f"Failed to update file {file_id} with session_id: {result.error}")
            except Exception as e:
                logger.error(f"Error updating attached files: {e}")
        
        # Add initial message if provided
        if request.initial_message:
            message_id = f"msg_{uuid.uuid4().hex[:16]}"
            db_manager.add_chat_message(message_id, session_id, "user", request.initial_message)
        
        # Get created session
        session = db_manager.get_chat_session(session_id, user_id)
        return ChatSessionResponse(
            id=session['id'],
            title=session['title'],
            model=session['model'],
            system_prompt=session.get('system_prompt'),
            message_count=0,
            created_at=datetime.fromisoformat(session['created_at']),
            updated_at=datetime.fromisoformat(session['updated_at'])
        )
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(limit: int = 50):
    try:
        user_id = "testuser"
        sessions = db_manager.get_chat_sessions(user_id, limit)
        response_sessions = []
        for session in sessions:
            response_sessions.append(ChatSessionResponse(
                id=session['id'],
                title=session['title'],
                model=session['model'],
                system_prompt=session.get('system_prompt'),
                message_count=session['message_count'] or 0,
                created_at=datetime.fromisoformat(session['created_at']),
                updated_at=datetime.fromisoformat(session['updated_at'])
            ))
        return response_sessions
    except Exception as e:
        logger.error(f"Error fetching chat sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.get("/chat/sessions/{session_id}", response_model=ChatSessionWithMessages)
async def get_chat_session(session_id: str):
    try:
        user_id = "testuser"
        session = db_manager.get_chat_session_with_messages(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        messages = []
        for msg in session['messages']:
            messages.append(ChatMessage(
                id=msg['id'],
                role=msg['role'],
                content=msg['content'],
                generation_id=msg['generation_id'],
                timestamp=datetime.fromisoformat(msg['timestamp'])
            ))
        return ChatSessionWithMessages(
            id=session['id'],
            title=session['title'],
            model=session['model'],
            system_prompt=session.get('system_prompt'),
            messages=messages,
            created_at=datetime.fromisoformat(session['created_at']),
            updated_at=datetime.fromisoformat(session['updated_at'])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.put("/chat/sessions/{session_id}")
async def update_chat_session(session_id: str, request: ChatSessionUpdate):
    try:
        user_id = "testuser"
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE chat_sessions 
                SET title = ?, system_prompt = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (request.title, request.system_prompt, session_id, user_id))
            conn.commit()
        return {"message": "Chat session updated successfully"}
    except Exception as e:
        logger.error(f"Error updating chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    try:
        user_id = "testuser"
        success = db_manager.delete_chat_session(session_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat session not found"
            )
        return {"message": "Chat session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/chat/sessions/{session_id}/messages")
async def send_chat_message(session_id: str, request: ChatMessageRequest):
    print('CHAT ENDPOINT REACHED (OLLAMA STREAM)')
    user_id = "testuser"  # Dummy-User für Test
    session = db_manager.get_chat_session(session_id, user_id)
    print(f'session: {session}')
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    
    # Add user message
    import uuid
    user_message_id = f"msg_{uuid.uuid4().hex[:16]}"
    db_manager.add_chat_message(user_message_id, session_id, "user", request.content)
    
    # Kontext bauen (Systemprompt + Verlauf)
    messages = db_manager.get_chat_messages(session_id)
    print(f'All messages: {messages}')
    
    # Build conversation context
    conversation_parts = []
    
    # Add system prompt if exists
    if session.get('system_prompt'):
        conversation_parts.append(f"System: {session['system_prompt']}")
    
    # Add attached files context if any
    if request.attached_files:
        try:
            files_context = []
            for file_id in request.attached_files:
                file_info = await file_upload_handler.get_file(file_id, user_id)
                if file_info and file_info.get('processed_content'):
                    file_type_emoji = {
                        'pdf': '📄',
                        'image': '🖼️',
                        'audio': '🎤'
                    }.get(file_info['file_type'], '📎')
                    
                    files_context.append(f"{file_type_emoji} {file_info['filename']}:\n{file_info['processed_content']}")
            
            if files_context:
                conversation_parts.append("Angehängte Dateien:\n" + "\n\n".join(files_context))
        except Exception as e:
            logger.error(f"Error processing attached files: {e}")
    
    # Add conversation history (excluding the current user message)
    for msg in messages[:-1]:  # Exclude the current user message
        role_prefix = "User: " if msg['role'] == 'user' else "Assistant: "
        conversation_parts.append(role_prefix + msg['content'])
    
    # Add current user message
    conversation_parts.append(f"User: {request.content}")
    
    # Join all parts
    full_prompt = "\n\n".join(conversation_parts)
    
    print(f'Full conversation context: {full_prompt}')
    
    # Sanitize inputs
    sanitized_prompt = security_manager.sanitize_input(full_prompt)
    
    options = {
        "temperature": 0.7,
        "top_p": 0.9,
        "num_predict": 1000
    }
    print(f'options: {options}')
    
    assistant_message_id = f"msg_{uuid.uuid4().hex[:16]}"
    
    async def stream_with_save():
        full_response = ""
        try:
            async for chunk in stream_ollama_response(session['model'], sanitized_prompt, options):
                print(f'CHUNK: {chunk}')
                if chunk.startswith('data: '):
                    try:
                        data = json.loads(chunk[6:])
                        if 'response' in data:
                            full_response += data['response']
                            yield chunk
                    except json.JSONDecodeError:
                        yield chunk
                else:
                    yield chunk
        finally:
            if full_response.strip():
                db_manager.add_chat_message(assistant_message_id, session_id, "assistant", full_response.strip())
    
    return StreamingResponse(
        stream_with_save(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

# File Upload Endpoints
@app.post("/upload/file")
async def upload_file(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)
):
    """Upload einer Datei (PDF, Bild, Audio)"""
    try:
        # Lese Dateiinhalt
        file_content = await file.read()
        
        # Upload und Verarbeitung
        result = await file_upload_handler.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type,
            user_id=current_user['id'],
            session_id=session_id
        )
        
        # Audit-Log
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="FILE_UPLOAD",
            details=f"Uploaded {file.filename} ({result['file_type']})",
            ip_address="unknown",
            success=True
        )
        
        return {
            "success": True,
            "file": result
        }
        
    except ValueError as e:
        # Validierungsfehler
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="FILE_UPLOAD_ERROR",
            details=f"Validation error: {str(e)}",
            ip_address="unknown",
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        audit_logger.log_user_action(
            user_id=current_user['id'],
            action="FILE_UPLOAD_ERROR",
            details=f"Upload failed: {str(e)}",
            ip_address="unknown",
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload failed"
        )

@app.get("/upload/files/{session_id}")
async def get_session_files(
    session_id: str,
    current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)
):
    """Holt alle Dateien einer Chat-Session"""
    try:
        files = await file_upload_handler.get_session_files(session_id, current_user['id'])
        return {
            "success": True,
            "files": files
        }
    except Exception as e:
        logger.error(f"Get session files failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get files"
        )

@app.delete("/upload/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(supabase_auth.get_current_user)
):
    """Löscht eine Datei"""
    try:
        success = await file_upload_handler.delete_file(file_id, current_user['id'])
        
        if success:
            audit_logger.log_user_action(
                user_id=current_user['id'],
                action="FILE_DELETE",
                details=f"Deleted file {file_id}",
                ip_address="unknown",
                success=True
            )
            return {"success": True, "message": "File deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete file failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )

@app.get("/favicon.ico")
async def favicon():
    """Serve favicon"""
    return FileResponse("favicon.ico")

@app.get("/test-stream")
async def test_stream():
    async def event_generator():
        for i in range(5):
            yield f"data: {{\"response\": \"Test {i}\\n\"}}\n\n"
            await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 