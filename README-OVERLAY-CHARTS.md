# Multi-Source Chart Overlay Feature

The Multi-Source Chart Overlay feature allows users to combine and visualize data from multiple sources on a unified timeline chart. This powerful tool enables correlation analysis between cryptocurrency prices, on-chain metrics, and macroeconomic indicators.

## Key Features

- **Multiple Data Sources**: Combine data from different APIs:
  - Cryptocurrency price data (from Coinet's internal API)
  - On-chain metrics from Glassnode
  - Economic data from FRED (Federal Reserve Economic Data)
  - TradingView chart integration

- **Interactive Charts**: Visualize combined data with synchronized zooming, panning, and tooltips

- **Template System**: Save, load, and share chart configurations

- **Responsive Design**: Works seamlessly on desktop and mobile devices

- **Performance Optimized**: Data downsampling for smooth rendering of large datasets

## Architecture

The feature follows a modular architecture with specialized components for each responsibility:

### Data Source Adapters

Located in `src/lib/datasources/`:

- `glassnode.ts`: Interface to Glassnode API for on-chain metrics
- `fred.ts`: Interface to FRED API for economic data
- `tradingview.ts`: Integration with TradingView or alternative price data sources
- `mergeSeries.ts`: Utility to normalize and merge time series data

### Caching Layer

- `src/lib/cache.ts`: In-memory caching system to minimize external API calls

### API Routes

- `src/pages/api/overlay.ts`: Main API endpoint for fetching and merging data
- `src/pages/api/overlay-templates.ts`: CRUD operations for saved chart templates

### Database Model

- Added `OverlayTemplate` model to the Prisma schema

### UI Components

- `src/components/charts/OverlayChart.tsx`: Main chart component
- `src/pages/overlay-charts.tsx`: Page with UI for configuring overlays

## How to Use

1. **Navigate to the Overlay Charts Page**: Access the feature at `/overlay-charts`

2. **Add Data Sources**:
   - Click "Add Data Source"
   - Select the data source type
   - Configure source-specific parameters
   - Click "Add" to add it to the chart

3. **Customize the Chart**:
   - Toggle series visibility in the legend
   - Use the brush control to zoom into specific time ranges
   - Hover over the chart to see tooltip values from all sources

4. **Save Templates**:
   - Enter a template name
   - Click "Save Template"
   - Your configuration will be saved for future use

5. **Share Charts**:
   - Click the share icon on a saved template
   - A link is copied to your clipboard that others can use to view your chart

## API Reference

### Overlay API

**Endpoint**: `POST /api/overlay`

**Request Body**:
```json
{
  "series": [
    { 
      "source": "price", 
      "symbol": "BTCUSDT", 
      "timeframe": "1d" 
    },
    { 
      "source": "glassnode", 
      "metric": "addresses/active_count", 
      "asset": "BTC",
      "frequency": "24h" 
    },
    { 
      "source": "fred", 
      "seriesId": "FEDFUNDS" 
    }
  ],
  "from": "2021-01-01",
  "to": "2022-01-01",
  "sampleCount": 500
}
```

**Response**:
```json
{
  "series": [
    {
      "time": 1609459200000,
      "price-BTCUSDT-1d": 29374.15,
      "glassnode-BTC-addresses-active_count": 1205674,
      "fred-FEDFUNDS": 0.09
    },
    // ... additional data points
  ],
  "metadata": {
    "seriesCount": 3,
    "pointCount": 365,
    "timeRange": {
      "from": "2021-01-01T00:00:00.000Z",
      "to": "2022-01-01T00:00:00.000Z"
    }
  }
}
```

### Templates API

**Endpoints**:
- `GET /api/overlay-templates`: List templates
- `GET /api/overlay-templates?id=<id>`: Get specific template
- `POST /api/overlay-templates`: Create template
- `PUT /api/overlay-templates`: Update template
- `DELETE /api/overlay-templates?id=<id>`: Delete template
- `GET /api/overlay-templates/share?id=<id>`: Generate sharing token

## Authentication & Access Control

- Basic chart access is available to all users
- Certain data sources (Glassnode, FRED) may require subscription
- Saving and sharing templates requires user authentication

## Implementation Notes

- Data normalization ensures different time series align correctly
- Chart performance is optimized through downsampling for large datasets
- JWT tokens enable secure template sharing
- Custom annotations can be added to highlight significant events

## Future Enhancements

- Additional data sources (CoinMetrics, DefiLlama, etc.)
- Advanced correlation analysis tools
- Custom formula support for derived indicators
- Improved mobile experience
- Downloadable reports and image export 