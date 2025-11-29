# 🔄 Sync Alchemy Whales Service to Your Existing Codespace

## Quick Sync Commands

### Step 1: Open Your Codespace Terminal

In your existing `coinet-platform` Codespace, run these commands:

```bash
# Navigate to repository root
cd /workspaces/coinet-platform

# Pull latest changes from GitHub
git pull origin feature/ai-data-feeder

# Or if you're on main/master branch
git fetch origin
git checkout feature/ai-data-feeder
git pull origin feature/ai-data-feeder
```

### Step 2: Navigate to Service Directory

```bash
cd services/alchemy-whales
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Setup Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file (use VS Code editor or nano)
code .env
# OR
nano .env
```

Add your Alchemy API keys:
```env
ALCHEMY_API_KEY_ETH=your_ethereum_key_here
ALCHEMY_API_KEY_POLYGON=your_polygon_key_here
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key_here
ALCHEMY_API_KEY_OPTIMISM=your_optimism_key_here
ALCHEMY_API_KEY_BASE=your_base_key_here
DATABASE_PASSWORD=your_password
WEBHOOK_SECRET=your_secret
```

### Step 5: Build the Service

```bash
npm run build
```

### Step 6: Setup Database (if using local PostgreSQL)

```bash
# Create database
createdb coinet_whales

# Run schema
psql -U postgres -d coinet_whales -f src/database/schema.sql
```

### Step 7: Start the Service

```bash
npm start
```

## 🚀 One-Line Sync Command

If you just want to quickly sync everything:

```bash
cd /workspaces/coinet-platform && \
git pull origin feature/ai-data-feeder && \
cd services/alchemy-whales && \
npm install && \
npm run build && \
echo "✅ Service synced! Run 'npm start' to start the service."
```

## 🔧 Using Codespace Secrets (Recommended)

Instead of `.env` file, use Codespace secrets:

1. Go to your GitHub repository
2. Settings → Secrets and variables → Codespaces
3. Add these secrets:
   - `ALCHEMY_API_KEY_ETH`
   - `ALCHEMY_API_KEY_POLYGON`
   - `ALCHEMY_API_KEY_ARBITRUM`
   - `ALCHEMY_API_KEY_OPTIMISM`
   - `ALCHEMY_API_KEY_BASE`
   - `DATABASE_PASSWORD`
   - `WEBHOOK_SECRET`

Then restart your Codespace - secrets will be available as environment variables!

## 📊 Verify Installation

```bash
# Check if service is running
curl http://localhost:9090/health

# Check metrics
curl http://localhost:9090/metrics

# Check info
curl http://localhost:9090/info
```

## 🐛 Troubleshooting

### If git pull fails:
```bash
# Check current branch
git branch

# Switch to feature branch
git checkout feature/ai-data-feeder

# Force pull if needed
git fetch origin
git reset --hard origin/feature/ai-data-feeder
```

### If npm install fails:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### If build fails:
```bash
# Check TypeScript version
npx tsc --version

# Rebuild
rm -rf dist
npm run build
```

### Port forwarding:
Codespace should auto-forward ports. If not:
```bash
# Check forwarded ports
gh codespace ports list

# Forward manually
gh codespace ports forward 3001:3001
gh codespace ports forward 9090:9090
gh codespace ports forward 9090:9090
```

## ✅ Verification Checklist

- [ ] Code pulled from GitHub
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env` or Codespace secrets)
- [ ] Service built (`npm run build`)
- [ ] Database setup (if using local PostgreSQL)
- [ ] Service started (`npm start`)
- [ ] Health check passes (`curl http://localhost:9090/health`)

## 🎯 Quick Start Script

Save this as `sync.sh` in your Codespace:

```bash
#!/bin/bash
set -e

echo "🔄 Syncing Alchemy Whales Service to Codespace..."

cd /workspaces/coinet-platform
git pull origin feature/ai-data-feeder || git fetch origin && git checkout feature/ai-data-feeder

cd services/alchemy-whales
npm install
npm run build

echo "✅ Sync complete!"
echo "📝 Next steps:"
echo "   1. Configure .env file: cp .env.example .env && code .env"
echo "   2. Start service: npm start"
```

Make it executable and run:
```bash
chmod +x sync.sh
./sync.sh
```

