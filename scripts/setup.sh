#!/bin/bash

# Lokale KI-Plattform Setup Script
# Für datensensible Institutionen

set -e

echo "🚀 Starte Setup der lokalen KI-Plattform..."

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Prüfe Voraussetzungen
check_requirements() {
    print_status "Prüfe System-Voraussetzungen..."
    
    # Docker prüfen
    if ! command -v docker &> /dev/null; then
        print_error "Docker ist nicht installiert. Bitte installieren Sie Docker zuerst."
        exit 1
    fi
    
    # Docker Compose prüfen
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose ist nicht installiert. Bitte installieren Sie Docker Compose zuerst."
        exit 1
    fi
    
    # Python prüfen
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 ist nicht installiert. Bitte installieren Sie Python 3 zuerst."
        exit 1
    fi
    
    # NVIDIA GPU prüfen (optional)
    if command -v nvidia-smi &> /dev/null; then
        print_success "NVIDIA GPU gefunden - GPU-Beschleunigung verfügbar"
        GPU_AVAILABLE=true
    else
        print_warning "Keine NVIDIA GPU gefunden - CPU-Modus wird verwendet"
        GPU_AVAILABLE=false
    fi
    
    print_success "Alle Voraussetzungen erfüllt"
}

# Erstelle Verzeichnisse
create_directories() {
    print_status "Erstelle notwendige Verzeichnisse..."
    
    mkdir -p data
    mkdir -p models
    mkdir -p logs
    mkdir -p backups
    
    print_success "Verzeichnisse erstellt"
}

# Konfiguriere Umgebung
setup_environment() {
    print_status "Konfiguriere Umgebung..."
    
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Umgebungsdatei erstellt (.env)"
    else
        print_warning "Umgebungsdatei .env existiert bereits"
    fi
    
    # Generiere sicheren Secret Key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/your-super-secret-key-change-this-in-production/$SECRET_KEY/" .env
    
    print_success "Umgebung konfiguriert"
}

# Starte Services
start_services() {
    print_status "Starte Services..."
    
    # Docker Compose starten
    docker-compose up -d
    
    print_success "Services gestartet"
}

# Prüfe Services
check_services() {
    print_status "Prüfe Service-Status..."
    
    # Warte auf Services
    sleep 15
    
    # Backend prüfen
    if curl -s http://localhost:8000/ > /dev/null; then
        print_success "Backend ist erreichbar"
    else
        print_error "Backend ist nicht erreichbar"
        return 1
    fi
    
    # Ollama prüfen
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        print_success "Ollama ist erreichbar"
    else
        print_warning "Ollama ist noch nicht erreichbar (wird noch gestartet)"
    fi
    
    # Frontend prüfen
    if curl -s http://localhost:3001 > /dev/null; then
        print_success "Frontend ist erreichbar"
    else
        print_warning "Frontend ist noch nicht erreichbar (wird noch gestartet)"
    fi
}

# Lade Standard-Modell
download_default_model() {
    print_status "Lade Standard-Modell (llama2)..."
    
    # Warte auf Ollama
    print_status "Warte auf Ollama-Service..."
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null; then
            break
        fi
        sleep 2
    done
    
    # Lade Modell
    curl -X POST http://localhost:11434/api/pull -d '{"name": "llama2"}'
    
    print_success "Standard-Modell geladen"
}

# Erstelle Admin-Benutzer
create_admin_user() {
    print_status "Erstelle Administrator-Benutzer..."
    
    # Prüfe ob Python-Script existiert
    if [ ! -f "scripts/create_admin.py" ]; then
        print_warning "Admin-Erstellung-Script nicht gefunden, überspringe Benutzer-Erstellung"
        return
    fi
    
    # Setze Umgebungsvariablen
    export SECRET_KEY=$(grep SECRET_KEY .env | cut -d '=' -f2)
    
    # Führe Admin-Erstellung aus
    cd scripts
    python3 create_admin.py
    cd ..
    
    print_success "Admin-Benutzer erstellt (falls gewünscht)"
}

# Zeige Informationen
show_info() {
    echo ""
    echo "🎉 Setup abgeschlossen!"
    echo ""
    echo "📋 Zugangsdaten:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend API: http://localhost:8000"
    echo "   Ollama API: http://localhost:11434"
    echo ""
    echo "🔒 Sicherheit:"
    echo "   - JWT-basierte Authentifizierung"
    echo "   - Verschlüsselte Passwort-Hashes"
    echo "   - Input-Validation und Sanitization"
    echo "   - Audit-Logging für Compliance"
    echo "   - Rate Limiting für API-Endpunkte"
    echo "   - 100% lokale Verarbeitung"
    echo "   - DSGVO-konform"
    echo ""
    echo "📚 Nächste Schritte:"
    echo "   1. Öffnen Sie http://localhost:3001 im Browser"
    echo "   2. Melden Sie sich mit Ihren Admin-Zugangsdaten an"
    echo "   3. Laden Sie ein Modell in der Modell-Verwaltung"
    echo "   4. Starten Sie mit der Textgenerierung"
    echo ""
    echo "🛠️  Verwaltung:"
    echo "   Starten: docker-compose up -d"
    echo "   Stoppen: docker-compose down"
    echo "   Logs: docker-compose logs -f"
    echo "   Admin erstellen: python3 scripts/create_admin.py"
    echo ""
    echo "🔧 Sicherheitshinweise:"
    echo "   - Ändern Sie den SECRET_KEY in der .env-Datei"
    echo "   - Verwenden Sie starke Passwörter"
    echo "   - Regelmäßige Backups der Datenbank"
    echo "   - Überwachen Sie die Audit-Logs"
    echo ""
}

# Hauptfunktion
main() {
    echo "🔐 Lokale KI-Plattform Setup - Phase 1: Sicherheit"
    echo "=================================================="
    echo ""
    
    check_requirements
    create_directories
    setup_environment
    start_services
    check_services
    download_default_model
    create_admin_user
    show_info
}

# Script ausführen
main "$@" 