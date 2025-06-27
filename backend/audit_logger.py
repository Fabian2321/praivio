"""
Audit Logger Module für Praivio
Saubere Implementierung für Compliance und Security
"""

import logging
from datetime import datetime
from typing import Optional
from database import DatabaseManager

logger = logging.getLogger(__name__)

class AuditLogger:
    """Saubere Audit-Logging-Implementierung"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def log_user_action(self, user_id: Optional[str], action: str, details: str, 
                       ip_address: str, success: bool = True, error_message: Optional[str] = None):
        """Loggt Benutzeraktionen für Compliance"""
        try:
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO audit_logs (user_id, action, details, ip_address, success, error_message, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, action, details, ip_address, success, error_message, datetime.now()))
                conn.commit()
        except Exception as e:
            logger.error(f"Audit logging failed: {e}")
            # Don't raise the exception - audit logging should not break the main functionality
    
    def log_data_access(self, user_id: str, data_type: str, record_id: int, ip_address: str):
        """Loggt Datenzugriffe für DSGVO-Compliance"""
        self.log_user_action(
            user_id=user_id,
            action="DATA_ACCESS",
            details=f"Accessed {data_type} record {record_id}",
            ip_address=ip_address
        )
    
    def log_data_export(self, user_id: str, data_type: str, record_count: int, ip_address: str):
        """Loggt Datenexporte"""
        self.log_user_action(
            user_id=user_id,
            action="DATA_EXPORT",
            details=f"Exported {record_count} {data_type} records",
            ip_address=ip_address
        )
    
    def log_text_generation(self, user_id: str, model: str, tokens: int, ip_address: str, success: bool = True):
        """Loggt Text-Generierungen"""
        self.log_user_action(
            user_id=user_id,
            action="TEXT_GENERATION",
            details=f"Generated text using model {model}, {tokens} tokens",
            ip_address=ip_address,
            success=success
        )
    
    def log_login(self, user_id: str, email: str, ip_address: str, success: bool = True):
        """Loggt Login-Versuche"""
        self.log_user_action(
            user_id=user_id,
            action="LOGIN",
            details=f"Login attempt for user: {email}",
            ip_address=ip_address,
            success=success
        )
    
    def log_logout(self, user_id: str, email: str, ip_address: str):
        """Loggt Logout"""
        self.log_user_action(
            user_id=user_id,
            action="LOGOUT",
            details=f"User logout: {email}",
            ip_address=ip_address,
            success=True
        ) 