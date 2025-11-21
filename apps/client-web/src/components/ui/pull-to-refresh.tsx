import { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const touchStartRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        touchStartRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartRef.current === 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartRef.current;

      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(dampedDistance);
        
        if (dampedDistance >= threshold && !canRefresh) {
          setCanRefresh(true);
          triggerHaptic('medium');
        } else if (dampedDistance < threshold && canRefresh) {
          setCanRefresh(false);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (canRefresh && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic('heavy');
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setCanRefresh(false);
        }
      }
      
      setPullDistance(0);
      touchStartRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, isRefreshing, canRefresh, disabled]);

  const refreshOpacity = Math.min(pullDistance / threshold, 1);
  const refreshRotation = (pullDistance / threshold) * 360;

  return (
    <div ref={containerRef} className={cn('relative overflow-auto h-full', className)}>
      {/* Pull to refresh indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
        style={{
          transform: `translateY(${Math.max(pullDistance - 40, 0)}px)`,
          opacity: refreshOpacity,
          height: '40px',
        }}
      >
        <div className={cn(
          'flex items-center gap-2 text-sm font-medium text-muted-foreground',
          canRefresh && 'text-primary',
          isRefreshing && 'animate-pulse'
        )}>
          <RefreshCw
            className={cn('w-5 h-5', isRefreshing && 'animate-spin')}
            style={{
              transform: !isRefreshing ? `rotate(${refreshRotation}deg)` : undefined,
            }}
          />
          {isRefreshing ? 'Refreshing...' : canRefresh ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
