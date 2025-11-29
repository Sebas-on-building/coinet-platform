# Chart & Data Improvements Documentation

This document covers the enhanced chart features including interactive annotations, real-time data streaming, custom dashboard widgets, and theme switching.

## Features Overview

### 1. Interactive Chart Annotations
**Components:** `ChartAnnotations`, `useChartAnnotations`

Add, edit, and manage annotations directly on charts.

**Annotation Types:**
- 📈 **Trend Lines** - Draw trend analysis lines
- ➡️ **Arrows** - Point to specific features
- 💬 **Text Notes** - Add contextual notes
- ⚠️ **Alerts** - Mark important price levels
- ✨ **Patterns** - Highlight chart patterns
- 🎯 **Targets** - Set price targets

**Usage:**
```tsx
import { ChartAnnotations, useChartAnnotations } from '@/components/charts';

function MyChart() {
  const {
    annotations,
    enabled,
    setEnabled,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
  } = useChartAnnotations();

  return (
    <ChartAnnotations
      annotations={annotations}
      onAnnotationAdd={addAnnotation}
      onAnnotationRemove={removeAnnotation}
      onAnnotationUpdate={updateAnnotation}
      enabled={enabled}
      onToggle={() => setEnabled(!enabled)}
    />
  );
}
```

### 2. Real-time Data Streaming
**Hook:** `useRealtimeChartData`
**Component:** `RealtimeChartWithControls`

Stream live market data with connection quality monitoring and latency tracking.

**Features:**
- 📊 Live data streaming from Supabase
- 🔌 Connection quality indicators (Excellent, Good, Poor, Disconnected)
- ⚡ Latency monitoring
- 📈 Automatic buffering and data management
- 🔄 Historical data fetching

**Usage:**
```tsx
import { useRealtimeChartData } from '@/hooks/useRealtimeChartData';

function MyRealtimeChart() {
  const {
    data,
    isStreaming,
    connectionQuality,
    latency,
    statistics,
    toggleStream,
    clearData,
  } = useRealtimeChartData({
    symbol: 'BTCUSD',
    bufferSize: 100,
  });

  return (
    <div>
      <button onClick={toggleStream}>
        {isStreaming ? 'Pause' : 'Start'} Stream
      </button>
      <p>Connection: {connectionQuality}</p>
      <p>Latency: {latency}ms</p>
      <p>Data Points: {statistics.dataPoints}</p>
    </div>
  );
}
```

**Or use the complete component:**
```tsx
import { RealtimeChartWithControls } from '@/components/charts';

<RealtimeChartWithControls
  symbol="BTCUSD"
  title="Bitcoin Live Price"
/>
```

### 3. Chart Theme Switching
**Component:** `ChartThemeSwitcher`
**Hook:** `useChartTheme`

Switch between predefined themes or create custom chart themes.

**Predefined Themes:**
- ☀️ **Light** - Clean white background
- 🌙 **Dark** - Sleek dark theme
- ⚪ **Minimal** - Distraction-free minimal design
- 📊 **TradingView** - TradingView-inspired colors
- 🎮 **Cyberpunk** - Vibrant neon theme

**Theme Options:**
- Background, grid, and text colors
- Bullish/bearish colors
- Grid style (solid, dashed, dotted)
- Grid opacity
- Line width
- Show/hide grid, crosshair, volume
- Candle style (candle, hollow, line, area)

**Usage:**
```tsx
import { ChartThemeSwitcher, useChartTheme } from '@/components/charts';

function MyChart() {
  const { theme, setTheme } = useChartTheme();

  return (
    <div>
      <ChartThemeSwitcher
        currentTheme={theme}
        onThemeChange={setTheme}
      />
      
      {/* Apply theme to your chart */}
      <div style={{ background: theme.colors.background }}>
        {/* Chart content */}
      </div>
    </div>
  );
}
```

### 4. Custom Dashboard Widgets
**Components:** `DashboardWidget`, `CustomDashboard`

Build customizable dashboards with drag-and-drop widgets.

