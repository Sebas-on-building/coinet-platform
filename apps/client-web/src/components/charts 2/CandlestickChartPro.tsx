import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { TradingDataPoint, CandlestickData } from '@/types/trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  DollarSign
} from 'lucide-react';

interface CandlestickChartProProps {
  data: TradingDataPoint[];
  height?: number;
  showVolume?: boolean;
  symbol?: string;
  title?: string;
  className?: string;
}

// Custom Candlestick component
const Candlestick = ({ payload, x, y, width, height, chartData }: any) => {
  if (!payload || !chartData) return null;
  
  const {
    open,
    high,
    low,
    close,
  } = payload;
  
  const isRising = close > open;
  const candleHeight = Math.abs(close - open);
  const candleY = Math.min(open, close);
  
  // Colors
  const bodyColor = isRising ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  const wickColor = isRising ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  
  // Scale factors (these need to be calculated based on the chart's scale)
  const scale = height / (Math.max(...chartData.map((d: TradingDataPoint) => d.high)) - Math.min(...chartData.map((d: TradingDataPoint) => d.low)));
  const baseY = y;
  
  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={x + width / 2}
        y1={baseY - (high - Math.max(open, close)) * scale}
        x2={x + width / 2}
        y2={baseY - (Math.min(open, close) - low) * scale}
        stroke={wickColor}
        strokeWidth={1}
      />
      
      {/* Body */}
      <rect
        x={x + width * 0.2}
        y={baseY - (Math.max(open, close) - low) * scale}
        width={width * 0.6}
        height={candleHeight * scale}
        fill={bodyColor}
        fillOpacity={isRising ? 0.8 : 1}
        stroke={bodyColor}
        strokeWidth={1}
      />
    </g>
  );
};

export function CandlestickChartPro({
  data,
  height = 400,
  showVolume = true,
  symbol = 'BTC-USD',
  title = 'Candlestick Chart',
  className
}: CandlestickChartProProps) {
  const [hoveredCandle, setHoveredCandle] = useState<TradingDataPoint | null>(null);
  
  // Transform data to candlestick format
  const candlestickData = useMemo(() => {
    return data.map((point, index) => {
      const isRising = point.close > point.open;
      const prevPoint = index > 0 ? data[index - 1] : null;
      
      return {
        ...point,
        bodyColor: isRising ? 'bullish' as const : 'bearish' as const,
        wickColor: isRising ? 'bullish' as const : 'bearish' as const,
        // Calculate volume color based on price movement
        volumeColor: isRising ? 'bullish' as const : 
                    !isRising ? 'bearish' as const : 'neutral' as const,
        // Body height for rendering
        bodyHeight: Math.abs(point.close - point.open),
        bodyTop: Math.max(point.open, point.close),
        bodyBottom: Math.min(point.open, point.close),
        upperWick: point.high - Math.max(point.open, point.close),
        lowerWick: Math.min(point.open, point.close) - point.low
      };
    });
  }, [data]);

  // Calculate current stats
  const currentCandle = candlestickData[candlestickData.length - 1];
  const previousCandle = candlestickData[candlestickData.length - 2];
  
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: date.getHours() !== 0 ? '2-digit' : undefined,
      minute: date.getHours() !== 0 ? '2-digit' : undefined
    });
  };

  const CandlestickTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const candle = payload[0].payload as TradingDataPoint & { 
      bodyColor: string; 
      volumeColor: string;
      bodyHeight: number;
    };
    
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/40 rounded-xl p-4 shadow-2xl min-w-[300px]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-foreground">
            {formatDate(label)}
          </div>
          <Badge variant={candle.bodyColor === 'bullish' ? 'default' : 'destructive'} className="text-xs">
            {candle.bodyColor === 'bullish' ? 'Bullish' : 'Bearish'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* OHLC Data */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Open</span>
              <span className="text-sm font-medium text-foreground">{formatPrice(candle.open)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">High</span>
              <span className="text-sm font-medium text-success">{formatPrice(candle.high)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Low</span>
              <span className="text-sm font-medium text-destructive">{formatPrice(candle.low)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Close</span>
              <span className="text-sm font-medium text-foreground">{formatPrice(candle.close)}</span>
            </div>
          </div>
          
          {/* Additional Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change</span>
              <div className={`text-sm font-medium flex items-center gap-1 ${
                candle.bodyColor === 'bullish' ? 'text-success' : 'text-destructive'
              }`}>
                {candle.bodyColor === 'bullish' ? 
                  <TrendingUp className="w-3 h-3" /> : 
                  <TrendingDown className="w-3 h-3" />
                }
                {formatPrice(Math.abs(candle.change || 0))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Change %</span>
              <span className={`text-sm font-medium ${
                candle.bodyColor === 'bullish' ? 'text-success' : 'text-destructive'
              }`}>
                {Math.abs(candle.changePercent || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Volume</span>
              <span className="text-sm font-medium text-foreground">{formatVolume(candle.volume)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Range</span>
              <span className="text-sm font-medium text-foreground">
                {formatPrice(candle.high - candle.low)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">{symbol}</Badge>
          </div>
          
          {currentCandle && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">
                  {formatPrice(currentCandle.close)}
                </div>
                {currentCandle.change && (
                  <div className={`text-sm flex items-center gap-1 ${
                    currentCandle.change > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {currentCandle.change > 0 ? 
                      <TrendingUp className="w-3 h-3" /> : 
                      <TrendingDown className="w-3 h-3" />
                    }
                    {formatPrice(Math.abs(currentCandle.change))} 
                    ({Math.abs(currentCandle.changePercent || 0).toFixed(2)}%)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Main Candlestick Chart */}
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={candlestickData}
                margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e?.activePayload?.[0]?.payload) {
                    setHoveredCandle(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                <CartesianGrid 
                  strokeDasharray="1 1" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
                
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                
                <YAxis
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tickFormatter={formatPrice}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  orientation="right"
                  width={90}
                />
                
                <Tooltip content={<CandlestickTooltip />} />
                
                {/* Render candlesticks using Bar with custom shape */}
                <Bar 
                  dataKey="bodyHeight" 
                  shape={(props: any) => <Candlestick {...props} chartData={candlestickData} />}
                >
                  {candlestickData.map((entry, index) => (
                    <Cell
                      key={`candlestick-${index}`}
                      fill={entry.bodyColor === 'bullish' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Volume Chart */}
          {showVolume && (
            <div style={{ height: 120 }}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Volume</span>
                {hoveredCandle && (
                  <span className="text-xs text-muted-foreground">
                    {formatVolume(hoveredCandle.volume)}
                  </span>
                )}
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={candlestickData}
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  
                  <YAxis
                    tickFormatter={formatVolume}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    orientation="right"
                    width={60}
                  />
                  
                  <Bar dataKey="volume" radius={[1, 1, 0, 0]}>
                    {candlestickData.map((entry, index) => (
                      <Cell
                        key={`volume-${index}`}
                        fill={
                          entry.volumeColor === 'bullish' 
                            ? 'hsl(var(--success))' 
                            : entry.volumeColor === 'bearish'
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--muted-foreground))'
                        }
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}