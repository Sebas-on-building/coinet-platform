# Cross-Signal Correlation Analysis

## Overview

The Cross-Signal Correlation Analysis system provides advanced statistical analysis of relationships between different signal types (market, on-chain, social). It uses correlation measures, Granger causality, signal clustering, and principal component analysis to detect lead-lag relationships, convergence patterns, and predictive signal combinations.

## Key Features

### 📊 **Statistical Correlation Analysis**
- **Pearson Correlation**: Linear relationship strength (-1 to 1)
- **Spearman Correlation**: Rank-based correlation for non-linear relationships
- **Significance Testing**: Statistical p-values for correlation validity
- **Multi-timeframe Analysis**: 1h, 4h, 24h correlation windows

### 🔄 **Granger Causality Detection**
- **Lead-Lag Relationships**: Determines which signals predict others
- **Temporal Causality**: Statistical test for directional influence
- **Lag Order Optimization**: Finds optimal time delays between signals
- **Causality Strength**: Quantifies causal relationship intensity

### 🎯 **Signal Clustering**
- **Convergence Detection**: Identifies when multiple signals converge before price moves
- **Hierarchical Clustering**: Groups similar signals based on correlation patterns
- **Predictive Power Assessment**: Measures cluster accuracy in price prediction
- **Pattern Recognition**: Detects recurring signal convergence patterns

### 🧬 **Principal Component Analysis (PCA)**
- **Dimensionality Reduction**: Reduces signal complexity while preserving information
- **Feature Extraction**: Identifies most important signal characteristics
- **Variance Analysis**: Shows how much information each component explains
- **Signal Importance Ranking**: Prioritizes signals by predictive power

### ⚖️ **Adaptive Weighting Integration**
- **Correlation-Based Weighting**: Adjusts signal weights based on correlation strength
- **Cluster Membership Influence**: Boosts weights for signals in predictive clusters
- **Learning Algorithm**: Continuously optimizes weights using historical performance
- **Market Regime Adaptation**: Different weighting strategies for different market conditions

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Raw Signals   │───▶│ Correlation     │───▶│   Analysis      │
│                 │    │ Analyzer        │    │   Pipeline      │
│ • Market Data   │    │                 │    │                 │
│ • Social Data   │    │ • Pearson/Spearman│   │ • Clustering    │
│ • On-chain Data │    │ • Granger Causality│  │ • PCA           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Signal          │    │ Adaptive        │
                       │ Clustering      │    │ Weighting       │
                       │                 │    │                 │
                       │ • Convergence   │    │ • Correlation   │
                       │   Detection     │    │   Influence     │
                       │ • Pattern       │    │ • Cluster       │
                       │   Recognition   │    │   Membership    │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Confidence      │
                       │ Scoring         │
                       │                 │
                       │ • Enhanced      │
                       │   Signal        │
                       │   Evaluation    │
                       └─────────────────┘
```

## Usage Examples

### Basic Correlation Analysis

```typescript
import { CorrelationAPI } from './src/correlation';

// Initialize correlation analysis
const correlationAPI = new CorrelationAPI(CorrelationAPI.createDefaultConfig());
await correlationAPI.initialize();

// Add signals for analysis
signals.forEach(signal => correlationAPI.addSignal(signal));

// Perform comprehensive analysis
const analysis = await correlationAPI.analyzeCorrelations({
  signalTypes: ['price', 'volume', 'social_media', 'on_chain'],
  timeWindow: 1440, // 24 hours
  correlationMethod: 'pearson',
  includeCausality: true,
  includeClustering: true,
  includePCA: true
});

console.log(`Found ${analysis.significantPairs.length} significant correlations`);
```

### Signal Clustering and Convergence Detection

```typescript
// Analyze signal clusters
const clusters = await correlationAPI.signalClustering.performClustering(
  analysis.matrix,
  analysis.signals || []
);

// Get predictive clusters
const predictiveClusters = correlationAPI.signalClustering.getPredictiveClusters(0.7);

console.log(`Found ${predictiveClusters.length} predictive clusters`);
predictiveClusters.forEach(cluster => {
  console.log(`Cluster: [${cluster.signals.join(', ')}] - Predictive Power: ${cluster.predictivePower}`);
});
```

### PCA for Dimensionality Reduction

```typescript
// Perform PCA analysis
const pcaResult = await correlationAPI.pcaAnalyzer.performPCA(
  analysis.signals || [],
  analysis.matrix,
  5, // max components
  0.95 // variance threshold
);

