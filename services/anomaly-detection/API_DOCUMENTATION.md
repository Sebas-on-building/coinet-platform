# 📚 Complete API Documentation

## Revolutionary Features API Reference

---

## 🔮 Predictive Anomaly Engine

### Initialize

```typescript
import { PredictiveAnomalyEngine } from '@coinet-ai/anomaly-detection';

const predictiveEngine = new PredictiveAnomalyEngine();
```

### Predict Future Anomalies

```typescript
const predictions = await predictiveEngine.predictFutureAnomalies(
  recentDataPoints,  // Last 100+ data points
  baseline,          // Learned baseline
  'BTC'             // Symbol
);

// Returns: Prediction[]
{
  id: string,
  timestamp: Date,
  predictedTime: Date,      // When anomaly will occur
  confidence: number,        // 0-1
  source: DataSource,
  predictedValue: number,
  expectedValue: number,
  deviation: number,
  type: 'price_spike' | 'volume_surge' | 'crash' | 'manipulation' | 'opportunity',
  indicators: string[],
  preventiveActions: string[],
  timeToEvent: number       // Milliseconds until event
}
```

### Validate Predictions

```typescript
const validation = await predictiveEngine.validatePredictions(
  'BTC',
  actualAnomaly
);

// Returns: { accuracy: number, predictions: Prediction[] }
```

### Events

```typescript
predictiveEngine.on('prediction_made', (prediction) => {
  console.log(`Prediction: ${prediction.type} in ${prediction.timeToEvent}ms`);
});
```

---

## 🧬 Causal Analysis Engine

### Initialize

```typescript
import { CausalAnalysisEngine } from '@coinet-ai/anomaly-detection';

const causalEngine = new CausalAnalysisEngine();
```

### Identify Root Cause

```typescript
const rootCause = await causalEngine.identifyRootCause(
  anomaly,
  relatedDataMap  // Map<DataSource, DataPoint[]>
);

// Returns: RootCause
{
  id: string,
  anomalyId: string,
  primaryCause: string,
  contributingFactors: [{
    factor: string,
    contribution: number,  // Percentage: 0-1
    dataSource: DataSource
  }],
  causalChain: string[],   // Step-by-step chain
  counterfactual: string,  // "What if" analysis
  confidence: number,
  evidence: string[]
}
```

### Recommend Intervention

```typescript
const recommendation = await causalEngine.recommendIntervention(rootCause);

// Returns: InterventionRecommendation
{
  id: string,
  rootCause: RootCause,
  intervention: string,
  expectedImpact: number,  // -1 to 1
  cost: 'low' | 'medium' | 'high',
  timeToEffect: number,
  risks: string[],
  benefits: string[]
}
```

### Events

```typescript
causalEngine.on('root_cause_identified', (rootCause) => {
  console.log(`Primary cause: ${rootCause.primaryCause}`);
});
```

---

## 🚨 Market Manipulation Detector

### Initialize

```typescript
import { MarketManipulationDetector } from '@coinet-ai/anomaly-detection';

const manipulationDetector = new MarketManipulationDetector();
```

### Detect Manipulation

```typescript
const detections = await manipulationDetector.detectManipulation(
  tradingData,
  priceData,
  volumeData,
  walletActivity  // Optional
);

// Returns: ManipulationDetection[]
{
  id: string,
  timestamp: Date,
  type: ManipulationType,  // 9 types available
  confidence: number,
  severity: 'low' | 'medium' | 'high' | 'critical',
  participants: string[],  // Wallet addresses
  affectedAssets: string[],
  pattern: {
    description: string,
    indicators: string[],
    timeline: [{ time: Date, event: string }]
  },
  evidence: {
    statistical: string[],
    behavioral: string[],
    network: string[]
  },
  estimatedImpact: {
    priceImpact: number,
    volumeManipulated: number,
    victimCount: number
  },
  countermeasures: string[]
}
```

### Manipulation Types

```typescript
enum ManipulationType {
  WASH_TRADING,          // Self-trading to inflate volume
  PUMP_AND_DUMP,         // Coordinated price manipulation
  SPOOFING,              // Fake orders
  LAYERING,              // Multiple fake order layers
  FRONT_RUNNING,         // Trading ahead of known orders
  BEAR_RAID,             // Coordinated short selling
  CORNERING,             // Market cornering
  QUOTE_STUFFING,        // High-frequency order spam
  COORDINATED_ATTACK     // Multi-participant fraud
}
```

### Check Wallet Suspicion

```typescript
const isSuspicious = manipulationDetector.isWalletSuspicious(
  '0x123...abc',
  10  // Threshold score
);

const suspiciousWallets = manipulationDetector.getSuspiciousWallets();
// Returns: Map<address, suspicionScore>
```

