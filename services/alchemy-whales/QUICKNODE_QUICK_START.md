# 🚀 QuickNode Integration - Quick Start Guide

## Get Started in 5 Minutes

### Step 1: Get Your QuickNode API Keys

1. Sign up at https://www.quicknode.com/
2. Create endpoints for the chains you need:
   - Ethereum
   - Polygon
   - Arbitrum
   - Optimism
   - Base
   - And 65+ more!

### Step 2: Configure Environment Variables

Copy the configuration from `docs/QUICKNODE_ENV_EXAMPLE.txt` to your `.env` file:

```bash
# Enable QuickNode
QUICKNODE_ENABLED=true

# Add your endpoints
QUICKNODE_ETH_HTTP_URL=https://your-endpoint.quiknode.pro/xxxxx/
QUICKNODE_ETH_CU_PER_SEC=300

QUICKNODE_POLYGON_HTTP_URL=https://your-polygon-endpoint.quiknode.pro/xxxxx/
QUICKNODE_POLYGON_CU_PER_SEC=300

# Enable smart features
CROSS_VALIDATION_ENABLED=true
QUOTA_AWARE_ROUTING=true
ENABLE_LOAD_BALANCING=true
ENABLE_FALLBACK=true
```

### Step 3: Install Dependencies

```bash
cd services/alchemy-whales
npm install
```

All required dependencies are already in `package.json`:
- `axios` - HTTP client
- `axios-retry` - Automatic retries
- `bottleneck` - Rate limiting
- `zod` - Validation

### Step 4: Build the Service

```bash
npm run build
```

### Step 5: Run the Examples

```bash
# Run comprehensive examples
npm run dev examples/quicknode-usage.ts
```

Or use the orchestrator in your code:

```typescript
import { ProviderOrchestrator } from './services/ProviderOrchestrator';
import { Chain } from './types';

const transfers = await orchestrator.getTransfers({
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  chain: Chain.ETHEREUM,
  limit: 100,
});
```

## ✅ You're Done!

The service will now:
- ✅ Automatically route between Alchemy and QuickNode
- ✅ Cross-validate large transfers
- ✅ Handle rate limits intelligently
- ✅ Fallback when providers fail
- ✅ Monitor health and performance
- ✅ Optimize quota usage

## 📚 Learn More

- **Full Documentation:** [docs/QUICKNODE_INTEGRATION.md](docs/QUICKNODE_INTEGRATION.md)
- **Examples:** [examples/quicknode-usage.ts](examples/quicknode-usage.ts)
- **Implementation Details:** [QUICKNODE_IMPLEMENTATION_COMPLETE.md](QUICKNODE_IMPLEMENTATION_COMPLETE.md)

## 🆘 Need Help?

- Check the [Full Documentation](docs/QUICKNODE_INTEGRATION.md)
- Review [Usage Examples](examples/quicknode-usage.ts)
- QuickNode Support: https://www.quicknode.com/docs

---

**Built with divine world-class perfection** 🚀✨

