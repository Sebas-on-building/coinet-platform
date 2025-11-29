import React, { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { TradingDataPoint, ChartSettings, TechnicalIndicator } from '@/types/trading';
import { TimeframeSelector } from './TimeframeSelector';
import { useTimeframeData, TimeframeValue } from '@/hooks/useTimeframeData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Volume2, 
  Target,
  Settings,
  Maximize2,
  Download,
  Share
} from 'lucide-react';

interface ProfessionalTradingChartProps {
  data: TradingDataPoint[];
  symbol: string;
  title?: string;
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  chartSettings?: Partial<ChartSettings>;
  onTimeframeChange?: (timeframe: TimeframeValue) => void;
  className?: string;
}

export function ProfessionalTradingChart({
  data,
  symbol,
  title = 'Price Chart',
  height = 400,
  showVolume = true,
  showIndicators = true,
  chartSettings,
  onTimeframeChange,
  className
}: ProfessionalTradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>('1T');
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<TradingDataPoint | null>(null);

  // Transform trading data to price data for timeframe selector
  const priceData = useMemo(() => 
    data.map(d => ({ 
      date: d.date, 
      price: d.close, 
      volume: d.volume,
      timestamp: d.timestamp 
    })), [data]
  );

  const { filteredData: filteredPriceData, timeAxisFormatter, tickInterval, timeframeOptions } = useTimeframeData(
    priceData,
    selectedTimeframe
  );

  // Convert back to trading data format
  const filteredData = useMemo(() => {
    return filteredPriceData.map(pd => {
      const originalPoint = data.find(d => d.timestamp === pd.timestamp);
      return originalPoint || {
        timestamp: pd.timestamp,
        date: pd.date,
        open: pd.price,
        high: pd.price,
        low: pd.price,
        close: pd.price,
        volume: pd.volume,
        change: 0,
        changePercent: 0
      };
    });
  }, [filteredPriceData, data]);

  // Calculate current price and change
  const currentPrice = filteredData[filteredData.length - 1];
  const previousPrice = filteredData[filteredData.length - 2];
  const priceChange = currentPrice && previousPrice ? currentPrice.close - previousPrice.close : 0;
  const priceChangePercent = previousPrice ? (priceChange / previousPrice.close) * 100 : 0;

  // Calculate volume data with semantic colors
  const volumeData = useMemo(() => {
    return filteredData.map((point, index) => {
      const prevPoint = index > 0 ? filteredData[index - 1] : null;
      let volumeColor: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      
      if (prevPoint) {
        if (point.close > prevPoint.close) {
          volumeColor = 'bullish';
        } else if (point.close < prevPoint.close) {
          volumeColor = 'bearish';
        }
      }
      
      return {
        ...point,
        volumeColor,
        avgVolume: filteredData.reduce((sum, p) => sum + p.volume, 0) / filteredData.length
      };
    });
  }, [filteredData]);

  // Calculate support and resistance levels
  const supportResistanceLevels = useMemo(() => {
    if (filteredData.length < 20) return [];
    
    const highs = filteredData.map(d => d.high).sort((a, b) => b - a);
    const lows = filteredData.map(d => d.low).sort((a, b) => a - b);
    
    const resistance = highs.slice(0, 3);
    const support = lows.slice(0, 3);
    
    return [
      ...resistance.map(price => ({ price, type: 'resistance' as const })),
      ...support.map(price => ({ price, type: 'support' as const }))
    ];
  }, [filteredData]);

  const handleTimeframeChange = useCallback((timeframe: TimeframeValue) => {
    setSelectedTimeframe(timeframe);
    onTimeframeChange?.(timeframe);
  }, [onTimeframeChange]);

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

  const getPriceChangeColor = () => {
    if (priceChange > 0) return 'hsl(var(--success))';
    if (priceChange < 0) return 'hsl(var(--destructive))';
    return 'hsl(var(--muted-foreground))';
  };

  const PriceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload as TradingDataPoint;
    const volumeInfo = volumeData.find(v => v.timestamp === data.timestamp);
    
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/40 rounded-xl p-4 shadow-2xl min-w-[280px]">
        <div className="text-sm font-semibold text-foreground mb-3">
          {timeAxisFormatter(label)}
        </div>
        
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Open</div>
              <div className="font-medium text-foreground">{formatPrice(data.open)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">High</div>
              <div className="font-medium text-success">{formatPrice(data.high)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Low</div>
              <div className="font-medium text-destructive">{formatPrice(data.low)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Close</div>
              <div className="font-medium text-foreground">{formatPrice(data.close)}</div>
            </div>
          </div>
          
          {volumeInfo && (
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">Volume</div>
                <div className="font-medium text-foreground">{formatVolume(volumeInfo.volume)}</div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-muted-foreground text-xs">vs Avg</div>
                <div className="text-xs">
                  {((volumeInfo.volume / volumeInfo.avgVolume - 1) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
          
          {data.change !== undefined && (
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">Change</div>
                <div className={`font-medium flex items-center gap-1 ${
                  data.change > 0 ? 'text-success' : data.change < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {data.change > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   data.change < 0 ? <TrendingDown className="w-3 h-3" /> :
                   <Minus className="w-3 h-3" />}
                  {formatPrice(Math.abs(data.change))} ({data.changePercent?.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-mono">
                  {symbol}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last: {currentPrice ? formatPrice(currentPrice.close) : 'N/A'}
                </span>
                {priceChange !== 0 && (
                  <div className="flex items-center gap-1 text-sm font-medium" style={{ color: getPriceChangeColor() }}>
                    {priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPrice(Math.abs(priceChange))} ({Math.abs(priceChangePercent).toFixed(2)}%)
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TimeframeSelector
              timeframes={timeframeOptions}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              className="mr-2"
            />
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Share className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Main Price Chart */}
          <div style={{ height: height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={filteredData}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e?.activePayload?.[0]?.payload) {
                    setHoveredDataPoint(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredDataPoint(null)}
              >
                <defs>
                  <linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="1 1" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  horizontal={true}
                  vertical={false}
                />
                
                <XAxis
                  dataKey="date"
                  tickFormatter={timeAxisFormatter}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval as any}
                  height={25}
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
                
                {/* Support/Resistance Lines */}
                {supportResistanceLevels.map((level, index) => (
                  <ReferenceLine
                    key={`${level.type}-${index}`}
                    y={level.price}
                    stroke={level.type === 'resistance' ? 'hsl(var(--destructive))' : 'hsl(var(--success))'}
                    strokeDasharray="2 2"
                    opacity={0.6}
                  />
                ))}
                
                <Tooltip content={<PriceTooltip />} />
                
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ 
                    r: 4, 
                    fill: "hsl(var(--primary))",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Volume Chart */}
          {showVolume && (
            <div style={{ height: 120 }}>
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Volume</span>
                {hoveredDataPoint && (
                  <span className="text-xs text-muted-foreground">
                    {formatVolume(hoveredDataPoint.volume)}
                  </span>
                )}
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={volumeData}
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={timeAxisFormatter}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={tickInterval as any}
                    height={25}
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
                    {volumeData.map((entry, index) => (
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