import React from 'react';
import { Button } from '@/components/ui/button';
import { TimeframeValue, TimeframeOption } from '@/hooks/useTimeframeData';

interface TimeframeSelectorProps {
  timeframes: TimeframeOption[];
  selectedTimeframe: TimeframeValue;
  onTimeframeChange: (timeframe: TimeframeValue) => void;
  className?: string;
}

export function TimeframeSelector({ 
  timeframes, 
  selectedTimeframe, 
  onTimeframeChange,
  className 
}: TimeframeSelectorProps) {
  return (
    <div className={`flex items-center gap-1 overflow-x-hidden ${className}`}>
      <div className="flex flex-wrap gap-1">
        {timeframes.map((timeframe) => (
          <Button
            key={timeframe.value}
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs font-semibold transition-all duration-200 whitespace-nowrap rounded-lg ${
              selectedTimeframe === timeframe.value 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => onTimeframeChange(timeframe.value)}
          >
            {timeframe.label}
          </Button>
        ))}
      </div>
    </div>
  );
}