# n8n Integration Anleitung für CODA Marketing Video Upload

Diese Anleitung zeigt dir, wie du das Video-Upload Frontend mit n8n und Telegram verbindest.

## Übersicht: Was wird gebaut?

1. **Video Upload Frontend** → Lädt Videos hoch
2. **n8n Workflow** → Empfängt Videos und speichert sie
3. **Telegram Bot** → Sendet Nachricht an Kunden: "Video erhalten - auf welche Social Media Kanäle posten?"
4. **n8n Automatisierung** → Postet Videos basierend auf Telegram-Antwort

## Schritt 1: n8n Webhook für Video-Upload erstellen

1. Öffne dein n8n Dashboard
2. Erstelle einen neuen Workflow namens "Video Upload - CODA Marketing"
3. Füge einen **Webhook** Node hinzu:
   - Klicke auf "Add Node" → "Webhook"
   - Wähle **POST** als HTTP Method
   - Path: `/webhook/video-upload`
   - Response Mode: "When Last Node Finishes"
   - Options → Binary Data: **Aktiviert**
   - Kopiere die **Webhook URL** (z.B. `https://dein-n8n-server.com/webhook/video-upload`)

## Schritt 2: Webhook URL im Frontend eintragen

1. Öffne die Datei: `src/App.jsx`
2. Suche nach Zeile 12:
   ```javascript
   const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'
   ```
3. Ersetze `'YOUR_N8N_WEBHOOK_URL_HERE'` mit deiner n8n Webhook URL:
   ```javascript
   const N8N_WEBHOOK_URL = 'https://dein-n8n-server.com/webhook/video-upload'
   ```

## Schritt 3: n8n Workflow für Video-Empfang und Telegram-Benachrichtigung

### Workflow-Struktur:

```
1. Webhook (empfängt Video)
   ↓
2. Video speichern (Google Drive/Dropbox/S3)
   ↓
3. Telegram Nachricht senden (an Kunden)
   ↓
4. Respond to Webhook (Bestätigung ans Frontend)
```

### Node 1: Webhook (bereits erstellt in Schritt 1)

Das Frontend sendet folgende Daten:
- `file` - Das Video (als Binary Data)
- `fileName` - Original Dateiname
- `fileSize` - Dateigröße in Bytes
- `mimeType` - Video MIME Type (z.B. "video/mp4")

In n8n zugreifen:
- Video: `{{ $binary.file }}`
- Dateiname: `{{ $json.fileName }}`
- Dateigröße: `{{ $json.fileSize }}`

### Node 2: Video speichern

**Option A: Google Drive**
1. Füge "Google Drive" Node hinzu
2. Operation: "Upload a File"
3. Binary Property: `file`
4. File Name: `{{ $json.fileName }}`
5. Folder: Wähle deinen Upload-Ordner
6. Verbinde mit Google Drive Account

**Option B: Dropbox, S3, oder lokaler Storage**
- Ähnlich wie Google Drive
- Wähle den passenden Node aus

### Node 3: Telegram Nachricht senden

1. Füge "Telegram" Node hinzu
2. Operation: "Send Message"
3. Chat ID: `DEINE_TELEGRAM_CHAT_ID` (siehe unten wie du diese bekommst)
4. Text:
   ```
   🎥 Neues Video hochgeladen!

   📁 Dateiname: {{ $node["Webhook"].json.fileName }}
   📊 Größe: {{ Math.round($node["Webhook"].json.fileSize / 1024 / 1024) }} MB

   Auf welche Social Media Kanäle soll das Video gepostet werden?

   Antworten Sie mit den gewünschten Plattformen:
   - Instagram
   - Facebook
   - TikTok
   - YouTube
   - LinkedIn
   ```

### Node 4: Respond to Webhook

1. Füge "Respond to Webhook" Node hinzu
2. Response Mode: "Using Respond to Webhook Node"
3. Response Body:
   ```json
   {
     "success": true,
     "message": "Video erfolgreich hochgeladen",
     "fileName": "={{ $node['Webhook'].json.fileName }}"
   }
   ```

## Schritt 4: Chunked Upload für sehr große Dateien (Optional)

Wenn du die Chunked Upload Funktion nutzen möchtest (für Dateien > 100MB), musst du in n8n die Chunks wieder zusammensetzen.

### n8n Workflow für Chunks:

```
Webhook → Function Node (Chunk speichern) → Function Node (Prüfen ob alle Chunks da) → Wenn ja: Chunks zusammensetzen → Finale Datei speichern → Response
```

#### Webhook empfängt:
- `file` - Der Chunk
- `fileName` - Original Dateiname
- `chunkIndex` - Index des aktuellen Chunks (0-basiert)
- `totalChunks` - Gesamtanzahl der Chunks
- `fileSize` - Gesamtgröße der originalen Datei

#### Function Node zum Chunk speichern:
```javascript
// Speichere Chunks temporär (z.B. in einer Datenbank oder File Storage)
const chunk = $binary.data;
const fileName = $input.item.json.fileName;
const chunkIndex = $input.item.json.chunkIndex;
const totalChunks = $input.item.json.totalChunks;

// Speichere Chunk mit eindeutigem Namen
// z.B. in Google Drive oder lokalem Storage
const chunkFileName = `${fileName}.part${chunkIndex}`;

return {
  json: {
    fileName,
    chunkIndex,
    totalChunks,
    chunkFileName
  },
  binary: {
    data: chunk
  }
};
```

