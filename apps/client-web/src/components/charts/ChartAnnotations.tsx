import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';
import {
  Pen,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Target,
  X,
  Check,
  AlertCircle,
  Info,
  Sparkles,
  Trash2,
  Edit2
} from 'lucide-react';

export interface ChartAnnotation {
  id: string;
  type: 'line' | 'arrow' | 'text' | 'alert' | 'pattern' | 'target';
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  text?: string;
  color?: string;
  timestamp: number;
  createdAt: Date;
}

interface ChartAnnotationsProps {
  annotations: ChartAnnotation[];
  onAnnotationAdd: (annotation: Omit<ChartAnnotation, 'id' | 'createdAt'>) => void;
  onAnnotationRemove: (id: string) => void;
  onAnnotationUpdate: (id: string, updates: Partial<ChartAnnotation>) => void;
  enabled: boolean;
  onToggle: () => void;
}

export function ChartAnnotations({
  annotations,
  onAnnotationAdd,
  onAnnotationRemove,
  onAnnotationUpdate,
  enabled,
  onToggle
}: ChartAnnotationsProps) {
  const [activeTool, setActiveTool] = useState<ChartAnnotation['type'] | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [showAnnotationsList, setShowAnnotationsList] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);

  const tools = [
    { type: 'line' as const, icon: TrendingUp, label: 'Trend Line', color: 'text-blue-500' },
    { type: 'arrow' as const, icon: TrendingDown, label: 'Arrow', color: 'text-purple-500' },
    { type: 'text' as const, icon: MessageSquare, label: 'Text Note', color: 'text-green-500' },
    { type: 'alert' as const, icon: AlertCircle, label: 'Alert', color: 'text-orange-500' },
    { type: 'pattern' as const, icon: Sparkles, label: 'Pattern', color: 'text-pink-500' },
    { type: 'target' as const, icon: Target, label: 'Target', color: 'text-cyan-500' },
  ];

  const handleToolSelect = (toolType: ChartAnnotation['type']) => {
    triggerHaptic('light');
    if (activeTool === toolType) {
      setActiveTool(null);
    } else {
      setActiveTool(toolType);
    }
  };

  const handleAddAnnotation = useCallback((x: number, y: number, type: ChartAnnotation['type']) => {
    triggerHaptic('medium');
    const annotation: Omit<ChartAnnotation, 'id' | 'createdAt'> = {
      type,
      x,
      y,
      timestamp: Date.now(),
      text: annotationText || undefined,
      color: tools.find(t => t.type === type)?.color
    };
    onAnnotationAdd(annotation);
    setAnnotationText('');
    setActiveTool(null);
  }, [annotationText, onAnnotationAdd, tools]);

  const handleDeleteAnnotation = (id: string) => {
    triggerHaptic('medium');
    onAnnotationRemove(id);
  };

  const handleEditAnnotation = (id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (annotation?.text) {
      setAnnotationText(annotation.text);
      setEditingAnnotation(id);
    }
  };

  const handleUpdateAnnotation = () => {
    if (editingAnnotation) {
      onAnnotationUpdate(editingAnnotation, { text: annotationText });
      setAnnotationText('');
      setEditingAnnotation(null);
      triggerHaptic('success');
    }
  };

  const groupedAnnotations = annotations.reduce((acc, annotation) => {
    if (!acc[annotation.type]) acc[annotation.type] = [];
    acc[annotation.type].push(annotation);
    return acc;
  }, {} as Record<ChartAnnotation['type'], ChartAnnotation[]>);

  return (
    <div className="flex items-center gap-2">
      {/* Annotation Tools */}
      <div className="flex items-center gap-1 p-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50">
        <Button
          variant={enabled ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            onToggle();
            triggerHaptic('light');
          }}
          className="h-8 w-8 p-0"
        >
          <Pen className="w-4 h-4" />
        </Button>

        {enabled && (
          <>
            <div className="w-px h-6 bg-border" />
            {tools.map((tool) => (
              <Button
                key={tool.type}
                variant={activeTool === tool.type ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleToolSelect(tool.type)}
                className={cn("h-8 w-8 p-0", activeTool === tool.type && "ring-2 ring-primary/20")}
                title={tool.label}
              >
                <tool.icon className={cn("w-4 h-4", tool.color)} />
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Text Input for Annotations */}
      {enabled && (activeTool === 'text' || activeTool === 'alert' || editingAnnotation) && (
        <div className="flex items-center gap-2 p-2 bg-background/95 backdrop-blur-sm rounded-lg border border-border/50">
          <Input
            placeholder={editingAnnotation ? "Update annotation..." : "Add annotation text..."}
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            className="h-8 w-48 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editingAnnotation) {
                handleUpdateAnnotation();
              }
            }}
          />
          {editingAnnotation ? (
            <>
              <Button
                size="sm"
                onClick={handleUpdateAnnotation}
                className="h-8 w-8 p-0"
                disabled={!annotationText}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAnnotationText('');
                  setEditingAnnotation(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="text-xs">
              Click chart to place
            </Badge>
          )}
        </div>
      )}

      {/* Annotations List */}
      {annotations.length > 0 && (
        <Popover open={showAnnotationsList} onOpenChange={setShowAnnotationsList}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Info className="w-4 h-4 mr-1" />
              {annotations.length}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Chart Annotations</h4>
                <Badge variant="secondary">{annotations.length}</Badge>
              </div>
              
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {Object.entries(groupedAnnotations).map(([type, typeAnnotations]) => {
                    const tool = tools.find(t => t.type === type);
                    if (!tool) return null;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <tool.icon className={cn("w-3 h-3", tool.color)} />
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {tool.label}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {typeAnnotations.length}
                          </Badge>
                        </div>
                        
                        {typeAnnotations.map((annotation) => (
                          <div
                            key={annotation.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              {annotation.text && (
                                <p className="text-sm truncate">{annotation.text}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(annotation.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditAnnotation(annotation.id)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive"
                                onClick={() => handleDeleteAnnotation(annotation.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Active Tool Indicator */}
      {activeTool && (
        <Badge variant="secondary" className="text-xs">
          Drawing: {tools.find(t => t.type === activeTool)?.label}
        </Badge>
      )}
    </div>
  );
}

// Hook for managing annotations
export function useChartAnnotations() {
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [enabled, setEnabled] = useState(false);

  const addAnnotation = useCallback((annotation: Omit<ChartAnnotation, 'id' | 'createdAt'>) => {
    const newAnnotation: ChartAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    return newAnnotation;
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<ChartAnnotation>) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  return {
    annotations,
    enabled,
    setEnabled,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    clearAnnotations,
  };
}
