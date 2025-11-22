# 🚀 Deployment & n8n Integration Guide

## Übersicht

Dieser Guide zeigt dir, wie du das Video-Upload Frontend mit deinem n8n Workflow verbindest und für deinen Kunden deployest.

## 📋 Was du brauchst

1. ✅ n8n Installation (läuft bereits)
2. ✅ Telegram Bot (bereits konfiguriert)
3. ✅ Google Drive Account (bereits verbunden)
4. ⚠️ **NEU:** Webhook in n8n für Video-Upload

---

## 🔧 Schritt 1: n8n Webhook für Upload erstellen

### 1.1 Neuen Workflow erstellen oder bestehenden anpassen

Du hast zwei Optionen:

**Option A: Separater Upload-Workflow (empfohlen)**
- Erstelle einen neuen Workflow: "Video Upload Handler"
- Dieser Workflow empfängt Videos vom Frontend
- Lädt sie zu Google Drive hoch
- Triggert deinen bestehenden "Auto Uploader" Workflow

**Option B: Bestehenden Workflow erweitern**
- Füge einen Webhook-Node zu "Auto Uploader" hinzu
- Ersetzt den Google Drive Trigger

### 1.2 Webhook Node hinzufügen

1. In n8n → Neuen Node hinzufügen → **Webhook**
2. Konfiguration:
   ```
   HTTP Method: POST
   Path: /video-upload
   Authentication: None (oder Basic Auth für Sicherheit)
   Response Mode: "Using 'Respond to Webhook' Node"
   ```
3. **Kopiere die Webhook URL!**
   - Sollte so aussehen: `https://dein-n8n-server.com/webhook/video-upload`

### 1.3 Video empfangen und zu Google Drive hochladen

Füge nach dem Webhook diese Nodes hinzu:

```
Webhook → Google Drive (Upload) → Set Variables → Respond to Webhook
```

**Google Drive Node:**
```
Operation: Upload a File
Binary Property: data (das ist das Video vom Frontend)
File Name: {{ $json.fileName }}
Parent Folder ID: 1Qb6A3L4YF1qpLL4X1K-K5h3UGQYCiiGb (dein "Telephonate Upload" Ordner)
```

**Set Variables Node:**
```
user_name: Cornelius
telegram_chat_id: 8455857646
file_name: {{ $json.name }}
file_id: {{ $json.id }}
file_url: {{ $json.webViewLink }}
file_size_mb: {{ Math.round($json.size / 1000000) }}
```

**Respond to Webhook Node:**
```json
{
  "success": true,
  "message": "Video erfolgreich hochgeladen!",
  "file_id": "{{ $json.id }}"
}
```

### 1.4 Mit bestehendem Workflow verbinden

Nach dem Upload gibt es zwei Wege:

**Weg 1: Direkt weitermachen**
- Verbinde direkt mit "Set User Info" Node aus deinem Auto Uploader
- Vorteil: Alles in einem Workflow

**Weg 2: Neuen Workflow triggern (sauberer)**
- Nach Google Drive Upload → "Workflow Trigger" Node
- Triggert deinen "Auto Uploader" Workflow
- Vorteil: Trennung von Upload und Verarbeitung

---

## 🌐 Schritt 2: Frontend konfigurieren

### 2.1 Webhook URL eintragen

1. Öffne `src/App.jsx`
2. Zeile 12: Ersetze die URL
   ```javascript
   const N8N_WEBHOOK_URL = 'https://dein-n8n-server.com/webhook/video-upload'
   ```

### 2.2 Testen (lokal)

```bash
npm run dev
```

1. Öffne `http://localhost:5173`
2. Lade ein Test-MP4 hoch
3. Prüfe in n8n:
   - ✅ Webhook wurde aufgerufen
   - ✅ Video in Google Drive
   - ✅ Telegram Nachricht erhalten

---

## 📱 Schritt 3: Für Kunden deployen

### Option A: Vercel (Empfohlen - Kostenlos)

