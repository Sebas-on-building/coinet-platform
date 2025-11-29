# 🔧 Codespace Fix: Missing Script Error

## Issue
```
npm error Missing script: "simulate:50k"
```

## Solution

The script exists in `package.json`, but you need to:

1. **Navigate to the service directory:**
   ```bash
   cd services/market-prices
   ```

2. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

3. **Run the script:**
   ```bash
   npm run simulate:50k
   ```

## Quick Fix Commands

```bash
# From project root
cd services/market-prices
npm install
npm run simulate:50k
```

## Verify Scripts Available

```bash
cd services/market-prices
npm run | grep simulate
```

Expected output:
```
  simulate:50k
  simulate:scaling
```

---

*The script is in package.json, just need to be in the right directory!*

