# 🚨 CRITICAL: Railway Root Directory Setup

## The Problem
Railway is building from the **monorepo root** instead of `apps/coinet-platform`, causing Prisma to fail finding the schema file.

## The Solution
You **MUST** set the Root Directory in Railway Dashboard:

### Steps:
1. Go to Railway Dashboard → Your `coinet-platform` service
2. Click **Settings** tab
3. Scroll to **Source** section
4. Find **Root Directory** field
5. Set it to: `apps/coinet-platform`
6. Click **Save**

### Why This Matters
- Without this setting, Railway builds from `/` (monorepo root)
- Prisma can't find `prisma/schema.prisma` because it's looking in the wrong directory
- The build fails with "file or directory not found"

### Verification
After setting the root directory, Railway will:
- Build from `apps/coinet-platform/`
- Find `package.json` in the correct location
- Find `prisma/schema.prisma` in the correct location
- Successfully generate Prisma client
- Successfully compile TypeScript

### Current Configuration
- ✅ `package.json` has `prisma.schema` configured
- ✅ `railway.json` has correct buildCommand
- ✅ All scripts use explicit schema paths
- ❌ **Root Directory in Railway UI must be set manually**

## Alternative (If Root Directory Can't Be Set)
If for some reason you cannot set the root directory, the buildCommand would need to be:
```json
"buildCommand": "cd apps/coinet-platform && npm install && npx prisma generate && npm run build"
```

But **setting Root Directory is the correct solution** and should be done in the Railway UI.

