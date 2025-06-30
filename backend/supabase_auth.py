"""
Supabase Authentication Module für Praivio
Validiert Supabase JWT-Tokens im Backend
"""

import jwt
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

class SupabaseAuthManager:
    """Supabase JWT-Token Validierung für Praivio Backend"""
    
    def __init__(self):
        self.supabase_url = "https://vtvlbavlhlnfamlreiql.supabase.co"
        self.supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dmxiYXZsaGxuZmFtbHJlaXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjUyMzEsImV4cCI6MjA2NjYwMTIzMX0.Y7X_m_GMqkMgNKkZztdrqXn99WiUlqal4RGqNWCCOXI"
    
    def verify_supabase_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifiziert einen Supabase JWT-Token"""
        try:
            # Einfache Token-Validierung ohne Signatur-Prüfung
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Prüfe grundlegende Felder
            if not payload.get('sub'):  # User ID
                logger.warning("No user ID in token")
                return None
            
            if not payload.get('email'):
                logger.warning("No email in token")
                return None
            
            # Prüfe Token-Typ
            if payload.get('role') != 'authenticated':
                logger.warning("Token role is not 'authenticated'")
                return None
            
            # Prüfe Ablaufzeit
            exp = payload.get('exp')
            if exp and datetime.now().timestamp() > exp:
                logger.warning("Token has expired")
                return None
            
            logger.info(f"Token verified for user: {payload.get('email')}")
            return payload
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Dependency für geschützte Endpunkte mit Supabase-Token"""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            payload = self.verify_supabase_token(credentials.credentials)
            if not payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Erstelle User-Objekt aus Supabase-Payload
            user = {
                'id': payload.get('sub'),  # Supabase User ID
                'email': payload.get('email'),
                'role': 'user',  # Standard-Rolle
                'is_active': True,
                'username': payload.get('email'),  # Verwende E-Mail als Username
                'organization': 'Praivio',
                'permissions': '["generate", "view_statistics", "manage_templates"]'
            }
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Supabase authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def get_current_user_optional(self, request: Request) -> Optional[Dict[str, Any]]:
        """Optionale Dependency für Endpunkte, die mit oder ohne Authentifizierung funktionieren"""
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        try:
            token = auth_header.replace("Bearer ", "")
            payload = self.verify_supabase_token(token)
            if not payload:
                return None
            
            # Erstelle User-Objekt aus Supabase-Payload
            user = {
                'id': payload.get('sub'),  # Supabase User ID
                'email': payload.get('email'),
                'role': 'user',  # Standard-Rolle
                'is_active': True,
                'username': payload.get('email'),  # Verwende E-Mail als Username
                'organization': 'Praivio',
                'permissions': '["generate", "view_statistics", "manage_templates"]'
            }
            
            return user
            
        except Exception as e:
            logger.error(f"Optional authentication error: {e}")
            return None
    
    async def get_current_user_manual(self, request: Request) -> Optional[Dict[str, Any]]:
        """Manuelle Dependency für Endpunkte ohne HTTPBearer"""
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        try:
            token = auth_header.replace("Bearer ", "")
            payload = self.verify_supabase_token(token)
            if not payload:
                return None
            
            # Erstelle User-Objekt aus Supabase-Payload
            user = {
                'id': payload.get('sub'),  # Supabase User ID
                'email': payload.get('email'),
                'role': 'user',  # Standard-Rolle
                'is_active': True,
                'username': payload.get('email'),  # Verwende E-Mail als Username
                'organization': 'Praivio',
                'permissions': '["generate", "view_statistics", "manage_templates"]'
            }
            
            return user
            
        except Exception as e:
            logger.error(f"Manual authentication error: {e}")
            return None
    
    def require_permission(self, permission: str):
        """Decorator für Berechtigungsprüfung"""
        def permission_checker(user: Dict[str, Any] = Depends(self.get_current_user)):
            import json
            permissions = json.loads(user.get('permissions', '[]'))
            if permission not in permissions and 'all' not in permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            return user
        return permission_checker

# Globale Instanz
supabase_auth = SupabaseAuthManager() 