# Upload-Funktionalität für Praivio Chat

## Übersicht

Die Upload-Funktionalität ermöglicht es Benutzern, PDFs, Bilder und Audio-Dateien in Chat-Sessions hochzuladen. Diese Dateien werden automatisch verarbeitet und als Kontext für die KI verwendet.

## Features

### Unterstützte Dateitypen
- **PDF**: Dokumente (max. 10 MB)
- **Bilder**: JPEG, PNG, WebP, GIF (max. 5 MB)
- **Audio**: MP3, WAV, OGG, M4A, WebM (max. 25 MB)

### Funktionen
- ✅ Drag & Drop Upload
- ✅ Dateigrößen-Validierung
- ✅ Automatische AI-Verarbeitung
- ✅ Vorschau und Verwaltung
- ✅ Integration in Chat-Kontext
- ✅ Sichere Speicherung in Supabase

## Technische Implementierung

### Backend

#### Neue Dependencies
```bash
supabase==2.0.2
openai-whisper==20231117
Pillow==10.1.0
PyMuPDF==1.23.8
pytesseract==0.3.10
```

#### Dateistruktur
```
backend/
├── file_upload.py          # Upload-Handler mit AI-Verarbeitung
├── models.py               # Erweiterte Pydantic-Models
├── main.py                 # Neue Upload-Endpoints
└── supabase_schema.sql     # Supabase-Tabellen-Schema
```

#### API-Endpoints
- `POST /upload/file` - Datei hochladen
- `GET /upload/files/{session_id}` - Session-Dateien abrufen
- `DELETE /upload/files/{file_id}` - Datei löschen

### Frontend

#### Neue Komponenten
```
frontend/src/components/
├── FileUpload.js           # Upload-Button mit Dropdown
└── AttachedFiles.js        # Datei-Anzeige und Verwaltung
```

#### Integration
- Upload-Button neben Mikrofon-Button
- Dateien werden unter dem Textfeld angezeigt
- Automatische Integration in Chat-Kontext

## Setup

### 1. Supabase Setup

Führe das SQL-Script in der Supabase SQL Editor aus:

```sql
-- Siehe scripts/setup_supabase.sql
```

### 2. Environment Variables

Füge diese Variablen zu deiner `.env` Datei hinzu:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### 3. Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Frontend Dependencies

```bash
cd frontend
npm install
```

## Verwendung

### Datei hochladen
1. Klicke auf den Upload-Button (📎)
2. Wähle Dateityp oder ziehe Datei per Drag & Drop
3. Datei wird automatisch verarbeitet und angezeigt

### Dateien verwenden
1. Hochgeladene Dateien erscheinen unter dem Textfeld
2. Schreibe eine Nachricht wie gewohnt
3. KI berücksichtigt automatisch den Inhalt der Dateien

### Dateien verwalten
- Klicke auf das Auge-Icon für Vorschau
- Klicke auf das X-Icon zum Löschen

## AI-Verarbeitung

### PDF-Verarbeitung
- Text-Extraktion mit PyMuPDF
- OCR für gescannte Dokumente
- Automatische Kürzung bei langen Texten

### Bild-Verarbeitung
- OCR mit Tesseract (Deutsch + Englisch)
- Automatische Bildbeschreibung (erweiterbar)
- Unterstützung für medizinische Bilder

### Audio-Verarbeitung
- Transkription mit Whisper
- Deutsche Sprache-Erkennung
- Automatische Zeichensetzung

## Sicherheit

### Dateivalidierung
- Größen-Limits pro Dateityp
- MIME-Type-Validierung
- Dateiendungs-Validierung

### Zugriffskontrolle
- Row Level Security (RLS) in Supabase
- Benutzer können nur eigene Dateien sehen
- Sichere Storage-Policies

### Audit-Logging
- Alle Upload-Operationen werden geloggt
- Fehler werden erfasst
- Benutzer-Aktivitäten werden verfolgt

## Erweiterte Features

### Geplante Erweiterungen
- [ ] Batch-Upload für mehrere Dateien
- [ ] Erweiterte Bildanalyse mit Vision-Models
- [ ] PDF-Seitenvorschau
- [ ] Audio-Player für Sprachmemos
- [ ] Export von Analysen als PDF

### Customization
- Dateigrößen-Limits in `file_upload.py` anpassbar
- Unterstützte Dateitypen erweiterbar
- AI-Modelle konfigurierbar

## Troubleshooting

### Häufige Probleme

#### Upload schlägt fehl
- Prüfe Dateigröße (max. 25 MB)
- Prüfe Dateityp (PDF, Bild, Audio)
- Prüfe Supabase-Verbindung

#### Dateien werden nicht angezeigt
- Prüfe Supabase-Policies
- Prüfe User-Authentifizierung
- Prüfe Session-ID

#### AI-Verarbeitung funktioniert nicht
- Prüfe Whisper-Installation
- Prüfe Tesseract-Installation
- Prüfe PyMuPDF-Installation

### Logs
- Backend-Logs in `logs/`
- Supabase-Logs im Dashboard
- Browser-Console für Frontend-Fehler

## Performance

### Optimierungen
- Lazy Loading für Whisper-Model
- Asynchrone Dateiverarbeitung
- Komprimierung für große Dateien
- Caching für verarbeitete Inhalte

### Monitoring
- Upload-Zeiten tracken
- Verarbeitungszeiten überwachen
- Speicherverbrauch kontrollieren

## Support

Bei Problemen oder Fragen:
1. Prüfe die Logs
2. Teste mit kleineren Dateien
3. Prüfe die Supabase-Konfiguration
4. Erstelle ein Issue im Repository 