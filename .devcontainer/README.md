# 🚀 Coinet Codespace

## Quick Start

1. **Open Codespace**
   - Go to GitHub repository
   - Click "Code" → "Codespaces"
   - Click "Create codespace"
   - Wait 2-3 minutes for setup

2. **Start Development**
   ```bash
   npm run dev
   ```

3. **Access Services**
   - Market Prices API: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379 (if configured)

## Features

- ✅ TypeScript 5.3+
- ✅ Node.js 18
- ✅ PostgreSQL 14
- ✅ Docker-in-Docker
- ✅ Pre-configured VS Code extensions
- ✅ Auto-install dependencies
- ✅ Auto-build on create

## Environment Variables

Set in Codespace secrets or `.env` file:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coinet
NODE_ENV=development
LOG_LEVEL=debug
```

## Database Setup

Migrations run automatically on first start, or manually:

```bash
psql $DATABASE_URL < services/market-prices/migrations/001_create_pattern_mining_tables.sql
```

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm run test

# Start dev server
npm run dev

# Lint code
npm run lint
```

## Ports

- **3000**: Market Prices API
- **5432**: PostgreSQL
- **6379**: Redis (optional)

## Troubleshooting

**Problem**: PostgreSQL not running
**Solution**: Check devcontainer features are enabled

**Problem**: Dependencies not installed
**Solution**: Run `npm install` manually

**Problem**: Port conflicts
**Solution**: Change ports in `devcontainer.json`

---

**Status**: ✅ Ready for Development  
**Last Updated**: November 23, 2025

