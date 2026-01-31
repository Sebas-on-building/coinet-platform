# 🔧 Fix Push Error - Step by Step

## Issue: Remote has changes you don't have locally

## Solution: Pull first, then push

### Step 1: Pull remote changes

```bash
# Pull and merge remote changes
git pull origin feature/ai-data-feeder

# If there are conflicts, resolve them, then:
git add .
git commit -m "merge: Resolve conflicts with remote branch"
```

### Step 2: Remove .env files from commit (they shouldn't be committed)

```bash
# Remove .env files from git tracking (but keep them locally)
git rm --cached .env
git rm --cached apps/coinet-platform/.env
git rm --cached services/alchemy-whales/.env
git rm --cached services/alchemy-whales/.env.swp

# Add to .gitignore if not already there
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "*.swp" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "chore: Remove .env files from git tracking"
```

### Step 3: Push again

```bash
git push origin feature/ai-data-feeder
```

---

## Alternative: Force push (⚠️ Only if you're sure remote changes aren't needed)

```bash
# ⚠️ WARNING: This overwrites remote branch
git push origin feature/ai-data-feeder --force
```

**Only use force push if:**
- You're the only one working on this branch
- You're sure the remote changes aren't important
- You've backed up the remote branch

---

## Complete Fix Command Sequence

```bash
# 1. Pull remote changes
git pull origin feature/ai-data-feeder

# 2. Remove .env files from tracking
git rm --cached .env apps/coinet-platform/.env services/alchemy-whales/.env services/alchemy-whales/.env.swp

# 3. Update .gitignore
echo -e "\n# Environment files\n.env\n.env.*\n*.swp" >> .gitignore

# 4. Commit the fix
git add .gitignore
git commit -m "chore: Remove .env files from git, update .gitignore"

# 5. Push
git push origin feature/ai-data-feeder
```

---

## Quick One-Liner (Safe Method)

```bash
git pull origin feature/ai-data-feeder && \
git rm --cached .env apps/coinet-platform/.env services/alchemy-whales/.env services/alchemy-whales/.env.swp 2>/dev/null; \
echo -e "\n# Environment files\n.env\n.env.*\n*.swp" >> .gitignore && \
git add .gitignore && \
git commit -m "chore: Remove .env files from git" && \
git push origin feature/ai-data-feeder
```

