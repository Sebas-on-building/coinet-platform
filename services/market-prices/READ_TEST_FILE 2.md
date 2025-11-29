# Read the Test File to Find the Root Cause

Run this command in Codespace to see what the test mocks are doing:

```bash
cd /workspaces/coinet-platform/services/market-prices
cat src/tests/defillama.test.ts | grep -A 20 "should get all pools"
```

This will show us how the test is mocking the `/yields` endpoint.

Also check the stablecoins test:
```bash
cat src/tests/defillama.test.ts | grep -A 20 "should get all stablecoins"
```

Then share the output so we can see the exact mock structure.

The issue is likely that:
1. The mock isn't returning what we expect
2. OR the endpoint URL doesn't match (`/yields` vs `/pools` or something)
3. OR the axios mock isn't set up correctly for these endpoints

