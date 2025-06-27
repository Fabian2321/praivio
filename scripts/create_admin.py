#!/usr/bin/env python3
"""
Admin User Creation Script für Praivio
Erstellt den ersten Administrator-Benutzer für die Plattform
"""

import sys
import os
import getpass
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from security import SecurityManager
from database import DatabaseManager

def create_admin_user():
    """Erstellt einen Admin-Benutzer"""
    print("🔐 Praivio Admin User Creation")
    print("=" * 40)
    print()
    
    # Initialize managers
    secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")
    security_manager = SecurityManager(secret_key)
    db_manager = DatabaseManager()
    
    try:
        # Get user input
        print("Bitte geben Sie die Informationen für den Administrator-Benutzer ein:")
        print()
        
        username = input("Benutzername: ").strip()
        if not username:
            print("❌ Benutzername ist erforderlich")
            return False
        
        email = input("E-Mail-Adresse: ").strip()
        if not email:
            print("❌ E-Mail-Adresse ist erforderlich")
            return False
        
        password = getpass.getpass("Passwort: ")
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
        
        organization_name = input("Organisationsname: ").strip()
        if not organization_name:
            organization_name = "Demo Organisation"
        
        print()
        print("Zusammenfassung:")
        print(f"  Benutzername: {username}")
        print(f"  E-Mail: {email}")
        print(f"  Organisation: {organization_name}")
        print()
        
        confirm = input("Soll der Benutzer erstellt werden? (j/N): ").strip().lower()
        if confirm not in ['j', 'ja', 'y', 'yes']:
            print("❌ Abgebrochen")
            return False
        
        # Create organization
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO organizations (name, type, contact_email)
                VALUES (?, ?, ?)
            """, (organization_name, "hospital", email))
            organization_id = cursor.lastrowid
            
            # Get admin role
            cursor.execute("SELECT id FROM roles WHERE name = 'admin'")
            role_id = cursor.fetchone()[0]
            
            # Hash password
            password_hash, password_salt = security_manager.hash_password(password)
            
            # Create user
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, password_salt, role_id, organization_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (username, email, password_hash, password_salt, role_id, organization_id))
            user_id = cursor.lastrowid
            
            conn.commit()
        
        print("✅ Administrator-Benutzer erfolgreich erstellt!")
        print()
        print("Zugangsdaten:")
        print(f"  Benutzername: {username}")
        print(f"  E-Mail: {email}")
        print()
        print("Sie können sich jetzt unter http://localhost:3001 anmelden.")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Benutzers: {e}")
        return False

if __name__ == "__main__":
    success = create_admin_user()
    sys.exit(0 if success else 1) 