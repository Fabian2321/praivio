# Chat-Funktionalität für Praivio

## Übersicht

Die Chat-Funktionalität erweitert Praivio um einen interaktiven Chat-Modus, ähnlich wie bei ChatGPT. Benutzer können nun fortlaufende Konversationen führen, bei denen der KI-Assistent den Kontext der vorherigen Nachrichten berücksichtigt.

## Features

### 🎯 Hauptfunktionen

- **Chat-Modus Toggle**: Umschalten zwischen Einzelanfrage und Chat-Modus
- **Chat-Sessions**: Mehrere separate Chat-Konversationen verwalten
- **Kontext-Bewusstsein**: KI berücksichtigt den gesamten Chat-Verlauf
- **System-Prompt**: Globaler, detaillierter System-Prompt für professionelle Antworten
- **Automatische Titel-Generierung**: Chat-Titel basierend auf der ersten Nachricht
- **Echtzeit-Streaming**: Sofortige Antworten während der Generierung
- **Chat-Verwaltung**: Erstellen, bearbeiten und löschen von Chat-Sessions

### 💬 Chat-Interface

- **Sidebar**: Übersicht aller Chat-Sessions
- **Message-Bubbles**: User-Nachrichten rechts (blau), AI-Antworten links (grau)
- **Typing-Indicator**: "Schreibt..." während der Generierung
- **Auto-Scroll**: Automatisches Scrollen zu neuen Nachrichten
- **Keyboard-Shortcuts**: Enter zum Senden, Shift+Enter für neue Zeile
- **System-Prompt-Editor**: Modal zum Bearbeiten des System-Prompts

### 🔧 Verwaltungsfunktionen

- **Chat-Titel bearbeiten**: Klick auf Titel zum Bearbeiten
- **System-Prompt bearbeiten**: Settings-Button im Chat-Header
- **Chat löschen**: Lösch-Button in der Sidebar
- **Modell-Anzeige**: Zeigt verwendetes Modell im Chat-Header
- **Nachrichten-Zähler**: Anzahl der Nachrichten pro Chat

## System-Prompt

### 🎯 Professioneller Default-System-Prompt

Jeder Chat verwendet automatisch einen detaillierten, professionellen System-Prompt:

```
Du bist ein professioneller KI-Assistent für Praivio, eine sichere, lokale KI-Plattform für datensensible Institutionen.

Deine Hauptaufgaben:
- Beantworte Fragen sachlich, präzise und hilfreich
- Verwende immer die deutsche Sprache
- Gib strukturierte und gut formatierte Antworten
- Berücksichtige den Kontext der gesamten Konversation
- Sei besonders hilfreich bei medizinischen, rechtlichen und behördlichen Themen
- Verwende eine professionelle, aber zugängliche Sprache
- Gib bei Unsicherheiten ehrliche Antworten und schlage Nachfragen vor

Wichtige Richtlinien:
- Antworte immer respektvoll und professionell
- Verwende bei Bedarf Aufzählungen und Strukturen für bessere Lesbarkeit
- Gib praktische und umsetzbare Ratschläge
- Berücksichtige Datenschutz und Sicherheitsaspekte
- Sei hilfreich bei der Erstellung von Dokumenten und Berichten

Kontext: Du arbeitest in einer sicheren, lokalen Umgebung für vertrauenswürdige Institutionen.
```

### 🔧 System-Prompt bearbeiten

- **Zugriff**: Settings-Button (⚙️) im Chat-Header
- **Modal**: Vollständiger Editor mit Syntax-Highlighting
- **Standard zurücksetzen**: "Standard verwenden" Button
- **Speichern**: Änderungen werden sofort übernommen

## Technische Implementierung

### Backend

#### Erweiterte Datenbank-Tabellen

```sql
-- Chat-Sessions (erweitert)
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    system_prompt TEXT,  -- NEU: System-Prompt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Chat-Messages (unverändert)
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    chat_session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    generation_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);
```

#### Erweiterte API-Endpoints

- `POST /chat/sessions` - Neue Chat-Session mit System-Prompt erstellen
- `GET /chat/sessions` - Chat-Sessions mit System-Prompt auflisten
- `GET /chat/sessions/{id}` - Chat-Session mit System-Prompt abrufen
- `PUT /chat/sessions/{id}` - Chat-Titel und System-Prompt aktualisieren
- `DELETE /chat/sessions/{id}` - Chat-Session löschen
- `POST /chat/sessions/{id}/messages` - Neue Nachricht mit System-Prompt-Kontext senden

### Frontend

#### Erweiterte Komponenten

- `ChatInterface.js`: System-Prompt-Editor und Modal
- Erweiterte `AITextPlatform.js`: Toggle zwischen Modi

#### State Management

```javascript
const [chatMode, setChatMode] = useState(false);
const [chatSessions, setChatSessions] = useState([]);
const [currentSession, setCurrentSession] = useState(null);
const [messages, setMessages] = useState([]);
const [systemPrompt, setSystemPrompt] = useState('');
const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
```

## Verwendung

### Chat starten

1. **Modus wechseln**: Klick auf "Chat" Button in der Navigation
2. **Neuen Chat erstellen**: 
   - Klick auf "+" in der Sidebar, oder
   - Direkt eine Nachricht eingeben
