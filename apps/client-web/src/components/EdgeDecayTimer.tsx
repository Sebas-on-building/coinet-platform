import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface EdgeDecayTimerProps {
  initialMinutes: number;
  startTime: string; // ISO timestamp
  onExpire?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export function EdgeDecayTimer({ 
  initialMinutes, 
  startTime, 
  onExpire, 
  size = 'md', 
  showProgress = true,
  className = '' 
}: EdgeDecayTimerProps) {
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = now - start;
      const totalDuration = initialMinutes * 60 * 1000; // Convert to milliseconds
      const remaining = Math.max(0, totalDuration - elapsed);
      
      const remainingMins = Math.ceil(remaining / (60 * 1000));
      const progressPercent = (remaining / totalDuration) * 100;
      
      setRemainingMinutes(remainingMins);
      setProgress(Math.max(0, progressPercent));
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every 30 seconds
    const interval = setInterval(updateTimer, 30000);
    
    return () => clearInterval(interval);
  }, [initialMinutes, startTime, isExpired, onExpire]);

  const getTimerVariant = () => {
    if (isExpired) return 'outline';
    if (progress <= 25) return 'destructive';
    if (progress <= 50) return 'secondary';
    return 'default';
  };

  const getTimerColor = () => {
    if (isExpired) return 'text-gray-500';
    if (progress <= 25) return 'text-red-600 dark:text-red-400';
    if (progress <= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    if (progress <= 25) return 'bg-red-500';
    if (progress <= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const formatTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getUrgencyLevel = () => {
    if (isExpired) return 'Expired';
    if (progress <= 25) return 'Critical';
    if (progress <= 50) return 'Medium';
    return 'High';
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

  const getIcon = () => {
    if (isExpired) return <CheckCircle className="w-3 h-3 mr-1" />;
    if (progress <= 25) return <AlertCircle className="w-3 h-3 mr-1" />;
    return <Clock className="w-3 h-3 mr-1" />;
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-medium">Edge Decay Analysis</div>
      <div className="text-sm text-muted-foreground">
        <div>Initial Duration: {formatTime(initialMinutes)}</div>
        <div>Time Remaining: {formatTime(remainingMinutes)}</div>
        <div>Progress: {Math.round(progress)}%</div>
        <div>Urgency: {getUrgencyLevel()}</div>
      </div>
      {showProgress && !isExpired && (
        <div className="pt-2">
          <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>
          <Progress 
            value={progress} 
            className="h-2 w-full"
            style={{
              background: 'var(--muted)',
            }}
          />
        </div>
      )}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {isExpired 
          ? 'This opportunity window has closed'
          : 'Alpha edge expected to decay over this timeframe'
        }
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex flex-col items-center space-y-1 ${className}`}>
            <Badge 
              variant={getTimerVariant()}
              className={`
                ${getSizeClasses()} 
                ${getTimerColor()} 
                font-medium 
                inline-flex 
                items-center 
                cursor-help 
                transition-all 
                hover:scale-105
                ${isExpired ? 'opacity-60' : ''}
              `}
            >
              {getIcon()}
              {isExpired ? 'Expired' : formatTime(remainingMinutes)}
            </Badge>
            
            {showProgress && !isExpired && (
              <div className="w-full max-w-[60px]">
                <Progress 
                  value={progress} 
                  className="h-1 w-full"
                  style={{
                    background: 'var(--muted)',
                  }}
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Utility hook for managing multiple edge timers
export function useEdgeTimers() {
  const [timers, setTimers] = useState<Map<string, EdgeTimerState>>(new Map());

  const addTimer = (id: string, minutes: number, startTime: string) => {
    setTimers(prev => new Map(prev).set(id, {
      id,
      initialMinutes: minutes,
      startTime,
      isExpired: false
    }));
  };

  const removeTimer = (id: string) => {
    setTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const expireTimer = (id: string) => {
    setTimers(prev => {
      const newMap = new Map(prev);
      const timer = newMap.get(id);
      if (timer) {
        newMap.set(id, { ...timer, isExpired: true });
      }
      return newMap;
    });
  };

  const getActiveTimers = () => {
    return Array.from(timers.values()).filter(timer => !timer.isExpired);
  };

  const getExpiredTimers = () => {
    return Array.from(timers.values()).filter(timer => timer.isExpired);
  };

  return {
    timers: Array.from(timers.values()),
    addTimer,
    removeTimer,
    expireTimer,
    getActiveTimers,
    getExpiredTimers
  };
}

interface EdgeTimerState {
  id: string;
  initialMinutes: number;
  startTime: string;
  isExpired: boolean;
}