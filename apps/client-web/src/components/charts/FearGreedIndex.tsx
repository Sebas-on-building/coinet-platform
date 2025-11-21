import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fearGreedData } from './mockData';

interface FearGreedIndexProps {
  className?: string;
}

export function FearGreedIndex({ className }: FearGreedIndexProps) {
  const { current, classification, previous } = fearGreedData;

  const getClassificationColor = (value: number) => {
    if (value <= 20) return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800';
    if (value <= 40) return 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800';
    if (value <= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800';
    if (value <= 80) return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800';
  };

  const getProgressColor = (value: number) => {
    if (value <= 20) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (value <= 40) return 'bg-gradient-to-r from-orange-500 to-orange-600';
    if (value <= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    if (value <= 80) return 'bg-gradient-to-r from-green-500 to-green-600';
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getCurrentScale = () => {
    const segments = [
      { label: 'Extreme Fear', max: 20, color: 'bg-gradient-to-t from-red-500 to-red-400' },
      { label: 'Fear', max: 40, color: 'bg-gradient-to-t from-orange-500 to-orange-400' },
      { label: 'Neutral', max: 60, color: 'bg-gradient-to-t from-yellow-500 to-yellow-400' },
      { label: 'Greed', max: 80, color: 'bg-gradient-to-t from-green-500 to-green-400' },
      { label: 'Extreme Greed', max: 100, color: 'bg-gradient-to-t from-emerald-500 to-emerald-400' }
    ];

    return segments;
  };

  const scale = getCurrentScale();

  return (
    <Card className={`bg-background/95 backdrop-blur-sm border border-border/30 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardHeader className="pb-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground">Fear & Greed Index</CardTitle>
          <Badge className={`font-semibold px-3 py-1 w-fit ${getClassificationColor(current)}`}>
            {classification}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-4 sm:px-6 space-y-6">
        {/* Current Value Display */}
        <div className="text-center space-y-3">
          <div className="relative">
            <div className="text-4xl sm:text-5xl font-bold text-foreground mb-2 tracking-tight">
              {current}
            </div>
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full animate-pulse"></div>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Current Index Value
          </div>
        </div>

        {/* Enhanced Progress Bar with Gradient */}
        <div className="space-y-3">
          <div className="relative">
            <div className="h-4 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressColor(current)}`}
                style={{ width: `${current}%` }}
              />
            </div>
            {/* Indicator Dot */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-background border-2 border-primary rounded-full shadow-lg transition-all duration-700"
              style={{ left: `calc(${current}% - 12px)` }}
            >
              <div className="w-2 h-2 bg-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
          
          {/* Scale Labels */}
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Enhanced Scale Segments */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {scale.map((segment, index) => (
            <div key={index} className="text-center">
              <div 
                className={`h-3 rounded-sm ${segment.color} shadow-sm transition-all duration-300 hover:scale-105`}
              />
              <div className="mt-2 text-muted-foreground font-medium truncate">
                {segment.label}
              </div>
            </div>
          ))}
        </div>

        {/* Historical Comparison with Enhanced Styling */}
        <div className="space-y-3 pt-4 border-t border-border/30">
          <div className="text-sm font-semibold text-foreground">Historical Values</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-muted/20 rounded-lg p-3 hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">Yesterday</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-foreground">{previous.yesterday}</span>
                {getTrendIcon(current, previous.yesterday)}
              </div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">Last Week</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-foreground">{previous.lastWeek}</span>
                {getTrendIcon(current, previous.lastWeek)}
              </div>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 hover:bg-muted/30 transition-colors">
              <div className="text-muted-foreground text-xs font-medium">Last Month</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-foreground">{previous.lastMonth}</span>
                {getTrendIcon(current, previous.lastMonth)}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Explanation */}
        <div className="text-xs text-muted-foreground pt-3 border-t border-border/20 bg-muted/10 rounded-lg p-3">
          <div className="font-medium text-foreground mb-1">About this Index</div>
          The Fear & Greed Index analyzes market sentiment from multiple data sources including volatility, 
          market momentum, social media, surveys, Bitcoin dominance, and Google trends to provide a comprehensive view of market psychology.
        </div>
      </CardContent>
    </Card>
  );
}