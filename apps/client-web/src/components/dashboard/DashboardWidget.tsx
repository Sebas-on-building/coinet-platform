import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  GripVertical,
  MoreVertical,
  Maximize2,
  Minimize2,
  Settings,
  X,
  RefreshCw,
  Pin,
  PinOff,
} from 'lucide-react';

export interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  config?: Record<string, any>;
  pinned?: boolean;
  refreshInterval?: number;
}

interface DashboardWidgetProps {
  widget: Widget;
  children: ReactNode;
  onRemove?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onResize?: (size: { w: number; h: number }) => void;
  onPin?: (pinned: boolean) => void;
  dragHandleProps?: any;
  isResizing?: boolean;
  className?: string;
}

export function DashboardWidget({
  widget,
  children,
  onRemove,
  onRefresh,
  onSettings,
  onResize,
  onPin,
  dragHandleProps,
  isResizing,
  className,
}: DashboardWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    triggerHaptic('light');
    
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    triggerHaptic('light');
    
    if (!isExpanded) {
      onResize?.({ w: 12, h: 8 });
    } else {
      onResize?.({ w: widget.size.w, h: widget.size.h });
    }
  };

  const handlePin = () => {
    const newPinned = !widget.pinned;
    onPin?.(newPinned);
    triggerHaptic('light');
  };

  return (
    <Card
      className={cn(
        'relative group overflow-hidden transition-all duration-200',
        isResizing && 'ring-2 ring-primary/20',
        widget.pinned && 'border-primary/50',
        isExpanded && 'col-span-full row-span-full z-10',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle */}
            <div
              {...dragHandleProps}
              className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <CardTitle className="text-sm font-medium truncate">
              {widget.title}
            </CardTitle>
            
            {widget.pinned && (
              <Pin className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>

          {/* Widget Controls */}
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn('w-3 h-3', isRefreshing && 'animate-spin')}
                />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExpand}>
                  {isExpanded ? (
                    <>
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Minimize
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Expand
                    </>
                  )}
                </DropdownMenuItem>
                
                {onPin && (
                  <DropdownMenuItem onClick={handlePin}>
                    {widget.pinned ? (
                      <>
                        <PinOff className="w-4 h-4 mr-2" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 mr-2" />
                        Pin Widget
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                
                {onSettings && (
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                {onRemove && (
                  <DropdownMenuItem
                    onClick={() => {
                      onRemove();
                      triggerHaptic('medium');
                    }}
                    className="text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {children}
      </CardContent>

      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-border">
          {widget.size.w} × {widget.size.h}
        </div>
      )}
    </Card>
  );
}

// Pre-built widget types
export const widgetTypes = {
  chart: {
    id: 'chart',
    name: 'Price Chart',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
  },
  metrics: {
    id: 'metrics',
    name: 'Key Metrics',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
  },
  alerts: {
    id: 'alerts',
    name: 'Active Alerts',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 6 },
  },
  agents: {
    id: 'agents',
    name: 'Trading Agents',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 6 },
  },
  volume: {
    id: 'volume',
    name: 'Volume Analysis',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 6, h: 4 },
  },
  heatmap: {
    id: 'heatmap',
    name: 'Market Heatmap',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 6 },
  },
  news: {
    id: 'news',
    name: 'Market News',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 8 },
  },
  performance: {
    id: 'performance',
    name: 'Performance',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
  },
};
