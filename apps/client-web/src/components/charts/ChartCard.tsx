import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  Download, 
  Share, 
  MoreHorizontal,
  Activity,
  Volume2
} from 'lucide-react';
import { TimeframeSelector } from './TimeframeSelector';
import { useTimeframeData, TimeframeValue } from '@/hooks/useTimeframeData';

interface ChartCardProps {
  title: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  children: React.ReactNode | ((timeframe: TimeframeValue) => React.ReactNode);
  showTimeframes?: boolean;
  showVolume?: boolean;
  className?: string;
  onTimeframeChange?: (timeframe: TimeframeValue) => void;
}

export function ChartCard({ 
  title, 
  symbol, 
  price, 
  change, 
  changePercent, 
  children, 
  showTimeframes = true,
  showVolume = false,
  className,
  onTimeframeChange 
}: ChartCardProps) {
  const { selectedTimeframe, setSelectedTimeframe, timeframeOptions } = useTimeframeData([]);
  const isPositive = change >= 0;

  const handleTimeframeChange = (timeframe: TimeframeValue) => {
    setSelectedTimeframe(timeframe);
    onTimeframeChange?.(timeframe);
  };

  const formatPrice = (value: number) => {
    if (value >= 1e12) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value >= 1 ? 2 : 6,
      maximumFractionDigits: value >= 1 ? 2 : 6,
    }).format(value);
  };

  const formatChange = (value: number) => {
    if (Math.abs(value) >= 1e9) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        signDisplay: 'always',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className={`group overflow-hidden bg-background/95 backdrop-blur-sm border border-border/30 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardHeader className="pb-3 md:pb-4 px-3 md:px-4 lg:px-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="space-y-2 md:space-y-3 min-w-0 flex-1">
            <div className="flex flex-col gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate">{title}</h3>
                <Badge 
                  variant="outline" 
                  className="text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 w-fit flex-shrink-0"
                >
                  {symbol}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3 md:gap-4">
                <span className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                  {formatPrice(price)}
                </span>
                <div className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold w-fit ${
                  isPositive 
                    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' 
                    : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                  ) : (
                    <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
                  )}
                  <span>
                    {formatChange(change)} ({changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-80 transition-opacity self-start md:self-end">
            <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-muted/50">
              <Share className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-muted/50">
              <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-muted/50">
              <Maximize2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-muted/50">
              <MoreHorizontal className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </Button>
          </div>
        </div>

        {showTimeframes && (
          <div className="pt-3 md:pt-4 pb-1">
            <TimeframeSelector
              timeframes={timeframeOptions}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 px-3 md:px-4 lg:px-6 pb-3 md:pb-4 lg:pb-6">
        <div className="w-full rounded-lg overflow-hidden bg-gradient-to-b from-muted/20 to-transparent" 
             style={{ height: '280px', minHeight: '250px' }}>
          {typeof children === 'function' ? children(selectedTimeframe) : children}
        </div>
        
        {showVolume && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 md:mt-4 pt-2 md:pt-3 border-t border-border/20 bg-muted/5 rounded-lg px-2 md:px-3 py-2 md:py-3 gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                <span className="text-xs md:text-sm font-medium text-foreground">Volume</span>
              </div>
              <span className="text-sm md:text-lg font-bold text-foreground">25.3B USD</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground">
              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-medium">24h</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}