### Events

```typescript
manipulationDetector.on('manipulation_detected', (detection) => {
  console.log(`${detection.type}: ${detection.severity}`);
});
```

---

## 🕸️ Graph Neural Network Analyzer

### Initialize

```typescript
import { GraphNeuralNetworkAnalyzer } from '@coinet-ai/anomaly-detection';

const graphAnalyzer = new GraphNeuralNetworkAnalyzer();
```

### Build Graph

```typescript
// Add wallet nodes
graphAnalyzer.addWallet({
  address: '0x123...abc',
  balance: 1000000,
  transactionCount: 150,
  firstSeen: new Date(),
  lastActive: new Date(),
  labels: ['whale', 'exchange'],
  riskScore: 0.3
});

// Add transaction edges
graphAnalyzer.addTransaction({
  from: '0x123...abc',
  to: '0x456...def',
  value: 50000,
  timestamp: new Date(),
  gasPrice: 50,
  successful: true
});
```

### Analyze Fund Flows

```typescript
const flows = await graphAnalyzer.analyzeFundFlows(
  '0x123...abc',  // Start address
  1000,          // Minimum value
  5              // Max hops
);

// Returns: FundFlow[]
{
  id: string,
  path: string[],              // Chain of addresses
  totalValue: number,
  hops: number,
  startTime: Date,
  endTime: Date,
  suspicionLevel: 'clean' | 'questionable' | 'suspicious' | 'high_risk',
  indicators: string[]
}
```

### Detect Clusters

```typescript
const clusters = await graphAnalyzer.detectClusters();

// Returns: WalletCluster[]
{
  id: string,
  wallets: string[],
  totalValue: number,
  cohesion: number,          // How tightly connected
  purpose: 'exchange' | 'whale_group' | 'mixer' | 'sybil' | 'normal' | 'suspicious',
  confidence: number,
  centerNodes: string[]      // Most influential wallets
}
```

### Detect Sybil Attacks

```typescript
const sybilAttacks = await graphAnalyzer.detectSybilAttacks();

// Returns: SybilDetection[]
{
  id: string,
  suspectedController: string,
  sybilWallets: string[],
  confidence: number,
  evidence: {
    commonFundingSource: boolean,
    synchronizedActivity: boolean,
    similarBehavior: boolean,
    clusteredCreation: boolean
  },
  estimatedRealWallets: number
}
```

### Calculate Centrality

```typescript
const centrality = graphAnalyzer.calculateCentrality('0x123...abc');

// Returns:
{
  degree: number,        // Connection count
  betweenness: number,   // Bridge importance
  pageRank: number,      // Google-style ranking
  influence: number      // Combined score
}
```

### Events

```typescript
graphAnalyzer.on('cluster_detected', (cluster) => {
  console.log(`Cluster: ${cluster.wallets.length} wallets, purpose: ${cluster.purpose}`);
});

graphAnalyzer.on('sybil_detected', (sybil) => {
  console.log(`Sybil attack: ${sybil.sybilWallets.length} fake wallets`);
});
```

---

## 🤖 Autonomous Trading Agent

### Initialize

```typescript
import { AutonomousTradingAgent } from '@coinet-ai/anomaly-detection';

const tradingAgent = new AutonomousTradingAgent(
  {
    enabled: true,
    maxPositionSize: 10,          // 10% max
    maxDailyTrades: 50,
    minConfidence: 0.75,
    riskTolerance: 'moderate',
    allowedAssets: ['BTC', 'ETH'],
    prohibitedAssets: [],
    requiresApproval: false,      // Full autonomous!
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    maxDrawdown: 20
  },
  1000000  // $1M initial capital
);
```

### Evaluate and Trade

```typescript
const decision = await tradingAgent.evaluateAnomaly(
  anomaly,
  prediction,  // Optional
  rootCause    // Optional
);

// Returns: TradingDecision
{
  id: string,
  timestamp: Date,
  type: TradeType,
  symbol: string,
  quantity: number,
  price: number,
  confidence: number,
  reasoning: string[],
  basedOn: {
    anomalies: string[],
    predictions: string[],
    rootCauses: string[]
  },
  riskAssessment: RiskAssessment,
  expectedReturn: number,
  timeHorizon: number,
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed'
}
```

### Manual Approval

```typescript
// Approve decision
tradingAgent.approveDecision(decisionId);

// Reject decision
tradingAgent.rejectDecision(decisionId, 'Too risky');
```

### Portfolio Management

