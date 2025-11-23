import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardWidget, Widget, widgetTypes } from './DashboardWidget';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  Plus,
  Layout,
  Grid3x3,
  Save,
  RotateCcw,
  TrendingUp,
  Bell,
  Zap,
  BarChart3,
  Activity,
  Newspaper,
} from 'lucide-react';

interface CustomDashboardProps {
  className?: string;
}

const widgetIcons = {
  chart: TrendingUp,
  metrics: BarChart3,
  alerts: Bell,
  agents: Zap,
  volume: Activity,
  heatmap: Grid3x3,
  news: Newspaper,
  performance: TrendingUp,
};

export function CustomDashboard({ className }: CustomDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: '1',
      type: 'chart',
      title: 'BTC/USD',
      position: { x: 0, y: 0 },
      size: { w: 6, h: 4 },
    },
    {
      id: '2',
      type: 'metrics',
      title: 'Key Metrics',
      position: { x: 6, y: 0 },
      size: { w: 3, h: 2 },
    },
    {
      id: '3',
      type: 'alerts',
      title: 'Active Alerts',
      position: { x: 9, y: 0 },
      size: { w: 3, h: 2 },
    },
  ]);
  
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleAddWidget = (typeId: string) => {
    const widgetType = widgetTypes[typeId as keyof typeof widgetTypes];
    if (!widgetType) return;

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: typeId,
      title: widgetType.name,
      position: { x: 0, y: widgets.length * 2 },
      size: widgetType.defaultSize,
    };

    setWidgets(prev => [...prev, newWidget]);
    setIsAddingWidget(false);
    triggerHaptic('success');
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    triggerHaptic('medium');
  };

  const handleWidgetResize = (id: string, size: { w: number; h: number }) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, size } : w))
    );
  };

  const handleWidgetPin = (id: string, pinned: boolean) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, pinned } : w))
    );
  };

  const handleRefresh = async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    triggerHaptic('success');
  };

  const handleSaveLayout = () => {
    localStorage.setItem('dashboard-layout', JSON.stringify(widgets));
    triggerHaptic('success');
  };

  const handleResetLayout = () => {
    localStorage.removeItem('dashboard-layout');
    // Reset to default layout
    setWidgets([
      {
        id: '1',
        type: 'chart',
        title: 'BTC/USD',
        position: { x: 0, y: 0 },
        size: { w: 6, h: 4 },
      },
      {
        id: '2',
        type: 'metrics',
        title: 'Key Metrics',
        position: { x: 6, y: 0 },
        size: { w: 3, h: 2 },
      },
    ]);
    triggerHaptic('medium');
  };

  const renderWidgetContent = (widget: Widget) => {
    // This would render actual widget content based on type
    return (
      <div className="flex items-center justify-center h-full min-h-[150px] text-muted-foreground">
        <div className="text-center">
          {(() => {
            const Icon = widgetIcons[widget.type as keyof typeof widgetIcons];
            return Icon ? <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" /> : null;
          })()}
          <p className="text-sm">
            {widget.type === 'chart' && 'Chart Widget'}
            {widget.type === 'metrics' && 'Metrics Widget'}
            {widget.type === 'alerts' && 'Alerts Widget'}
            {widget.type === 'agents' && 'Agents Widget'}
            {widget.type === 'volume' && 'Volume Widget'}
            {widget.type === 'heatmap' && 'Heatmap Widget'}
            {widget.type === 'news' && 'News Widget'}
            {widget.type === 'performance' && 'Performance Widget'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Content coming soon
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Custom Dashboard</h2>
          <Badge variant="secondary">{widgets.length} widgets</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveLayout}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Layout
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Dialog open={isAddingWidget} onOpenChange={setIsAddingWidget}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
                <DialogDescription>
                  Choose a widget to add to your dashboard
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(widgetTypes).map(([key, widget]) => {
                    const Icon = widgetIcons[key as keyof typeof widgetIcons];
                    return (
                      <button
                        key={key}
                        onClick={() => handleAddWidget(key)}
                        className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary transition-all hover:scale-105"
                      >
                        {Icon && <Icon className="w-8 h-8 text-primary" />}
                        <div className="text-center">
                          <p className="font-medium text-sm">{widget.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {widget.defaultSize.w}×{widget.defaultSize.h}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Grid with Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="grid grid-cols-12 gap-4 auto-rows-[100px]">
          {widgets
            .sort((a, b) => (a.pinned ? -1 : b.pinned ? 1 : 0))
            .map((widget) => (
              <div
                key={widget.id}
                className={cn(
                  'transition-all duration-200',
                  `col-span-${widget.size.w}`,
                  `row-span-${widget.size.h}`
                )}
                style={{
                  gridColumn: `span ${widget.size.w}`,
                  gridRow: `span ${widget.size.h}`,
                }}
              >
                <DashboardWidget
                  widget={widget}
                  onRemove={() => handleRemoveWidget(widget.id)}
                  onRefresh={handleRefresh}
                  onResize={(size) => handleWidgetResize(widget.id, size)}
                  onPin={(pinned) => handleWidgetPin(widget.id, pinned)}
                  className="h-full"
                >
                  {renderWidgetContent(widget)}
                </DashboardWidget>
              </div>
            ))}
        </div>

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <Layout className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Widgets Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start building your custom dashboard by adding widgets
            </p>
            <Button onClick={() => setIsAddingWidget(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
