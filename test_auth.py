#!/usr/bin/env python3
"""
Test-Script für Supabase-Authentifizierung und Streaming-Test
"""

import requests
import json
import time

# Supabase-Konfiguration
SUPABASE_URL = "https://vtvlbavlhlnfamlreiql.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dmxiYXZsaGxuZmFtbHJlaXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMjUyMzEsImV4cCI6MjA2NjYwMTIzMX0.Y7X_m_GMqkMgNKkZztdrqXn99WiUlqal4RGqNWCCOXI"

def get_supabase_token():
    """Holt einen Supabase-Token für den Test-User"""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": "fabloeffler@gmail.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            token_data = response.json()
            return token_data.get('access_token')
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

def test_streaming(token):
    """Testet das Streaming mit einem gültigen Token"""
    url = "http://localhost:8000/generate/stream"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    data = {
        "prompt": "Schreibe einen kurzen Test-Text über das Wetter.",
        "model": "tinyllama:latest",
        "max_tokens": 50,
        "temperature": 0.7
    }
    
    print("Testing streaming...")
    print("=" * 50)
    
    try:
        response = requests.post(url, headers=headers, json=data, stream=True)
        
        if response.status_code == 200:
            print("✅ Streaming response received!")
            print("Chunks:")
            print("-" * 30)
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            if 'chunk' in data:
                                print(f"📝 Chunk: '{data['chunk']}'")
                            elif 'done' in data:
                                print(f"✅ Done: {data}")
                                break
                            elif 'error' in data:
                                print(f"❌ Error: {data['error']}")
                                break
                        except json.JSONDecodeError:
                            print(f"⚠️  Invalid JSON: {line_str}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request error: {e}")

if __name__ == "__main__":
    print("🔐 Getting Supabase token...")
    token = get_supabase_token()
    
    if token:
        print(f"✅ Token received: {token[:20]}...")
        test_streaming(token)
    else:
        print("❌ Failed to get token") 