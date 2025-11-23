import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Volume2 } from 'lucide-react';

interface MetricData {
  label: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  icon?: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
}

interface CompactMetricsCardProps {
  title: string;
  metrics: MetricData[];
  className?: string;
}

export function CompactMetricsCard({ title, metrics, className }: CompactMetricsCardProps) {
  const formatValue = (value: string | number, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: value >= 1 ? 2 : 6,
          maximumFractionDigits: value >= 1 ? 2 : 6,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (change?: number) => {
    if (!change) return null;
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return null;
  };

  const getTrendColor = (change?: number) => {
    if (!change) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={`bg-card/50 border-border/30 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {formatValue(metric.value, metric.format)}
                  </span>
                  
                  {metric.change !== undefined && (
                    <div className={`flex items-center gap-1 ${getTrendColor(metric.change)}`}>
                      {getTrendIcon(metric.change)}
                      <span className="text-xs font-medium">
                        {metric.changePercent !== undefined 
                          ? `${metric.changePercent > 0 ? '+' : ''}${metric.changePercent.toFixed(2)}%`
                          : `${metric.change > 0 ? '+' : ''}${metric.change.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}