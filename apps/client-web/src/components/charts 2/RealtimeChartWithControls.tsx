import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeChartData } from '@/hooks/useRealtimeChartData';
import { ChartAnnotations, useChartAnnotations } from './ChartAnnotations';
import { ChartThemeSwitcher, useChartTheme } from './ChartThemeSwitcher';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface RealtimeChartWithControlsProps {
  symbol: string;
  title?: string;
  className?: string;
}

export function RealtimeChartWithControls({
  symbol,
  title = 'Real-time Chart',
  className,
}: RealtimeChartWithControlsProps) {
  const {
    data,
    isStreaming,
    connectionQuality,
    latency,
    statistics,
    toggleStream,
    clearData,
    fetchHistoricalData,
  } = useRealtimeChartData({ symbol, bufferSize: 100 });

  const {
    annotations,
    enabled: annotationsEnabled,
    setEnabled: setAnnotationsEnabled,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    clearAnnotations,
  } = useChartAnnotations();

  const { theme, setTheme } = useChartTheme();

  const [showStats, setShowStats] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getConnectionBadge = () => {
    const configs = {
      excellent: { color: 'bg-green-500', label: 'Excellent' },
      good: { color: 'bg-blue-500', label: 'Good' },
      poor: { color: 'bg-yellow-500', label: 'Poor' },
      disconnected: { color: 'bg-red-500', label: 'Disconnected' },
    };

    const config = configs[connectionQuality];

    return (
      <Badge variant="outline" className="gap-2">
        <div className={cn('w-2 h-2 rounded-full animate-pulse', config.color)} />
        {config.label}
        {latency > 0 && <span className="text-xs">({latency}ms)</span>}
      </Badge>
    );
  };

  const currentValue = data[data.length - 1]?.value || 0;
  const previousValue = data[data.length - 2]?.value || currentValue;
  const change = currentValue - previousValue;
  const changePercent = previousValue ? (change / previousValue) * 100 : 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="font-mono">
              {symbol}
            </Badge>
            {getConnectionBadge()}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stream Control */}
            <Button
              variant={isStreaming ? "destructive" : "default"}
              size="sm"
              onClick={toggleStream}
              className="gap-2"
            >
              {isStreaming ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>

            {/* Chart Annotations */}
            <ChartAnnotations
              annotations={annotations}
              onAnnotationAdd={addAnnotation}
              onAnnotationRemove={removeAnnotation}
              onAnnotationUpdate={updateAnnotation}
              enabled={annotationsEnabled}
              onToggle={() => setAnnotationsEnabled(!annotationsEnabled)}
            />

            {/* Theme Switcher */}
            <ChartThemeSwitcher
              currentTheme={theme}
              onThemeChange={setTheme}
            />

            {/* Additional Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistoricalData(200)}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearData}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Current Price */}
        <div className="flex items-baseline gap-3 mt-3">
          <span className="text-3xl font-bold">
            {formatPrice(currentValue)}
          </span>
          {change !== 0 && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              change > 0 ? 'text-success' : 'text-destructive'
            )}>
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {formatPrice(Math.abs(change))} ({Math.abs(changePercent).toFixed(2)}%)
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Chart */}
        <div className="h-[400px]" style={{ background: theme.colors.background }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                {theme.showGrid && (
                  <CartesianGrid
                    strokeDasharray={theme.gridStyle === 'solid' ? '' : theme.gridStyle === 'dashed' ? '3 3' : '1 1'}
                    stroke={theme.colors.grid}
                    opacity={theme.gridOpacity}
                  />
                )}
                
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  stroke={theme.colors.text}
                  fontSize={10}
                  tick={{ fill: theme.colors.text }}
                />
                
                <YAxis
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  stroke={theme.colors.text}
                  fontSize={10}
                  tick={{ fill: theme.colors.text }}
                  orientation="right"
                />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.grid}`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: theme.colors.text }}
                  formatter={(value: number) => [formatPrice(value), 'Price']}
                  labelFormatter={formatTimestamp}
                />
                
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={theme.colors.primary}
                  strokeWidth={theme.lineWidth}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                {isStreaming ? (
                  <>
                    <Activity className="w-12 h-12 mx-auto mb-3 animate-pulse" />
                    <p>Waiting for data...</p>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Stream paused</p>
                    <p className="text-sm mt-1">Click Start to begin streaming</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Data Points</div>
            <div className="text-sm font-medium">{statistics.dataPoints}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Avg</div>
            <div className="text-sm font-medium">{formatPrice(statistics.averageValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Min</div>
            <div className="text-sm font-medium text-destructive">{formatPrice(statistics.minValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Max</div>
            <div className="text-sm font-medium text-success">{formatPrice(statistics.maxValue)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className="text-sm font-medium">{latency}ms</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
