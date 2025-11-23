import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { TradingDataPoint, RSIData, MACDData, MovingAverageData } from '@/types/trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Activity
} from 'lucide-react';

interface TechnicalIndicatorsPanelProps {
  data: TradingDataPoint[];
  height?: number;
  className?: string;
}

export function TechnicalIndicatorsPanel({ 
  data, 
  height = 300,
  className 
}: TechnicalIndicatorsPanelProps) {
  
  // Calculate RSI (Relative Strength Index)
  const rsiData = useMemo(() => {
    if (data.length < 14) return [];
    
    const calculateRSI = (prices: number[], period = 14) => {
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
      
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };
    
    return data.map((point, index) => {
      if (index < 13) return null;
      
      const prices = data.slice(Math.max(0, index - 13), index + 1).map(d => d.close);
      const rsi = calculateRSI(prices);
      
      return {
        timestamp: point.timestamp,
        date: point.date,
        value: rsi,
        overbought: rsi > 70,
        oversold: rsi < 30,
        signal: rsi > 70 ? 'sell' as const : rsi < 30 ? 'buy' as const : 'hold' as const
      };
    }).filter(Boolean) as RSIData[];
  }, [data]);

  // Calculate MACD
  const macdData = useMemo(() => {
    if (data.length < 26) return [];
    
    const calculateEMA = (prices: number[], period: number) => {
      const multiplier = 2 / (period + 1);
      let ema = prices[0];
      const result = [ema];
      
      for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        result.push(ema);
      }
      
      return result;
    };
    
    const prices = data.map(d => d.close);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    return data.map((point, index) => {
      if (index < 25) return null;
      
      const macd = ema12[index] - ema26[index];
      const signal = index < 34 ? macd : 
        calculateEMA(data.slice(0, index + 1).map((_, i) => 
          i < 25 ? 0 : ema12[i] - ema26[i]
        ).filter(v => v !== 0), 9)[index - 25];
      
      const histogram = macd - signal;
      
      return {
        timestamp: point.timestamp,
        date: point.date,
        macd,
        signal,
        histogram,
        crossover: histogram > 0 && index > 0 && 
          (data.slice(0, index).map((_, i) => 
            i < 25 ? 0 : ema12[i] - ema26[i] - signal
          ).pop() || 0) <= 0 ? 'bullish' as const : 
          histogram < 0 && index > 0 && 
          (data.slice(0, index).map((_, i) => 
            i < 25 ? 0 : ema12[i] - ema26[i] - signal
          ).pop() || 0) >= 0 ? 'bearish' as const : undefined
      };
    }).filter(Boolean) as MACDData[];
  }, [data]);

  // Calculate Moving Averages
  const movingAverageData = useMemo(() => {
    const calculateSMA = (prices: number[], period: number) => {
      return prices.slice(-period).reduce((a, b) => a + b) / period;
    };
    
    const calculateEMA = (prices: number[], period: number) => {
      const multiplier = 2 / (period + 1);
      let ema = prices[0];
      
      for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      }
      
      return ema;
    };

    return data.map((point, index) => {
      if (index < 199) return null;
      
      const prices = data.slice(0, index + 1).map(d => d.close);
      
      return {
        timestamp: point.timestamp,
        date: point.date,
        sma20: calculateSMA(prices, 20),
        sma50: calculateSMA(prices, 50),
        sma200: calculateSMA(prices, 200),
        ema20: calculateEMA(prices, 20),
        ema50: calculateEMA(prices, 50),
        goldenCross: index > 49 && calculateSMA(prices, 20) > calculateSMA(prices, 50) &&
          data[index - 1] && calculateSMA(data.slice(0, index).map(d => d.close), 20) <= 
          calculateSMA(data.slice(0, index).map(d => d.close), 50),
        deathCross: index > 49 && calculateSMA(prices, 20) < calculateSMA(prices, 50) &&
          data[index - 1] && calculateSMA(data.slice(0, index).map(d => d.close), 20) >= 
          calculateSMA(data.slice(0, index).map(d => d.close), 50)
      };
    }).filter(Boolean) as MovingAverageData[];
  }, [data]);

  const currentRSI = rsiData[rsiData.length - 1];
  const currentMACD = macdData[macdData.length - 1];
  const currentMA = movingAverageData[movingAverageData.length - 1];

  const formatValue = (value: number, decimals = 2) => {
    return value.toFixed(decimals);
  };

  const RSITooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/40 rounded-xl p-3 shadow-2xl">
        <div className="text-sm font-semibold text-foreground mb-2">{label}</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-sm">RSI (14)</span>
            <span className="font-medium text-foreground">{formatValue(data.value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data.overbought ? "destructive" : data.oversold ? "default" : "secondary"} className="text-xs">
              {data.overbought ? "Overbought" : data.oversold ? "Oversold" : "Neutral"}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const MACDTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border/40 rounded-xl p-3 shadow-2xl">
        <div className="text-sm font-semibold text-foreground mb-2">{label}</div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">MACD</span>
            <span className="font-medium text-foreground">{formatValue(data.macd, 4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Signal</span>
            <span className="font-medium text-foreground">{formatValue(data.signal, 4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Histogram</span>
            <span className={`font-medium ${data.histogram > 0 ? 'text-success' : 'text-destructive'}`}>
              {formatValue(data.histogram, 4)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* RSI Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              RSI (14)
            </CardTitle>
            {currentRSI && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatValue(currentRSI.value)}</span>
                <Badge 
                  variant={currentRSI.overbought ? "destructive" : currentRSI.oversold ? "default" : "secondary"}
                  className="text-xs"
                >
                  {currentRSI.overbought ? "Overbought" : currentRSI.oversold ? "Oversold" : "Neutral"}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* RSI Progress Bar */}
            {currentRSI && (
              <div className="space-y-2">
                <Progress 
                  value={currentRSI.value} 
                  max={100}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span className="text-destructive">70</span>
                  <span className="text-success">30</span>
                  <span>100</span>
                </div>
              </div>
            )}
            
            {/* RSI Chart */}
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rsiData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="1 1" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    fontSize={10}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<RSITooltip />} />
                  
                  <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="2 2" opacity={0.6} />
                  <ReferenceLine y={30} stroke="hsl(var(--success))" strokeDasharray="2 2" opacity={0.6} />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="1 1" opacity={0.4} />
                  
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MACD Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              MACD (12,26,9)
            </CardTitle>
            {currentMACD && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant={currentMACD.crossover === 'bullish' ? "default" : 
                          currentMACD.crossover === 'bearish' ? "destructive" : "secondary"}
                  className="text-xs flex items-center gap-1"
                >
                  {currentMACD.crossover === 'bullish' ? (
                    <>
                      <TrendingUp className="w-3 h-3" />
                      Bullish
                    </>
                  ) : currentMACD.crossover === 'bearish' ? (
                    <>
                      <TrendingDown className="w-3 h-3" />
                      Bearish
                    </>
                  ) : (
                    'Neutral'
                  )}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macdData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="1 1" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  fontSize={10}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MACDTooltip />} />
                
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="1 1" opacity={0.4} />
                
                <Bar dataKey="histogram" radius={[1, 1, 1, 1]}>
                  {macdData.map((entry, index) => (
                    <Cell
                      key={`histogram-${index}`}
                      fill={entry.histogram > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      fillOpacity={0.6}
                    />
                  ))}
                </Bar>
                
                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="signal"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}