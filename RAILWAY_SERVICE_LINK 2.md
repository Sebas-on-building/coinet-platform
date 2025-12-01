# 🔗 Link Railway Service

## Current Status
- ✅ Logged in as: s.kuhrueber@gmail.com
- ✅ Project: Coinet
- ✅ Environment: production
- ⚠️ Service: None (needs to be linked)

## Link to Market Prices Service

```bash
# Navigate to market-prices service directory
cd services/market-prices

# Link to Railway service
railway link

# Select the "Market Prices" service when prompted
# Or if you know the service ID:
# railway link <service-id>

# Check status after linking
railway status

# View logs
railway logs --tail 50

# Get service URL
railway domain
```

## Alternative: List All Services

```bash
# List all services in the project
railway service list

# Then link to specific service
railway link <service-name>
```

## Quick Commands After Linking

```bash
cd services/market-prices
railway link
railway status
railway logs
railway domain
railway variables
```

## If Service Doesn't Exist Yet

If the service doesn't exist, create it:

```bash
cd services/market-prices
railway service create market-prices
railway link
```

Then configure in Railway Dashboard:
1. Set Root Directory: `services/market-prices`
2. Set Build Command: `npm run build`
3. Set Start Command: `npm start`
4. Add environment variables