console.log(`Reduced from ${Object.keys(pcaResult.signalImportance).length} to ${pcaResult.reducedDimensions} dimensions`);
console.log(`Explained variance: ${pcaResult.cumulativeVariance[pcaResult.cumulativeVariance.length - 1]}`);
```

### Adaptive Weighting Updates

```typescript
// Update signal weights based on correlation insights
const weightUpdates = await correlationAPI.updateAdaptiveWeights();

console.log(`Updated ${weightUpdates.length} signal weights`);
weightUpdates.forEach(update => {
  console.log(`${update.signalType}: ${update.newWeight.toFixed(3)} (confidence: ${update.confidence.toFixed(3)})`);
});
```

### Integration with Confidence Scoring

```typescript
// Set up integrated pipeline
const confidenceAPI = new ConfidenceAPI(ConfidenceAPI.createDefaultConfig());
const correlationAPI = new CorrelationAPI(CorrelationAPI.createDefaultConfig());

// Connect systems
correlationAPI.setConfidenceAPI(confidenceAPI);

// Process signals through both systems
signals.forEach(signal => {
  correlationAPI.addSignal(signal);
  // Confidence scoring happens automatically
});

// Get comprehensive insights
const insights = correlationAPI.getCorrelationInsights();
console.log('Correlation insights:', insights);
```

## Configuration

### Default Configuration

```typescript
const config = CorrelationAPI.createDefaultConfig();

// Correlation analysis
config.correlationMethods = ['pearson', 'spearman'];
config.timeWindows = [60, 240, 1440]; // 1h, 4h, 24h
config.minDataPoints = 50;
config.significanceLevel = 0.05;

// Granger causality
config.granger = {
  maxLagOrder: 10,
  minObservations: 30,
  significanceLevel: 0.05
};

// Clustering
config.clustering = {
  minClusterSize: 2,
  maxClusters: 10,
  convergenceThreshold: 0.6,
  stabilityWindow: 7 // days
};

// PCA
config.pca = {
  varianceThreshold: 0.95,
  maxComponents: 10,
  standardization: true
};

// Adaptive weighting
config.adaptiveWeighting = {
  enabled: true,
  learningRate: 0.1,
  decayFactor: 0.95
};
```

### Custom Configuration

```typescript
const customConfig = {
  ...CorrelationAPI.createDefaultConfig(),
  // Focus on recent correlations
  timeWindows: [60, 240], // Only 1h and 4h windows
  lookbackPeriod: 7, // 7 days instead of 30

  // More sensitive clustering
  clustering: {
    ...config.clustering,
    convergenceThreshold: 0.7, // Higher threshold for convergence
    minClusterSize: 3 // Require at least 3 signals
  },

  // More conservative PCA
  pca: {
    ...config.pca,
    varianceThreshold: 0.98, // Explain 98% of variance
    maxComponents: 5 // Limit to 5 components
  }
};
```

## API Endpoints

### REST-style Interface

```typescript
// HTTP-style requests supported
const response = await correlationAPI.handleRequest('POST', '/correlation/analyze', {
  signalTypes: ['price', 'volume', 'social_media'],
  timeWindow: 1440,
  includeCausality: true,
  includeClustering: true,
  includePCA: true
});
```

### Available Endpoints

- `POST /correlation/analyze` - Perform correlation analysis
- `GET /correlation/insights` - Get correlation insights
- `POST /correlation/adaptive-weights` - Update adaptive weights
- `GET /correlation/metrics` - Get system metrics
- `GET /correlation/config` - Get current configuration
- `PUT /correlation/config` - Update configuration
- `GET /correlation/status` - System status

## Advanced Features

### Lead-Lag Relationship Detection

```typescript
// Analyze causality relationships
const causalityResults = analysis.causalityResults;
causalityResults.forEach(result => {
  if (result.isCausal) {
    console.log(`${result.cause} → ${result.effect} (lag: ${result.lagOrder}, strength: ${result.strength})`);
  }
});

