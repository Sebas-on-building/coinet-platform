# Coinet Platform - New Mac Setup Guide

Quick setup after cloning the repo on a fresh Mac.

## Prerequisites

1. **Node.js 20+** – Install via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), or [Homebrew](https://brew.sh):
   ```bash
   # Option A: nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20 && nvm use 20

   # Option B: Homebrew
   brew install node@20
   ```

2. **pnpm** – After Node is installed:
   ```bash
   corepack enable && corepack prepare pnpm@10.18.3 --activate
   # or: npm install -g pnpm
   ```

3. **PostgreSQL** – Install and start:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   # Create database: createdb coinet
   ```

4. **Redis** – Install and start:
   ```bash
   brew install redis
   brew services start redis
   ```

## Setup Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm prisma:gen:root

# 3. (Optional) Run migrations if database exists
cd apps/coinet-platform && pnpm db:migrate:deploy
```

## Create Database (if needed)

```bash
# Connect to PostgreSQL and create database
psql postgres -c "CREATE DATABASE coinet;"
```

## Run the Platform

**Terminal 1 – Backend:**
```bash
cd apps/coinet-platform && pnpm build && pnpm start
```

**Terminal 2 – Frontend:**
```bash
cd apps/client-web && pnpm dev
```

Open: **http://localhost:8080**

## Environment Files

- `apps/coinet-platform/.env` – Backend (already created with local defaults)
- `apps/client-web/.env` – Frontend (VITE_API_URL set)

Update `DATABASE_URL` if your PostgreSQL user/password differ. Add `VITE_CLERK_PUBLISHABLE_KEY` for auth (get from [Clerk dashboard](https://dashboard.clerk.com)).

## Troubleshooting

- **pnpm not found**: Run `corepack enable` or install Node via nvm/fnm first
- **Database connection refused**: Ensure PostgreSQL is running (`brew services list`)
- **Redis connection refused**: Ensure Redis is running (`redis-cli ping` should return PONG)
- **Port 3000 in use**: Change `PORT` in `apps/coinet-platform/.env`
