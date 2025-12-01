# 🚀 DEPLOY NOW - SIMPLE COMMANDS

## If `./deploy` doesn't exist, run these commands:

```bash
# 1. Build
cd services/market-prices && npm run build && cd ../..

# 2. Commit & Push
git add .
git commit -m "deploy: Phase 1 Week 1-2 complete"
git push

# 3. Deploy to Railway
# Option A: Via Dashboard (easiest)
# Go to https://railway.app → New Project → GitHub → Select repo

# Option B: Via CLI (if installed)
cd services/market-prices && railway up
```

---

## Or create the deploy script:

```bash
cat > deploy << 'EOF'
#!/bin/bash
set -e
cd services/market-prices && npm run build && cd ../..
git add . && git commit -m "deploy: Phase 1 Week 1-2" && git push
echo "✅ Pushed! Deploy at https://railway.app"
EOF

chmod +x deploy
./deploy
```

---

**That's it!** ✅

