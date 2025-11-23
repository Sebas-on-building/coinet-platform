# Confidence Scoring System

## Overview

The Confidence Scoring System provides advanced signal confidence evaluation with multiple factors including data freshness, source reliability, historical accuracy, signal consistency, and market regime appropriateness. It features normalization via z-score or min-max scaling with configurable time decay.

## Key Features

### 🔄 Multi-Factor Analysis
- **Data Freshness**: Time-based decay for signal relevance
- **Source Reliability**: Historical performance tracking per source
- **Historical Accuracy**: Signal type accuracy over time
- **Signal Consistency**: Consistency with recent signals of same type
- **Market Regime Fit**: Appropriateness for current market conditions
- **Signal Strength**: Inherent signal quality indicators

### 📊 Normalization & Scaling
- **Z-Score Normalization**: Statistical standardization
- **Min-Max Scaling**: Range-based normalization
- **Time Decay**: Configurable exponential decay for older signals

### ⚖️ Configurable Weighting
- **Signal Type Weights**: Market, On-Chain, Social signal categories
- **Factor Weights**: Individual factor importance configuration
- **Backtesting Calibration**: Optimize weights using historical data

### 🎯 Market Regime Awareness
- **Dynamic Adaptation**: Adjusts scoring based on market conditions
- **Regime Detection**: Identifies bull/bear, volatility, and sentiment states
- **Contextual Scoring**: Different signal types score differently per regime

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Raw Signals   │───▶│ ConfidenceScorer │───▶│   API Layer     │
│                 │    │                 │    │                 │
│ • Data Sources  │    │ • Factor Calc   │    │ • HTTP/REST     │
│ • Timestamps    │    │ • Normalization │    │ • Batch Process │
│ • Metadata      │    │ • Weighting     │    │ • Caching       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Fusion Engine  │
                       │                 │
                       │ • Enhanced      │
                       │   Weighting     │
                       │ • Confidence    │
                       │   Integration   │
                       └─────────────────┘
```

## Usage Examples

### Basic Confidence Calculation

```typescript
import { ConfidenceAPI } from './src/confidence';

// Initialize with default configuration
const confidenceAPI = new ConfidenceAPI(ConfidenceAPI.createDefaultConfig());
await confidenceAPI.initialize();

// Calculate confidence for a signal
const request = {
  signalId: 'signal_123',
  signalType: 'price',
  timestamp: new Date(),
  context: {
    sourceId: 'binance_api'
  }
};

const response = await confidenceAPI.calculateConfidence(request);
console.log(`Confidence Score: ${response.score.overallScore}`);
console.log(`Factors:`, response.score.factors);
```

### Batch Processing

```typescript
// Process multiple signals efficiently
const requests = [
  { signalId: 'sig1', signalType: 'price', timestamp: new Date() },
  { signalId: 'sig2', signalType: 'social_media', timestamp: new Date() },
  { signalId: 'sig3', signalType: 'on_chain', timestamp: new Date() }
];

const responses = await confidenceAPI.batchCalculateConfidence(requests);
responses.forEach((response, index) => {
  console.log(`Signal ${index + 1}: ${response.score.overallScore}`);
});
```

### Integration with Fusion Engine

```typescript
import { FusionEngine } from './src/fusion';
import { ConfidenceAPI } from './src/confidence';

// Set up fusion engine with confidence scoring
const fusionEngine = new FusionEngine(fusionConfig);
fusionEngine.setConfidenceAPI(confidenceAPI, confidenceConfig);

// Enhanced fusion now uses confidence scores
const fusionUpdate = await fusionEngine.updateFusion();
```

### Learning from Outcomes

```typescript
// Update source reliability based on signal accuracy
await confidenceAPI.updateSourceReliability('binance_api', 'price', true);

// Update historical accuracy for signal types
await confidenceAPI.updateHistoricalAccuracy('price', true);
```

### Backtesting and Calibration

```typescript
// Perform backtesting to optimize weights
const backtestResult = await confidenceAPI.performBacktesting(
  new Date('2024-01-01'),
  new Date('2024-06-01')
);

console.log('Backtesting Results:', {
  accuracy: backtestResult.metrics.accuracy,
  calibrationScore: backtestResult.metrics.calibrationScore,
  optimalWeights: backtestResult.recommendations.optimalWeights
});

// Apply optimized configuration
confidenceAPI.updateConfigWithBacktesting(backtestResult);
```

## Configuration

### Default Configuration

```typescript
const config = ConfidenceAPI.createDefaultConfig();

