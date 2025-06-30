#!/bin/bash

# Setup Script für Praivio Upload-Funktionalität
echo "🚀 Setup für Praivio Upload-Funktionalität"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktion für farbige Ausgabe
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "docker-compose.yml" ]; then
    print_error "Bitte führe dieses Script im Praivio-Root-Verzeichnis aus"
    exit 1
fi

print_status "Starte Setup für Upload-Funktionalität..."

# 1. Backend Dependencies installieren
print_status "Installiere Backend Dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# 2. Frontend Dependencies installieren
print_status "Installiere Frontend Dependencies..."
cd frontend
npm install
cd ..

# 3. Supabase Setup prüfen
print_warning "Supabase Setup erforderlich:"
echo "1. Gehe zu deinem Supabase Dashboard"
echo "2. Öffne den SQL Editor"
echo "3. Führe das Script aus: scripts/setup_supabase.sql"
echo "4. Stelle sicher, dass die Environment Variables gesetzt sind:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_KEY"

# 4. Environment Variables prüfen
print_status "Prüfe Environment Variables..."
if [ -z "$SUPABASE_URL" ]; then
    print_warning "SUPABASE_URL ist nicht gesetzt"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    print_warning "SUPABASE_SERVICE_KEY ist nicht gesetzt"
fi

# 5. Docker Build (optional)
read -p "Möchtest du das Docker Image neu bauen? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Baue Docker Images..."
    docker-compose build
fi

# 6. System Dependencies prüfen (für lokale Entwicklung)
print_status "Prüfe System Dependencies..."
if ! command -v tesseract &> /dev/null; then
    print_warning "Tesseract ist nicht installiert. Für lokale Entwicklung:"
    echo "Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng"
    echo "macOS: brew install tesseract tesseract-lang"
    echo "Windows: https://github.com/UB-Mannheim/tesseract/wiki"
fi

if ! command -v ffmpeg &> /dev/null; then
    print_warning "FFmpeg ist nicht installiert. Für lokale Entwicklung:"
    echo "Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "macOS: brew install ffmpeg"
    echo "Windows: https://ffmpeg.org/download.html"
fi

# 7. Test Setup
print_status "Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. Stelle sicher, dass Supabase korrekt konfiguriert ist"
echo "2. Starte die Anwendung: docker-compose up"
echo "3. Teste die Upload-Funktionalität im Chat"
echo ""
echo "Dokumentation: docs/UPLOAD_FEATURE.md"
echo "Troubleshooting: Siehe docs/UPLOAD_FEATURE.md#troubleshooting"

print_status "Setup erfolgreich abgeschlossen! 🎉" 