# Fix DeFiLlama Test Failures - Divine Perfection Required

## Problem
The DeFiLlama REST client tests are failing with 4 test cases:
1. `should get all pools` - expects array with length 1, gets empty array
2. `should get specific pool by ID` - expects pool object with `pool: 'pool-id-1'`, gets undefined
3. `should get all stablecoins` - expects array with length 1, gets empty array  
4. `should get specific stablecoin` - expects stablecoin object with `symbol: 'USDC'`, gets undefined

## Task
1. **First, examine the test file** `src/tests/defillama.test.ts` to understand:
   - How the axios mocks are structured
   - What response format the mocks return for `/yields` and `/stablecoins` endpoints
   - What the expected data structure looks like for pools and stablecoins

2. **Fix the implementation** in `src/providers/defillama-rest.ts`:
   - Update `getPools()` to correctly parse the mocked response structure
   - Update `getPoolById()` to correctly find pools by ID
   - Update `getStablecoins()` to correctly parse the mocked response structure
   - Update `getStablecoin()` to correctly find stablecoins by symbol/ID
   - Ensure the response parsing matches exactly what the test mocks provide

3. **Key Requirements**:
   - The mocks likely return data in a specific format (could be direct array, wrapped in `data`, or nested in another property)
   - The test expects `getPools()` to return `[{ symbol: 'USDC', apy: 3.5 }]`
   - The test expects `getPoolById('pool-id-1')` to return `{ pool: 'pool-id-1', ... }`
   - The test expects `getStablecoins()` to return `[{ symbol: 'USDT', circulating: { peggedUSD: 80000000000 } }]`
   - The test expects `getStablecoin('USDC')` to return `{ symbol: 'USDC', ... }`

4. **Run the tests** to verify:
   ```bash
   npm run test:defi
   ```

5. **Ensure all tests pass** - The 4 failing tests should now pass while keeping all 20 passing tests still passing.

## Expected Outcome
All 24 tests should pass with 0 failures. The implementation should correctly parse mocked axios responses and return the expected data structures.

