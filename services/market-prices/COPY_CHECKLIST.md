# ✅ COPY CHECKLIST - Follow Exactly

## 🎯 PREPARE (Do Once)

- [ ] Open VS Code **Window 1**: Local (`/Users/sebastian/Desktop/Arbeit/Coinet`)
- [ ] Open VS Code **Window 2**: Codespace (`/workspaces/coinet-platform`)
- [ ] Open Terminal in **Codespace**

---

## 📋 COPY FILES (Check Each Box)

### File 1: `cryptopanic-rest.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/providers/cryptopanic-rest.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/providers/`
- [ ] **CODESPACE**: Create new file `cryptopanic-rest.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/providers/cryptopanic-rest.ts` → See ~15K ✅

### File 2: `cryptopanic-news.service.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/services/cryptopanic-news.service.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/services/`
- [ ] **CODESPACE**: Create new file `cryptopanic-news.service.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/services/cryptopanic-news.service.ts` → See ~17K ✅

### File 3: `cryptopanic-sentiment.service.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/services/cryptopanic-sentiment.service.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/services/`
- [ ] **CODESPACE**: Create new file `cryptopanic-sentiment.service.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/services/cryptopanic-sentiment.service.ts` → See ~14K ✅

### File 4: `cryptopanic.types.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/types/cryptopanic.types.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/types/`
- [ ] **CODESPACE**: Create new file `cryptopanic.types.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/types/cryptopanic.types.ts` → See ~5K ✅

### File 5: `cryptopanic-integration.example.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/examples/cryptopanic-integration.example.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/examples/`
- [ ] **CODESPACE**: Create new file `cryptopanic-integration.example.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/examples/cryptopanic-integration.example.ts` → See ~18K ✅

### File 6: `cryptopanic.test.ts`
- [ ] **LOCAL**: Open `services/market-prices/src/tests/cryptopanic.test.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/src/tests/`
- [ ] **CODESPACE**: Create new file `cryptopanic.test.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh src/tests/cryptopanic.test.ts` → See ~21K ✅

### File 7: `test-cryptopanic.ts`
- [ ] **LOCAL**: Open `services/market-prices/test-cryptopanic.ts`
- [ ] **LOCAL**: Select All (Cmd+A) → Copy (Cmd+C)
- [ ] **CODESPACE**: Navigate to `services/market-prices/`
- [ ] **CODESPACE**: Create new file `test-cryptopanic.ts`
- [ ] **CODESPACE**: Paste (Cmd+V) → Save (Cmd+S)
- [ ] **TERMINAL**: Run `ls -lh test-cryptopanic.ts` → See ~5K ✅

---

## ✅ FINAL CHECK

- [ ] **TERMINAL**: Run verification script (see below)
- [ ] **TERMINAL**: All 7 files show ✅

**Verification Script** (copy-paste in codespace terminal):
```bash
cd /workspaces/coinet-platform/services/market-prices
for file in "src/providers/cryptopanic-rest.ts" "src/services/cryptopanic-news.service.ts" "src/services/cryptopanic-sentiment.service.ts" "src/types/cryptopanic.types.ts" "src/examples/cryptopanic-integration.example.ts" "src/tests/cryptopanic.test.ts" "test-cryptopanic.ts"; do [ -f "$file" ] && echo "✅ $file" || echo "❌ $file MISSING"; done
```

---

## 🚀 TEST

- [ ] **TERMINAL**: `export CRYPTOPANIC_AUTH_TOKEN=your-token-here`
- [ ] **TERMINAL**: `npx ts-node test-cryptopanic.ts`
- [ ] **TERMINAL**: See "ALL TESTS PASSED!" ✅

---

**✅ When all boxes are checked, you're done!**

