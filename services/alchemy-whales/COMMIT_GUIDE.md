# ✅ What to Commit - DO NOT COMMIT SECRETS!

## ❌ NEVER COMMIT:

- `.env` - Contains API keys and secrets
- `.env.local` - Contains local secrets
- `.env.*` - Any environment files with real keys
- `.turbo/cache/` - Build cache files
- `node_modules/` - Dependencies
- `dist/` - Build output

## ✅ SAFE TO COMMIT:

- `.gitignore` - Git ignore rules
- `*.md` - Documentation files
- `*.ts` - Source code
- `*.json` - Configuration files (package.json, tsconfig.json, etc.)
- `*.sh` - Scripts
- `*.yaml` / `*.yml` - Kubernetes configs
- `Dockerfile` - Docker configuration
- `src/` - Source code directory

## 🚨 Before Committing:

1. **Check for .env files:**
   ```bash
   git status | grep "\.env"
   ```
   If you see `.env`, **DO NOT COMMIT IT!**

2. **Check for secrets:**
   ```bash
   git diff | grep -i "api_key\|password\|secret\|token"
   ```
   If you see actual keys/passwords, **DO NOT COMMIT!**

3. **Verify .gitignore includes:**
   - `.env`
   - `.turbo/`
   - `node_modules/`
   - `dist/`

## ✅ Safe Commit Command:

```bash
# Only commit safe files
git add .gitignore
git add *.md
git add *.sh
git add src/
git add package.json tsconfig.json
git add Dockerfile
git add k8s/

# Verify what you're committing
git status

# Commit
git commit -m "your message"
```

## 🛡️ If You Accidentally Committed .env:

```bash
# Remove from git (but keep local file)
git rm --cached .env

# Add to .gitignore
echo ".env" >> .gitignore

# Commit the fix
git add .gitignore
git commit -m "fix: Remove .env from git tracking"
```

