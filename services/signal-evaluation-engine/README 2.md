# Signal Evaluation Engine

A high-performance real-time signal evaluation engine for the Coinet platform with Kafka Streams processing, advanced feature extraction, and fusion engine integration. This service provides millisecond-level signal processing with exactly-once semantics and comprehensive monitoring.

## Features

- **Real-Time Processing**: Millisecond-level signal processing with Kafka Streams
- **Advanced Normalization**: Z-score and statistical normalization
- **Feature Extraction**: Temporal, statistical, volatility, momentum, correlation features
- **Fusion Engine**: Multi-signal fusion with weighted scoring
- **Anomaly Detection**: Statistical anomaly detection with configurable thresholds
- **Condition Evaluation**: Ad-hoc signal condition evaluation for alert builder
- **Exactly-Once Processing**: Guaranteed processing semantics
- **Horizontal Scaling**: Auto-scaling and load balancing
- **Comprehensive Monitoring**: Latency, throughput, error rate tracking

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kafka Streams │───▶│   Signal        │───▶│   Feature       │
│   Processing    │    │   Normalization │    │   Extraction    │
│                 │    │                 │    │                 │
│ • Input Topics  │    │ • Z-Score       │    │ • Temporal      │
│ • Raw Signals   │    │ • Statistical   │    │ • Statistical   │
│ • Normalization │    │ • Outlier       │    │ • Volatility    │
│ • Feature       │    │   Removal       │    │ • Momentum      │
│   Extraction    │    │                 │    │ • Correlation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                             │
┌─────────────────┐    ┌─────────────────┐    │
│   Fusion Engine │◀───│   Condition     │    │
│   Integration   │    │   Evaluation    │    │
│                 │    │                 │    │
│ • Multi-Signal  │    │ • Threshold     │    │
│ • Weighted      │    │ • Pattern       │    │
│ • Scoring       │    │ • Composite     │    │
│ • Confidence    │    │ • Real-time     │    │
│ • Updates       │    │   Evaluation    │    │
└─────────────────┘    └─────────────────┘    │
                                             │
┌─────────────────┐    ┌─────────────────┐    │
│   Monitoring    │    │   Output        │    │
│   & Metrics     │    │   Topics        │    │
│                 │    │                 │    │
│ • Health Checks │    │ • Normalized    │    │
│ • Performance   │    │   Signals       │    │
│ • Error Rates   │    │ • Fusion        │    │
│ • Throughput    │    │   Updates       │    │
│ • Latency       │    │ • Alerts        │    │
└─────────────────┘    └─────────────────┘
```

## Installation

```bash
cd services/signal-evaluation-engine
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=signal-evaluation-engine
KAFKA_GROUP_ID=signal-evaluation-group

# Processing Configuration
PROCESSING_TIMEOUT_MS=30000
BATCH_SIZE=100
PARALLELISM=4
EXACTLY_ONCE=true

# Normalization Configuration
NORMALIZATION_METHOD=z_score
NORMALIZATION_WINDOW_SIZE=1000
NORMALIZATION_UPDATE_INTERVAL=60000
OUTLIER_THRESHOLD=3.0

# Feature Extraction Configuration
ENABLED_FEATURES=temporal,statistical,volatility,momentum,correlation,trend,composite,anomaly
WINDOW_SIZES=60,300,900,3600
CORRELATION_THRESHOLD=0.7
VOLATILITY_WINDOW=300
MOMENTUM_WINDOW=900

# Fusion Configuration
FUSION_UPDATE_INTERVAL=5000
SIGNAL_WEIGHTS={"social_media":0.3,"news":0.4,"defi_metrics":0.2,"on_chain":0.1,"price":0.3,"volume":0.2,"technical":0.2,"fundamental":0.3}
MIN_SIGNALS=3
MAX_SIGNALS=20
DECAY_FACTOR=0.95
CONFIDENCE_THRESHOLD=0.7

# Evaluation Configuration
MAX_CONCURRENT_EVALUATIONS=100
EVALUATION_TIMEOUT_MS=5000
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
CACHE_TTL_SECONDS=300

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## Usage

### Basic Usage

