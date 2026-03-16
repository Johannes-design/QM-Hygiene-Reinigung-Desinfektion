# Kühlraum-Kontrolle – Setup-Anleitung

## 1. Firebase-Projekt anlegen

1. Gehe zu https://console.firebase.google.com
2. „Projekt hinzufügen" → Name z.B. `bh-kallwass-kuehlraum`
3. Analytics kann deaktiviert bleiben
4. Nach Erstellung: **Firestore Database** → „Datenbank erstellen"
   - Modus: „Im Produktionsmodus starten"
   - Region: `europe-west3 (Frankfurt)`

### Firestore-Regeln setzen
In der Firestore-Konsole unter „Regeln" einfügen:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /eintraege/{doc} {
      allow read, write: if true;
    }
  }
}
```
→ Veröffentlichen

### Firebase Web-App registrieren
1. In Firebase-Projekteinstellungen: Web-App hinzufügen (</> Symbol)
2. App-Nickname: `kuehlraum`
3. Die angezeigte `firebaseConfig` notieren – du brauchst die Werte für Schritt 3

---

## 2. GitHub-Repository

1. Neues Repo anlegen: z.B. `kuehlraum-kontrolle`
2. Alle Dateien aus diesem Ordner hochladen (flache Struktur beibehalten)

---

## 3. Vercel deployen

1. https://vercel.com → „Add New Project" → GitHub-Repo auswählen
2. Framework: **Vite** (wird automatisch erkannt)
3. **Environment Variables** hinzufügen (aus Firebase-Config):

| Variable | Wert aus Firebase |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

4. „Deploy" klicken → fertig ✓

---

## 4. PWA auf iPad/iPhone installieren

1. App-URL im Safari öffnen
2. Teilen-Button → „Zum Home-Bildschirm hinzufügen"
3. App läuft dann fullscreen wie eine native App

---

## Icons (optional)

Lege zwei PNG-Icons in den `/public`-Ordner:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Z.B. einfach das BH-Kallwaß-Logo quadratisch zuschneiden.
