# 🚀 GitHub Push Anleitung

## Das Projekt ist bereits Git-ready!

✅ Git Repository initialisiert
✅ Alle Dateien committed
✅ Branch: main

## So pushen Sie zu GitHub:

### Option 1: GitHub Desktop (Einfachste Methode)

1. Öffne GitHub Desktop
2. File → Add Local Repository
3. Wähle: `/Users/sebastiankauffmann/Documents/Projects/coda-upload`
4. Klicke "Publish repository"
5. Name: `coda-video-upload`
6. Description: "Modern video upload frontend for CODA Marketing"
7. ✅ Public oder Private wählen
8. Klicke "Publish repository"

### Option 2: Über GitHub.com (Manuell)

1. Gehe zu https://github.com/new
2. Repository Name: `coda-video-upload`
3. Description: "Modern video upload frontend for CODA Marketing with n8n integration"
4. Wähle Public oder Private
5. ❌ NICHT initialisieren mit README (wir haben schon Dateien!)
6. Klicke "Create repository"

7. Kopiere die Remote URL (sollte so aussehen):
   ```
   https://github.com/IHR-USERNAME/coda-video-upload.git
   ```

8. In deinem Terminal (in diesem Projekt-Ordner):
   ```bash
   git remote add origin https://github.com/IHR-USERNAME/coda-video-upload.git
   git push -u origin main
   ```

### Option 3: GitHub CLI installieren und nutzen

```bash
# Installiere GitHub CLI
brew install gh

# Login
gh auth login

# Repository erstellen und pushen
gh repo create coda-video-upload --public --source=. --description "Modern video upload frontend for CODA Marketing with n8n integration" --push
```

---

## ✅ Nach dem Push

Dein Repository ist online unter:
```
https://github.com/IHR-USERNAME/coda-video-upload
```

### Vercel Deployment (direkt von GitHub)

1. Gehe zu [vercel.com](https://vercel.com)
2. "Import Project"
3. Wähle dein GitHub Repository
4. Klicke "Deploy"
5. Fertig! 🎉

---

## 📝 Was ist bereits committed:

- ✅ Source Code (React App)
- ✅ README.md (Projekt-Übersicht)
- ✅ N8N_INTEGRATION.md (n8n Setup Guide)
- ✅ DEPLOYMENT_GUIDE.md (Vollständige Deploy-Anleitung)
- ✅ package.json & package-lock.json
- ✅ .gitignore (node_modules etc. ausgeschlossen)

---

## 🔒 Sicherheitshinweis

Die Webhook URL (`YOUR_N8N_WEBHOOK_URL_HERE`) ist noch nicht eingetragen - das ist gut!
So kannst du das Projekt öffentlich sharen, ohne deine n8n URL zu exposen.

Trage die URL erst ein, wenn du deployest.