```typescript
import { SignalEvaluationEngine } from './src/SignalEvaluationEngine';

const engine = new SignalEvaluationEngine({
  kafka: {
    brokers: ['localhost:9092'],
    clientId: 'signal-evaluation-engine',
    groupId: 'signal-evaluation-group'
  },
  streams: {
    inputTopics: ['raw-signals', 'social-media-sentiment', 'news-aggregator'],
    outputTopics: ['normalized-signals', 'fusion-updates', 'alerts'],
    errorTopic: 'signal-evaluation-errors',
    deadLetterTopic: 'signal-evaluation-dead-letters',
    exactlyOnce: true
  },
  normalization: {
    method: 'z_score',
    windowSize: 1000,
    outlierThreshold: 3.0
  },
  features: {
    enabledFeatures: ['temporal', 'statistical', 'volatility', 'momentum'],
    windowSizes: [60, 300, 900]
  },
  fusion: {
    updateInterval: 5000,
    signalWeights: {
      social_media: 0.3,
      news: 0.4,
      defi_metrics: 0.2
    }
  }
});

// Start the engine
await engine.start();

// Listen for processed signals
engine.on('signal_processed', (event) => {
  const signal = event.data;
  console.log('Processed signal:', signal.id, signal.type);
});

// Listen for fusion updates
engine.on('fusion_updated', (event) => {
  const fusion = event.data;
  console.log('Fusion score:', fusion.fusionScore, fusion.recommendations.action);
});
```

### Ad-Hoc Condition Evaluation

```typescript
// Evaluate signal conditions
const evaluationRequest = {
  conditionId: 'high_tvl_change',
  signalIds: ['signal_001', 'signal_002', 'signal_003']
};

const response = await engine.evaluateConditions(evaluationRequest);

console.log('Evaluation results:', response.results.map(r => ({
  signalId: r.signalId,
  result: r.result,
  confidence: r.confidence
})));
```

## API Reference

### SignalEvaluationEngine

Main service class for real-time signal evaluation.

#### Methods

- `start(): Promise<void>` - Start the signal evaluation engine
- `stop(): Promise<void>` - Stop the signal evaluation engine
- `evaluateConditions(request: EvaluationRequest): Promise<EvaluationResponse>` - Evaluate signal conditions ad-hoc
- `getEngineMetrics(): Promise<EngineMetrics>` - Get current engine metrics
- `getHealthStatus(): Promise<HealthStatus>` - Get detailed health information
- `getStatus(): string` - Get current service status

#### Events

- `signal_processed` - Emitted when a signal is processed and normalized
- `condition_evaluated` - Emitted when signal conditions are evaluated
- `fusion_updated` - Emitted when fusion engine updates
- `anomaly_detected` - Emitted when anomalies are detected
- `metrics` - Emitted with engine metrics
- `error` - Emitted when processing errors occur

### SignalCondition

Signal condition definition for alert builder.

```typescript
interface SignalCondition {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'pattern' | 'correlation' | 'anomaly' | 'composite';
  enabled: boolean;

  parameters: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    window: number; // Time window in seconds
    aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
  };

  logic?: {
    operator: 'AND' | 'OR' | 'NOT';
    conditions: string[]; // Condition IDs
  };

  actions: {
    alert: boolean;
    severity: SignalSeverity;
    channels: string[];
    cooldown: number;
  };
}
```

### NormalizedSignal

Processed and normalized signal with extracted features.

```typescript
interface NormalizedSignal {
  id: string;
  type: SignalType;
  source: string;
  timestamp: Date;
  normalizedValues: Record<string, number>;
  originalValues: Record<string, number>;
  features: FeatureVector;
  metadata: {
    sourceId: string;
    confidence: number;
    normalizationMethod: string;
    featureExtractionMethod: string;
    version: string;
  };
}
```

### FusionUpdate

Multi-signal fusion result.

```typescript
interface FusionUpdate {
  id: string;
  timestamp: Date;
  signals: NormalizedSignal[];
  aggregatedFeatures: FeatureVector;
  fusionScore: number; // 0-1
  confidence: number;  // 0-1
  recommendations: {
    action: 'alert' | 'investigate' | 'ignore';
    priority: 'low' | 'medium' | 'high' | 'critical';
    reasoning: string;
  };
}
```

## Processing Pipeline

### 1. Signal Ingestion
- Raw signals consumed from Kafka input topics
- Validation and deduplication
- Rate limiting and backpressure handling

### 2. Normalization
- Z-score normalization across signal types
- Statistical outlier removal
- Rolling window statistics
- Feature standardization

### 3. Feature Extraction
- Temporal features (time of day, day of week)
- Statistical features (mean, std, skewness, kurtosis)
- Volatility and momentum indicators
- Correlation and trend analysis
- Composite scoring

### 4. Fusion Engine
- Multi-signal aggregation
- Weighted scoring by signal type
- Confidence calculation
- Recommendation generation

### 5. Condition Evaluation
- Real-time condition checking
- Composite logic evaluation
- Alert generation
- Cooldown management

### 6. Output Generation
- Normalized signals to output topics
- Fusion updates for downstream processing
- Alerts for immediate action
- Metrics for monitoring

## Kafka Streams Integration

