#!/usr/bin/env python3
"""
Admin Password Reset Script für Praivio
Setzt das Passwort des Admin-Benutzers zurück
"""

import sys
import os
import getpass
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from security import SecurityManager
from database import DatabaseManager

def reset_admin_password():
    """Setzt das Passwort des Admin-Benutzers zurück"""
    print("🔐 Praivio Admin Password Reset")
    print("=" * 40)
    print()
    
    # Initialize managers
    secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")
    security_manager = SecurityManager(secret_key)
    db_manager = DatabaseManager()
    
    try:
        # Get new password
        print("Bitte geben Sie das neue Passwort für den Admin-Benutzer ein:")
        print()
        
        password = getpass.getpass("Neues Passwort: ")
        if not password:
            print("❌ Passwort ist erforderlich")
            return False
        
        password_confirm = getpass.getpass("Passwort bestätigen: ")
        if password != password_confirm:
            print("❌ Passwörter stimmen nicht überein")
            return False
        
        if len(password) < 8:
            print("❌ Passwort muss mindestens 8 Zeichen lang sein")
            return False
        
        print()
        confirm = input("Soll das Passwort zurückgesetzt werden? (j/N): ").strip().lower()
        if confirm not in ['j', 'ja', 'y', 'yes']:
            print("❌ Abgebrochen")
            return False
        
        # Hash password
        password_hash, password_salt = security_manager.hash_password(password)
        
        # Update user password
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET password_hash = ?, password_salt = ?
                WHERE username = 'admin'
            """, (password_hash, password_salt))
            
            if cursor.rowcount == 0:
                print("❌ Admin-Benutzer nicht gefunden")
                return False
            
            conn.commit()
        
        print("✅ Admin-Passwort erfolgreich zurückgesetzt!")
        print()
        print("Zugangsdaten:")
        print(f"  Benutzername: admin")
        print(f"  Passwort: [das eingegebene Passwort]")
        print()
        print("Sie können sich jetzt unter http://localhost:3001 anmelden.")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler beim Zurücksetzen des Passworts: {e}")
        return False

if __name__ == "__main__":
    success = reset_admin_password()
    sys.exit(0 if success else 1) 