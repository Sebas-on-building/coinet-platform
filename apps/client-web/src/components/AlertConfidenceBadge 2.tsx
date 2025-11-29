import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface AlertConfidenceBadgeProps {
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

export function AlertConfidenceBadge({ 
  confidence, 
  trend, 
  size = 'md', 
  showTrend = true,
  className = '' 
}: AlertConfidenceBadgeProps) {
  const confidencePercent = Math.round(confidence * 100);
  
  const getConfidenceVariant = () => {
    if (confidence >= 0.8) return 'destructive'; // High confidence (critical)
    if (confidence >= 0.6) return 'default';     // Medium confidence (warning)
    if (confidence >= 0.4) return 'secondary';   // Low confidence (info)
    return 'outline';                            // Very low confidence
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-red-600 dark:text-red-400';
    if (confidence >= 0.6) return 'text-orange-600 dark:text-orange-400';
    if (confidence >= 0.4) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTrendIcon = () => {
    if (!showTrend || !trend) return null;
    
    const iconProps = { className: "w-3 h-3 ml-1" };
    
    switch (trend) {
      case 'up':
        return <TrendingUp {...iconProps} className={`${iconProps.className} text-green-500`} />;
      case 'down':
        return <TrendingDown {...iconProps} className={`${iconProps.className} text-red-500`} />;
      case 'stable':
        return <Minus {...iconProps} className={`${iconProps.className} text-gray-500`} />;
      default:
        return null;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">Confidence Analysis</div>
      <div className="text-sm text-muted-foreground">
        <div>Score: {confidencePercent}%</div>
        <div>Level: {getConfidenceLabel()}</div>
        {trend && (
          <div className="flex items-center mt-1">
            Trend: {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
            {getTrendIcon()}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <div>• High (80%+): Strong signal quality</div>
        <div>• Medium (60-79%): Good signal quality</div>
        <div>• Low (40-59%): Weak signal quality</div>
        <div>• Very Low (&lt;40%): Poor signal quality</div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getConfidenceVariant()}
            className={`
              ${getSizeClasses()} 
              ${getConfidenceColor()} 
              font-medium 
              inline-flex 
              items-center 
              cursor-help 
              transition-all 
              hover:scale-105
              ${className}
            `}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {confidencePercent}%
            {getTrendIcon()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}