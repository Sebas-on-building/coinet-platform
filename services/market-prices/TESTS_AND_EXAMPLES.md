# Market Prices Service - Tests & Examples

## 📋 Test Suite

Comprehensive integration tests for all new services:

### Test Files

1. **`src/tests/unified-market-data.test.ts`**
   - Tests best-price aggregation
   - Tests multi-source data aggregation
   - Tests confidence scoring
   - Tests batch price fetching

2. **`src/tests/market-analytics.test.ts`**
   - Tests correlation calculation
   - Tests anomaly detection
   - Tests trend analysis
   - Tests support/resistance levels

3. **`src/tests/market-data-streamer.test.ts`**
   - Tests real-time streaming
   - Tests symbol management (add/remove)
   - Tests price update handling
   - Tests stream statistics

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unified      # UnifiedMarketDataService tests
npm run test:analytics    # MarketAnalytics tests
npm run test:streamer     # MarketDataStreamer tests
npm run test:defi         # DeFiLlama tests

# Watch mode
npm run test:watch

# Run all integration tests
npm run test:integration
```

## 📚 Example Usage Files

Practical examples demonstrating how to use each service:

### Example Files

1. **`src/examples/unified-market-data.example.ts`**
   - Get best price for a symbol
   - Get aggregated market data
   - Batch price fetching
   - Custom provider weights

2. **`src/examples/market-analytics.example.ts`**
   - Calculate asset correlation
   - Detect price anomalies
   - Analyze trends
   - Compare multiple assets

3. **`src/examples/market-data-streamer.example.ts`**
   - Real-time price streaming
   - Dynamic symbol management
   - Stream statistics
   - Event handling

4. **`src/examples/enhanced-error-handler.example.ts`**
   - Error handling with circuit breaker
   - Circuit breaker status monitoring
   - Error statistics
   - Circuit breaker reset

### Running Examples

```bash
# Run examples (requires API keys in .env)
npx ts-node src/examples/unified-market-data.example.ts
npx ts-node src/examples/market-analytics.example.ts
npx ts-node src/examples/market-data-streamer.example.ts
npx ts-node src/examples/enhanced-error-handler.example.ts
```

## 🧪 Test Coverage

All tests use mocked providers to ensure:
- ✅ Fast execution (no real API calls)
- ✅ Reliable results (deterministic)
- ✅ No API rate limits
- ✅ Offline testing capability

## 📝 Notes

- Tests use Vitest as the test runner
- Examples require API keys in `.env` file
- All examples include error handling
- Examples demonstrate best practices

