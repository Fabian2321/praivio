"""
Pydantic Models für Praivio API
Definiert Request- und Response-Modelle für alle Endpunkte
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import re

class UserCreate(BaseModel):
    """Modell für Benutzer-Erstellung"""
    username: str = Field(..., min_length=3, max_length=50, description="Benutzername")
    email: str = Field(..., description="E-Mail-Adresse")
    password: str = Field(..., min_length=8, description="Passwort")
    role_id: int = Field(..., description="Rollen-ID")
    organization_id: int = Field(..., description="Organisations-ID")
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Benutzername darf nur Buchstaben, Zahlen, - und _ enthalten')
        return v
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Ungültige E-Mail-Adresse')
        return v

class UserLogin(BaseModel):
    """Modell für Benutzer-Login"""
    username: str = Field(..., description="Benutzername")
    password: str = Field(..., description="Passwort")

class UserResponse(BaseModel):
    """Modell für Benutzer-Response"""
    id: int
    username: str
    email: Optional[str]
    role_name: str
    organization_name: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    """Modell für Token-Response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TextGenerationRequest(BaseModel):
    """Modell für Text-Generierungs-Request"""
    prompt: str = Field(..., min_length=1, max_length=10000, description="Eingabe-Text")
    model: str = Field(default="llama2", description="Zu verwendendes Modell")
    max_tokens: int = Field(default=1000, ge=1, le=4000, description="Maximale Token-Anzahl")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Kreativität (0.0-2.0)")
    top_p: float = Field(default=0.9, ge=0.0, le=1.0, description="Nucleus Sampling (0.0-1.0)")
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0, description="Frequenz-Strafe (-2.0-2.0)")
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0, description="Präsenz-Strafe (-2.0-2.0)")
    template: Optional[str] = Field(None, description="Vorlagen-ID")
    context: Optional[str] = Field(None, max_length=5000, description="Zusätzlicher Kontext")
    
    @validator('prompt')
    def sanitize_prompt(cls, v):
        # Entferne potenziell gefährliche Inhalte
        v = re.sub(r'<[^>]+>', '', v)  # HTML-Tags
        v = re.sub(r'[<>"\']', '', v)  # Gefährliche Zeichen
        return v.strip()

class TextGenerationResponse(BaseModel):
    """Modell für Text-Generierungs-Response"""
    id: int
    generated_text: str
    model_name: str
    tokens_used: int
    processing_time: float
    template_used: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModelInfo(BaseModel):
    """Modell für Modell-Informationen"""
    name: str
    size: str
    parameters: str
    status: str
    description: Optional[str] = None

class TemplateInfo(BaseModel):
    """Modell für Vorlagen-Informationen"""
    id: str
    name: str
    category: str
    description: str
    prompt: str
    preview: Optional[str] = None

class StatisticsResponse(BaseModel):
    """Modell für Statistiken-Response"""
    total_generations: int
    total_tokens_used: int
    active_users: int
    audit_events_today: int
    average_processing_time: float
    success_rate: float
    generations_today: int
    usage_trend: List[Dict[str, Any]]
    model_usage: List[Dict[str, Any]]
    template_usage: List[Dict[str, Any]]

class AuditLogResponse(BaseModel):
    """Modell für Audit-Log-Response"""
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    success: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class OrganizationCreate(BaseModel):
    """Modell für Organisations-Erstellung"""
    name: str = Field(..., min_length=2, max_length=100, description="Organisationsname")
    type: str = Field(..., description="Organisationstyp")
    address: Optional[str] = Field(None, max_length=500, description="Adresse")
    contact_person: Optional[str] = Field(None, max_length=100, description="Kontaktperson")
    contact_email: Optional[str] = Field(None, description="Kontakt-E-Mail")

class OrganizationResponse(BaseModel):
    """Modell für Organisations-Response"""
    id: int
    name: str
    type: str
    address: Optional[str]
    contact_person: Optional[str]
    contact_email: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    """Modell für Rollen-Response"""
    id: int
    name: str
    description: Optional[str]
    permissions: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class HealthCheckResponse(BaseModel):
    """Modell für Health-Check-Response"""
    status: str
    version: str
    timestamp: datetime
    services: Dict[str, str]
    database: str
    ollama: str

class ErrorResponse(BaseModel):
    """Modell für Fehler-Response"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now) 

# Chat-Funktionalität Modelle
class ChatMessage(BaseModel):
    """Modell für Chat-Nachrichten"""
    id: str
    role: str = Field(..., description="'user' oder 'assistant'")
    content: str = Field(..., min_length=1, max_length=10000, description="Nachrichteninhalt")
    generation_id: Optional[str] = Field(None, description="Link zur Generierung")
    timestamp: datetime = Field(default_factory=datetime.now)
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant']:
            raise ValueError('Role muss "user" oder "assistant" sein')
        return v

class ChatSessionCreate(BaseModel):
    """Modell für Chat-Session-Erstellung"""
    title: str = Field(..., min_length=1, max_length=100, description="Chat-Titel")
    model: str = Field(..., description="Zu verwendendes Modell")
    initial_message: Optional[str] = Field(None, description="Erste Nachricht (optional)")
    system_prompt: Optional[str] = Field(None, description="System-Prompt (optional)")

class ChatSessionUpdate(BaseModel):
    """Modell für Chat-Session-Update"""
    title: str = Field(..., min_length=1, max_length=100, description="Chat-Titel")
    system_prompt: Optional[str] = Field(None, description="System-Prompt (optional)")

class ChatSessionResponse(BaseModel):
    """Modell für Chat-Session-Response"""
    id: str
    title: str
    model: str
    system_prompt: Optional[str]
    message_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessageRequest(BaseModel):
    """Modell für Chat-Nachrichten-Request"""
    content: str = Field(..., min_length=1, max_length=10000, description="Nachrichteninhalt")
    
    @validator('content')
    def sanitize_content(cls, v):
        # Entferne potenziell gefährliche Inhalte
        v = re.sub(r'<[^>]+>', '', v)  # HTML-Tags
        v = re.sub(r'[<>"\']', '', v)  # Gefährliche Zeichen
        return v.strip()

class ChatSessionWithMessages(BaseModel):
    """Modell für Chat-Session mit Nachrichten"""
    id: str
    title: str
    model: str
    system_prompt: Optional[str]
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 