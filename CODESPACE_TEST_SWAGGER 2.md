# Codespace Swagger Test Guide

## ✅ Status
- [x] Git pull erfolgreich
- [x] Dependencies installiert (API Gateway & User Service)
- [ ] Services gestartet
- [ ] Swagger UI getestet

## 🚀 Services starten

### Option 1: Beide Services parallel starten (Terminal 1 & 2)

**Terminal 1 - API Gateway:**
```bash
cd services/api-gateway
npm run dev
# Oder: npm start (für Production)
```

**Terminal 2 - User Service:**
```bash
cd services/user
npm run dev
# Oder: npm start (für Production)
```

### Option 2: Mit PM2 (wenn installiert)
```bash
cd services/api-gateway && npm start &
cd ../user && npm start &
```

## 🧪 Swagger UI testen

Nachdem beide Services laufen:

1. **API Gateway Swagger:**
   - URL: http://localhost:8000/docs
   - OpenAPI JSON: http://localhost:8000/openapi.json
   - Prüfe: Server URL sollte `http://localhost:8000` sein

2. **User Service Swagger:**
   - URL: http://localhost:8005/docs
   - OpenAPI JSON: http://localhost:8005/openapi.json
   - Prüfe: Server URL sollte `http://localhost:8005` sein

## ✅ Was zu prüfen ist

1. **Swagger UI lädt korrekt**
   - Keine JavaScript-Fehler in der Konsole
   - Alle Endpoints werden angezeigt

2. **Server URL ist korrekt**
   - Im Swagger UI oben rechts sollte der Server angezeigt werden
   - Sollte `http://localhost:8000` (Gateway) oder `http://localhost:8005` (User) sein

3. **API Calls funktionieren**
   - Teste einen Endpoint (z.B. `/health`)
   - Sollte erfolgreich antworten

4. **OpenAPI JSON ist korrekt**
   - `servers` Array sollte die richtige URL enthalten
   - Prüfe: `curl http://localhost:8000/openapi.json | jq .servers`

## 🔍 Troubleshooting

### Service startet nicht
```bash
# Prüfe ob Port bereits belegt ist
lsof -i :8000
lsof -i :8005

# Prüfe Logs
cd services/api-gateway && npm run dev
```

### Swagger UI zeigt falsche URL
- Prüfe Environment-Variablen: `echo $SWAGGER_SERVER_URL`
- Prüfe ob `RAILWAY_PUBLIC_DOMAIN` gesetzt ist (sollte in Codespace leer sein)
- Standard sollte `localhost` sein

### CORS Fehler
- Normal in Codespace wenn von außen zugegriffen wird
- Teste direkt im Browser innerhalb von Codespace

## 📝 Nächste Schritte nach erfolgreichem Test

1. ✅ Swagger funktioniert lokal
2. ⏭️ Railway Deployment testen
3. ⏭️ Prüfe ob Railway automatisch die richtige URL verwendet

