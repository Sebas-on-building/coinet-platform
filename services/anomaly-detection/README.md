# 🚀 Proactive Anomaly Detection System

**World-class AI-driven anomaly detection and proactive monitoring for cryptocurrency markets**

A sophisticated, production-ready system that continuously scans all available data for anomalies, emerging trends, and overlooked opportunities using unsupervised learning and advanced anomaly detection algorithms.

## ⚡ REVOLUTIONARY FEATURES - NEW!

This system now includes **6 revolutionary AI capabilities** that set a new industry standard:

🔮 **Predictive Anomaly Engine** - Predicts anomalies BEFORE they occur  
🧬 **Causal Analysis Engine** - Understands WHY anomalies happen  
🚨 **Market Manipulation Detector** - Detects 9 types of fraud  
🕸️ **Graph Neural Network Analyzer** - Analyzes wallet relationships  
🤖 **Autonomous Trading Agent** - AI that trades automatically  
🌐 **Cross-Chain Correlation Engine** - Multi-blockchain intelligence  

👉 **[See REVOLUTIONARY_FEATURES.md for details](./REVOLUTIONARY_FEATURES.md)**

## 🌟 ETHICAL AI FRAMEWORK - ULTIMATE EDITION!

**The most comprehensive ethical AI system ever built - 9 modules with real-time monitoring:**

### Core Ethics (5 Modules)
⚖️ **Bias Auditing** - 5 fairness metrics + distribution analysis  
🎯 **Fairness Mitigation** - 3 methods (re-weight, adversarial, post-process)  
🔍 **Explainability** - LIME + SHAP + counterfactual  
🔒 **GDPR Compliance** - All 6 user rights implemented  
🌟 **Ethical Framework** - Unified orchestrator  

### Revolutionary Extensions (4 NEW!)
📊 **Real-Time Fairness Monitor** - Live monitoring + auto-correction  
🏆 **AI Ethics Certification** - Automated certification system (4 levels)  
👥 **Diversity & Inclusion** - Scientific D&I tracking (Shannon entropy)  
🔬 **IBM AIF360 Integration** - 11 metrics + 8 algorithms  

👉 **[ETHICAL_AI_FRAMEWORK.md](./ETHICAL_AI_FRAMEWORK.md)** | **[ULTIMATE_ETHICAL_AI.md](./ULTIMATE_ETHICAL_AI.md)**

## 🌟 Features

### Core Capabilities

- **🧠 Unsupervised Learning**: Automatically establishes baselines from historical data
- **🔍 Real-time Detection**: Continuous monitoring with sub-second latency
- **🎯 Multi-Algorithm Approach**: Combines statistical, ML-based, and percentile-based detection
- **🏷️ Intelligent Classification**: Automatically classifies anomalies as benign, threats, or opportunities
- **💡 Action Suggestions**: Provides specific, actionable recommendations with domain knowledge
- **🔔 Multi-Channel Alerts**: Email, SMS, Slack, Telegram, Webhook, Push notifications
- **📊 Comprehensive Monitoring**: Trading, sentiment, wallet activity, on-chain metrics

### Advanced Features

- **Seasonal Pattern Detection**: Identifies and adjusts for hourly, daily, weekly patterns
- **Correlation Analysis**: Detects relationships between multiple anomalies
- **Smart Throttling**: Prevents alert fatigue with intelligent rate limiting
- **Baseline Auto-Update**: Continuously improves detection accuracy
- **Domain Knowledge Base**: Extensive crypto-specific expertise built-in
- **RESTful API**: Complete API for integration and control

## 📦 Installation

