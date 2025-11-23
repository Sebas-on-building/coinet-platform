import React, { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  Bar,
  Cell,
  ReferenceArea
} from 'recharts';
import { TradingDataPoint } from '@/types/trading';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2,
  Settings,
  Maximize2,
  Target,
  Activity,
  Crosshair,
  Plus,
  Minus,
  BarChart3
} from 'lucide-react';

interface ProfessionalCandlestickChartProps {
  data: TradingDataPoint[];
  symbol: string;
  title?: string;
  height?: number;
  showVolume?: boolean;
  className?: string;
}

// Custom Candlestick shape component
const Candlestick = (props: any) => {
  const { payload, x, y, width, height, fill } = props;
  const data = payload;
  
  if (!data) return null;
  
  const { open, high, low, close } = data;
  const isRising = close >= open;
  
  // Calculate positions
  const bodyHeight = Math.abs(close - open);
  const bodyY = Math.min(close, open);
  const wickTop = high;
  const wickBottom = low;
  
  // Scale values relative to chart
  const priceRange = high - low;
  const scaleFactor = height / priceRange;
  
  const wickX = x + width / 2;
  const bodyTop = y + ((wickTop - Math.max(open, close)) * scaleFactor);
  const bodyBottom = y + ((wickTop - Math.min(open, close)) * scaleFactor);
  const wickTopY = y + ((wickTop - high) * scaleFactor);
  const wickBottomY = y + ((wickTop - low) * scaleFactor);
  
  const candleColor = isRising ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  
  return (
    <g>
      {/* Upper wick */}
      <line
        x1={wickX}
        y1={wickTopY}
        x2={wickX}
        y2={bodyTop}
        stroke={candleColor}
        strokeWidth={1}
      />
      {/* Lower wick */}
      <line
        x1={wickX}
        y1={bodyBottom}
        x2={wickX}
        y2={wickBottomY}
        stroke={candleColor}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + 2}
        y={bodyTop}
        width={width - 4}
        height={Math.max(bodyBottom - bodyTop, 1)}
        fill={isRising ? 'transparent' : candleColor}
        stroke={candleColor}
        strokeWidth={1}
      />
    </g>
  );
};

