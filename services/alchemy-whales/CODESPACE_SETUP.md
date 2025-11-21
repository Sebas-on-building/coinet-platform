# GitHub Codespace Setup Guide

## 🚀 Quick Start in Codespace

### Step 1: Open in Codespace

1. Navigate to your GitHub repository
2. Click "Code" → "Codespaces" → "Create codespace on main"
3. Wait for codespace to initialize (2-3 minutes)

### Step 2: Setup Environment

```bash
# Navigate to service directory
cd services/alchemy-whales

# Copy environment template
cp .env.example .env

# Edit environment file (use Codespace editor)
code .env
```

Add your Alchemy API keys and configuration.

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build

```bash
npm run build
```

### Step 5: Setup Database (if using local PostgreSQL)

The `.devcontainer/devcontainer.json` includes PostgreSQL and Redis.

```bash
# Database should be available at localhost:5432
# Create database
createdb coinet_whales

# Run schema
psql -U postgres -d coinet_whales -f src/database/schema.sql
```

### Step 6: Start Service

```bash
npm start
```

### Step 7: Access Service

Codespace automatically forwards ports:
- **Webhooks**: `https://your-codespace-xxxxx.preview.app.github.dev:3001`
- **Health**: `https://your-codespace-xxxxx.preview.app.github.dev:9090/health`
- **Metrics**: `https://your-codespace-xxxxx.preview.app.github.dev:9090/metrics`

## 🔧 DevContainer Features

The `.devcontainer/devcontainer.json` includes:

- **Node.js 18** - TypeScript runtime
- **PostgreSQL 14** - Database
- **Redis 7** - Caching
- **Docker-in-Docker** - Container support
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - TypeScript

## 📝 Development Workflow

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

### Watching for Changes

```bash
# Install ts-node-dev for hot reload
npm install -g ts-node-dev

# Run with watch mode
ts-node-dev --respawn src/index.ts
```

## 🔐 Environment Variables in Codespace

### Option 1: .env File (Local)

Create `.env` file in `services/alchemy-whales/` directory.

### Option 2: Codespace Secrets

1. Go to repository → Settings → Secrets and variables → Codespaces
2. Add secrets:
   - `ALCHEMY_API_KEY_ETH`
   - `ALCHEMY_API_KEY_POLYGON`
   - etc.

Access in codespace:
```bash
echo $ALCHEMY_API_KEY_ETH
```

## 🐛 Troubleshooting

### Port Forwarding Issues

```bash
# Check forwarded ports
gh codespace ports list

# Forward port manually
gh codespace ports forward 3001:3001
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Check connection
psql -U postgres -c "SELECT version();"
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf dist tsconfig.tsbuildinfo
npm run build
```

## 📊 Monitoring in Codespace

### View Logs

```bash
# Application logs
npm start | tee logs/app.log

# Or use VS Code terminal
```

### Health Checks

```bash
# In another terminal
curl http://localhost:8080/health
curl http://localhost:9090/metrics
```

## 🔄 Git Workflow

```bash
# Make changes
git add .
git commit -m "feat: your changes"
git push

# Codespace auto-syncs with GitHub
```

## 💡 Tips

1. **Use VS Code Terminal** - Integrated terminal is convenient
2. **Port Forwarding** - Automatically configured
3. **Extensions** - Pre-installed in devcontainer
4. **Hot Reload** - Use `ts-node-dev` for development
5. **Database GUI** - Use VS Code PostgreSQL extension

## 📚 Resources

- GitHub Codespaces Docs: https://docs.github.com/en/codespaces
- VS Code Remote Development: https://code.visualstudio.com/docs/remote/remote-overview
- Service Documentation: See `README.md`

