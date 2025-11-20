# 🚨 Quick Fix for Codespace Issues

## The Problem

You encountered these errors:
1. ❌ `npm install` failed with "Cannot read properties of null"
2. ❌ `.env.example` file missing
3. ❌ `npm start` script not found
4. ❌ Service not running

## ✅ Solution - Copy & Paste This:

Run these commands **one by one** in your Codespace terminal:

```bash
# 1. Navigate to service directory
cd /workspaces/coinet-platform/services/alchemy-whales

# 2. Pull latest fixes
git pull origin feature/ai-data-feeder

# 3. Run the automated fix script
chmod +x FIX_CODESPACE.sh
./FIX_CODESPACE.sh
```

**OR** run these commands manually:

```bash
# Navigate to service
cd /workspaces/coinet-platform/services/alchemy-whales

# Create .env.example (if still missing)
cat > .env.example << 'EOF'
ALCHEMY_API_KEY_ETH=your_ethereum_api_key_here
ALCHEMY_API_KEY_POLYGON=your_polygon_api_key_here
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_api_key_here
ALCHEMY_API_KEY_OPTIMISM=your_optimism_api_key_here
ALCHEMY_API_KEY_BASE=your_base_api_key_here
DATABASE_PASSWORD=your_password_here
WEBHOOK_SECRET=your_webhook_secret_here
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=coinet_whales
DATABASE_USER=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
WEBHOOK_PORT=3001
METRICS_PORT=9090
HEALTH_CHECK_PORT=8080
LOG_LEVEL=info
NODE_ENV=development
EOF

# Install dependencies (standalone, not workspace)
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Build the service
npm run build

# Create .env from example
cp .env.example .env

# Edit .env with your API keys
code .env

# Start the service
npm start
```

## 🔍 Verify It's Working

In **another terminal**, run:

```bash
# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:9090/metrics

# Info
curl http://localhost:8080/info
```

## 🐛 If Still Having Issues

### npm install fails:
```bash
# Clear everything and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps --no-save
```

### Build fails:
```bash
# Check TypeScript
npx tsc --version

# Clean and rebuild
rm -rf dist
npm run build
```

### Service won't start:
```bash
# Check if dist folder exists
ls -la dist/

# Check if index.js exists
ls -la dist/index.js

# Run directly
node dist/index.js
```

## 📝 Important Notes

1. **This service runs standalone** - Don't use `turbo build` from root
2. **Install dependencies locally** - Use `npm install` in the service directory
3. **Build before starting** - Always run `npm run build` first
4. **Configure .env** - Edit `.env` with your real API keys

## ✅ Success Checklist

- [ ] `.env.example` exists
- [ ] `.env` file created and configured
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed successfully
- [ ] `dist/` folder contains compiled files
- [ ] `npm start` runs without errors
- [ ] Health check returns 200 OK

## 🆘 Still Stuck?

Check these files for more help:
- `CODESPACE_FIX_COMMANDS.txt` - Simple command list
- `SYNC_TO_CODESPACE.md` - Detailed sync guide
- `README.md` - Full documentation