// Key settings
config.normalizationType = 'z_score';
config.timeDecay.enabled = true;
config.timeDecay.halfLifeMinutes = 30;
config.factorWeights = {
  dataFreshness: 0.15,
  sourceReliability: 0.25,
  historicalAccuracy: 0.20,
  signalConsistency: 0.15,
  marketRegimeFit: 0.15,
  signalStrength: 0.10
};
config.signalTypeWeights = {
  market: 0.4,    // Price, volume, technical
  onChain: 0.35,  // On-chain, DeFi metrics
  social: 0.25    // Social media, news
};
```

### Custom Configuration

```typescript
const customConfig = {
  ...ConfidenceAPI.createDefaultConfig(),
  normalizationType: 'min_max',
  timeDecay: {
    enabled: true,
    halfLifeMinutes: 15,  // Faster decay
    maxAgeMinutes: 720    // 12 hours max
  },
  factorWeights: {
    dataFreshness: 0.20,      // Emphasize recency
    sourceReliability: 0.30,   // Trust reliable sources more
    historicalAccuracy: 0.25,
    signalConsistency: 0.10,
    marketRegimeFit: 0.10,
    signalStrength: 0.05
  }
};
```

## API Endpoints

### REST-style Interface

```typescript
// HTTP-style requests supported
const response = await confidenceAPI.handleRequest('POST', '/confidence/calculate', {
  signalId: 'sig123',
  signalType: 'price',
  timestamp: new Date().toISOString()
});
```

### Available Endpoints

- `POST /confidence/calculate` - Single signal confidence
- `POST /confidence/batch` - Batch confidence calculation
- `GET /confidence/score/:signalId` - Retrieve stored score
- `POST /confidence/source-reliability` - Update source reliability
- `POST /confidence/historical-accuracy` - Update historical accuracy
- `POST /confidence/backtesting` - Run backtesting
- `GET /confidence/config` - Get current configuration
- `PUT /confidence/config` - Update configuration
- `GET /confidence/status` - System status

## Advanced Features

### Market Regime Detection

The system automatically detects market regimes and adjusts scoring:

```typescript
// High volatility bull market preferences
const bullHighVol = {
  price: 0.9, volume: 0.8, technical: 0.9,
  on_chain: 0.7, defi_metrics: 0.6,
  social_media: 0.3, news: 0.5
};

// Bear market emphasizes different signals
const bearMarket = {
  price: 0.9, volume: 0.8, technical: 0.9,
  on_chain: 0.8, fundamental: 0.9  // More emphasis on fundamentals
};
```

### Caching and Performance

- **5-minute TTL** for confidence calculations
- **Concurrent batch processing** for efficiency
- **Memory-efficient storage** with automatic cleanup
- **Lazy evaluation** for expensive computations

### Event-Driven Architecture

```typescript
// Listen for confidence calculation events
confidenceAPI.on('confidence_calculated', (response) => {
  console.log('New confidence score:', response.score.overallScore);
});

// Listen for fusion integration events
fusionEngine.on('fusion_update', (update) => {
  console.log('Fusion updated with confidence:', update.confidence);
});
```

## Performance Characteristics

- **Latency**: ~5-15ms per signal (cached), ~50-100ms (fresh calculation)
- **Throughput**: 1000+ signals/second with batching
- **Memory**: ~1MB per 10,000 cached scores
- **Scalability**: Horizontal scaling via stateless design

## Monitoring and Observability

The system provides comprehensive logging and metrics:

```typescript
// Access system status
const status = confidenceAPI.getStatus();
console.log('Confidence Scorer Status:', status);

// Monitor performance
confidenceAPI.on('confidence_calculated', (response) => {
  if (response.calculationTime > 100) {
    console.warn('Slow confidence calculation:', response.calculationTime);
  }
});
```

## Integration Examples

### With Signal Evaluation Engine

```typescript
// In your signal processing pipeline
class SignalProcessor {
  async processSignal(rawSignal: RawSignal): Promise<NormalizedSignal> {
    // Normalize signal
    const normalized = await this.normalizer.normalize(rawSignal);

    // Calculate confidence
    const confidence = await this.confidenceAPI.calculateConfidence({
      signalId: normalized.id,
      signalType: normalized.type,
      timestamp: normalized.timestamp
    });

    // Enhanced signal with confidence
    return {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        confidence: confidence.score.overallScore
      }
    };
  }
}
```

### With Trading Systems

```typescript
// Risk management integration
class RiskManager {
  async assessSignalRisk(signal: NormalizedSignal): Promise<RiskAssessment> {
    const confidence = await this.confidenceAPI.calculateConfidence({
      signalId: signal.id,
      signalType: signal.type,
      timestamp: signal.timestamp
    });

    const riskScore = this.calculateRiskScore(signal, confidence.score);

    return {
      signalId: signal.id,
      riskLevel: riskScore > 0.8 ? 'low' : riskScore > 0.5 ? 'medium' : 'high',
      confidence: confidence.score.overallScore,
      reasoning: `Based on ${Object.keys(confidence.score.factors).length} factors`
    };
  }
}
```

## Best Practices

1. **Batch Processing**: Use batch operations for multiple signals
2. **Caching**: Leverage built-in caching for repeated calculations
3. **Configuration**: Start with defaults, calibrate with backtesting
4. **Monitoring**: Track calculation performance and accuracy
5. **Learning**: Regularly update source reliability and historical accuracy
6. **Regime Awareness**: Consider market conditions in signal evaluation

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**: Check source reliability and historical accuracy
2. **Performance Issues**: Enable caching and use batch processing
3. **Inconsistent Results**: Verify normalization settings and factor weights
4. **Memory Usage**: Monitor cache size and adjust TTL as needed

### Debug Information

```typescript
// Detailed logging
confidenceAPI.confidenceScorer.logger.setLevel('debug');

// Access internal metrics
const internalState = {
  sourcesTracked: confidenceAPI.confidenceScorer['sourceReliability'].size,
  signalTypesTracked: confidenceAPI.confidenceScorer['historicalAccuracy'].size,
  cacheSize: confidenceAPI.confidenceScorer['confidenceCache'].size
};
```