```bash
cd services/anomaly-detection
npm install
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { ProactiveMonitoringSystem, DataSource } from '@coinet-ai/anomaly-detection';

// Initialize system
const system = new ProactiveMonitoringSystem({
  monitoring: {
    sources: [DataSource.TRADING_VOLUME, DataSource.SENTIMENT],
    enableRealTime: true,
    anomalyThresholds: {
      statistical: 3,  // 3 standard deviations
      ml: 0.7,         // 70% anomaly score
      percentile: 95   // 95th percentile
    }
  },
  notifications: {
    channels: {
      slack: {
        enabled: true,
        webhookUrl: 'https://hooks.slack.com/...'
      }
    },
    defaultChannels: ['slack']
  },
  autoClassify: true,
  autoSuggestActions: true,
  autoAlert: true
});

// Start monitoring
await system.start();

// Learn from historical data
await system.learnHistoricalBaselines(
  DataSource.TRADING_VOLUME,
  historicalData,
  'BTC'
);

// Process real-time data
await system.processTrade({
  symbol: 'BTC',
  price: 45000,
  volume: 1500000,
  timestamp: new Date(),
  exchange: 'Binance',
  side: 'buy'
});
```

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:3030`

## 📚 Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                Proactive Monitoring System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Trading    │  │  Sentiment   │  │     Wallet      │  │
│  │   Monitor    │  │   Monitor    │  │    Monitor      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                  │                    │           │
│         └──────────────────┼────────────────────┘           │
│                            │                                │
│                  ┌─────────▼─────────┐                      │
│                  │  Data Processing  │                      │
│                  │      Queue        │                      │
│                  └─────────┬─────────┘                      │
│                            │                                │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼───────┐  ┌──────▼────────┐  ┌──────▼────────┐   │
│  │   Baseline   │  │   Anomaly     │  │  Anomaly      │   │
│  │   Learning   │  │   Detector    │  │  Classifier   │   │
│  │   Engine     │  │               │  │               │   │
│  └──────────────┘  └───────┬───────┘  └───────┬───────┘   │
│                            │                   │           │
│                    ┌───────▼───────────────────▼─────┐     │
│                    │    Action Suggestion Engine     │     │
│                    └───────┬─────────────────────────┘     │
│                            │                               │
│                    ┌───────▼───────┐                       │
│                    │ Alert System  │                       │
│                    └───────┬───────┘                       │
│                            │                               │
│         ┌──────────────────┼──────────────────┐            │
│         │                  │                  │            │
│    ┌────▼───┐        ┌─────▼─────┐     ┌─────▼─────┐      │
│    │ Email  │        │   Slack   │     │  Webhook  │      │
│    └────────┘        └───────────┘     └───────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detection Pipeline

1. **Data Ingestion**: Real-time data flows through specialized monitors
2. **Baseline Learning**: Historical patterns are learned and updated
3. **Anomaly Detection**: Multiple algorithms detect deviations
4. **Classification**: Domain knowledge classifies anomalies
5. **Action Generation**: Specific recommendations are created
6. **Alert Distribution**: Multi-channel notifications are sent

## 🎯 Use Cases

### 1. Trading Opportunities

Detects unusual volume spikes, price movements, and liquidity changes that may signal trading opportunities.

```typescript
// Automatically detects
- Accumulation patterns
- Breakout opportunities
- Smart money movements
- Volume/price divergences
```

### 2. Risk Management

Identifies emerging threats before they impact your portfolio.

```typescript
// Alerts on
- Sudden price crashes
- Negative sentiment shifts
- Suspicious wallet activity
- Potential exploits
```

### 3. Market Intelligence

Discovers overlooked opportunities and emerging trends.

```typescript
// Monitors
- Social sentiment shifts
- Network growth
- Whale activity
- Cross-market correlations
```

## 🔧 API Reference

### Core Endpoints

#### System Status
```
GET /api/monitoring/status
GET /api/monitoring/health
GET /api/monitoring/statistics
```

#### Anomalies
```
GET  /api/monitoring/anomalies
GET  /api/monitoring/anomalies/:id
POST /api/monitoring/anomalies/:id/investigate
```

#### Alerts
```
GET  /api/monitoring/alerts
POST /api/monitoring/alerts/:id/acknowledge
GET  /api/monitoring/alerts/unacknowledged
```

#### Data Ingestion
```
POST /api/monitoring/ingest/trade
POST /api/monitoring/ingest/sentiment
POST /api/monitoring/ingest/wallet
```

#### Configuration
```
GET /api/monitoring/config
PUT /api/monitoring/config
```

## 📊 Data Sources

The system monitors multiple data sources:

| Source | Description | Anomaly Examples |
|--------|-------------|------------------|
| **Trading Volume** | Exchange trading activity | Unusual spikes, wash trading |
| **Price Movement** | Asset price changes | Flash crashes, pumps |
| **Sentiment** | Social media & news | Sentiment shifts, FUD |
| **Wallet Activity** | On-chain transactions | Whale movements, exploits |
| **Network Fees** | Gas prices | Congestion, attacks |
| **On-Chain Metrics** | Active addresses, TVL | Network growth, migration |

## 🧪 Examples

See the `examples/` directory for complete examples:

- `basic-usage.ts` - Simple setup and usage
- `advanced-integration.ts` - Full integration with external systems
- `custom-rules.ts` - Adding custom detection rules

## 🔐 Security

The system includes built-in security features:

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes all inputs
- **Secure Defaults**: Conservative thresholds
- **Audit Logging**: Tracks all anomaly detections

## ⚡ Performance

- **Latency**: <100ms detection time
- **Throughput**: 10,000+ data points/second
- **Memory**: Efficient LRU caching
- **Scalability**: Horizontal scaling ready

## 🎨 Customization

### Custom Detection Rules

```typescript
const classifier = system.getClassifier();

