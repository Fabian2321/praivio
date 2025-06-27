"""
Authentication Module für Praivio
JWT-basierte Authentifizierung und Session-Management
"""

import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from security import SecurityManager
from database import DatabaseManager

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

class AuthManager:
    """Zentrale Authentifizierungsverwaltung"""
    
    def __init__(self, security_manager: SecurityManager, db_manager: DatabaseManager):
        self.security = security_manager
        self.db = db_manager
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authentifiziert einen Benutzer"""
        try:
            user = self.db.get_user_by_username(username)
            if not user:
                return None
            
            if not self.security.verify_password(password, user['password_hash'], user['password_salt']):
                return None
            
            # Aktualisiere letzten Login
            self.db.update_user_last_login(user['id'])
            
            return user
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    def create_access_token(self, user_data: Dict[str, Any], expires_in: int = 3600) -> str:
        """Erstellt einen JWT-Access-Token"""
        return self.security.create_jwt_token(user_data, expires_in)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifiziert einen JWT-Token"""
        return self.security.verify_jwt_token(token)
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Dependency für geschützte Endpunkte"""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            payload = self.verify_token(credentials.credentials)
            if not payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            user = self.db.get_user_by_id(payload.get('user_id'))
            if not user or not user['is_active']:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
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