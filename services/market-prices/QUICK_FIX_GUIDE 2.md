# 🚀 Quick Fix Guide for DeFiLlama Tests

## In Codespace Terminal, run:

```bash
cd services/market-prices
node inspect-and-fix-defillama.js
```

This will show you how the mocks are structured.

## OR manually check the test file:

```bash
cd services/market-prices
cat src/tests/defillama.test.ts | grep -A 20 "mockResolvedValue\|/yields\|/stablecoins"
```

## Common Mock Patterns to Look For:

1. **Direct array mock:**
   ```typescript
   mockResolvedValue({ data: [{ symbol: 'USDC', apy: 3.5 }] })
   ```

2. **Nested property mock:**
   ```typescript
   mockResolvedValue({ data: { yields: [{ symbol: 'USDC', apy: 3.5 }] } })
   ```

3. **Direct return (no data wrapper):**
   ```typescript
   mockResolvedValue([{ symbol: 'USDC', apy: 3.5 }])
   ```

## After Finding the Structure:

Update `src/providers/defillama-rest.ts`:
- `getPools()` method (around line 325)
- `getStablecoins()` method (around line 370)

To match the exact mock structure you found.

## Test:

```bash
npm run test:defi
```

Expected: All 24 tests pass ✅

