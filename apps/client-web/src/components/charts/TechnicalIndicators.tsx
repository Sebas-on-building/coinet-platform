import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Target, Zap } from 'lucide-react';
import { technicalIndicators } from './mockData';

interface TechnicalIndicatorsProps {
  className?: string;
}

export function TechnicalIndicators({ className }: TechnicalIndicatorsProps) {
  const { rsi, macd, bollinger, movingAverages } = technicalIndicators;

  const getRSISignal = (value: number) => {
    if (value >= 70) return { signal: 'Overbought', color: 'text-red-600 bg-red-50 border-red-200', icon: TrendingDown, severity: 'high' };
    if (value <= 30) return { signal: 'Oversold', color: 'text-green-600 bg-green-50 border-green-200', icon: TrendingUp, severity: 'high' };
    return { signal: 'Neutral', color: 'text-muted-foreground bg-muted/20 border-border', icon: Activity, severity: 'low' };
  };

  const getMACDSignal = () => {
    const signal = macd.macd > macd.signal ? 'Bullish' : 'Bearish';
    return {
      signal,
      color: signal === 'Bullish' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200',
      icon: signal === 'Bullish' ? TrendingUp : TrendingDown,
      severity: Math.abs(macd.histogram) > 50 ? 'high' : 'medium'
    };
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const rsiSignal = getRSISignal(rsi);
  const macdSignal = getMACDSignal();
  const RSIIcon = rsiSignal.icon;
  const MACDIcon = macdSignal.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* RSI Enhanced */}
      <Card className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-card/30 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">RSI (14)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <RSIIcon className={`w-4 h-4 ${rsiSignal.color.split(' ')[0]}`} />
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold px-2 py-1 ${rsiSignal.color}`}
              >
                {rsiSignal.signal}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-foreground text-lg">{rsi.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">Overbought: 70+ | Oversold: 30-</span>
            </div>
            <div className="relative">
              <Progress value={rsi} className="h-3 bg-muted/30" />
              <div 
                className="absolute top-0 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700"
                style={{ width: `${rsi}%` }}
              />
              <div className="absolute top-0 left-[30%] w-0.5 h-3 bg-green-400/70 rounded-full" />
              <div className="absolute top-0 left-[70%] w-0.5 h-3 bg-red-400/70 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MACD Enhanced */}
      <Card className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-card/30 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">MACD (12,26,9)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <MACDIcon className={`w-4 h-4 ${macdSignal.color.split(' ')[0]}`} />
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold px-2 py-1 ${macdSignal.color}`}
              >
                {macdSignal.signal}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">MACD</div>
              <div className="font-bold text-foreground text-lg">{macd.macd.toFixed(2)}</div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">Signal</div>
              <div className="font-bold text-foreground text-lg">{macd.signal.toFixed(2)}</div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">Histogram</div>
              <div className={`font-bold text-lg ${macd.histogram > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {macd.histogram.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bollinger Bands Enhanced */}
      <Card className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-card/30 to-transparent">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">Bollinger Bands (20,2)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center border border-red-200 dark:border-red-800/30">
                <div className="text-red-600 text-xs font-medium">Upper</div>
                <div className="font-bold text-red-700 dark:text-red-400 text-base">{formatPrice(bollinger.upper)}</div>
              </div>
              <div className="bg-muted/20 rounded-lg p-3 text-center border border-border">
                <div className="text-muted-foreground text-xs font-medium">Middle (SMA20)</div>
                <div className="font-bold text-foreground text-base">{formatPrice(bollinger.middle)}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-800/30">
                <div className="text-green-600 text-xs font-medium">Lower</div>
                <div className="font-bold text-green-700 dark:text-green-400 text-base">{formatPrice(bollinger.lower)}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/10 rounded-lg p-3 border border-border/20">
              <div className="font-medium text-foreground mb-1">Analysis</div>
              Current price is within the bands, suggesting normal volatility levels with potential for breakout signals.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moving Averages Enhanced */}
      <Card className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-card/30 to-transparent">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">Moving Averages</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800/30">
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-medium text-xs">SMA 20</span>
                  <span className="font-bold text-blue-700 dark:text-blue-400">{formatPrice(movingAverages.sma20)}</span>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800/30">
                <div className="flex justify-between items-center">
                  <span className="text-purple-600 font-medium text-xs">SMA 50</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">{formatPrice(movingAverages.sma50)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800/30">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 font-medium text-xs">EMA 20</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatPrice(movingAverages.ema20)}</span>
                </div>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800/30">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-600 font-medium text-xs">EMA 50</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">{formatPrice(movingAverages.ema50)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}