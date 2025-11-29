# DeFi Protocol Metrics Service

A high-performance real-time DeFi protocol monitoring service for the Coinet platform. This service tracks Total Value Locked (TVL), yields, lending rates, liquidity pools, governance proposals, and token unlock schedules across major DeFi platforms with intelligent anomaly detection and signal generation.

## Features

- **Multi-Protocol Monitoring**: TVL, yields, lending, liquidity, governance, token unlocks
- **Real-Time Updates**: Sub-1-minute metric collection and analysis
- **Anomaly Detection**: Statistical analysis for unusual changes and patterns
- **Signal Generation**: Structured alerts for fusion engine integration
- **High Availability**: Caching and rate-limiting for robust operation
- **Backfill Support**: Historical data retrieval for backtesting
- **Comprehensive Monitoring**: Health checks, metrics, and performance tracking

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │───▶│   Metrics       │───▶│   Anomaly       │
│                 │    │   Collection    │    │   Detection     │
│ • DeFi Llama    │    │                 │    │                 │
│ • Protocol APIs │    │ • TVL Tracking  │    │ • Statistical   │
│ • On-Chain Data │    │ • Yield Monitor │    │   Analysis      │
│ • Dune Analytics│    │ • Lending Rates │    │ • Pattern       │
│ • Subgraphs     │    │ • Liquidity     │    │   Recognition   │
│                 │    │ • Governance    │    │ • Threshold     │
└─────────────────┘    └─────────────────┘    │   Alerts        │
                                             │                 │
┌─────────────────┐    ┌─────────────────┐    │ • Severity      │
│   Signal        │◀───│   Storage       │    │   Assessment    │
│   Generation    │    │   Layer         │    └─────────────────┘
│                 │    │                 │
│ • Alert Creation│    │ • Time-series   │    ┌─────────────────┐
│ • Impact        │    │   data          │    │   Monitoring    │
│   Assessment    │    │ • Protocol      │    │   & Health      │
│ • Fusion Engine │    │   metadata      │    │   Checks        │
│   Integration   │    │ • Anomaly       │    └─────────────────┘
│                 │    │   history       │
└─────────────────┘    └─────────────────┘
```

## Installation

```bash
cd services/defi-protocol-metrics
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# Service Configuration
NODE_ENV=production
LOG_LEVEL=info

# Metrics Configuration
UPDATE_INTERVAL_MS=60000
ANOMALY_THRESHOLD=2.0
MIN_DATA_POINTS=24
CACHE_TTL_SECONDS=300

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_REQUESTS_PER_HOUR=1000

# Signal Thresholds (percentage changes)
TVL_CHANGE_THRESHOLD=5.0
YIELD_CHANGE_THRESHOLD=2.0
LENDING_CHANGE_THRESHOLD=1.0
LIQUIDITY_CHANGE_THRESHOLD=10.0
ANOMALY_SIGNAL_THRESHOLD=3.0

# Backfill Settings
BACKFILL_MAX_DAYS=7
BACKFILL_MAX_RECORDS_PER_DAY=1000

# Data Providers
DEFILLAMA_API_URL=https://api.llama.fi
DUNE_API_KEY=your_dune_api_key
INFURA_PROJECT_ID=your_infura_project_id

# Protocol Configurations
PROTOCOL_UNISWAP_V3_ADDRESS=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
PROTOCOL_AAVE_V3_ADDRESS=0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
PROTOCOL_COMPOUND_V3_ADDRESS=0xc3d688B66703497DAA19211Eedff47f25384cdc3
```

## Usage

### Basic Usage

```typescript
import { DeFiProtocolMetrics, ProtocolInfo } from './src/DeFiProtocolMetrics';

const protocols: ProtocolInfo[] = [
  {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    type: 'dex',
    network: 'ethereum',
    contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    tokenSymbol: 'UNI',
    tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    launchDate: new Date('2021-05-05'),
    isActive: true
  }
];

const metricsService = new DeFiProtocolMetrics({
  enabledProtocols: protocols,
  metricsConfig: {
    updateInterval: 60000,
    anomalyThreshold: 2.0,
    minDataPoints: 24
  },
  signalThresholds: {
    tvlChange: 5.0,
    yieldChange: 2.0,
    lendingChange: 1.0,
    liquidityChange: 10.0
  }
});

// Start the service
await metricsService.start();

// Get current TVL metrics
const tvlMetrics = await metricsService.getTVLMetrics();
console.log('Current TVL:', tvlMetrics);