3. **System-Prompt**: Wird automatisch mit professionellem Default geladen
4. **Chat-Titel**: Wird automatisch aus der ersten Nachricht generiert

### Chat verwenden

1. **Nachricht eingeben**: Textfeld am unteren Rand
2. **Senden**: Enter-Taste oder Send-Button
3. **Kontext**: KI berücksichtigt automatisch System-Prompt und alle vorherigen Nachrichten
4. **Chat wechseln**: Klick auf andere Chat-Session in der Sidebar

### System-Prompt bearbeiten

1. **Zugriff**: Settings-Button (⚙️) im Chat-Header klicken
2. **Bearbeiten**: System-Prompt im Modal anpassen
3. **Standard**: "Standard verwenden" für professionellen Default
4. **Speichern**: Änderungen übernehmen

### Chat verwalten

1. **Titel bearbeiten**: Klick auf Titel im Chat-Header
2. **System-Prompt**: Settings-Button für erweiterte Konfiguration
2. **Chat löschen**: Klick auf Lösch-Button in der Sidebar
3. **Zurück zu Einzelanfrage**: Klick auf "Einzelanfrage" Button

## Kontext-Management

### Wie es funktioniert

1. **System-Prompt**: Wird als erste Zeile im Context eingefügt
2. **Nachrichten-Sammlung**: Alle Nachrichten der Session werden gesammelt
3. **Context-Aufbau**: System-Prompt + Nachrichten als "User: " und "Assistant: " formatiert
4. **LLM-Aufruf**: Vollständiger Context wird an das LLM gesendet
5. **Antwort-Generierung**: KI generiert Antwort basierend auf System-Prompt und vollständigem Kontext

### Beispiel Context

```
System: Du bist ein professioneller KI-Assistent für Praivio...

User: Erstelle einen Arztbericht für einen 45-jährigen Patienten

Assistant: Hier ist ein strukturierter Arztbericht...

User: Kannst du das noch detaillierter machen?

Assistant: [Antwort mit System-Prompt und Kontext der vorherigen Nachrichten]
```

## Vorteile gegenüber Einzelanfragen

### 🎯 Bessere Ergebnisse

- **Professioneller System-Prompt**: Konsistente, hochwertige Antworten
- **Iterative Verbesserung**: Schrittweise Verfeinerung der Anfragen
- **Kontext-Bewusstsein**: KI versteht den Gesprächsverlauf
- **Korrekturen**: Einfache Nachfragen und Klarstellungen möglich

### 💡 Benutzerfreundlichkeit

- **Natürliche Konversation**: Wie bei ChatGPT gewohnt
- **Keine Wiederholungen**: Kontext muss nicht wiederholt werden
- **Flexibilität**: Spontane Fragen und Anpassungen möglich
- **Professionelle Antworten**: Durch detaillierten System-Prompt

### 🔄 Workflow-Optimierung

- **Schnellere Iteration**: Keine neuen Anfragen für Anpassungen
- **Bessere Qualität**: Durch System-Prompt und Kontext-bewusste Antworten
- **Zeitersparnis**: Weniger manuelle Kontext-Eingabe
- **Konsistenz**: Einheitlicher Stil durch System-Prompt

## Zukünftige Erweiterungen

### Geplante Features

- **Chat-Export**: PDF/Word Export von Chat-Verläufen
- **Chat-Templates**: Vordefinierte Chat-Starter mit spezifischen System-Prompts
- **Chat-Kategorien**: Organisation nach Themen
- **Chat-Suche**: Volltext-Suche in Chat-Verläufen
- **Chat-Statistiken**: Nutzungsanalysen für Chats
- **System-Prompt-Templates**: Vordefinierte System-Prompts für verschiedene Anwendungsfälle

### Technische Verbesserungen

- **Token-Optimierung**: Intelligente Context-Truncation
- **Chat-Archivierung**: Automatische Archivierung alter Chats
- **Chat-Backup**: Export/Import von Chat-Sessions
- **Multi-Modal**: Bild-Upload in Chats
- **System-Prompt-Versionierung**: Tracking von System-Prompt-Änderungen

## Troubleshooting

### Häufige Probleme

1. **Chat wird nicht gespeichert**: Prüfen Sie die Datenbankverbindung
2. **Kontext geht verloren**: Stellen Sie sicher, dass alle Nachrichten geladen sind
3. **Langsame Antworten**: Prüfen Sie die LLM-Performance
4. **System-Prompt wird nicht angewendet**: Prüfen Sie die Backend-Logs

### Debugging

- **Browser-Konsole**: Fehler-Logs anzeigen
- **Backend-Logs**: API-Aufrufe überwachen
- **Datenbank**: Chat-Sessions und System-Prompts direkt prüfen

## Migration von bestehenden Generierungen

Bestehende Einzelanfragen bleiben unverändert und können weiterhin verwendet werden. Die Chat-Funktionalität ist eine zusätzliche Option, die die bestehende Funktionalität erweitert.

---

**Status**: ✅ Implementiert und getestet  
**Version**: 1.1.0 (mit System-Prompt)  
**Datum**: Juni 20245