**Widget Types:**
- 📈 **Chart** - Price charts
- 📊 **Metrics** - Key metrics cards
- 🔔 **Alerts** - Active alerts list
- ⚡ **Agents** - Trading agents status
- 📊 **Volume** - Volume analysis
- 🔥 **Heatmap** - Market heatmap
- 📰 **News** - Market news feed
- 📈 **Performance** - Performance metrics

**Widget Features:**
- Drag handles for repositioning
- Resize controls
- Pin/unpin widgets
- Expand/minimize
- Refresh individual widgets
- Custom settings per widget
- Save/load layouts

**Usage:**
```tsx
import { CustomDashboard } from '@/components/dashboard';

function Dashboard() {
  return <CustomDashboard />;
}
```

**Or create custom widgets:**
```tsx
import { DashboardWidget, Widget } from '@/components/dashboard';

function MyCustomWidget() {
  const widget: Widget = {
    id: '1',
    type: 'chart',
    title: 'BTC/USD',
    position: { x: 0, y: 0 },
    size: { w: 6, h: 4 },
  };

  return (
    <DashboardWidget
      widget={widget}
      onRemove={() => console.log('Remove')}
      onRefresh={async () => console.log('Refresh')}
      onResize={(size) => console.log('Resize', size)}
      onPin={(pinned) => console.log('Pin', pinned)}
    >
      {/* Your widget content */}
    </DashboardWidget>
  );
}
```

## Complete Integration Example

```tsx
import { useState } from 'react';
import {
  RealtimeChartWithControls,
  ChartAnnotations,
  ChartThemeSwitcher,
  useChartAnnotations,
  useChartTheme,
} from '@/components/charts';
import { CustomDashboard } from '@/components/dashboard';
import { useRealtimeChartData } from '@/hooks/useRealtimeChartData';

function TradingDashboard() {
  return (
    <div className="space-y-6">
      {/* Real-time Chart with All Features */}
      <RealtimeChartWithControls
        symbol="BTCUSD"
        title="Bitcoin Live Trading"
      />

      {/* Custom Dashboard */}
      <CustomDashboard />
    </div>
  );
}
```

## Real-time Data Setup

To enable real-time data streaming, ensure your Supabase tables have real-time enabled:

```sql
-- Enable realtime for market_context table
ALTER TABLE market_context REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE market_context;
```

## Performance Considerations

1. **Buffer Management**
   - Default buffer size: 500 data points
   - Adjust based on your needs: `bufferSize: 100`
   - Larger buffers use more memory

2. **Update Frequency**
   - Real-time updates arrive as they occur
   - Connection quality adapts to latency
   - Automatic reconnection on disconnect

3. **Theme Performance**
   - Themes are lightweight CSS changes
   - No re-rendering of data
   - Instant switching

4. **Widget Performance**
   - Lazy render widget content
   - Virtualize large widget lists
   - Debounce resize/drag operations

## Accessibility

All chart features support:
- Keyboard navigation
- Screen reader labels
- ARIA attributes
- High contrast modes
- Reduced motion preferences

## Mobile Support

- Touch gestures for annotations
- Responsive widget layouts
- Swipe to pan charts
- Pinch to zoom (where applicable)
- Pull-to-refresh dashboard
- Mobile-optimized controls

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Troubleshooting

**Real-time not working?**
- Check Supabase connection
- Verify table has realtime enabled
- Check browser console for errors

**Annotations not appearing?**
- Enable annotation mode first
- Check z-index conflicts
- Verify click handlers

**Theme not applying?**
- Check CSS specificity
- Verify theme object structure
- Clear browser cache

**Dashboard layout breaking?**
- Check grid column spans
- Verify widget size constraints
- Reset layout to default

## API Reference

See individual component files for detailed prop types and methods.

## Examples & Demos

Check the following files for working examples:
- `src/components/charts/RealtimeChartWithControls.tsx`
- `src/components/dashboard/CustomDashboard.tsx`
- `src/hooks/useRealtimeChartData.ts`
