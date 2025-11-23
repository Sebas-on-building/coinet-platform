# Token Unlocks Quick Start Guide 🚀

Get up and running with the Token Unlocks system in under 5 minutes!

## Prerequisites

- Node.js 16+ and npm
- Redis server running
- PostgreSQL/TimescaleDB running
- Messari API key ([Get one here](https://messari.io/api))

## Installation

```bash
cd services/market-prices
npm install
```

## Quick Setup

### 1. Environment Variables

Create a `.env` file:

```bash
# Messari API
MESSARI_API_KEY=your-messari-api-key-here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coinet
DB_USER=postgres
DB_PASSWORD=your-password
```

### 2. Quick Start Code

Create a file `token-unlocks-quick-start.ts`:

```typescript
import { createTokenUnlocksSystem } from './src/services/token-unlocks-integration';

async function main() {
  // Initialize the system
  const system = await createTokenUnlocksSystem({
    messari: {
      apiKey: process.env.MESSARI_API_KEY!,
    },
    cache: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
      db: 0,
    },
    database: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
    },
  });

  console.log('✅ System initialized!\n');

  // 1. Get upcoming unlocks for Arbitrum
  console.log('📊 Upcoming ARB unlocks:');
  const arbUnlocks = await system.getUpcomingUnlocks('ARB', 30);
  console.log(`Found ${arbUnlocks.length} unlocks\n`);

  // 2. Get high-impact unlocks across all tokens
  console.log('🚨 High-impact unlocks:');
  const highImpact = await system.getHighImpactUnlocks(7, 'high');
  console.log(`Found ${highImpact.length} high-impact unlocks\n`);

  // 3. Generate alerts
  console.log('🔔 Generating alerts:');
  const alerts = await system.generateAlerts(7, 'medium');
  alerts.slice(0, 3).forEach((alert) => {
    console.log(`- ${alert.assetSymbol}: ${alert.message}`);
  });
  console.log();

  // 4. Get analytics
  console.log('📈 Analytics summary:');
  const analytics = await system.getAnalytics(90);
  console.log(`Total upcoming: ${analytics.totalUpcoming}`);
  console.log(`Total value: $${analytics.totalValueUsd.toLocaleString()}`);
  console.log(`Critical: ${analytics.bySeverity.critical?.count || 0}`);
  console.log(`High: ${analytics.bySeverity.high?.count || 0}\n`);

  // 5. Check system health
  console.log('🏥 System health:');
  const health = await system.getHealth();
  console.log(`Healthy: ${health.service.healthy}`);
  console.log(`Storage: ${health.service.storage}`);
  console.log(`Cache: ${health.service.cache}\n`);

  // Shutdown gracefully
  await system.shutdown();
  console.log('✅ Complete!');
}

main().catch(console.error);
```

### 3. Run It!

```bash
ts-node token-unlocks-quick-start.ts
```

## Common Use Cases

### Use Case 1: Monitor a Specific Token

```typescript
const system = await createTokenUnlocksSystem(config);

// Get unlocks for the next 30 days
const unlocks = await system.getUpcomingUnlocks('ARB', 30);

// Filter high-severity only
const critical = unlocks.filter((u) => u.severity === 'critical');

console.log(`${critical.length} critical unlocks for ARB`);

// Get detailed analysis
const analysis = await system.getImpactAnalysis('ARB', 30);
console.log('Top risks:', analysis.topRisks.slice(0, 5));
```

### Use Case 2: Daily Alert System

```typescript
const system = await createTokenUnlocksSystem(config);

// Listen for new alerts
system.on('alerts_generated', (data) => {
  console.log(`🔔 ${data.count} new alerts generated`);
  
  data.alerts.forEach((alert) => {
    if (alert.severity === 'critical') {
      // Send notification (email, Slack, etc.)
      sendCriticalAlert(alert);
    }
  });
});

// Generate alerts daily
const alerts = await system.generateAlerts(7, 'medium');
```

### Use Case 3: Build a Dashboard

```typescript
const system = await createTokenUnlocksSystem(config);

// Get comprehensive data for dashboard
const [
  upcomingUnlocks,
  highImpact,
  analytics,
  health,
] = await Promise.all([
  system.getAllUpcomingUnlocks(30),
  system.getHighImpactUnlocks(7, 'medium'),
  system.getAnalytics(90),
  system.getHealth(),
]);

const dashboardData = {
  overview: {
    total: upcomingUnlocks.length,
    highImpact: highImpact.length,
    totalValue: analytics.totalValueUsd,
  },
  byTimeframe: analytics.byTimeframe,
  byCategory: analytics.byCategory,
  topRisks: analytics.topUnlocksByImpact.slice(0, 10),
  systemHealth: health,
};

// Send to frontend
res.json(dashboardData);
```

### Use Case 4: Trading Bot Integration

```typescript
const system = await createTokenUnlocksSystem(config);

// Get market pressure for a token
const symbol = 'ARB';
const pressure = await system.getMarketPressure(symbol, 30);

if (pressure.pressureLevel === 'extreme') {
  // Reduce position or exit
  await tradingBot.reducePosition(symbol, 0.5);
  console.log(`⚠️ Extreme pressure on ${symbol} - reduced position`);
}

// Monitor near-term unlocks
const nearTerm = await system.getHighImpactUnlocks(3, 'high');
nearTerm.forEach(async (unlock) => {
  if (unlock.severity === 'critical') {
    // Exit position before unlock
    await tradingBot.exitPosition(unlock.symbol);
    console.log(`🚨 Exiting ${unlock.symbol} before critical unlock`);
  }
});
```

### Use Case 5: Research & Analysis

```typescript
const system = await createTokenUnlocksSystem(config);

// Analyze multiple tokens
const tokens = ['ARB', 'APT', 'OP', 'SUI'];

for (const symbol of tokens) {
  const unlocks = await system.getUpcomingUnlocks(symbol, 90);
  
  if (unlocks.length === 0) continue;
  
  const report = await system.getImpactAnalysis(unlocks);
  
  console.log(`\n${symbol} Analysis:`);
  console.log(`- Total unlocks: ${report.summary.totalUnlocks}`);
  console.log(`- Total value: $${report.summary.totalValueUsd.toLocaleString()}`);
  console.log(`- Critical: ${report.summary.criticalImpactCount}`);
  console.log(`- Market pressure: ${report.marketPressure.pressureLevel}`);
  
  // Get tokenomics
  const tokenomics = await system.getTokenomics(symbol);
  if (tokenomics) {
    console.log(`- Circulating supply: ${tokenomics.circulating_supply?.toLocaleString()}`);
    console.log(`- Inflation rate: ${tokenomics.inflation_rate_annual?.toFixed(2)}%`);
  }
}
```

## API Quick Reference

### Main Methods

```typescript
// Get unlocks
getUpcomingUnlocks(symbol, daysAhead, options?)
getAllUpcomingUnlocks(daysAhead, options?)
getHighImpactUnlocks(daysAhead, minSeverity)

// Analysis
getImpactAnalysis(symbolOrUnlocks, daysAhead)
getMarketPressure(symbol, daysAhead, marketPrice?)
getSupplyDilution(unlock)
getTokenomics(symbol, useCache?)

// Alerts
generateAlerts(daysAhead?, minSeverity?)
getAlerts(includeResolved?)
resolveAlert(alertId)

// Monitoring
getHealth()
getDiagnostics()
getStats()

// System
shutdown()
```

### Event Listeners

```typescript
system.on('daily_poll_completed', (data) => {
  // New unlocks fetched
});

system.on('near_term_poll_completed', (data) => {
  // Near-term unlocks updated
});

system.on('alerts_generated', (data) => {
  // New alerts generated
});

system.on('health_check_completed', (result) => {
  // Health check finished
});

system.on('alert_created', (alert) => {
  // New monitoring alert
});
```

## Configuration Options

### Minimal Configuration

```typescript
{
  messari: { apiKey: 'your-key' },
  cache: { host: 'localhost', port: 6379, db: 0 },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'coinet',
    user: 'postgres',
    password: 'password',
  },
}
```

### Full Configuration

```typescript
{
  messari: {
    apiKey: 'your-key',
    apiUrl: 'https://data.messari.io/api/v1',
  },
  cache: {
    host: 'localhost',
    port: 6379,
    password: 'optional',
    db: 0,
    defaultTTL: 86400,
    nearTermThreshold: 7,
    nearTermTTL: 3600,
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'coinet',
    user: 'postgres',
    password: 'password',
  },
  scheduler: {
    dailyPollingCron: '0 0 * * *',
    nearTermPollingCron: '0 * * * *',
    nearTermThresholdDays: 7,
    daysAheadToFetch: 90,
    enableDailyPolling: true,
    enableNearTermPolling: true,
  },
  monitoring: {
    enabled: true,
    intervalMs: 60000,
  },
  enablePriceFeedIntegration: true,
  alertThresholds: {
    minSeverity: 'medium',
    daysAhead: 7,
  },
}
```

## Next Steps

1. Read the full [TOKEN_UNLOCKS_README.md](./TOKEN_UNLOCKS_README.md) for detailed documentation
2. Explore [examples/token-unlocks.example.ts](./src/examples/token-unlocks.example.ts) for 10 working examples
3. Check out [tests/token-unlocks.test.ts](./src/tests/token-unlocks.test.ts) for test examples
4. Integrate with your existing systems

## Troubleshooting

### Error: "Messari API key invalid"
**Solution**: Check your API key at https://messari.io/api

### Error: "Redis connection failed"
**Solution**: Ensure Redis is running: `redis-server`

### Error: "Database connection failed"
**Solution**: Check PostgreSQL is running and credentials are correct

### Performance is slow
**Solution**: Ensure indexes are created (happens automatically on first run)

## Support

For questions or issues, refer to the main documentation or contact the development team.

---

**Built with 💎 by the Coinet Team**