```typescript
const portfolio = tradingAgent.getPortfolio();

// Returns: PortfolioState
{
  totalValue: number,
  cash: number,
  positions: Map<symbol, {
    quantity: number,
    averagePrice: number,
    currentPrice: number,
    unrealizedPnL: number,
    allocation: number
  }>,
  performance: {
    totalReturn: number,
    sharpeRatio: number,
    maxDrawdown: number,
    winRate: number
  }
}
```

### Emergency Stop

```typescript
await tradingAgent.emergencyStop('Market crash detected');
// Closes all positions immediately
```

### Events

```typescript
tradingAgent.on('decision_made', (decision) => {
  console.log(`Decision: ${decision.type} ${decision.symbol}`);
});

tradingAgent.on('trade_executed', ({ decision, result }) => {
  console.log(`Executed: PnL = $${result.pnl}`);
});

tradingAgent.on('emergency_stop', ({ reason }) => {
  console.log(`EMERGENCY STOP: ${reason}`);
});
```

---

## 🌐 Cross-Chain Correlation Engine

### Initialize

```typescript
import { CrossChainCorrelationEngine } from '@coinet-ai/anomaly-detection';

const crossChainEngine = new CrossChainCorrelationEngine();
```

### Analyze Cross-Chain Correlations

```typescript
const correlations = await crossChainEngine.analyzeCorrelations(
  chainMetricsMap  // Map<chain, ChainMetrics[]>
);

// Returns: CrossChainCorrelation[]
{
  chains: string[],
  correlation: number,       // -1 to 1
  timelag: number,           // milliseconds
  confidence: number,
  type: 'positive' | 'negative' | 'leading' | 'lagging',
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong'
}
```

### Detect Cross-Chain Anomalies

```typescript
const anomalies = await crossChainEngine.detectCrossChainAnomalies(
  chainMetricsMap,
  bridgeData
);

// Returns: CrossChainAnomaly[]
{
  id: string,
  timestamp: Date,
  chains: string[],
  type: 'bridge_exploit' | 'arbitrage' | 'coordinated_attack' | 'liquidity_crisis',
  description: string,
  affectedAssets: string[],
  evidence: {
    priceDiscrepancy?: number,
    volumeSpike?: number,
    suspiciousTransfers?: number,
    timing: string
  },
  severity: 'low' | 'medium' | 'high' | 'critical',
  estimatedImpact: number,
  countermeasures: string[]
}
```

### Monitor Bridge Activity

```typescript
const activity = await crossChainEngine.monitorBridgeActivity(
  'Wormhole',      // Bridge name
  'ethereum',      // Source chain
  'bsc',          // Target chain
  transfers       // Transfer array
);

// Returns: BridgeActivity
{
  bridge: string,
  sourceChain: string,
  targetChain: string,
  volume: number,
  transactionCount: number,
  largestTransfer: number,
  averageTransfer: number,
  timestamp: Date,
  anomalous: boolean
}
```

### Events

```typescript
crossChainEngine.on('cross_chain_anomaly', (anomaly) => {
  console.log(`${anomaly.type} across ${anomaly.chains.join(', ')}`);
});

crossChainEngine.on('bridge_anomaly', (activity) => {
  console.log(`Bridge anomaly: ${activity.bridge}`);
});
```

---

## 🌟 Advanced Monitoring System

### Initialize (All Features)

```typescript
import { AdvancedMonitoringSystem } from '@coinet-ai/anomaly-detection';

const system = new AdvancedMonitoringSystem({
  baseSystem: { /* base config */ },
  predictive: {
    enabled: true,
    lookAheadHours: 1,
    minPredictionConfidence: 0.7
  },
  causal: {
    enabled: true,
    depthOfAnalysis: 'deep'
  },
  manipulation: {
    enabled: true,
    sensitivity: 'high'
  },
  graph: {
    enabled: true,
    maxGraphSize: 100000,
    clusteringInterval: 300000
  },
  autonomous: {
    enabled: true,
    requiresApproval: false,
    maxPositionSize: 10,
    riskTolerance: 'moderate'
  },
  crossChain: {
    enabled: true,
    chains: ['ethereum', 'bsc', 'polygon'],
    monitorBridges: true
  }
});
```

### Start System

```typescript
await system.start();
// Starts all engines and begins monitoring
```

### Get Comprehensive Report

```typescript
const report = await system.getComprehensiveReport();

// Returns complete system state:
{
  baseSystem: { /* base stats */ },
  predictive: {
    totalPredictions: number
  },
  causal: {
    rootCausesIdentified: number,
    causalGraph: number
  },
  manipulation: {
    detectionsTotal: number,
    suspiciousWallets: number
  },
  graph: {
    totalNodes: number,
    totalEdges: number,
    density: number
  },
  trading: {
    portfolio: PortfolioState,
    performance: Performance,
    pendingDecisions: number
  },
  crossChain: {
    correlations: number,
    anomalies: number
  },
  insights: SystemInsights
}
```