// Detect lead-lag patterns
const leadLagRelationships = correlationAPI.getLeadLagRelationships();
leadLagRelationships.forEach(rel => {
  console.log(`${rel.leading} leads ${rel.lagging} by ${rel.lagPeriods} periods`);
});
```

### Convergence Pattern Recognition

```typescript
// Find convergence patterns
const patterns = signalClustering.getRecentConvergencePatterns(24); // Last 24 hours
patterns.forEach(pattern => {
  console.log(`Convergence at ${pattern.convergenceTime}:`, {
    signals: pattern.signals,
    strength: pattern.strength,
    priceMove: `${pattern.priceMove.direction} ${pattern.priceMove.magnitude * 100}%`,
    frequency: pattern.frequency
  });
});

// Update cluster predictive power
signalClustering.updateClusterPredictivePower('cluster_id', 0.85);
```

### Market Regime-Aware Analysis

```typescript
// Get regime-specific correlations
const insights = correlationAPI.getCorrelationInsights();
const regimeCorrelations = insights.marketRegime.correlations;

// Different correlation patterns in different regimes
if (insights.marketRegime.regimeShift) {
  console.log('Market regime shift detected - recalibrating correlations');
}
```

### Real-time Analysis

```typescript
// Set up real-time correlation monitoring
correlationAPI.on('analysis_complete', (response) => {
  if (response.significantPairs.length > 10) {
    console.log('High correlation activity detected');
  }
});