### Topology Configuration
```typescript
const topology = {
  sourceTopics: ['raw-signals', 'social-media-sentiment'],
  sinkTopics: ['normalized-signals', 'fusion-updates'],
  processor: async (signal) => {
    // Process signal through pipeline
    return await processSignal(signal);
  },
  errorHandler: (error, signal) => {
    // Handle processing errors
    console.error('Processing error:', error);
  }
};
```

### Exactly-Once Processing
- Transactional processing guarantees
- Idempotent operations
- Failure recovery
- State consistency

### Horizontal Scaling
- Partition-based parallelism
- Consumer group coordination
- Load balancing
- Auto-scaling capabilities

## Anomaly Detection

### Statistical Methods
- **Z-Score Analysis**: Standard deviations from baseline
- **Modified Z-Score**: Robust outlier detection
- **IQR Method**: Interquartile range analysis
- **Isolation Forest**: Machine learning approach

### Threshold Configuration
```typescript
const anomalyConfig = {
  method: 'z_score',
  threshold: 3.0,        // 3 standard deviations
  windowSize: 1000,      // Rolling window
  minSamples: 30,        // Minimum samples for baseline
  sensitivity: 'high'    // Detection sensitivity
};
```

### Anomaly Types
- **Point Anomalies**: Single data point outliers
- **Contextual Anomalies**: Normal in context but anomalous
- **Collective Anomalies**: Group of related anomalous points
- **Seasonal Anomalies**: Time-based pattern deviations

## Performance Characteristics

### Latency
- **Signal Processing**: < 10ms per signal
- **Normalization**: < 5ms per signal
- **Feature Extraction**: < 15ms per signal
- **Fusion Updates**: < 50ms per update
- **End-to-End**: < 100ms from ingestion to output

### Throughput
- **Peak Capacity**: 10,000+ signals/second
- **Sustained Rate**: 5,000 signals/second
- **Batch Processing**: 100 signals/batch
- **Parallel Processing**: 4+ concurrent processors

### Scalability
- **Horizontal Scaling**: Auto-scaling based on load
- **Partition Scaling**: 10+ partitions per topic
- **Consumer Groups**: Multiple consumer instances
- **Load Balancing**: Automatic partition distribution

## Monitoring & Observability

### Metrics Collection
- Signal processing latency
- Throughput (signals/second)
- Error rates by component
- Memory and CPU usage
- Kafka consumer lag
- Fusion update frequency

### Health Checks
- Kafka connectivity
- Stream processing status
- Component health
- Resource utilization
- Error condition monitoring

### Alerting
- Processing latency thresholds
- Error rate spikes
- Resource exhaustion
- Kafka connectivity issues
- Fusion engine failures

## Integration with Alert Builder

### Condition Definition
```typescript
const condition = {
  id: 'extreme_market_volatility',
  name: 'Extreme Market Volatility',
  type: 'composite',
  logic: {
    operator: 'AND',
    conditions: ['high_price_volatility', 'high_volume_spike']
  },
  actions: {
    alert: true,
    severity: 'critical',
    channels: ['email', 'slack', 'sms']
  }
};
```

### Real-Time Evaluation
- Continuous condition monitoring
- Immediate alert generation
- Cooldown period management
- Alert escalation logic

### Historical Backtesting
- Condition performance analysis
- Alert accuracy validation
- Parameter optimization
- Strategy refinement

## Troubleshooting

### Common Issues

#### High Latency
- Check Kafka partition distribution
- Monitor consumer lag
- Optimize batch sizes
- Review network configuration

#### Memory Usage
- Monitor garbage collection
- Check cache sizes
- Review stream processing buffers
- Optimize feature extraction

#### Error Rates
- Check signal format validation
- Review error handling logic
- Monitor external service dependencies
- Validate configuration parameters

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug

# Check Kafka connectivity
kafka-console-consumer --bootstrap-server localhost:9092 --topic signal-evaluation-errors

# Monitor processing metrics
curl http://localhost:3000/health
```

## Performance Optimization

### Configuration Tuning
```typescript
const optimizedConfig = {
  streams: {
    batchSize: 200,        // Increase batch size
    parallelism: 8,        // More parallel processors
    processingTimeout: 15000 // Shorter timeout
  },
  features: {
    enabledFeatures: ['temporal', 'statistical'], // Reduce features
    windowSizes: [300, 900] // Fewer windows
  },
  fusion: {
    updateInterval: 10000, // Less frequent updates
    maxSignals: 10        // Fewer signals to process
  }
};
```

### Resource Optimization
- CPU: Multi-core processing with thread pools
- Memory: Efficient caching and garbage collection
- Network: Connection pooling and keep-alive
- Storage: Optimized serialization and compression

## Contributing

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for configuration changes
4. Ensure exactly-once processing semantics
5. Test with high-throughput scenarios

## License

MIT License - see LICENSE file for details.
