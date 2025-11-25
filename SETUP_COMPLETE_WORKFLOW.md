# 🚀 Komplette Integration: Frontend → n8n → Telegram → Social Media

## 📋 Was passiert:

```
1. Kunde lädt Video hoch auf https://coda-upload.netlify.app
   ↓
2. Frontend sendet Video an n8n Webhook
   ↓
3. n8n lädt Video zu Google Drive hoch
   ↓
4. n8n erstellt Queue-Eintrag in Notion
   ↓
5. Telegram Nachricht: "Video erhalten! Was soll ich machen?"
   ↓
6. Kunde antwortet: "Upload für Weber auf Instagram und TikTok"
   ↓
7. n8n lädt Video von Google Drive herunter
   ↓
8. n8n analysiert Video mit Gemini
   ↓
9. n8n erstellt Caption
   ↓
10. n8n lädt Video zu Postiz hoch
   ↓
11. n8n postet auf Social Media
   ↓
12. Telegram: "Upload erfolgreich! 🎉"
```

---

## 🔧 Schritt 1: n8n Webhook-Workflow importieren

### 1.1 Workflow importieren

1. Öffne n8n
2. Klicke auf **"+"** (Neuer Workflow)
3. Klicke auf **"⋮"** (Menü) → **"Import from File"**
4. Wähle die Datei: `n8n-webhook-workflow.json`
5. Klicke **"Import"**

### 1.2 Credentials überprüfen

Stelle sicher, dass diese Credentials verbunden sind:
- ✅ Google Drive OAuth2 API
- ✅ Notion API
- ✅ Telegram API

### 1.3 Webhook URL kopieren

1. Klicke auf den Node **"Webhook - Receive Video"**
2. Klicke auf **"Copy Production URL"**
3. Die URL sieht so aus:
   ```
   https://dein-n8n-server.com/webhook/video-upload
   ```

### 1.4 Workflow aktivieren

1. Oben rechts: **"Active"** Toggle einschalten
2. **Speichern** (Save)

---

## 🌐 Schritt 2: Frontend mit Webhook verbinden

### 2.1 Environment Variable in Netlify setzen

**Option A: Via Netlify UI (Empfohlen)**

1. Gehe zu Netlify Dashboard
2. Wähle dein Projekt: **coda-upload**
3. **Site settings** → **Environment variables**
4. Klicke **"Add a variable"**
5. Trage ein:
   ```
   Key: VITE_N8N_WEBHOOK_URL
   Value: https://dein-n8n-server.com/webhook/video-upload
   ```
6. **Save**
7. Gehe zu **Deploys** → **Trigger deploy** → **Deploy site**

**Option B: Direkt im Code (Schneller für Test)**

1. Öffne `src/App.jsx`
2. Zeile 12: Ersetze die URL:
   ```javascript
   const N8N_WEBHOOK_URL = 'https://dein-n8n-server.com/webhook/video-upload'
   ```
3. Git commit & push:
   ```bash
   git add src/App.jsx
   git commit -m "Add n8n webhook URL"
   git push
   ```
4. Netlify deployt automatisch neu

---

## 🧪 Schritt 3: Testen

### 3.1 Test durchführen

1. Öffne: `https://coda-upload.netlify.app`
2. Lade ein **MP4-Video** hoch (max 2-3 MB für ersten Test)
3. Klicke **"1 Video hochladen"**

### 3.2 Prüfen

**✅ Frontend:**
- "Upload erfolgreich!" erscheint

**✅ n8n:**
- Gehe zu n8n → **Executions**
- Siehst du eine erfolgreiche Execution?
- Klicke drauf und prüfe jeden Node:
  - Webhook: Video empfangen? ✅
  - Google Drive: Hochgeladen? ✅
  - Notion: Eintrag erstellt? ✅
  - Telegram: Nachricht gesendet? ✅

**✅ Google Drive:**
- Öffne deinen "Telephonate Upload" Ordner
- Ist das Video da?

**✅ Telegram:**
- Hast du die Nachricht erhalten?
- "Video wurde empfangen! Was soll ich machen?"

### 3.3 Wenn etwas nicht funktioniert

**Problem: "Upload failed"**
→ Browser Console öffnen (F12) → Fehler anschauen
→ n8n CORS aktivieren (siehe unten)

**Problem: Video nicht in Google Drive**
→ n8n Execution Log prüfen
→ Google Drive Folder ID prüfen

**Problem: Keine Telegram Nachricht**
→ Telegram Bot Token prüfen
→ Chat ID prüfen

---

## 🔒 Schritt 4: CORS in n8n aktivieren

Falls du einen CORS-Fehler bekommst:

1. n8n → **Settings** (⚙️)
2. **Security** → **CORS**
3. Aktiviere CORS
4. Füge hinzu:
   ```
   https://coda-upload.netlify.app
   ```
5. **Save**

---

## 📱 Schritt 5: Bestehenden "Auto Uploader" Workflow anpassen

Dein bestehender Workflow muss **NICHT** mehr den Google Drive Trigger haben!

### Option A: Google Drive Trigger deaktivieren