### Access Individual Engines

```typescript
const engines = system.getEngines();

engines.base          // ProactiveMonitoringSystem
engines.predictive    // PredictiveAnomalyEngine
engines.causal        // CausalAnalysisEngine
engines.manipulation  // MarketManipulationDetector
engines.graph         // GraphNeuralNetworkAnalyzer
engines.trading       // AutonomousTradingAgent
engines.crossChain    // CrossChainCorrelationEngine
```

### Emergency Shutdown

```typescript
await system.emergencyShutdown('Critical security issue');
// Stops all trading, closes positions, shuts down system
```

### Events (Comprehensive)

```typescript
// Prediction events
system.on('prediction_made', (prediction) => { });

// Causal events  
system.on('root_cause_identified', (rootCause) => { });

// Manipulation events
system.on('manipulation_detected', (detection) => { });

// Graph events
system.on('cluster_detected', (cluster) => { });
system.on('sybil_detected', (sybil) => { });

// Trading events
system.on('trading_decision', (decision) => { });
system.on('trade_executed', (data) => { });

// Cross-chain events
system.on('cross_chain_anomaly', (anomaly) => { });

// System events
system.on('insights_generated', (insights) => { });
system.on('emergency_shutdown', (data) => { });
```

---

## 📊 Complete Usage Example

```typescript
import { AdvancedMonitoringSystem } from '@coinet-ai/anomaly-detection';

// Initialize revolutionary system
const system = new AdvancedMonitoringSystem(config);

// Setup event listeners
system.on('prediction_made', (prediction) => {
  console.log(`🔮 Future: ${prediction.type} in ${prediction.timeToEvent}ms`);
});

system.on('manipulation_detected', (detection) => {
  console.log(`🚨 Fraud: ${detection.type} - ${detection.severity}`);
  // Take immediate action
});

system.on('trading_decision', (decision) => {
  if (decision.status === 'pending') {
    // Manual approval if required
    if (decision.confidence > 0.9) {
      tradingAgent.approveDecision(decision.id);
    }
  }
});

// Start the system
await system.start();

// System now:
// ✅ Predicts future anomalies
// ✅ Detects current anomalies
// ✅ Analyzes root causes
// ✅ Checks for manipulation
// ✅ Analyzes wallet relationships
// ✅ Makes trading decisions
// ✅ Executes trades autonomously
// ✅ Monitors across multiple chains
// ✅ Generates comprehensive insights

// Get real-time insights
const insights = system.getLatestInsights();
console.log(insights.topInsights);
console.log(insights.criticalActions);

// Get comprehensive report
const report = await system.getComprehensiveReport();
console.log(`Portfolio: $${report.trading.portfolio.totalValue}`);
console.log(`Return: ${report.trading.performance.totalReturn}%`);
console.log(`Manipulations detected: ${report.manipulation.detectionsTotal}`);
console.log(`Graph nodes: ${report.graph.totalNodes}`);
```

---

## 🎯 Advanced Use Cases

### Use Case 1: Predictive Trading

```typescript
// Predict anomalies before they occur
const predictions = await predictiveEngine.predictFutureAnomalies(
  recentData, baseline, 'BTC'
);

for (const prediction of predictions) {
  if (prediction.confidence > 0.8 && prediction.type === 'opportunity') {
    // Prepare for predicted event
    console.log(`Opportunity in ${prediction.timeToEvent / 60000} minutes`);
    console.log(`Actions: ${prediction.preventiveActions.join(', ')}`);
  }
}
```

### Use Case 2: Fraud Investigation

```typescript
// Comprehensive fraud analysis
const manipulations = await manipulationDetector.detectManipulation(
  tradingData, priceData, volumeData, walletActivity
);

for (const detection of manipulations) {
  if (detection.severity === 'critical') {
    // Generate forensic report
    console.log(`Type: ${detection.type}`);
    console.log(`Participants: ${detection.participants.join(', ')}`);
    console.log(`Evidence: ${detection.evidence.statistical.join(', ')}`);
    console.log(`Timeline: ${JSON.stringify(detection.pattern.timeline)}`);
    
    // Take action
    detection.participants.forEach(addr => {
      // Flag wallet, freeze assets, report to authorities
    });
  }
}
```

### Use Case 3: Network Analysis