// Listen for signals
metricsService.on('signal', (event) => {
  const signal = event.data;
  console.log('New signal:', signal.title, signal.severity);
});
```

### Advanced Configuration

```typescript
const config = {
  dataProviders: [
    {
      id: 'defillama',
      name: 'DeFi Llama',
      type: 'api',
      baseUrl: 'https://api.llama.fi',
      rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
      supportedProtocols: ['uniswap-v3', 'aave-v3'],
      supportedMetrics: ['tvl', 'yields', 'lending'],
      reliability: 0.95
    }
  ],
  metricsConfig: {
    updateInterval: 30000, // 30 seconds
    anomalyThreshold: 1.5, // More sensitive
    minDataPoints: 48,     // More data for baseline
    cacheTtl: 600          // 10 minutes
  }
};

const metricsService = new DeFiProtocolMetrics(config);
```

## API Reference

### DeFiProtocolMetrics

Main service class for DeFi protocol metrics monitoring.

#### Methods

- `start(): Promise<void>` - Start the metrics monitoring service
- `stop(): Promise<void>` - Stop the metrics monitoring service
- `getTVLMetrics(protocols?: string[]): Promise<TVLMetrics[]>` - Get current TVL metrics
- `getYieldMetrics(protocols?: string[]): Promise<YieldMetrics[]>` - Get current yield metrics
- `getLendingMetrics(protocols?: string[]): Promise<LendingMetrics[]>` - Get current lending metrics
- `getLiquidityMetrics(protocols?: string[]): Promise<LiquidityMetrics[]>` - Get current liquidity metrics
- `getGovernanceMetrics(protocols?: string[]): Promise<GovernanceMetrics[]>` - Get governance metrics
- `getTokenUnlockMetrics(protocols?: string[]): Promise<TokenUnlockMetrics[]>` - Get token unlock schedules
- `getRecentAnomalies(limit?: number): Promise<AnomalyDetection[]>` - Get recent anomalies
- `getRecentSignals(limit?: number): Promise<DeFiSignal[]>` - Get recent signals
- `backfillData(request: BackfillRequest): Promise<BackfillResult>` - Backfill historical data
- `getStatus(): string` - Get current service status
- `getHealthStatus(): Promise<HealthStatus>` - Get detailed health information

#### Events

- `metrics` - Emitted when new metrics are collected
- `anomaly` - Emitted when anomalies are detected
- `signal` - Emitted when signals are generated
- `error` - Emitted when processing errors occur

### Data Models

#### TVLMetrics
```typescript
interface TVLMetrics {
  protocol: ProtocolInfo;
  totalValueLocked: number;        // USD value
  totalValueLockedChange24h: number; // Percentage change
  totalValueLockedChange7d: number;  // Percentage change
  tvlRank: number;                 // Global ranking
  dominantToken: string;           // Token with highest TVL share
  tokenDistribution: Record<string, number>; // Token -> percentage
  timestamp: Date;
  source: 'defillama' | 'dune' | 'protocol-api' | 'on-chain';
}
```

#### YieldMetrics
```typescript
interface YieldMetrics {
  protocol: ProtocolInfo;
  poolId: string;
  poolName: string;
  apy: number;                     // Annual percentage yield
  apyChange24h: number;            // Change in APY
  baseApy: number;                 // Base APY without rewards
  rewardApy: number;               // Additional reward APY
  impermanentLoss?: number;        // IL risk estimate
  volume24h: number;               // Trading volume
  fees24h: number;                 // Fees generated
  timestamp: Date;
}
```

#### DeFiSignal
```typescript
interface DeFiSignal {
  id: string;
  type: 'tvl_change' | 'yield_change' | 'lending_change' | 'liquidity_change' | 'governance' | 'token_unlock' | 'anomaly';
  protocol: ProtocolInfo;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  data: any;                       // Specific metrics data
  impact: {
    tokens: string[];
    users: number;
    tvl: number;
    volume: number;
  };
  timestamp: Date;
  source: 'api' | 'on-chain' | 'anomaly-detection';
}
```

## Supported Protocols

### DEX Protocols
- **Uniswap V3** - Ethereum, Polygon, Arbitrum, Optimism
- **Curve Finance** - Multi-chain stablecoin pools
- **Balancer** - Weighted and stable pools
- **SushiSwap** - AMM with yield farming
- **PancakeSwap** - BSC-based DEX

### Lending Protocols
- **Aave V3** - Multi-chain lending protocol
- **Compound V3** - Algorithmic lending
- **MakerDAO** - DAI stablecoin system
- **Liquity** - Zero-interest stablecoin
- **Euler** - Permissionless lending

### Yield Farming
- **Yearn Finance** - Yield optimization
- **Convex Finance** - Curve yield booster
- **Fantom** - FTM yield opportunities
- **OlympusDAO** - OHM bonding system

### Liquid Staking
- **Lido** - ETH liquid staking
- **Rocket Pool** - Decentralized ETH staking
- **Ankr** - Multi-chain liquid staking
- **StakeWise** - ETH staking pools

## Anomaly Detection

The service uses statistical analysis to detect anomalies:

### Detection Methods
- **Z-Score Analysis**: Standard deviations from baseline
- **Moving Averages**: Trend analysis and breakouts
- **Volatility Assessment**: Unusual price/volume movements
- **Correlation Analysis**: Cross-protocol pattern detection

### Anomaly Types
- **TVL Anomalies**: Unusual inflows/outflows
- **Yield Anomalies**: Sudden APY changes
- **Lending Anomalies**: Rate or utilization spikes
- **Liquidity Anomalies**: Pool imbalance or volume surges
- **Governance Anomalies**: Unusual voting patterns
- **Token Unlock Anomalies**: Unexpected unlock events

### Severity Levels
- **Low**: Minor deviations (1-2σ)
- **Medium**: Moderate deviations (2-3σ)
- **High**: Significant deviations (3-4σ)
- **Critical**: Extreme deviations (4σ+)

## Signal Generation

Signals are generated based on configurable thresholds:

### Signal Types
- **TVL Changes**: Significant TVL increases/decreases
- **Yield Changes**: APY fluctuations above thresholds
- **Lending Changes**: Interest rate or utilization changes
- **Liquidity Changes**: Pool balance or volume anomalies
- **Governance Events**: Important proposal outcomes
- **Token Unlocks**: Scheduled or emergency unlocks

### Severity Assessment
- **Info**: Minor changes, routine updates
- **Warning**: Moderate impact, attention needed
- **Critical**: Significant market impact
- **Emergency**: Extreme market disruption

## Integration with Fusion Engine

Signals are structured for seamless fusion engine integration:

```typescript
interface FusionSignal {
  id: string;
  type: 'defi_metrics';
  source: 'defi-protocol-metrics';
  timestamp: Date;
  data: {
    protocol: ProtocolInfo;
    metricType: string;
    currentValue: number;
    change: number;
    anomalyScore: number;
    impact: {
      tokens: string[];
      users: number;
      tvl: number;
    };
  };
  confidence: number;
  ttl: number; // Time to live in seconds
}
```

## Performance

- **Update Frequency**: 30-60 second intervals
- **Processing Latency**: < 2 seconds per metric
- **Throughput**: 1000+ metrics/minute
- **Scalability**: Horizontal scaling with Redis clustering
- **Reliability**: 99.9% uptime with automatic failover

## Data Sources

### Primary Sources
- **DeFi Llama API**: Comprehensive DeFi data aggregation
- **Dune Analytics**: On-chain data queries
- **Protocol APIs**: Direct protocol integrations
- **Subgraph APIs**: The Graph protocol data

### Rate Limiting
- **DeFi Llama**: 60 requests/minute, 1000/hour
- **Dune Analytics**: API key based limits
- **Protocol APIs**: Varies by protocol
- **On-Chain**: RPC rate limits

### Error Handling
- **Automatic Retries**: Exponential backoff
- **Fallback Providers**: Multiple data sources
- **Circuit Breakers**: Prevent cascade failures
- **Graceful Degradation**: Continue with partial data

## Monitoring & Health Checks

### Metrics Collected
- Protocol health status
- Data provider reliability
- Processing latency
- Error rates and types
- Cache hit rates
- Memory and CPU usage

### Health Endpoints
- Service status and uptime
- Protocol connectivity
- Data source availability
- Anomaly detection status
- Signal generation status

## Backfill Capabilities

### Historical Data Retrieval
```typescript
const backfillResult = await metricsService.backfillData({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  protocols: ['uniswap-v3', 'aave-v3'],
  maxRecords: 10000
});
```

### Backtesting Support
- Historical anomaly detection
- Signal accuracy validation
- Performance benchmarking
- Strategy optimization

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new protocols and metrics
3. Update documentation for new features
4. Ensure all anomaly detection algorithms are tested
5. Test with multiple data providers

## License

MIT License - see LICENSE file for details.