#### Function Node zum Zusammensetzen:
```javascript
// Wenn alle Chunks vorhanden sind:
// 1. Lade alle Chunks
// 2. Setze sie in der richtigen Reihenfolge zusammen
// 3. Speichere die finale Datei
// 4. Lösche die temporären Chunks
```

## Schritt 4: Telegram Bot erstellen und Chat ID erhalten

### Telegram Bot erstellen:
1. Öffne Telegram und suche nach **@BotFather**
2. Sende `/newbot`
3. Folge den Anweisungen (Name und Username für deinen Bot)
4. Du erhältst einen **Bot Token** - speichere diesen!
5. Füge den Token in n8n ein (Telegram Credentials)

### Chat ID herausfinden:
1. Suche deinen Bot in Telegram (Username von oben)
2. Sende eine Nachricht an den Bot (z.B. "Hallo")
3. Öffne: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   (Ersetze `<BOT_TOKEN>` mit deinem Token)
4. Suche nach `"chat":{"id":12345678}`
5. Die Zahl ist deine Chat ID - trage sie in n8n ein

## Schritt 5: CORS aktivieren (falls n8n auf anderem Server läuft)

Wenn dein n8n Server auf einer anderen Domain läuft als dein Frontend, musst du CORS aktivieren:

1. In n8n gehe zu: **Settings** → **Security**
2. Aktiviere **CORS**
3. Füge die URL deines Frontends hinzu:
   - Lokal: `http://localhost:5173`
   - Produktiv: `https://deine-domain.de`

## Schritt 6: Frontend deployen

### Lokale Entwicklung:
```bash
npm run dev
```
Öffne `http://localhost:5173`

### Produktiv deployen:

**Option A: Vercel (empfohlen - kostenlos)**
1. Erstelle Account auf [vercel.com](https://vercel.com)
2. Installiere Vercel CLI: `npm i -g vercel`
3. Im Projektordner: `vercel`
4. Folge den Anweisungen
5. Du erhältst eine URL wie `https://coda-upload.vercel.app`

**Option B: Netlify**
1. Erstelle Account auf [netlify.com](https://netlify.com)
2. Ziehe den `dist` Ordner (nach `npm run build`) auf Netlify

**Option C: Eigener Server**
```bash
npm run build
# Upload den 'dist' Ordner auf deinen Server
# Konfiguriere nginx/apache für die statischen Dateien
```

## Schritt 7: Testen

1. Starte dein Frontend:
   ```bash
   npm run dev
   ```
2. Öffne `http://localhost:5173`
3. Lade ein Test-Video hoch (z.B. eine kleine MP4-Datei)
4. Prüfe:
   - ✅ n8n Workflow wurde ausgelöst
   - ✅ Video wurde in Google Drive/Dropbox gespeichert
   - ✅ Telegram Nachricht wurde gesendet
   - ✅ Frontend zeigt "Upload erfolgreich"

## Schritt 8: Für den Kunden einrichten

### Was dein Kunde braucht:
1. **Die URL der Webseite** (z.B. `https://coda-upload.vercel.app`)
2. **Telegram auf seinem Handy** installiert
3. **Telegram Bot abonniert** (den du in Schritt 4 erstellt hast)

### So funktioniert es für den Kunden:
1. Kunde öffnet die Upload-Webseite auf seinem Gerät
2. Kunde wählt Video(s) aus und lädt sie hoch
3. Kunde erhält Telegram-Nachricht: "Video erhalten - auf welche Kanäle posten?"
4. Kunde antwortet mit gewünschten Plattformen
5. n8n verarbeitet die Antwort und postet das Video (späterer Workflow)

## Debugging Tipps

- **Frontend Fehler**: Browser Console öffnen (F12) → Console Tab
- **n8n Fehler**: n8n Execution Logs prüfen
- **Webhook testen**: n8n "Execute Once" Button nutzen
- **CORS Fehler**: Prüfe n8n CORS Settings
- **Video zu groß**: Prüfe n8n Upload-Limit und Server-Konfiguration

## Hinweis zu Dateigrößen-Limits

- Standard Browser Limit für FormData Upload: ~2GB
- n8n Standard Limit: Prüfe deine n8n Konfiguration
- Für sehr große Videos > 100MB: Verwende Chunked Upload (siehe Schritt 4)

## Nächste Schritte (Optional - für später)

### Social Media Auto-Posting implementieren:
1. Erstelle zweiten n8n Workflow: "Telegram Response → Social Media Post"
2. Trigger: Telegram erhält Nachricht
3. Parse die Antwort (Instagram, Facebook, etc.)
4. Nutze entsprechende n8n Nodes:
   - Instagram: Instagram Business Node
   - Facebook: Facebook Node
   - YouTube: YouTube Node
   - TikTok: TikTok Node (falls verfügbar)
   - LinkedIn: LinkedIn Node
5. Poste das Video auf die gewählten Plattformen

## Support

Bei Fragen oder Problemen:
1. Prüfe die Browser Console auf Fehler (F12)
2. Prüfe die n8n Execution Logs
3. Stelle sicher, dass die Webhook URL korrekt ist
4. Stelle sicher, dass CORS korrekt konfiguriert ist
5. Teste die Telegram Bot-Verbindung separat
