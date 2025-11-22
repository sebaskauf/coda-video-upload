# CODA Marketing - Video Upload

Ein schönes, einfaches Video-Upload Frontend für CODA Marketing, das Videos automatisch an n8n sendet und eine Telegram-Benachrichtigung auslöst.

## Übersicht

Dieses Frontend ermöglicht es Ihrem Kunden, Videos hochzuladen, die dann automatisch:
1. ✅ An n8n gesendet werden
2. ✅ In Google Drive/Dropbox gespeichert werden
3. ✅ Eine Telegram-Nachricht auslösen: "Video erhalten - auf welche Social Media Kanäle posten?"

## Features

- 🎥 Nur Video-Uploads (MP4, MOV, AVI, MKV, WebM, etc.)
- 🎨 Futuristisches Design mit animierten Laser-Effekten (Schwarz/Orange)
- ✨ WebGL-basierter LaserFlow Hintergrund-Effekt
- 📱 Voll responsive - funktioniert auf Desktop, Tablet, Handy
- ⬆️ Drag & Drop Upload Interface
- 📊 Mehrfach-Video Upload
- 💾 Unterstützung für beliebig große Videos
- ⚡ Live Upload-Status
- 🌐 Deutsche Benutzeroberfläche

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. n8n Webhook konfigurieren

**📖 Vollständige Anleitung:** Siehe [N8N_INTEGRATION.md](./N8N_INTEGRATION.md)

**Schnellstart:**
1. Erstelle einen Webhook in n8n (POST Method, Binary Data aktiviert)
2. Kopiere die Webhook URL
3. Öffne `src/App.jsx` (Zeile 12)
4. Ersetze `YOUR_N8N_WEBHOOK_URL_HERE` mit deiner Webhook URL

```javascript
const N8N_WEBHOOK_URL = 'https://dein-n8n-server.com/webhook/video-upload'
```

### 3. Lokal testen

```bash
npm run dev
```

Die App läuft dann auf `http://localhost:5173`

### 4. Für Kunden deployen

**Empfohlen: Vercel (kostenlos)**
```bash
npm i -g vercel
vercel
```

Weitere Deployment-Optionen siehe unten.

## Projekt Struktur

```
coda-upload/
├── src/
│   ├── App.jsx              # Haupt-Komponente mit Upload-Logik
│   ├── App.css              # Styling
│   └── utils/
│       └── uploadChunked.js # Chunked Upload für große Dateien
├── N8N_INTEGRATION.md       # n8n Integration Anleitung
└── README.md                # Diese Datei
```

## Technologie Stack

- **Vite** - Build Tool & Dev Server
- **React** - UI Framework
- **JavaScript** - Ohne TypeScript für Einfachheit
- **CSS** - Modern, responsive Styling

## Deployment

### Build für Produktion

```bash
npm run build
```

Die fertigen Dateien landen im `dist/` Ordner.

### Deployment Optionen

- **Vercel**: `vercel deploy`
- **Netlify**: Drag & Drop den `dist` Ordner
- **GitHub Pages**: `npm run build` und push den `dist` Ordner
- **Eigener Server**: Kopiere den `dist` Ordner auf deinen Server

## Workflow für den Kunden

1. **Kunde öffnet die Webseite** (auf Handy, Tablet, oder Desktop)
2. **Kunde lädt ein oder mehrere Videos hoch**
3. **Videos werden automatisch an n8n gesendet**
4. **n8n speichert Videos** (Google Drive, Dropbox, etc.)
5. **Kunde erhält Telegram-Nachricht**: "Video erhalten - auf welche Kanäle posten?"
6. **Kunde antwortet in Telegram** mit gewünschten Social Media Plattformen
7. **n8n postet Videos automatisch** (später zu implementieren)

## Anpassungen

### Design ändern

**Farben ändern:**
Alle Farben sind in `src/index.css` als CSS-Variablen definiert:

```css
--color-primary: #FF6B00;        /* Orange */
--color-background: #000000;     /* Schwarz */
--color-surface: #0a0a0a;        /* Dunkelgrau */
--color-text-primary: #ffffff;   /* Weiß */
```

**Laser-Effekt anpassen:**
In `src/App.jsx` kannst du die LaserFlow-Parameter ändern:

```javascript
<LaserFlow
  color="#FF6B00"           // Laser-Farbe
  wispDensity={1.2}         // Dichte der Laser-Strahlen
  fogIntensity={0.5}        // Nebel-Intensität
  flowSpeed={0.4}           // Geschwindigkeit
  wispSpeed={12}            // Wisp-Geschwindigkeit
/>
```

### Erlaubte Video-Formate ändern

In `src/App.jsx` (Zeile 15-23) kannst du die erlaubten Video-Formate anpassen:

```javascript
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  // Füge weitere hinzu...
]
```

## Browser Support

- ✅ Chrome/Edge (empfohlen)
- ✅ Firefox
- ✅ Safari (Desktop & iOS)
- ✅ Moderne Mobile Browser

## Wichtige Dateien

- **`src/App.jsx`** - Hauptlogik, hier n8n URL eintragen
- **`src/App.css`** - Design & Styling
- **`src/index.css`** - Farben & Basis-Styling
- **`N8N_INTEGRATION.md`** - Vollständige Integration-Anleitung

## Support & Hilfe

Falls Probleme auftreten:
1. Prüfe die Browser Console (F12) auf Fehler
2. Prüfe n8n Execution Logs
3. Stelle sicher, dass CORS aktiviert ist (siehe N8N_INTEGRATION.md)
4. Teste die Telegram-Bot Verbindung separat

## Lizenz

Frei verwendbar für dein CODA Marketing Kundenprojekt.
