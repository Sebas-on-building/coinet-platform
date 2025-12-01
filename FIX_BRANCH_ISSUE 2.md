# 🔧 Fix Branch Divergence Issue

## Problem
- You're on `main` branch locally
- Trying to push to `feature/ai-data-feeder` 
- Branches have "unrelated histories"
- Remote branch is ahead of local

## Solution: Switch to feature branch and merge

### Step 1: Switch to the feature branch

```bash
# Checkout the feature branch (or create it if it doesn't exist locally)
git checkout feature/ai-data-feeder

# If branch doesn't exist locally, create it and track remote
git checkout -b feature/ai-data-feeder origin/feature/ai-data-feeder
```

### Step 2: Pull with allow-unrelated-histories

```bash
# Pull remote changes, allowing unrelated histories
git pull origin feature/ai-data-feeder --allow-unrelated-histories

# If there are conflicts, resolve them, then:
git add .
git commit -m "merge: Merge remote feature branch changes"
```

### Step 3: Push

```bash
git push origin feature/ai-data-feeder
```

---

## Complete Fix Sequence

```bash
# 1. Switch to feature branch
git checkout feature/ai-data-feeder || git checkout -b feature/ai-data-feeder origin/feature/ai-data-feeder

# 2. Pull with allow-unrelated-histories
git pull origin feature/ai-data-feeder --allow-unrelated-histories

# 3. Push
git push origin feature/ai-data-feeder
```

---

## Alternative: Force push (if you're sure remote changes aren't needed)

```bash
# Switch to feature branch
git checkout feature/ai-data-feeder || git checkout -b feature/ai-data-feeder

# Force push (overwrites remote)
git push origin feature/ai-data-feeder --force
```

---

## Quick One-Liner (Safe Method)

```bash
git checkout feature/ai-data-feeder 2>/dev/null || git checkout -b feature/ai-data-feeder origin/feature/ai-data-feeder && \
git pull origin feature/ai-data-feeder --allow-unrelated-histories && \
git push origin feature/ai-data-feeder
```