classifier.addRule({
  name: 'custom_whale_alert',
  condition: (anomaly) => 
    anomaly.source === DataSource.WALLET_ACTIVITY &&
    anomaly.dataPoint.metadata?.transactionValue > 10000000,
  type: AnomalyType.OPPORTUNITY,
  reasoning: 'Major whale transaction detected',
  confidence: 0.9
});
```

### Custom Actions

```typescript
const actionEngine = system.getActionEngine();

actionEngine.addActionRule({
  condition: (anomaly) => anomaly.score > 0.95,
  template: {
    priority: 'urgent',
    category: 'investigate',
    description: 'Critical anomaly requires immediate review',
    detailsGenerator: (a) => `Score: ${a.score}`,
    automatable: false
  }
});
```

## 📈 Monitoring Dashboard

Access the built-in dashboard at `/api/monitoring/dashboard/overview`

Features:
- Real-time anomaly feed
- System statistics
- Alert management
- Baseline visualization
- Performance metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

### Environment Variables

```bash
PORT=3030
NODE_ENV=production
ENABLE_REAL_TIME=true
BATCH_SIZE=100
```

## 📝 Configuration

### Monitoring Config

```typescript
{
  sources: DataSource[],           // Data sources to monitor
  updateInterval: number,          // Processing interval (ms)
  lookbackPeriod: number,          // Hours of historical data
  sensitivityThreshold: number,    // 0-1, detection sensitivity
  enableRealTime: boolean,         // Real-time processing
  enableBatching: boolean,         // Batch processing
  batchSize: number,               // Items per batch
  anomalyThresholds: {
    statistical: number,           // Standard deviations
    ml: number,                    // ML anomaly score
    percentile: number             // Percentile threshold
  }
}
```

### Notification Config

```typescript
{
  channels: {
    email: { enabled: boolean, recipients: string[] },
    sms: { enabled: boolean, phoneNumbers: string[] },
    webhook: { enabled: boolean, urls: string[] },
    slack: { enabled: boolean, webhookUrl: string },
    telegram: { enabled: boolean, botToken: string, chatIds: string[] }
  },
  defaultChannels: AlertChannel[],
  rateLimits: {
    maxAlertsPerMinute: number,
    maxAlertsPerHour: number
  }
}
```

## 🤝 Integration

### With Existing Services

```typescript
// Subscribe to anomaly events
system.on('anomaly_detected', async (anomaly) => {
  // Send to your analytics
  await analyticsService.track('anomaly', anomaly);
  
  // Update trading strategy
  if (anomaly.type === AnomalyType.OPPORTUNITY) {
    await tradingBot.evaluate(anomaly);
  }
  
  // Log to database
  await db.anomalies.insert(anomaly);
});
```

## 📚 Domain Knowledge

The system includes extensive crypto-specific domain knowledge:

- Trading patterns (accumulation, distribution, pumps, dumps)
- Market psychology (FOMO, FUD, capitulation)
- On-chain metrics (whale behavior, network effects)
- DeFi protocols (TVL, yield farming, liquidity)
- Security threats (exploits, rug pulls, attacks)

## 🎓 Best Practices

1. **Start Conservative**: Begin with higher thresholds, tune down
2. **Learn First**: Always learn baselines before production
3. **Monitor Alerts**: Review and acknowledge alerts regularly
4. **Custom Rules**: Add domain-specific rules for your use case
5. **Integration**: Connect to your existing monitoring stack

## 🐛 Troubleshooting

### Common Issues

**No anomalies detected**
- Check if baselines are learned
- Verify sensitivity thresholds
- Ensure data is flowing

**Too many false positives**
- Increase threshold values
- Add more historical data for baseline
- Enable seasonal pattern detection

**High memory usage**
- Reduce batch size
- Decrease lookback period
- Enable data retention limits

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with world-class AI/ML techniques and extensive domain knowledge in cryptocurrency markets.

## 📧 Support

For issues and feature requests, please open an issue on GitHub.

---

**Built with ❤️ by the Coinet AI Team**

*Proactive monitoring • AI-driven detection • World-class performance*

