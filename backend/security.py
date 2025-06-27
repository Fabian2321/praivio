"""
Security Module für Praivio
Implementiert erweiterte Sicherheitsfunktionen für datensensible Institutionen
"""

import hashlib
import hmac
import os
import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import re
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

class SecurityManager:
    """Zentrale Sicherheitsverwaltung für Praivio"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key.encode()
        self.fernet_key = self._derive_fernet_key()
        self.cipher_suite = Fernet(self.fernet_key)
        
    def _derive_fernet_key(self) -> bytes:
        """Leitet einen Fernet-Schlüssel aus dem Secret Key ab"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'praivio_salt',  # In Produktion: zufälliger Salt
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(self.secret_key))
    
    def create_jwt_token(self, user_data: Dict[str, Any], expires_in: int = 3600) -> str:
        """Erstellt einen JWT-Token für Benutzerauthentifizierung"""
        payload = {
            'user_id': user_data.get('id'),
            'username': user_data.get('username'),
            'role': user_data.get('role'),
            'organization': user_data.get('organization'),
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow(),
            'iss': 'praivio'
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verifiziert einen JWT-Token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Verschlüsselt sensible Daten"""
        return self.cipher_suite.encrypt(data.encode()).decode()
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Entschlüsselt sensible Daten"""
        return self.cipher_suite.decrypt(encrypted_data.encode()).decode()
    
    def hash_password(self, password: str, salt: Optional[str] = None) -> tuple[str, str]:
        """Erstellt einen sicheren Password-Hash"""
        if not salt:
            salt = os.urandom(32).hex()
        
        # PBKDF2 mit 100.000 Iterationen
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt.encode(),
            iterations=100000,
        )
        hash_bytes = kdf.derive(password.encode())
        return base64.b64encode(hash_bytes).decode(), salt
    
    def verify_password(self, password: str, stored_hash: str, salt: str) -> bool:
        """Verifiziert ein Passwort gegen den gespeicherten Hash"""
        try:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt.encode(),
                iterations=100000,
            )
            hash_bytes = kdf.derive(password.encode())
            return hmac.compare_digest(
                base64.b64encode(hash_bytes).decode(),
                stored_hash
            )
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def sanitize_input(self, text: str) -> str:
        """Bereinigt Benutzereingaben von potenziell gefährlichen Inhalten"""
        # Entferne HTML-Tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Entferne SQL-Injection-Patterns
        sql_patterns = [
            r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)',
            r'(\b(UNION|WHERE|FROM|JOIN)\b)',
            r'(\b(OR|AND)\b\s+\d+\s*=\s*\d+)',
            r'(\b(OR|AND)\b\s+\'[^\']*\'\s*=\s*\'[^\']*\')',
        ]
        
        for pattern in sql_patterns:
            text = re.sub(pattern, '[REDACTED]', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def validate_file_upload(self, filename: str, content_type: str, max_size: int = 10*1024*1024) -> bool:
        """Validiert Datei-Uploads"""
        # Erlaubte Dateitypen
        allowed_extensions = {'.txt', '.pdf', '.doc', '.docx', '.rtf'}
        allowed_mime_types = {
            'text/plain', 'application/pdf', 
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/rtf'
        }
        
        # Prüfe Dateiendung
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in allowed_extensions:
            return False
        
        # Prüfe MIME-Type
        if content_type not in allowed_mime_types:
            return False
        
        return True

class AuditLogger:
    """Erweiterte Audit-Logging-Funktionalität"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        
    def log_user_action(self, user_id: int, action: str, details: str, ip_address: str, success: bool = True):
        """Loggt Benutzeraktionen für Compliance"""
        try:
            cursor = self.db.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (user_id, action, details, ip_address, success, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, action, details, ip_address, success, datetime.now()))
            self.db.commit()
        except Exception as e:
            logger.error(f"Audit logging failed: {e}")
    
    def log_data_access(self, user_id: int, data_type: str, record_id: int, ip_address: str):
        """Loggt Datenzugriffe für DSGVO-Compliance"""
        self.log_user_action(
            user_id=user_id,
            action="DATA_ACCESS",
            details=f"Accessed {data_type} record {record_id}",
            ip_address=ip_address
        )
    
    def log_data_export(self, user_id: int, data_type: str, record_count: int, ip_address: str):
        """Loggt Datenexporte"""
        self.log_user_action(
            user_id=user_id,
            action="DATA_EXPORT",
            details=f"Exported {record_count} {data_type} records",
            ip_address=ip_address
        )

class RateLimiter:
    """Rate Limiting für API-Endpunkte"""
    
    def __init__(self):
        self.requests = {}
        
    def is_allowed(self, user_id: str, endpoint: str, max_requests: int = 100, window_seconds: int = 3600) -> bool:
        """Prüft ob ein Benutzer noch Anfragen senden darf"""
        now = datetime.now()
        key = f"{user_id}:{endpoint}"
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Entferne alte Anfragen
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if (now - req_time).seconds < window_seconds
        ]
        
        # Prüfe Limit
        if len(self.requests[key]) >= max_requests:
            return False
        
        # Füge aktuelle Anfrage hinzu
        self.requests[key].append(now)
        return True 