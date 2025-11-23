import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LiveRegionProps {
  className?: string;
}

export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(
  ({ className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("sr-only", className)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    );
  }
);

LiveRegion.displayName = 'LiveRegion';
