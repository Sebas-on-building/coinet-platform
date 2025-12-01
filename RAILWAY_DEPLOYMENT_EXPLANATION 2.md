# Railway Deployment - Warum alle Services gleichzeitig deployen

## 🔍 Problem

Wenn du eine Änderung machst, deployen alle Services gleichzeitig. Das ist nicht normal und kann mehrere Gründe haben:

## 🎯 Mögliche Ursachen

### 1. **Alle Services zeigen auf denselben Branch**
- Wenn alle Services auf `feature/ai-data-feeder` zeigen
- Jeder Push triggert alle Services
- **Lösung**: Nur betroffene Services sollten auf den Branch zeigen

### 2. **Shared Variables werden geändert**
- Wenn Shared Variables geändert werden
- Railway deployed alle Services, die diese verwenden
- **Lösung**: Shared Variables nur ändern, wenn nötig

### 3. **Root railway.json betrifft alle**
- Eine `railway.json` im Root-Verzeichnis könnte alle Services beeinflussen
- **Lösung**: Root railway.json sollte nur für Root-Services sein

### 4. **Watch Paths zu breit**
- Watch Paths könnten zu viele Dateien überwachen
- **Lösung**: Spezifische Watch Paths für jeden Service

## ✅ Lösung: Service-spezifische Watch Paths

### Für jeden Service in Railway konfigurieren:

**market-prices Service:**
- Watch Path: `services/market-prices/**`

**ai-data-feeder Service:**
- Watch Path: `services/ai-data-feeder/**`

**alchemy-whales Service:**
- Watch Path: `services/alchemy-whales/**`

**coinet-platform Service:**
- Watch Path: `apps/coinet-platform/**`

## 🔧 Wie man Watch Paths in Railway setzt

1. **Railway Dashboard** öffnen
2. **Service auswählen** (z.B. `market-prices`)
3. **Settings** → **Watch Paths**
4. **Add pattern** klicken
5. Pattern eingeben: `services/market-prices/**`
6. **Save**

## 📋 Alternative: Separate Branches

Wenn du willst, dass Services unabhängig deployen:

1. **Für jeden Service einen eigenen Branch:**
   - `market-prices` → `main` oder `production`
   - `ai-data-feeder` → `main` oder `production`
   - `alchemy-whales` → `main` oder `production`

2. **Nur wenn nötig auf Feature-Branch wechseln**

## 🎯 Empfohlene Konfiguration

### Option 1: Watch Paths (Empfohlen)
- Jeder Service hat spezifische Watch Paths
- Nur relevante Services deployen bei Änderungen
- Einfach zu verwalten

### Option 2: Separate Branches
- Jeder Service hat eigenen Branch
- Mehr Kontrolle über Deployments
- Mehr Branches zu verwalten

## ⚠️ Wichtig

**Shared Variables ändern triggert immer alle Services!**
- Wenn du Shared Variables änderst
- Werden alle Services neu deployed, die diese verwenden
- Das ist normal und gewollt

## 🔍 Prüfen, welche Services betroffen sind

1. **Railway Dashboard** → **Project Settings** → **Shared Variables**
2. **Prüfe**, welche Services welche Shared Variables verwenden
3. **Änderungen an Shared Variables** = alle betroffenen Services deployen

## 💡 Tipp

Wenn du nur einen Service ändern willst:
- **Ändere nur Service-spezifische Dateien**
- **Setze Watch Paths** für jeden Service
- **Vermeide Änderungen an Shared Variables**, wenn nicht nötig

