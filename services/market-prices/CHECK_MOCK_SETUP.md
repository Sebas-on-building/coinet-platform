# Check Mock Setup

Run these commands in Codespace to find the mock setup:

```bash
cd /workspaces/coinet-platform/services/market-prices

# Check how axios is mocked
cat src/tests/defillama.test.ts | grep -B 10 -A 5 "mockResolvedValueOnce.*mockPools"

# Check if there's a beforeEach that sets up mocks
cat src/tests/defillama.test.ts | grep -B 5 -A 20 "beforeEach"

# Check the full test for "should get all pools"
cat src/tests/defillama.test.ts | grep -A 30 "should get all pools"
```

Share the output. The issue is likely that the mock isn't set up to intercept the `/yields` request.

