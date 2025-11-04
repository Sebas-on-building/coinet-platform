# Quick Start Guide

Get up and running in 5 minutes! ⚡

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)
- CoinGecko API key ([Get one here](https://www.coingecko.com/en/api))

## Installation

### Option 1: Automated Setup (Recommended)

```bash
cd services/market-prices
./setup.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Create .env file
- ✅ Build TypeScript
- ✅ Optionally start infrastructure

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your API keys

# 3. Build
npm run build

# 4. Start infrastructure
docker-compose up -d timescaledb redis

# 5. Run service
npm run dev
```

## First Request

```typescript
import { createAggregator } from '@coinet/market-prices';

// Initialize
const aggregator = await createAggregator();

// Get Bitcoin price
const [btc] = await aggregator.getMarketPrices(['BTC']);
console.log(`Bitcoin: $${btc.price}`);

// Cleanup
await aggregator.shutdown();
```

## Common Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm test                 # Run tests

# Docker
docker-compose up -d     # Start full stack
docker-compose logs -f   # View logs
docker-compose down      # Stop everything

# With debug tools
docker-compose --profile debug up -d
```

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| pgAdmin | http://localhost:5050 | Database management |
| Redis Commander | http://localhost:8081 | Cache inspection |

**pgAdmin Credentials:**
- Email: admin@coinet.com
- Password: admin (or from .env)

## Quick Examples

### Get Multiple Prices

```typescript
const prices = await aggregator.getMarketPrices([
  'BTC', 'ETH', 'SOL', 'ADA', 'AVAX'
]);

prices.forEach(p => {
  console.log(`${p.symbol.toUpperCase()}: $${p.price} (${p.source})`);
});
```

### Real-Time Updates via WebSocket

```typescript
// Subscribe to WebSocket
await aggregator.subscribeToWebSocket([
  'bitcoin', 'ethereum', 'solana'
]);

// Listen for updates
aggregator.on('price_update', (event) => {
  const price = event.data;
  console.log(`${price.symbol}: $${price.price}`);
});
```

### Get Historical Data

```typescript
// Get 7 days of daily candles
const ohlcv = await aggregator.getOHLCV('BTC', '1d', 7);

ohlcv.forEach(candle => {
  console.log(
    `${candle.timestamp.toDateString()}: ` +
    `Open: $${candle.open}, Close: $${candle.close}`
  );
});
```

### Get Coin Information

```typescript
const metadata = await aggregator.getMetadata('BTC');

console.log(`Name: ${metadata.name}`);
console.log(`Description: ${metadata.description?.substring(0, 100)}...`);
console.log(`Website: ${metadata.links.homepage?.[0]}`);
console.log(`Categories: ${metadata.categories.join(', ')}`);
```

## Environment Variables (Minimal)

```env
# Required
COINGECKO_API_KEY=your_key_here

# Optional (for fallback)
COINMARKETCAP_API_KEY=your_key_here

# Database (use defaults for local dev)
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_PASSWORD=coinet_password

# Redis (use defaults for local dev)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if database is running
docker-compose ps timescaledb

# Restart database
docker-compose restart timescaledb
```

### "Rate limit exceeded"
- Check your API tier limits
- Enable caching: `useCache: true`
- Use WebSocket for real-time data

### "Module not found"
```bash
npm install
npm run build
```

### "WebSocket not connecting"
- Verify `ENABLE_WEBSOCKET=true` in .env
- Check if your API tier supports WebSocket
- CoinGecko WebSocket requires paid tier (Analyst+)

## Health Check

```typescript
const health = await aggregator.getHealthStatus();

console.log('Service healthy:', health.healthy);
console.log('CoinGecko REST:', health.providers.coingecko.rest);
console.log('CoinGecko WS:', health.providers.coingecko.websocket);
console.log('Database:', health.database.connected);
console.log('Cache hit rate:', health.cache.hitRate);
```

## Next Steps

1. ✅ **Read the Documentation**
   - [README.md](./README.md) - Complete guide
   - [API.md](./API.md) - API reference
   - [EXAMPLES.md](./EXAMPLES.md) - More examples

2. ✅ **Configure for Production**
   - Set strong database password
   - Use secrets management
   - Enable monitoring
   - See [DEPLOYMENT.md](./DEPLOYMENT.md)

3. ✅ **Customize**
   - Add more coins to symbol registry
   - Adjust cache TTL
   - Configure rate limits
   - Add custom providers

## Support

- 📖 **Full Documentation**: See README.md
- 🐛 **Issues**: GitHub Issues
- 💬 **Questions**: support@coinet.com

---

**Now you're ready to build amazing crypto applications! 🚀**

*For production deployment, please review [DEPLOYMENT.md](./DEPLOYMENT.md)*

