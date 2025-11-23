# Advanced Correlation Analysis & Market Impact Prediction

This module enhances the automated crypto news publishing system with advanced correlation analysis between news events and price movements, along with predictive capabilities to estimate potential market impact based on historical correlations.

## Features

### 1. Historical Price Correlation Analysis

The system now tracks and analyzes correlations between specific news types and asset price performance:

- **Category-Based Analysis**: Tracks how different news categories (market, regulatory, technology, etc.) historically correlate with price movements
- **Asset-Specific Correlations**: Analyzes which assets are most affected by specific news types
- **Temporal Analysis**: Examines price impacts over different timeframes (1h, 4h, 24h, 7d)
- **Reliability Metrics**: Calculates confidence scores based on historical accuracy

### 2. News Impact Predictor

The system can now predict potential market impact of news based on similar past events:

- **Prediction Engine**: Estimates price direction, magnitude, and confidence levels for different assets
- **Similar Event Analysis**: Finds and analyzes similar historical news events
- **Multi-Asset Predictions**: Generates predictions for multiple assets simultaneously
- **Confidence Scoring**: Provides confidence metrics based on historical reliability

### 3. Enhanced News Digest Generation

Digests now include advanced correlation analysis and market predictions:

- **Correlation Sections**: Show historical correlations between news categories and price movements
- **Market Impact Predictions**: Include price predictions with confidence levels
- **Asset-Specific Analysis**: Detailed asset-specific price impact predictions
- **Supporting Evidence**: References to similar historical events and their actual impacts

### 4. Asset Impact Analysis Reports

Generate specialized reports focusing on a specific asset's correlation with different news types:

- **Historical Correlations**: How different news categories affect the asset price
- **Price Predictions**: Predicted price movements with timeframes and confidence
- **News Aggregation**: Relevant recent news affecting the asset
- **Sentiment Analysis**: Overall sentiment trends for the asset

## How It Works

### Data Collection & Correlation Tracking

1. The system automatically tracks news events and monitors subsequent price movements
2. Price changes are recorded at multiple intervals (1h, 4h, 24h, 7d) after news publication
3. Correlation scores are calculated based on sentiment alignment with price direction
4. Statistics are maintained for each news category and asset combination

### Prediction Engine

1. When a new news item is analyzed, the system finds similar historical events
2. Similarity is determined by category, affected assets, and content analysis
3. Historical price impacts of similar events are aggregated to generate predictions
4. Confidence scores are calculated based on historical accuracy and sample size

### Integration with Publishing System

The correlation analysis is fully integrated with the existing news publishing system:

- **Automatic Tracking**: Each published article automatically tracks price correlations
- **Enhanced Templates**: Article templates can include predicted market impacts
- **Scheduled Analysis**: Regular digest generation includes correlation analysis
- **API Access**: Correlation data available through the existing API endpoints

## Usage Examples

### Generate Daily Digest with Correlations

```typescript
const digestGenerator = new NewsDigestGenerator();
const assets = ["BTC", "ETH", "SOL", "XRP"];
const dailyDigestPath =
  await digestGenerator.createDailyDigestWithCorrelation(assets);
```

### Create Asset-Specific Impact Analysis

```typescript
const digestGenerator = new NewsDigestGenerator();
// Generate a BTC-specific impact analysis for the last 48 hours
const btcAnalysisPath = await digestGenerator.createAssetImpactAnalysis(
  "BTC",
  48,
);
```

### Get Price Correlation Statistics

```typescript
const impactPredictor = new NewsImpactPredictor();
// Get correlation statistics for all news categories
const categoryCorrelations = impactPredictor.getCategoryCorrelations();
```

### Predict Market Impact for News Items

```typescript
const impactPredictor = new NewsImpactPredictor();
const newsItems = await newsService.searchNews("Ethereum upgrade");
// Analyze and predict market impact
const analyzedGroups = await impactPredictor.analyzeNewsGroup(newsItems);
```

## Implementation Details

### Key Components

1. **NewsCorrelationService**: Core service for tracking and analyzing correlations
2. **NewsImpactPredictor**: Prediction engine for estimating market impact
3. **NewsDigestGenerator**: Enhanced with correlation analysis for digests
4. **AutomatedNewsPublisher**: Integrates predictions into published articles

### Data Storage

Correlation data is stored in JSON format in the `data/news-correlation` directory:

- `correlation-events.json`: Historical news events with price impact data
- Category statistics are calculated on-the-fly from historical events

## Future Enhancements

- **Machine Learning Models**: Replace rule-based prediction with ML models
- **Feedback Loop**: Improve predictions based on actual outcomes
- **Market Factors Integration**: Consider overall market conditions in predictions
- **Multi-Source Verification**: Compare predictions from multiple methodologies
- **Real-Time Alerts**: Notifications when significant correlations are detected

## Implementation Notes

This system performs best with a substantial history of tracked events. Initial predictions will have lower confidence until enough data is collected to establish reliable correlation patterns.
