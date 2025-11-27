# Cloudflare Worker für R2 Video Upload

## Setup-Anleitung

### 1. Worker erstellen
1. Gehe zu [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
2. Klicke "Create Application" → "Create Worker"
3. Gib dem Worker einen Namen (z.B. `coda-video-upload`)
4. Klicke "Deploy"

### 2. Code einfügen
1. Klicke "Edit Code"
2. Lösche den Standard-Code
3. Kopiere den gesamten Inhalt von `worker.js` und füge ihn ein
4. Klicke "Save and Deploy"

### 3. R2 Bucket verbinden
1. Gehe zu Worker Settings → Variables
2. Scrolle zu "R2 Bucket Bindings"
3. Klicke "Add binding"
4. Variable name: `R2_BUCKET`
5. R2 bucket: `coda-videos`
6. Klicke "Save"

### 4. Worker URL kopieren
Nach dem Deploy bekommst du eine URL wie:
```
https://coda-video-upload.<dein-subdomain>.workers.dev
```

Diese URL brauchst du für das Frontend!

## Testen

```bash
# Health Check
curl https://coda-video-upload.<subdomain>.workers.dev/health

# Upload testen
curl -X POST https://coda-video-upload.<subdomain>.workers.dev/upload \
  -F "file=@test-video.mp4" \
  -F "fileName=test-video.mp4" \
  -F "mimeType=video/mp4"
```

## Endpunkte

- `GET /health` - Health Check
- `POST /upload` - Video Upload (FormData oder Binary)

## Response Format

```json
{
  "success": true,
  "url": "https://pub-41d321eea7e1460a8ceec66c6bb4016e.r2.dev/videos/1234567890-abc123.mp4",
  "filename": "videos/1234567890-abc123.mp4",
  "originalFilename": "mein-video.mp4",
  "size": 12345678,
  "mimeType": "video/mp4"
}
```