1. Öffne deinen "Auto Uploader" Workflow
2. Deaktiviere den Node **"Neue Audio-Datei erkannt"** (Google Drive Trigger)
3. **WICHTIG:** Lass den Rest des Workflows wie er ist!

### Option B: Beide Workflows parallel laufen lassen

- **Webhook-Workflow:** Für Uploads via Frontend
- **Auto Uploader:** Bleibt für manuelle Google Drive Uploads

Beide funktionieren parallel!

---

## 🎯 Schritt 6: Kompletten Flow testen

Jetzt den **GANZEN** Flow testen:

### 6.1 Video hochladen

1. Öffne `https://coda-upload.netlify.app`
2. Lade ein Test-Video hoch (MP4, max 50 MB)
3. Warte auf "Upload erfolgreich!"

### 6.2 Telegram Nachricht erhalten

Du (Cornelius) erhältst:
```
✅ Sehr geil Quandale Video wurde empfangen!

📁 Datei: test-video.mp4
📊 Größe: 15 MB

Was soll ich jetzt machen?

Beispiel:
"Upload für Weber auf Instagram und TikTok, motivierende Caption mit Hashtags"
```

### 6.3 Instructions senden

Antworte in Telegram:
```
Upload für Weber auf Instagram und TikTok, motivierende Caption mit Hashtags
```

### 6.4 Automatische Verarbeitung

n8n macht jetzt automatisch:
1. ✅ Findet das Video in der Queue (Notion)
2. ✅ Validiert dass es < 10 Minuten alt ist
3. ✅ Parst deine Instructions mit Gemini
4. ✅ Findet Weber's Instagram & TikTok Accounts
5. ✅ Lädt Video von Google Drive herunter
6. ✅ Analysiert Video mit Gemini
7. ✅ Erstellt Caption mit Hashtags
8. ✅ Lädt Video zu Postiz hoch
9. ✅ Postet auf Instagram & TikTok
10. ✅ Sendet Telegram Bestätigung: "Upload erfolgreich! 🎉"

---

## 🎨 Schritt 7: Für mehrere Kunden einrichten (Optional)

### 7.1 Mehrere Kunden unterstützen

Im Webhook-Workflow kannst du dynamisch werden:

```javascript
// Im "Set User Info" Node
// Statt hardcoded "Cornelius"
const userEmail = $json.userEmail || 'cornelius@example.com';
const userName = userEmail === 'cornelius@example.com' ? 'Cornelius' : 'Anderer Kunde';
const chatId = userEmail === 'cornelius@example.com' ? '8455857646' : 'ANDERE_CHAT_ID';
```

### 7.2 Frontend anpassen

Füge ein Login/Email-Feld im Frontend hinzu, um User zu identifizieren.

---

## 🚀 Fertig!

Dein komplettes System ist jetzt live:

✅ Kunde kann von überall Videos hochladen (Handy, Tablet, Desktop)
✅ Video landet automatisch in Google Drive
✅ Telegram Nachricht wird gesendet
✅ Kunde gibt Instructions
✅ Video wird automatisch auf Social Media gepostet
✅ Bestätigung via Telegram

---

## 📊 Nächste Schritte

- [ ] Mehr Kunden hinzufügen
- [ ] Custom Domain für Frontend (z.B. `upload.coda-marketing.de`)
- [ ] Analytics Dashboard
- [ ] Video-Vorschau vor Upload
- [ ] Mehrere Videos gleichzeitig
- [ ] Thumbnail-Generator
- [ ] Scheduling (Videos für später planen)

---

## 🐛 Troubleshooting

### Frontend → n8n funktioniert nicht

1. Browser Console (F12) öffnen → Fehler?
2. n8n CORS aktiviert?
3. Webhook URL korrekt in Frontend?
4. n8n Workflow aktiviert?

### Google Drive Upload funktioniert nicht

1. n8n Execution Log prüfen
2. Google Drive Credentials verbunden?
3. Folder ID korrekt?

### Telegram Nachricht kommt nicht an

1. Telegram Bot Token korrekt?
2. Chat ID korrekt?
3. Bot gestartet? (Sende /start an den Bot)

### Video wird nicht gepostet

1. Ist das Video < 10 Minuten alt?
2. n8n Execution Log vom "Auto Uploader" prüfen
3. Postiz Credentials korrekt?
4. Customer Account existiert in Notion?

---

## 💡 Pro-Tipps

**Performance:**
- Videos < 100 MB funktionieren am besten
- MP4 Format wird empfohlen
- H.264 Codec für beste Kompatibilität

**Sicherheit:**
- Nutze Environment Variables für URLs
- Basic Auth für Webhook (optional)
- Rate Limiting in n8n aktivieren

**User Experience:**
- Custom Domain macht es professioneller
- Logo hinzufügen im Frontend
- Favicon setzen
- PWA machen (installierbar auf Handy)

---

## 🎉 Du bist fertig!

Dein komplettes Video-Upload & Social Media Automation System läuft!

Bei Fragen: n8n Execution Logs sind dein bester Freund! 🚀