```typescript
// Analyze wallet relationships
const flows = await graphAnalyzer.analyzeFundFlows('0x123...abc', 10000, 10);

const suspiciousFlows = flows.filter(f => f.suspicionLevel === 'high_risk');

for (const flow of suspiciousFlows) {
  console.log(`Suspicious flow: ${flow.path.join(' → ')}`);
  console.log(`Value: $${flow.totalValue}`);
  console.log(`Indicators: ${flow.indicators.join(', ')}`);
  
  // Investigate each wallet in the path
  for (const wallet of flow.path) {
    const centrality = graphAnalyzer.calculateCentrality(wallet);
    console.log(`${wallet}: Influence = ${centrality.influence.toFixed(2)}`);
  }
}
```

### Use Case 4: Autonomous Portfolio Management

```typescript
// Let AI manage your portfolio
const agent = new AutonomousTradingAgent(config, 1000000);

// Agent automatically:
// 1. Monitors anomalies
// 2. Evaluates opportunities and threats
// 3. Calculates optimal position sizes
// 4. Executes trades
// 5. Manages risk
// 6. Tracks performance

// Just monitor results
setInterval(() => {
  const portfolio = agent.getPortfolio();
  const performance = agent.getPerformance();
  
  console.log(`Portfolio: $${portfolio.totalValue.toLocaleString()}`);
  console.log(`Return: ${performance.totalReturn.toFixed(2)}%`);
  console.log(`Win Rate: ${(performance.winRate * 100).toFixed(0)}%`);
  console.log(`Sharpe: ${performance.sharpeRatio.toFixed(2)}`);
}, 60000); // Every minute
```

---

## 🔧 Configuration Best Practices

### Conservative Setup

```typescript
{
  predictive: { enabled: true, minPredictionConfidence: 0.85 },
  autonomous: {
    enabled: true,
    requiresApproval: true,      // Human approval
    maxPositionSize: 5,          // 5% max
    riskTolerance: 'conservative'
  }
}
```

### Aggressive Setup

```typescript
{
  predictive: { enabled: true, minPredictionConfidence: 0.7 },
  autonomous: {
    enabled: true,
    requiresApproval: false,     // Fully autonomous
    maxPositionSize: 15,         // 15% max
    riskTolerance: 'aggressive'
  }
}
```

### Security-Focused Setup

```typescript
{
  manipulation: { enabled: true, sensitivity: 'high' },
  graph: { enabled: true, clusteringInterval: 60000 },  // 1 minute
  autonomous: { enabled: false },  // No autonomous trading
  crossChain: { enabled: true, monitorBridges: true }
}
```

---

## 📈 Performance Optimization

### For High-Frequency Trading

```typescript
{
  baseSystem: {
    monitoring: {
      updateInterval: 100,      // 100ms
      enableBatching: false,    // Real-time only
      batchSize: 1
    }
  },
  predictive: { lookAheadHours: 0.1 }  // 6 minutes ahead
}
```

### For Large-Scale Monitoring

```typescript
{
  baseSystem: {
    monitoring: {
      enableBatching: true,
      batchSize: 1000
    }
  },
  graph: {
    maxGraphSize: 1000000,    // 1M wallets
    clusteringInterval: 3600000  // 1 hour
  }
}
```

---

## 🎓 Integration Patterns

### With Existing Trading Bot

```typescript
tradingAgent.on('decision_made', async (decision) => {
  if (decision.confidence > 0.85) {
    // Send to your trading bot
    await yourTradingBot.execute(decision);
  }
});
```

### With Risk Management System

```typescript
system.on('manipulation_detected', async (detection) => {
  await riskSystem.alert(detection);
  
  if (detection.severity === 'critical') {
    await riskSystem.freezeAsset(detection.affectedAssets);
  }
});
```

### With Analytics Platform

```typescript
system.on('insights_generated', async (insights) => {
  await analytics.track('system_insights', {
    anomalies: insights.anomaliesDetected,
    manipulations: insights.manipulationCases,
    decisions: insights.tradingDecisions,
    health: insights.systemHealth
  });
});
```

---

## 🔬 Research References

1. **LSTM**: Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory.
2. **Transformers**: Vaswani, A., et al. (2017). Attention is all you need.
3. **GNN**: Scarselli, F., et al. (2009). The graph neural network model.
4. **Granger Causality**: Granger, C. W. (1969). Investigating causal relations.
5. **Kelly Criterion**: Kelly, J. (1956). A new interpretation of information rate.
6. **Isolation Forest**: Liu, F. T., et al. (2008). Isolation forest.
7. **Prophet**: Taylor, S. J., & Letham, B. (2018). Forecasting at scale.

---

**Built for perfection. Ready for production. Designed for the future.** 🚀


