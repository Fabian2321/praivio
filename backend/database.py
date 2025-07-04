"""
Database Module für Praivio
Erweiterte Datenbankfunktionen für Benutzerverwaltung und Audit-Logging
"""

import sqlite3
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Zentrale Datenbankverwaltung für Praivio"""
    
    def __init__(self, db_path: str = "./data/app.db"):
        self.db_path = db_path
        self._ensure_data_directory()
        self._init_database()
    
    def _ensure_data_directory(self):
        """Stellt sicher, dass das Datenverzeichnis existiert"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
    
    def _init_database(self):
        """Initialisiert die Datenbank mit allen Tabellen"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Erweiterte Benutzer-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    role_id INTEGER NOT NULL,
                    organization_id INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (role_id) REFERENCES roles (id),
                    FOREIGN KEY (organization_id) REFERENCES organizations (id)
                )
            """)
            
            # Rollen-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    permissions TEXT,  -- JSON string of permissions
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Organisationen-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,  -- 'hospital', 'law_firm', 'government', etc.
                    address TEXT,
                    contact_person TEXT,
                    contact_email TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Erweiterte Text-Generierungen-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS text_generations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    prompt TEXT NOT NULL,
                    generated_text TEXT NOT NULL,
                    model_used TEXT NOT NULL,
                    tokens_used INTEGER,
                    processing_time REAL,
                    template_used TEXT,
                    context TEXT,
                    is_encrypted BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Erweiterte Audit-Logs-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    success BOOLEAN DEFAULT 1,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Sessions-Tabelle für JWT-Token-Management
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Rate Limiting-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS rate_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    endpoint TEXT NOT NULL,
                    request_count INTEGER DEFAULT 1,
                    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Chat-Sessions-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,  -- Changed from INTEGER to TEXT for Supabase user IDs
                    title TEXT NOT NULL,
                    model TEXT NOT NULL,
                    system_prompt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Chat-Messages-Tabelle
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    chat_session_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    generation_id TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
                )
            """)
            
            # Erstelle Standard-Rollen
            self._create_default_roles(cursor)
            
            # Erstelle Standard-Organisation
            self._create_default_organization(cursor)
            
            conn.commit()
    
    def _create_default_roles(self, cursor):
        """Erstellt Standard-Rollen"""
        roles = [
            ('admin', 'Systemadministrator', '["all"]'),
            ('manager', 'Manager/Leitung', '["read", "write", "export", "manage_users"]'),
            ('user', 'Standardbenutzer', '["read", "write"]'),
            ('viewer', 'Nur Lesen', '["read"]')
        ]
        
        for role_name, description, permissions in roles:
            cursor.execute("""
                INSERT OR IGNORE INTO roles (name, description, permissions)
                VALUES (?, ?, ?)
            """, (role_name, description, permissions))
    
    def _create_default_organization(self, cursor):
        """Erstellt Standard-Organisation"""
        cursor.execute("""
            INSERT OR IGNORE INTO organizations (name, type, contact_person, contact_email)
            VALUES (?, ?, ?, ?)
        """, ('Demo Organisation', 'hospital', 'Admin', 'admin@demo.org'))
    
    @contextmanager
    def get_connection(self):
        """Context Manager für Datenbankverbindungen"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Ermöglicht Zugriff über Spaltennamen
        try:
            yield conn
        finally:
            conn.close()
    
    def create_user(self, username: str, email: str, password_hash: str, 
                   password_salt: str, role_id: int, organization_id: int) -> int:
        """Erstellt einen neuen Benutzer"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, password_salt, role_id, organization_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, email, password_hash, password_salt, role_id, organization_id))
            conn.commit()
            return cursor.lastrowid
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Holt einen Benutzer anhand des Benutzernamens"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.*, r.name as role_name, r.permissions, o.name as organization_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                JOIN organizations o ON u.organization_id = o.id
                WHERE u.username = ? AND u.is_active = 1
            """, (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Holt einen Benutzer anhand der ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.*, r.name as role_name, r.permissions, o.name as organization_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                JOIN organizations o ON u.organization_id = o.id
                WHERE u.id = ? AND u.is_active = 1
            """, (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_user_last_login(self, user_id: int):
        """Aktualisiert den letzten Login-Zeitpunkt"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users SET last_login = ? WHERE id = ?
            """, (datetime.now(), user_id))
            conn.commit()
    
    def create_session(self, user_id: int, session_token: str, expires_at: datetime, 
                      ip_address: str, user_agent: str) -> int:
        """Erstellt eine neue Benutzersession"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, session_token, expires_at, ip_address, user_agent))
            conn.commit()
            return cursor.lastrowid
    
    def get_valid_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Holt eine gültige Session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM user_sessions 
                WHERE session_token = ? AND expires_at > ? AND is_active = 1
            """, (session_token, datetime.now()))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def invalidate_session(self, session_token: str):
        """Macht eine Session ungültig"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE user_sessions SET is_active = 0 WHERE session_token = ?
            """, (session_token,))
            conn.commit()
    
    def log_audit_event(self, user_id: Optional[int], action: str, details: str, 
                       ip_address: str, user_agent: str, success: bool = True, 
                       error_message: Optional[str] = None):
        """Loggt ein Audit-Event"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, action, details, ip_address, user_agent, success, error_message))
            conn.commit()
    
    def get_audit_logs(self, user_id: Optional[int] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Holt Audit-Logs"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if user_id:
                cursor.execute("""
                    SELECT al.*, u.username FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.user_id = ?
                    ORDER BY al.created_at DESC
                    LIMIT ?
                """, (user_id, limit))
            else:
                cursor.execute("""
                    SELECT al.*, u.username FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    ORDER BY al.created_at DESC
                    LIMIT ?
                """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def save_text_generation(self, user_id: int, prompt: str, generated_text: str, 
                           model_used: str, tokens_used: int, processing_time: float,
                           template_used: Optional[str] = None, context: Optional[str] = None,
                           is_encrypted: bool = False) -> int:
        """Speichert eine Text-Generierung"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO text_generations 
                (user_id, prompt, generated_text, model_used, tokens_used, processing_time, 
                 template_used, context, is_encrypted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, prompt, generated_text, model_used, tokens_used, processing_time,
                  template_used, context, is_encrypted))
            conn.commit()
            return cursor.lastrowid
    
    def get_user_generations(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Holt Text-Generierungen eines Benutzers"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM text_generations
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user_id, limit))
            return [dict(row) for row in cursor.fetchall()]
    
    def cleanup_expired_sessions(self):
        """Bereinigt abgelaufene Sessions"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE user_sessions SET is_active = 0 
                WHERE expires_at < ?
            """, (datetime.now(),))
            conn.commit()
    
    def get_statistics(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Holt erweiterte Statistiken"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats = {}
            
            # Gesamte Generierungen
            if user_id:
                cursor.execute("SELECT COUNT(*) FROM text_generations WHERE user_id = ?", (user_id,))
            else:
                cursor.execute("SELECT COUNT(*) FROM text_generations")
            stats['total_generations'] = cursor.fetchone()[0]
            
            # Token-Verbrauch
            if user_id:
                cursor.execute("SELECT SUM(tokens_used) FROM text_generations WHERE user_id = ?", (user_id,))
            else:
                cursor.execute("SELECT SUM(tokens_used) FROM text_generations")
            stats['total_tokens_used'] = cursor.fetchone()[0] or 0
            
            # Durchschnittliche Verarbeitungszeit
            if user_id:
                cursor.execute("SELECT AVG(processing_time) FROM text_generations WHERE user_id = ?", (user_id,))
            else:
                cursor.execute("SELECT AVG(processing_time) FROM text_generations")
            avg_time = cursor.fetchone()[0]
            stats['average_processing_time'] = round(avg_time, 2) if avg_time else 0.0
            
            # Erfolgsrate (basierend auf erfolgreichen Generierungen vs. fehlgeschlagene Audit-Logs)
            if user_id:
                # Erfolgreiche Generierungen
                cursor.execute("SELECT COUNT(*) FROM text_generations WHERE user_id = ?", (user_id,))
                successful_generations = cursor.fetchone()[0]
                
                # Fehlgeschlagene Generierungen (aus Audit-Logs)
                cursor.execute("""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE user_id = ? AND action = 'text_generation' AND success = 0
                    AND DATE(created_at) >= DATE('now', '-30 days')
                """, (user_id,))
                failed_generations = cursor.fetchone()[0]
                
                total_attempts = successful_generations + failed_generations
                if total_attempts > 0:
                    stats['success_rate'] = round((successful_generations / total_attempts) * 100, 1)
                else:
                    stats['success_rate'] = 100.0
            else:
                # System-weite Erfolgsrate
                cursor.execute("SELECT COUNT(*) FROM text_generations")
                successful_generations = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE action = 'text_generation' AND success = 0
                    AND DATE(created_at) >= DATE('now', '-30 days')
                """)
                failed_generations = cursor.fetchone()[0]
                
                total_attempts = successful_generations + failed_generations
                if total_attempts > 0:
                    stats['success_rate'] = round((successful_generations / total_attempts) * 100, 1)
                else:
                    stats['success_rate'] = 100.0
            
            # Nutzungstrend (Generierungen der letzten 7 Tage)
            if user_id:
                cursor.execute("""
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM text_generations 
                    WHERE user_id = ? AND DATE(created_at) >= DATE('now', '-7 days')
                    GROUP BY DATE(created_at)
                    ORDER BY date
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM text_generations 
                    WHERE DATE(created_at) >= DATE('now', '-7 days')
                    GROUP BY DATE(created_at)
                    ORDER BY date
                """)
            
            usage_trend = cursor.fetchall()
            stats['usage_trend'] = [
                {'date': row[0], 'count': row[1]} for row in usage_trend
            ]
            
            # Detaillierte Modell-Nutzung
            if user_id:
                cursor.execute("""
                    SELECT model_used, COUNT(*) as count, 
                           SUM(tokens_used) as total_tokens,
                           AVG(processing_time) as avg_time
                    FROM text_generations 
                    WHERE user_id = ?
                    GROUP BY model_used 
                    ORDER BY count DESC
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT model_used, COUNT(*) as count, 
                           SUM(tokens_used) as total_tokens,
                           AVG(processing_time) as avg_time
                    FROM text_generations 
                    GROUP BY model_used 
                    ORDER BY count DESC
                """)
            
            model_usage = cursor.fetchall()
            stats['model_usage'] = [
                {
                    'model': row[0],
                    'count': row[1],
                    'total_tokens': row[2] or 0,
                    'avg_time': round(row[3], 2) if row[3] else 0.0
                } for row in model_usage
            ]
            
            # Template-Nutzung
            if user_id:
                cursor.execute("""
                    SELECT template_used, COUNT(*) as count
                    FROM text_generations 
                    WHERE user_id = ? AND template_used IS NOT NULL
                    GROUP BY template_used 
                    ORDER BY count DESC
                    LIMIT 5
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT template_used, COUNT(*) as count
                    FROM text_generations 
                    WHERE template_used IS NOT NULL
                    GROUP BY template_used 
                    ORDER BY count DESC
                    LIMIT 5
                """)
            
            template_usage = cursor.fetchall()
            stats['template_usage'] = [
                {'template': row[0], 'count': row[1]} for row in template_usage
            ]
            
            # Aktive Benutzer
            cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
            stats['active_users'] = cursor.fetchone()[0]
            
            # Audit-Events heute
            cursor.execute("""
                SELECT COUNT(*) FROM audit_logs 
                WHERE DATE(created_at) = DATE('now')
            """)
            stats['audit_events_today'] = cursor.fetchone()[0]
            
            # Generierungen heute
            if user_id:
                cursor.execute("""
                    SELECT COUNT(*) FROM text_generations 
                    WHERE user_id = ? AND DATE(created_at) = DATE('now')
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT COUNT(*) FROM text_generations 
                    WHERE DATE(created_at) = DATE('now')
                """)
            stats['generations_today'] = cursor.fetchone()[0]
            
            return stats 
    
    # Chat-Funktionalität Methoden
    def create_chat_session(self, session_id: str, user_id: str, title: str, model: str, system_prompt: str = None) -> str:
        """Erstellt eine neue Chat-Session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (id, user_id, title, model, system_prompt)
                VALUES (?, ?, ?, ?, ?)
            """, (session_id, user_id, title, model, system_prompt))
            conn.commit()
            return session_id
    
    def get_chat_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Holt alle Chat-Sessions eines Benutzers"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT cs.*, 
                       COUNT(cm.id) as message_count
                FROM chat_sessions cs
                LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
                WHERE cs.user_id = ?
                GROUP BY cs.id
                ORDER BY cs.updated_at DESC
                LIMIT ?
            """, (user_id, limit))
            
            sessions = []
            for row in cursor.fetchall():
                sessions.append(dict(row))
            return sessions
    
    def get_chat_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Holt eine spezifische Chat-Session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM chat_sessions 
                WHERE id = ? AND user_id = ?
            """, (session_id, user_id))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_chat_session_title(self, session_id: str, user_id: str, title: str):
        """Aktualisiert den Titel einer Chat-Session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE chat_sessions 
                SET title = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (title, session_id, user_id))
            conn.commit()
    
    def delete_chat_session(self, session_id: str, user_id: str) -> bool:
        """Löscht eine Chat-Session und alle zugehörigen Nachrichten"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM chat_sessions 
                WHERE id = ? AND user_id = ?
            """, (session_id, user_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def add_chat_message(self, message_id: str, chat_session_id: str, role: str, 
                        content: str, generation_id: Optional[str] = None) -> str:
        """Fügt eine neue Nachricht zu einer Chat-Session hinzu"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_messages (id, chat_session_id, role, content, generation_id)
                VALUES (?, ?, ?, ?, ?)
            """, (message_id, chat_session_id, role, content, generation_id))
            
            # Aktualisiere updated_at der Chat-Session
            cursor.execute("""
                UPDATE chat_sessions 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (chat_session_id,))
            
            conn.commit()
            return message_id
    
    def get_chat_messages(self, chat_session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Holt alle Nachrichten einer Chat-Session"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM chat_messages 
                WHERE chat_session_id = ?
                ORDER BY timestamp ASC
                LIMIT ?
            """, (chat_session_id, limit))
            
            messages = []
            for row in cursor.fetchall():
                messages.append(dict(row))
            return messages
    
    def get_chat_session_with_messages(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Holt eine Chat-Session mit allen Nachrichten"""
        session = self.get_chat_session(session_id, user_id)
        if not session:
            return None
        
        messages = self.get_chat_messages(session_id)
        session['messages'] = messages
        return session 