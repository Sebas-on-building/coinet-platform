import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { TradingDataPoint, RSIData, MACDData } from '@/types/trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  BarChart3,
  Target,
  Zap,
  Signal
} from 'lucide-react';

interface TechnicalIndicatorsChartProps {
  data: TradingDataPoint[];
  height?: number;
  className?: string;
}

export function TechnicalIndicatorsChart({
  data,
  height = 300,
  className
}: TechnicalIndicatorsChartProps) {

  // Enhanced RSI Calculation with divergence detection
  const rsiData = useMemo(() => {
    const calculateRSI = (prices: number[], period = 14) => {
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      const rsiValues: number[] = [];
      let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      // First RSI value
      const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + firstRS)));
      
      // Smoothed RSI calculation
      for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        
        if (avgLoss === 0) {
          rsiValues.push(100);
        } else {
          const rs = avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));
          rsiValues.push(rsi);
        }
      }
      
      return rsiValues;
    };

    const prices = data.map(d => d.close);
    const rsiValues = calculateRSI(prices);
    
    return data.slice(14).map((point, index) => {
      const rsi = rsiValues[index] || 50;
      const prevRSI = index > 0 ? rsiValues[index - 1] : rsi;
      
      // Enhanced signal detection
      const isOverbought = rsi > 70;
      const isOversold = rsi < 30;
      const isBullishDivergence = rsi > prevRSI && point.close < data[index + 13].close;
      const isBearishDivergence = rsi < prevRSI && point.close > data[index + 13].close;
      
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      if (isOversold || isBullishDivergence) signal = 'buy';
      if (isOverbought || isBearishDivergence) signal = 'sell';
      
      return {
        ...point,
        value: rsi,
        rsi,
        overbought: isOverbought,
        oversold: isOversold,
        signal,
        strength: Math.abs(50 - rsi) / 50,
        momentum: rsi - prevRSI,
        bullishDivergence: isBullishDivergence,
        bearishDivergence: isBearishDivergence
      };
    });
  }, [data]);

  // Enhanced MACD Calculation with histogram analysis
  const macdData = useMemo(() => {
    const calculateEMA = (prices: number[], period: number) => {
      const ema: number[] = [];
      const multiplier = 2 / (period + 1);
      
      // Start with SMA for first value
      let sum = 0;
      for (let i = 0; i < Math.min(period, prices.length); i++) {
        sum += prices[i];
      }
      ema[period - 1] = sum / period;
      
      // Calculate EMA for remaining values
      for (let i = period; i < prices.length; i++) {
        ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
      }
      
      return ema;
    };

    const prices = data.map(d => d.close);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    const macdLine = ema12.map((val, i) => val ? val - (ema26[i] || 0) : 0);
    const signalLine = calculateEMA(macdLine.filter(v => v !== undefined), 9);
    
    return data.slice(26).map((point, index) => {
      const adjustedIndex = index + 26;
      const macd = macdLine[adjustedIndex] || 0;
      const signal = signalLine[index] || 0;
      const histogram = macd - signal;
      const prevHist = index > 0 ? (macdLine[adjustedIndex - 1] || 0) - (signalLine[index - 1] || 0) : 0;
      
      // Enhanced crossover detection
      const bullishCrossover = macd > signal && (macdLine[adjustedIndex - 1] || 0) <= (signalLine[index - 1] || 0);
      const bearishCrossover = macd < signal && (macdLine[adjustedIndex - 1] || 0) >= (signalLine[index - 1] || 0);
      const histogramRising = histogram > prevHist;
      
      let crossover: 'bullish' | 'bearish' | undefined;
      if (bullishCrossover) crossover = 'bullish';
      if (bearishCrossover) crossover = 'bearish';
      
      return {
        ...point,
        macd,
        signal,
        histogram,
        crossover,
        momentum: histogram - prevHist,
        strength: Math.abs(histogram) / Math.max(Math.abs(macd), 0.001),
        histogramRising,
        zeroCrossing: (macd > 0 && (macdLine[adjustedIndex - 1] || 0) <= 0) || 
                      (macd < 0 && (macdLine[adjustedIndex - 1] || 0) >= 0)
      } as MACDData & TradingDataPoint & { 
        momentum: number; 
        strength: number; 
        histogramRising: boolean; 
        zeroCrossing: boolean; 
      };
    });
  }, [data]);

  // Moving Averages calculation
  const movingAverages = useMemo(() => {
    const calculateSMA = (prices: number[], period: number) => {
      const sma: number[] = [];
      for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
      return sma;
    };

    const prices = data.map(d => d.close);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    
    return data.slice(49).map((point, index) => ({
      ...point,
      sma20: sma20[index + 29] || 0,
      sma50: sma50[index] || 0,
      goldenCross: sma20[index + 29] > sma50[index] && 
                  (index === 0 || sma20[index + 28] <= sma50[index - 1]),
      deathCross: sma20[index + 29] < sma50[index] && 
                 (index === 0 || sma20[index + 28] >= sma50[index - 1])
    }));
  }, [data]);

  // Current values for display
  const currentRSI = rsiData[rsiData.length - 1];
  const currentMACD = macdData[macdData.length - 1];

  // Enhanced formatting functions
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatMACDValue = (value: number) => {
    return Math.abs(value) < 0.001 ? value.toExponential(2) : value.toFixed(4);
  };

  // Enhanced tooltips
  const RSITooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="coinet-card bg-card/95 backdrop-blur-xl border-brand/20 p-4 rounded-lg shadow-2xl min-w-[240px]">
        <div className="coinet-body-sm font-semibold text-foreground mb-2">
          {formatDate(label)}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="coinet-body-xs text-muted-foreground">RSI:</span>
            <span className={`coinet-body-sm font-semibold ${
              data.value > 70 ? 'text-destructive' : 
              data.value < 30 ? 'text-success' : 'text-foreground'
            }`}>
              {data.value.toFixed(1)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="coinet-body-xs text-muted-foreground">Momentum:</span>
            <span className={`coinet-body-sm font-medium ${
              data.momentum > 0 ? 'text-success' : 'text-destructive'
            }`}>
              {data.momentum > 0 ? '+' : ''}{data.momentum.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="coinet-body-xs text-muted-foreground">Signal:</span>
            <Badge 
              variant={
                data.signal === 'buy' ? 'default' : 
                data.signal === 'sell' ? 'destructive' : 'secondary'
              }
              className="coinet-badge text-xs"
            >
              {data.overbought ? 'OVERBOUGHT' : 
               data.oversold ? 'OVERSOLD' : 
               data.signal.toUpperCase()}
            </Badge>
          </div>
          
          {(data.bullishDivergence || data.bearishDivergence) && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-warning/10 border border-warning/20">
              <Signal className="w-3 h-3 text-warning" />
              <span className="coinet-body-xs text-warning font-medium">
                {data.bullishDivergence ? 'Bullish Divergence' : 'Bearish Divergence'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MACDTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="coinet-card bg-card/95 backdrop-blur-xl border-brand/20 p-4 rounded-lg shadow-2xl min-w-[260px]">
        <div className="coinet-body-sm font-semibold text-foreground mb-2">
          {formatDate(label)}
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex justify-between">
              <span className="coinet-body-xs text-muted-foreground">MACD:</span>
              <span className="coinet-body-sm font-medium text-primary">
                {formatMACDValue(data.macd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="coinet-body-xs text-muted-foreground">Signal:</span>
              <span className="coinet-body-sm font-medium text-warning">
                {formatMACDValue(data.signal)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="coinet-body-xs text-muted-foreground">Histogram:</span>
            <div className="flex items-center gap-2">
              {data.histogramRising ? 
                <TrendingUp className="w-3 h-3 text-success" /> : 
                <TrendingDown className="w-3 h-3 text-destructive" />
              }
              <span className={`coinet-body-sm font-medium ${
                data.histogram >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatMACDValue(data.histogram)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="coinet-body-xs text-muted-foreground">Strength:</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-muted-foreground to-primary rounded-full"
                  style={{ width: `${Math.min(data.strength * 100, 100)}%` }}
                />
              </div>
              <span className="coinet-body-xs text-muted-foreground">
                {(data.strength * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          
          {data.crossover && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-accent/10 border border-accent/20">
              <Zap className="w-3 h-3 text-accent" />
              <span className="coinet-body-xs text-accent font-medium">
                {data.crossover === 'bullish' ? '↗ Bullish Signal' : '↘ Bearish Signal'}
              </span>
            </div>
          )}
          
          {data.zeroCrossing && (
            <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20">
              <Target className="w-3 h-3 text-primary" />
              <span className="coinet-body-xs text-primary font-medium">
                Zero Line Cross
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced RSI Chart */}
      <Card className="coinet-card overflow-hidden">
        <CardHeader className="coinet-section pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="coinet-heading-lg">Relative Strength Index</CardTitle>
                <div className="coinet-body-xs text-muted-foreground">Period: 14 • Overbought: 70 • Oversold: 30</div>
              </div>
            </div>
            
            {currentRSI && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`coinet-heading-xl font-bold ${
                    currentRSI.value > 70 ? 'text-destructive' : 
                    currentRSI.value < 30 ? 'text-success' : 'text-foreground'
                  }`}>
                    {currentRSI.value.toFixed(1)}
                  </div>
                  <div className={`coinet-body-xs ${
                    currentRSI.momentum > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {currentRSI.momentum > 0 ? '+' : ''}{currentRSI.momentum.toFixed(2)} momentum
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <Badge 
                    variant={
                      currentRSI.signal === 'buy' ? 'default' : 
                      currentRSI.signal === 'sell' ? 'destructive' : 'secondary'
                    }
                    className="coinet-badge justify-center"
                  >
                    {currentRSI.overbought ? 'OVERBOUGHT' : 
                     currentRSI.oversold ? 'OVERSOLD' : 
                     currentRSI.signal.toUpperCase()}
                  </Badge>
                  
                  {(currentRSI.bullishDivergence || currentRSI.bearishDivergence) && (
                    <Badge variant="outline" className="coinet-badge text-warning border-warning/50">
                      {currentRSI.bullishDivergence ? '↗ BULL DIV' : '↘ BEAR DIV'}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div style={{ height: height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rsiData}
                margin={{ top: 10, right: 40, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="overboughtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="oversoldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05}/>
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
                />
                
                <YAxis
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />

                {/* Reference lines */}
                <ReferenceLine 
                  y={70} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                
                <ReferenceLine 
                  y={30} 
                  stroke="hsl(var(--success))" 
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                
                <ReferenceLine 
                  y={50} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="1 1"
                  opacity={0.3}
                />
                
                <Tooltip content={<RSITooltip />} />
                
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#rsiGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced MACD Chart */}
      <Card className="coinet-card overflow-hidden">
        <CardHeader className="coinet-section pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <BarChart3 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <CardTitle className="coinet-heading-lg">MACD</CardTitle>
                <div className="coinet-body-xs text-muted-foreground">Fast: 12 • Slow: 26 • Signal: 9</div>
              </div>
            </div>
            
            {currentMACD && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="grid grid-cols-2 gap-4 coinet-body-sm">
                    <div>
                      <span className="text-muted-foreground">MACD: </span>
                      <span className="text-primary font-semibold">{formatMACDValue(currentMACD.macd)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Signal: </span>
                      <span className="text-warning font-semibold">{formatMACDValue(currentMACD.signal)}</span>
                    </div>
                  </div>
                  <div className={`coinet-body-xs ${
                    currentMACD.momentum > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {currentMACD.histogramRising ? '↗ Rising' : '↘ Falling'} • 
                    Strength: {(currentMACD.strength * 100).toFixed(0)}%
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  {currentMACD.crossover && (
                    <Badge 
                      variant={currentMACD.crossover === 'bullish' ? 'default' : 'destructive'}
                      className="coinet-badge justify-center"
                    >
                      {currentMACD.crossover === 'bullish' ? '↗ BULLISH' : '↘ BEARISH'}
                    </Badge>
                  )}
                  
                  {currentMACD.zeroCrossing && (
                    <Badge variant="outline" className="coinet-badge text-primary border-primary/50">
                      ZERO CROSS
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div style={{ height: height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={macdData}
                margin={{ top: 10, right: 40, left: 10, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="1 1" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                />
                
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={formatMACDValue}
                />

                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="1 1"
                  opacity={0.5}
                />
                
                <Tooltip content={<MACDTooltip />} />
                
                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="MACD"
                />
                
                <Line
                  type="monotone"
                  dataKey="signal"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={false}
                  name="Signal"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Enhanced MACD Histogram */}
          <div style={{ height: 100 }} className="mt-4 border-t border-border/30 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={macdData}
                margin={{ top: 0, right: 40, left: 10, bottom: 10 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={formatMACDValue}
                />

                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                />
                
                <Bar dataKey="histogram" radius={[1, 1, 0, 0]}>
                  {macdData.map((entry, index) => (
                    <Cell
                      key={`histogram-${index}`}
                      fill={entry.histogram >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}