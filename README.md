# Praivio - Lokale KI-Plattform für datensensible Institutionen

## 🚀 Über Praivio

**Praivio** ist eine moderne, lokale KI-Plattform speziell entwickelt für datensensible Institutionen wie Krankenhäuser, Anwaltskanzleien und Behörden. Die Plattform bietet 100% lokale Textgenerierung mit fortschrittlichen KI-Modellen, ohne dass Daten das interne Netzwerk verlassen.

## ✨ Features

### 🔒 **Datenschutz & Sicherheit**
- **100% lokale Verarbeitung** - Keine Datenübertragung an externe Server
- **Vollständige Kontrolle** über alle Daten und Modelle
- **DSGVO-konform** für europäische Institutionen
- **Audit-Logs** für alle Aktivitäten

### 🤖 **KI-Funktionen**
- **Mehrere KI-Modelle** (medgemma-27b-multimodal, medgemma-4b-it)
- **Vorlagen-System** für medizinische, rechtliche und behördliche Dokumente
- **Kontextuelle Textgenerierung** mit anpassbaren Parametern
- **Batch-Verarbeitung** für mehrere Anfragen

### 🎨 **Moderne Benutzeroberfläche**
- **Glassmorphismus Design** mit moderner Ästhetik
- **Responsive Layout** für Desktop und Mobile
- **Intuitive Navigation** mit Sidebar
- **Real-time Feedback** und Statusanzeigen

### 📊 **Analytik & Monitoring**
- **Detaillierte Statistiken** über Nutzung und Performance
- **Token-Tracking** für Kostenkontrolle
- **Verarbeitungszeit-Monitoring**
- **Modell-Performance-Vergleich**

## 🏗️ Architektur

```
Praivio/
├── frontend/          # React-basierte Benutzeroberfläche
├── backend/           # FastAPI Backend mit KI-Integration
├── models/            # Lokale KI-Modelle (Ollama)
├── data/              # SQLite-Datenbank und Audit-Logs
├── docs/              # Dokumentation und Business Plan
├── scripts/           # Setup- und Wartungsskripte
├── backups/           # Automatische Backups
└── logs/              # Anwendungs- und System-Logs
```

## 🚀 Schnellstart

### Voraussetzungen
- Docker und Docker Compose
- Mindestens 16GB RAM (32GB empfohlen für große Modelle)
- 20GB freier Speicherplatz (für Modelle)

### Installation

1. **Repository klonen**
```bash
git clone <repository-url>
cd Praivio
```

2. **KI-Modelle herunterladen** ⚠️ **WICHTIG**
   
   **Vor dem Start der Anwendung müssen die KI-Modelle heruntergeladen werden:**
   
   ```bash
   # Option 1: Mit Ollama (empfohlen)
   docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
   docker exec -it ollama ollama pull medgemma:27b-multimodal
   docker exec -it ollama ollama pull medgemma:4b-it
   
   # Option 2: Manueller Download
   # Lade die folgenden Dateien in das models/ Verzeichnis:
   # - medgemma-27b-multimodal-IQ4_XS.gguf (~3.7GB)
   # - medgemma-4b-it-IQ4_XS.gguf (~2.3GB)
   ```
   
   **Hinweis:** Die großen Modell-Dateien sind nicht im Git-Repository enthalten. Siehe [models/README.md](models/README.md) für detaillierte Download-Anweisungen.

3. **Umgebungsvariablen konfigurieren**
```bash
cp env.example .env
# Bearbeite .env nach Bedarf
```

4. **Plattform starten**
```bash
docker-compose up -d
```

5. **Zugriff**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **Ollama**: http://localhost:11434

## 📋 Verwendung

### 1. Modell auswählen
- **medgemma-4b-it**: Schnell, klein (4B Parameter) - ideal für einfache Aufgaben
- **medgemma-27b-multimodal**: Groß (27B Parameter) - für anspruchsvolle Aufgaben mit Bildverarbeitung

### 2. Vorlage wählen
- **Medizinisch**: Arztberichte, Befunde, Anamnesen
- **Rechtlich**: Vertragsanalysen, Dokumentenprüfungen
- **Behördlich**: Berichte, Protokolle, Dokumentationen

### 3. Text generieren
1. Kontext eingeben (optional)
2. Anfrage formulieren
3. Parameter anpassen (Temperatur, Token-Limit)
4. Generate klicken

## 🔧 Konfiguration

### Umgebungsvariablen (.env)
```bash
# Backend-Konfiguration
OLLAMA_BASE_URL=http://ollama:11434
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///./data/app.db

# Frontend-Konfiguration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_TITLE=Praivio
```

### Modelle verwalten
```bash
# Verfügbare Modelle anzeigen
docker exec -it praivio-ollama-1 ollama list

# Neues Modell herunterladen
docker exec -it praivio-ollama-1 ollama pull llama2:7b-chat-q4_0

# Modell löschen
docker exec -it praivio-ollama-1 ollama rm medgemma:27b-multimodal
```

## 📊 Monitoring

### Statistiken anzeigen
- Navigiere zu "Statistiken" im Frontend
- Siehe Gesamtnutzung, Token-Verbrauch, Modell-Performance

### Logs einsehen
```bash
# Backend-Logs
docker-compose logs backend

# Frontend-Logs
docker-compose logs frontend

# Ollama-Logs
docker-compose logs ollama
```

## 🔒 Sicherheit

### Datenschutz
- Alle Daten bleiben im lokalen Netzwerk
- Keine Cloud-Verbindungen
- Verschlüsselte Datenbank
- Audit-Trail für Compliance

### Backup-Strategie
```bash
# Automatisches Backup erstellen
./scripts/backup.sh

# Backup wiederherstellen
./scripts/restore.sh backup-YYYY-MM-DD.sql
```

## 🛠️ Wartung

### Updates
```bash
# Alle Services aktualisieren
docker-compose pull
docker-compose up -d

# Nur Backend aktualisieren
docker-compose up -d --build backend
```

### Troubleshooting
```bash
# Services neu starten
docker-compose restart

# Volle Neuinstallation
docker-compose down -v
docker-compose up -d --build
```

## 📈 Business Plan

Siehe [docs/BUSINESS_PLAN.md](docs/BUSINESS_PLAN.md) für detaillierte Geschäftsstrategie und Marktanalyse.

## 🤝 Beitragen

1. Fork das Repository
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) Datei für Details.

## 📞 Support

- **Dokumentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Email**: support@praivio.com

---

**Praivio** - Sichere, lokale KI für datensensible Institutionen 🚀 