// Periodic analysis updates
setInterval(async () => {
  await correlationAPI.analyzeCorrelations({
    signalTypes: ['price', 'volume', 'social_media'],
    timeWindow: 60 // Last hour
  });
}, 60000); // Every minute
```

## Performance Characteristics

### Analysis Speed
- **Correlation Matrix**: ~10-50ms for 8 signal types
- **Granger Causality**: ~50-200ms for pair analysis
- **Clustering**: ~100-500ms for 10+ signals
- **PCA**: ~20-100ms for dimensionality reduction

### Memory Usage
- **Signal History**: ~1MB per 10,000 signals
- **Correlation Cache**: ~500KB per 100 matrices
- **Clustering Data**: ~2MB per 100 clusters

### Scalability
- **Horizontal Scaling**: Stateless design supports multiple instances
- **Batch Processing**: Efficient handling of large signal volumes
- **Caching**: Intelligent caching reduces redundant calculations

## Integration Examples

### With Trading Systems

```typescript
class TradingStrategy {
  async analyzeMarketSignals(signals: NormalizedSignal[]): Promise<TradingSignal> {
    // Add signals to correlation analysis
    signals.forEach(signal => correlationAPI.addSignal(signal));

    // Perform comprehensive analysis
    const analysis = await correlationAPI.analyzeCorrelations({
      signalTypes: ['price', 'volume', 'on_chain', 'social_media'],
      includeCausality: true,
      includeClustering: true
    });

    // Check for convergence patterns
    const clusters = analysis.clusters;
    const convergingClusters = clusters.filter(c => c.convergenceScore > 0.7);

    if (convergingClusters.length > 0) {
      // Signals are converging - potential trading opportunity
      return {
        action: 'BUY',
        confidence: convergingClusters[0].predictivePower,
        reasoning: `Convergence detected in cluster: ${convergingClusters[0].signals.join(', ')}`
      };
    }

    return { action: 'HOLD', confidence: 0.3 };
  }
}
```

### With Risk Management

```typescript
class RiskManager {
  async assessPortfolioRisk(signals: NormalizedSignal[]): Promise<RiskAssessment> {
    const analysis = await correlationAPI.analyzeCorrelations({
      signalTypes: ['price', 'volume', 'on_chain'],
      correlationMethod: 'spearman'
    });

    // High correlation indicates concentrated risk
    const avgCorrelation = analysis.significantPairs.reduce((sum, pair) =>
      sum + Math.abs(pair.correlation), 0
    ) / analysis.significantPairs.length;

    const riskLevel = avgCorrelation > 0.7 ? 'HIGH' : avgCorrelation > 0.5 ? 'MEDIUM' : 'LOW';

    return {
      riskLevel,
      correlationRisk: avgCorrelation,
      recommendation: avgCorrelation > 0.7 ? 'Diversify portfolio' : 'Monitor correlations'
    };
  }
}
```

### With Signal Quality Assessment

```typescript
class SignalQualityAssessor {
  async assessSignalQuality(signal: NormalizedSignal): Promise<QualityScore> {
    // Get correlation context for this signal type
    const insights = correlationAPI.getCorrelationInsights();
    const correlations = insights.dominantCorrelations.filter(pair =>
      pair.signalType1 === signal.type || pair.signalType2 === signal.type
    );

    // Higher correlation with reliable signals = better quality
    const qualityScore = correlations.reduce((sum, corr) =>
      sum + Math.abs(corr.correlation), 0
    ) / Math.max(correlations.length, 1);

    return {
      signalType: signal.type,
      qualityScore,
      correlationContext: correlations.length,
      assessment: qualityScore > 0.6 ? 'HIGH' : qualityScore > 0.4 ? 'MEDIUM' : 'LOW'
    };
  }
}
```

## Statistical Methods

### Correlation Analysis

**Pearson Correlation** measures linear relationships:
```
r = Σ((x_i - x̄)(y_i - ȳ)) / √[Σ(x_i - x̄)² Σ(y_i - ȳ)²]
```

**Spearman Correlation** measures monotonic relationships:
```
ρ = 1 - (6 Σ d_i²) / (n(n² - 1))
```

**Significance Testing** uses Fisher's z-transformation:
```
z = 0.5 * ln((1 + r)/(1 - r))
SE = 1 / √(n - 3)
z_score = |z| / SE
p_value = 2 * (1 - Φ(z_score))
```

### Granger Causality

Tests whether one time series can predict another:
- **Null Hypothesis**: Series X does not Granger-cause Series Y
- **Test Statistic**: F-statistic comparing restricted vs unrestricted models
- **Lag Selection**: Information criteria (AIC, BIC) for optimal lag order

### Hierarchical Clustering

Uses correlation-based distance metric:
```
distance = 1 - |correlation|
```

Agglomerative clustering with complete linkage:
- Start with individual signals as clusters
- Merge closest clusters iteratively
- Stop when desired number of clusters reached

### Principal Component Analysis

**Standardization**:
```
z = (x - μ) / σ
```

**Covariance Matrix**:
```
Σ = (1/(n-1)) * Z^T * Z
```

**Eigenvalue Decomposition**:
```
Σ = V * Λ * V^T
```
Where V contains eigenvectors (principal components) and Λ contains eigenvalues (variance explained).

## Best Practices

1. **Signal Quality**: Ensure sufficient data points (50+) for reliable correlations
2. **Time Windows**: Use multiple timeframes (1h, 4h, 24h) for robust analysis
3. **Significance Levels**: Set appropriate p-value thresholds (0.01-0.05)
4. **Cluster Validation**: Verify cluster stability over time
5. **Adaptive Learning**: Enable adaptive weighting for continuous improvement
6. **Performance Monitoring**: Track analysis speed and memory usage

## Troubleshooting

### Common Issues

1. **Insufficient Data**: Increase lookback period or reduce min data points
2. **Weak Correlations**: Check signal quality and normalization
3. **Clustering Instability**: Adjust convergence threshold or min cluster size
4. **Performance Issues**: Enable caching and use batch processing
5. **Memory Usage**: Monitor cache sizes and implement cleanup

### Debug Information

```typescript
// Detailed logging
correlationAPI.correlationAnalyzer.logger.setLevel('debug');

// Access internal state
const internalState = {
  signalHistory: correlationAPI.correlationAnalyzer['signalHistory'].size,
  correlationCache: correlationAPI.correlationAnalyzer['correlationCache'].size,
  clusters: correlationAPI.signalClustering['signalClusters'].size,
  patterns: correlationAPI.signalClustering['convergencePatterns'].length
};
```

## Mathematical Foundation

### Statistical Significance

Correlation significance testing uses the t-distribution:
```
t = r * √((n-2)/(1-r²))
df = n-2
p_value = 2 * t_cdf(-|t|, df)
```

### Information Criteria for Lag Selection

**Akaike Information Criterion (AIC)**:
```
AIC = 2k - 2ln(L)
```

**Bayesian Information Criterion (BIC)**:
```
BIC = k ln(n) - 2ln(L)
```

Where k = number of parameters, n = sample size, L = likelihood.

### Principal Component Selection

**Kaiser Criterion**: Retain components with eigenvalue > 1
**Scree Plot**: Visual inspection of eigenvalue decay
**Cumulative Variance**: Retain until threshold (e.g., 95%) reached

This correlation analysis system provides the foundation for sophisticated signal evaluation, enabling the system to learn which signals are most predictive and how they interact with each other across different market conditions.
