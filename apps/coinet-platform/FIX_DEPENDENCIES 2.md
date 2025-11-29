# 🔧 Fix Dependencies Issue

## Problem

Server crashes with:
```
Error: Cannot find module 'etag'
```

## Solution

Install dependencies at **workspace root** first:

```bash
# Step 1: Install at workspace root
cd /workspaces/coinet-platform
pnpm install

# Step 2: Install at app level
cd apps/coinet-platform
pnpm install

# Step 3: Rebuild
pnpm build

# Step 4: Start
pnpm start
```

## Why This Happens

You're in a **pnpm workspace monorepo**. Dependencies need to be installed at the root level first so they're available to all workspace packages.

## Quick Fix (One-Liner)

```bash
cd /workspaces/coinet-platform && pnpm install && cd apps/coinet-platform && pnpm build && pnpm start
```

This installs everything and starts the server.

---

**After this, the server should start successfully!** ✅

