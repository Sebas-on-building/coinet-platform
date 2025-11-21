import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { HeatmapDataPoint } from './mockData';

interface MarketHeatmapProps {
  data: HeatmapDataPoint[];
  className?: string;
}

export function MarketHeatmap({ data, className }: MarketHeatmapProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value >= 1 ? 2 : 6,
      maximumFractionDigits: value >= 1 ? 2 : 6,
    }).format(value);
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const getColorClasses = (changePercent: number) => {
    if (changePercent > 0) {
      return {
        bg: 'from-green-100/90 to-green-200/90 dark:from-green-900/40 dark:to-green-800/40',
        border: 'border-green-400/60 dark:border-green-500/40',
        text: 'text-green-900 dark:text-green-50'
      };
    } else {
      return {
        bg: 'from-red-100/90 to-red-200/90 dark:from-red-900/40 dark:to-red-800/40',
        border: 'border-red-400/60 dark:border-red-500/40',
        text: 'text-red-900 dark:text-red-50'
      };
    }
  };

  // Sort by market cap for better layout
  const sortedData = [...data].sort((a, b) => b.marketCap - a.marketCap);
  
  // Take top 6 for cleaner mobile display
  const displayData = sortedData.slice(0, 6);

  return (
    <div className={`p-3 md:p-4 ${className}`}>
      {/* Responsive Grid - Single column on very small screens */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
        {displayData.map((item, index) => {
          const isPositive = item.changePercent >= 0;
          const colors = getColorClasses(item.changePercent);
          
          // First two items are larger
          const heightClass = index < 2 ? 'min-h-[160px]' : 'min-h-[140px]';
          
          return (
            <div
              key={item.symbol}
              className={`relative rounded-2xl border-2 p-3.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-gradient-to-br ${colors.bg} ${colors.border} ${heightClass} backdrop-blur-sm`}
            >
              {/* Content */}
              <div className={`h-full flex flex-col justify-between ${colors.text}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-base md:text-lg font-bold tracking-tight truncate">
                      {item.symbol}
                    </div>
                    <div className="text-[10px] md:text-xs opacity-70 mt-0.5 truncate">
                      {item.name}
                    </div>
                  </div>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 opacity-60 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5 opacity-60 flex-shrink-0" />
                  )}
                </div>
                
                {/* Footer Data */}
                <div className="space-y-0.5">
                  <div className="text-lg md:text-xl font-bold tracking-tight truncate">
                    {formatPrice(item.price)}
                  </div>
                  <div className="text-sm md:text-base font-semibold opacity-80">
                    {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-[10px] md:text-xs opacity-60">
                    {formatMarketCap(item.marketCap)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] md:text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-900 dark:to-green-800 rounded border border-green-400/60 dark:border-green-500/40" />
          <span className="text-muted-foreground">Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gradient-to-br from-red-200 to-red-300 dark:from-red-900 dark:to-red-800 rounded border border-red-400/60 dark:border-red-500/40" />
          <span className="text-muted-foreground">Negative</span>
        </div>
        <span className="text-muted-foreground hidden sm:inline">Size = Market Cap</span>
      </div>
    </div>
  );
}