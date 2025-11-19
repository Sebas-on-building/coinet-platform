# 🔑 Get API Token & Test CryptoPanic

## ⚠️ Error: 400 Bad Request

This means your token is invalid. You're using `your-actual-token-here` which is a placeholder.

---

## 🔑 Step 1: Get Your Real API Token

### Option A: Free Development Plan (Recommended for Testing)

1. **Visit**: https://cryptopanic.com/developers/api/
2. **Sign up** (free account)
3. **Go to API section**
4. **Copy your auth token** (looks like: `abc123def456...`)

### Option B: Use Public API (No Token Needed)

For testing, you can use the public endpoint without authentication:

```bash
# Test public API first
curl "https://cryptopanic.com/api/v1/posts/?public=true"
```

---

## 💾 Step 2: Save All Files in Codespace

**In VS Code Codespace:**
1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
2. Type: "Save All"
3. Press Enter
4. Or: `Cmd+K S` (save all)

**Or manually save each file:**
- Click each unsaved file tab
- Press `Cmd+S` to save

---

## 🚀 Step 3: Set Real Token & Test

```bash
cd /workspaces/coinet-platform/services/market-prices

# Replace with YOUR ACTUAL TOKEN from CryptoPanic
export CRYPTOPANIC_AUTH_TOKEN=abc123your-actual-token-here
export CRYPTOPANIC_PLAN=development  # or 'growth' if you have paid plan

# Run test
npx ts-node test-cryptopanic.ts
```

---

## 🎯 Quick Test Without Token (Public API)

If you want to test without a token first, modify the test temporarily:

```typescript
// In test-cryptopanic.ts, change:
const response = await client.fetchPosts({ public: true });
```

But you'll still need a token for most features.

---

## ✅ Expected Success Output

```
🚀 Testing CryptoPanic Integration...
✅ Initializing CryptoPanic client...
📰 Test 1: Fetching latest crypto news...
✅ Success! Fetched 20 posts

📄 Latest Article:
   Title: Bitcoin Surges Past $50,000
   Source: CoinTelegraph
   URL: https://...

🎉 ALL TESTS PASSED! CryptoPanic integration is working!
```

---

## 📝 Token Setup Checklist

- [ ] Visited https://cryptopanic.com/developers/api/
- [ ] Signed up for account
- [ ] Copied auth token
- [ ] Saved all files in codespace
- [ ] Set `CRYPTOPANIC_AUTH_TOKEN` with real token
- [ ] Ran test successfully

---

**Get your token, save files, then test again!** 🚀