**3.A.1 Vercel Account erstellen**
- Gehe zu [vercel.com](https://vercel.com)
- Sign up mit GitHub

**3.A.2 Projekt deployen**
```bash
npm install -g vercel
cd /path/to/coda-upload
vercel
```

**3.A.3 Fragen beantworten**
```
? Set up and deploy "~/coda-upload"? Y
? Which scope? → Dein Account
? Link to existing project? N
? What's your project's name? coda-video-upload
? In which directory is your code located? ./
? Want to override the settings? N
```

**3.A.4 Fertig!**
Du erhältst eine URL wie:
```
https://coda-video-upload.vercel.app
```

**3.A.5 Custom Domain (optional)**
- In Vercel Dashboard → Settings → Domains
- Füge deine Domain hinzu (z.B. `upload.coda-marketing.de`)

### Option B: Netlify (Auch kostenlos)

**3.B.1 Build erstellen**
```bash
npm run build
```

**3.B.2 Auf Netlify deployen**
1. Gehe zu [netlify.com](https://netlify.com)
2. Drag & Drop den `dist` Ordner
3. Fertig! Du erhältst eine URL wie `https://coda-upload.netlify.app`

### Option C: Eigener Server

**3.C.1 Build erstellen**
```bash
npm run build
```

**3.C.2 Upload auf Server**
- Kopiere den `dist` Ordner auf deinen Server
- Konfiguriere nginx/apache für statische Dateien

**3.C.3 Nginx Beispiel-Config**
```nginx
server {
    listen 80;
    server_name upload.deine-domain.de;

    root /var/www/coda-upload/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔒 Schritt 4: Sicherheit (Wichtig!)

### 4.1 CORS in n8n aktivieren

Falls n8n auf anderem Server läuft:

1. n8n Settings → Security → CORS
2. Aktiviere CORS
3. Füge deine Frontend-URL hinzu:
   ```
   https://coda-video-upload.vercel.app
   ```

### 4.2 Basic Auth für Webhook (Optional)

In n8n Webhook Node:
```
Authentication: Basic Auth
Username: cornelius
Password: [starkes Passwort]
```

Im Frontend (`src/App.jsx`):
```javascript
const response = await fetch(N8N_WEBHOOK_URL, {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Basic ' + btoa('cornelius:password')
  }
})
```

---

## 📲 Schritt 5: Für Kunden freigeben

### 5.1 URL teilen

Sende deinem Kunden (Cornelius):
```
🎬 Dein Video-Upload Portal:
https://coda-video-upload.vercel.app

Einfach Video hochladen und du bekommst eine Telegram-Nachricht!
```

### 5.2 Anleitung für Kunden

**Am Handy:**
1. Link öffnen
2. Auf die orangene Box tippen
3. Video auswählen (nur MP4!)
4. "1 Video hochladen" Button drücken
5. Warten auf Telegram-Nachricht

**Am Desktop:**
1. Link öffnen
2. Video in die Box ziehen ODER klicken zum Auswählen
3. "Videos hochladen" Button klicken
4. Warten auf Telegram-Nachricht

---

## 🔄 Workflow-Ablauf (nach Integration)

```
1. Kunde öffnet Upload-URL
   ↓
2. Lädt Video hoch (MP4)
   ↓
3. Frontend → n8n Webhook
   ↓
4. n8n lädt Video zu Google Drive hoch
   ↓
5. n8n erstellt Notion Queue Entry
   ↓
6. Telegram Nachricht: "Video erhalten!"
   ↓
7. Kunde antwortet mit Instructions
   ↓
8. n8n verarbeitet (wie vorher)
   ↓
9. Posts gehen live
   ↓
10. Telegram Bestätigung: "Upload erfolgreich!"
```

---

## 🧪 Testing Checklist

Bevor du es dem Kunden gibst:

- [ ] Video-Upload funktioniert lokal
- [ ] n8n Webhook erhält Videos
- [ ] Video landet in Google Drive
- [ ] Telegram Nachricht wird gesendet
- [ ] Frontend ist deployed (Vercel/Netlify)
- [ ] CORS ist konfiguriert
- [ ] Upload funktioniert vom Handy
- [ ] Upload funktioniert vom Desktop
- [ ] Fehlerbehandlung funktioniert (falsche Dateien)
- [ ] n8n Workflow läuft vollständig durch

---

## 🐛 Troubleshooting

### Problem: "Webhook URL not configured"
→ `src/App.jsx` Zeile 12 - URL eintragen!

### Problem: CORS Error
→ n8n Settings → CORS aktivieren und Frontend-URL hinzufügen

### Problem: Video nicht in Google Drive
→ Prüfe Google Drive Folder ID in n8n Node

### Problem: Keine Telegram Nachricht
→ Prüfe Telegram Bot Token und Chat ID in n8n

### Problem: Upload hängt
→ Browser Console öffnen (F12) → Fehler prüfen

---

## 📞 Support

Bei Problemen:
1. Browser Console prüfen (F12)
2. n8n Execution Logs prüfen
3. Webhook Test in n8n durchführen

---

## 🎉 Fertig!

Dein Kunde kann jetzt von überall Videos hochladen und sie werden automatisch verarbeitet!

**Nächste Schritte:**
- [ ] Weitere Kunden hinzufügen
- [ ] Mehr Social Media Plattformen
- [ ] Caption-Templates anpassen
- [ ] Analytics Dashboard bauen