export function ProfessionalCandlestickChart({
  data,
  symbol,
  title = 'Professional Chart',
  height = 500,
  showVolume = true,
  className
}: ProfessionalCandlestickChartProps) {
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  // Process chart data with enhanced calculations
  const chartData = useMemo(() => {
    return data.map((point, index) => {
      const prevPoint = index > 0 ? data[index - 1] : null;
      const isRising = point.close >= point.open;
      
      // Calculate support/resistance levels
      const recentPrices = data.slice(Math.max(0, index - 20), index + 1);
      const recentHighs = recentPrices.map(p => p.high);
      const recentLows = recentPrices.map(p => p.low);
      const resistance = Math.max(...recentHighs);
      const support = Math.min(...recentLows);
      
      return {
        ...point,
        isRising,
        change: prevPoint ? point.close - prevPoint.close : 0,
        changePercent: prevPoint ? ((point.close - prevPoint.close) / prevPoint.close) * 100 : 0,
        bodyHeight: Math.abs(point.close - point.open),
        upperShadow: point.high - Math.max(point.open, point.close),
        lowerShadow: Math.min(point.open, point.close) - point.low,
        resistance,
        support,
        // Calculate relative strength
        relativeStrength: recentPrices.length > 1 ? 
          (point.close - recentLows[0]) / (recentHighs[0] - recentLows[0]) : 0.5,
      };
    });
  }, [data]);

  // Enhanced statistics calculation
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    
    const current = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    const recentData = chartData.slice(-24);
    const prices = recentData.map(d => d.close);
    const volumes = recentData.map(d => d.volume);
    
    const high24h = Math.max(...recentData.map(d => d.high));
    const low24h = Math.min(...recentData.map(d => d.low));
    const volume24h = volumes.reduce((sum, v) => sum + v, 0);
    const avgVolume = volume24h / volumes.length;
    
    // Calculate volatility (standard deviation of price changes)
    const priceChanges = recentData.slice(1).map((point, i) => 
      (point.close - recentData[i].close) / recentData[i].close
    );
    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const volatility = Math.sqrt(
      priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length
    );
    
    return {
      currentPrice: current.close,
      change24h: previous ? current.close - previous.close : 0,
      changePercent24h: previous ? ((current.close - previous.close) / previous.close) * 100 : 0,
      high24h,
      low24h,
      volume24h,
      avgVolume,
      volatility: volatility * 100,
      isPositive: previous ? current.close >= previous.close : true,
      marketCap: current.close * current.volume, // Simplified
      priceRange: high24h - low24h,
    };
  }, [chartData]);

  // Professional formatting functions
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value > 1 ? 2 : 4,
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: date.getHours() !== 0 ? 'numeric' : undefined,
      minute: date.getMinutes() !== 0 ? '2-digit' : undefined
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Enhanced tooltip with comprehensive data
  const ProfessionalTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="coinet-card border-brand/20 backdrop-blur-xl bg-card/95 p-4 rounded-lg shadow-2xl min-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-foreground">
            {formatDate(label)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(label)}
          </div>
        </div>
        
        {/* OHLC Data */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Open:</span>
              <span className="text-sm font-medium text-foreground">
                {formatPrice(data.open)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">High:</span>
              <span className="text-sm font-medium text-success">
                {formatPrice(data.high)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Low:</span>
              <span className="text-sm font-medium text-destructive">
                {formatPrice(data.low)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Close:</span>
              <span className="text-sm font-medium text-foreground">
                {formatPrice(data.close)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Change and Volume */}
        <div className="border-t border-border/30 pt-2 space-y-2">
          {data.change !== 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Change:</span>
              <div className="flex items-center gap-1">
                {data.change >= 0 ? 
                  <TrendingUp className="w-3 h-3 text-success" /> : 
                  <TrendingDown className="w-3 h-3 text-destructive" />
                }
                <span className={`text-sm font-medium ${
                  data.change >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {data.change >= 0 ? '+' : ''}{formatPrice(data.change)} 
                  ({data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Volume:</span>
            <span className="text-sm font-medium text-foreground">
              {formatVolume(data.volume)}
            </span>
          </div>
          
          {/* Technical Analysis */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Strength:</span>
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-destructive via-warning to-success rounded-full"
                  style={{ width: `${data.relativeStrength * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {(data.relativeStrength * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mouse event handlers for crosshair
  const handleMouseMove = useCallback((event: any) => {
    if (event && event.activePayload && event.activePayload.length > 0) {
      setHoveredData(event.activePayload[0].payload);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  if (!stats) return null;

  return (
    <Card className={`coinet-card overflow-hidden ${className}`}>
      {/* Professional Header */}
      <CardHeader className="coinet-section border-b border-border/30">
        <div className="flex items-center justify-between">
          {/* Symbol & Price Display */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="coinet-badge-primary text-base font-mono tracking-wider px-4 py-2">
                {symbol}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="w-3 h-3" />
                <span>Live</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="coinet-heading-2xl font-bold text-foreground">
                {formatPrice(stats.currentPrice)}
              </div>
              <div className={`flex items-center gap-2 coinet-body-lg font-semibold ${
                stats.changePercent24h >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {stats.changePercent24h >= 0 ? 
                  <TrendingUp className="w-5 h-5" /> : 
                  <TrendingDown className="w-5 h-5" />
                }
                <div className="flex flex-col">
                  <span>{stats.changePercent24h >= 0 ? '+' : ''}{formatPrice(stats.change24h)}</span>
                  <span className="coinet-body-sm">
                    ({stats.changePercent24h >= 0 ? '+' : ''}{stats.changePercent24h.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Statistics */}
          <div className="flex items-center gap-8 coinet-body-sm">
            <div className="text-center">
              <div className="text-success font-semibold">{formatPrice(stats.high24h)}</div>
              <div className="text-muted-foreground coinet-body-xs">24h High</div>
            </div>
            <div className="text-center">
              <div className="text-destructive font-semibold">{formatPrice(stats.low24h)}</div>
              <div className="text-muted-foreground coinet-body-xs">24h Low</div>
            </div>
            <div className="text-center">
              <div className="text-foreground font-semibold">{formatVolume(stats.volume24h)}</div>
              <div className="text-muted-foreground coinet-body-xs">24h Volume</div>
            </div>
            <div className="text-center">
              <div className="text-warning font-semibold">{stats.volatility.toFixed(1)}%</div>
              <div className="text-muted-foreground coinet-body-xs">Volatility</div>
            </div>
          </div>

          {/* Professional Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="coinet-btn-ghost h-8 w-8 p-0">
              <Crosshair className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="coinet-btn-ghost h-8 w-8 p-0">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="coinet-btn-ghost h-8 w-8 p-0">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Main Candlestick Chart */}
        <div style={{ height: height }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
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
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={formatPrice}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                orientation="right"
                width={80}
              />

              {/* Current Price Reference Line */}
              <ReferenceLine 
                y={stats.currentPrice} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="4 4"
                opacity={0.8}
              />

              {/* Support and Resistance levels */}
              {hoveredData && (
                <>
                  <ReferenceLine 
                    y={hoveredData.resistance} 
                    stroke="hsl(var(--success))" 
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                  <ReferenceLine 
                    y={hoveredData.support} 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                </>
              )}
              
              <Tooltip content={<ProfessionalTooltip />} />
              
              {/* Candlestick bars using Bar component */}
              <Bar 
                dataKey="high" 
                fill="transparent"
                shape={<Candlestick />}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Price level labels on the right */}
          {hoveredData && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 space-y-1">
              <div className="coinet-badge text-xs bg-primary/10 text-primary px-2 py-1">
                {formatPrice(stats.currentPrice)}
              </div>
            </div>
          )}
        </div>
        
        {/* Volume Chart */}
        {showVolume && (
          <div style={{ height: 120 }} className="border-t border-border/30">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 80, left: 20, bottom: 10 }}
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
                
                {/* Average volume line */}
                <ReferenceLine 
                  y={stats.avgVolume} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                
                <Bar dataKey="volume" radius={[1, 1, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`volume-${index}`}
                      fill={entry.isRising ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      fillOpacity={0.6}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}