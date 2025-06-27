#!/usr/bin/env python3
"""
Script to create a user in Supabase directly
"""

from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://vtvlbavlhlnfamlreiql.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dmxiYXZsaGxuZmFtbHJlaXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjUyMzEsImV4cCI6MjA2NjYwMTIzMX0.Y7X_m_GMqkMgNKkZztdrqXn99WiUlqal4RGqNWCCOXI"

def create_supabase_user(email: str, password: str):
    """Create a new user in Supabase"""
    try:
        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Create user
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if response.user:
            print(f"✅ User created successfully!")
            print(f"   Email: {response.user.email}")
            print(f"   ID: {response.user.id}")
            print(f"   Created at: {response.user.created_at}")
            
            if response.session:
                print(f"   Session token: {response.session.access_token[:20]}...")
            
            return True
        else:
            print("❌ Failed to create user")
            if response.error:
                print(f"   Error: {response.error}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return False

def main():
    print("🚀 Creating Supabase User")
    print("=" * 40)
    
    # Default values
    email = "fabloeffler@gmail.com"
    password = "admin123"
    
    print(f"📧 Email: {email}")
    print(f"🔑 Password: {password}")
    
    # Create user
    success = create_supabase_user(email, password)
    
    if success:
        print("\n🎉 User creation completed!")
        print(f"   You can now login with: {email}")
        print(f"   Password: {password}")
    else:
        print("\n💥 User creation failed!")
        exit(1)

if __name__ == "__main__":
    main() 