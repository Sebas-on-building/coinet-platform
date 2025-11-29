import React from "react";
import { 
  Bell, 
  Edit2, 
  Trash2, 
  Copy, 
  TrendingUp, 
  Brain,
  Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert } from "@/types/alerts";
import { formatDistanceToNow } from "date-fns";

interface AlertListProps {
  alerts: Alert[];
  onUpdate: (id: string, updates: Partial<Alert>) => void;
  onDelete: (id: string) => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function AlertList({ alerts, onUpdate, onDelete, onRefresh, loading }: AlertListProps) {
  const isMobile = useIsMobile();
  
  const handleToggleStatus = (alert: Alert) => {
    const newStatus = alert.status === "active" ? "paused" : "active";
    onUpdate(alert.id, { status: newStatus });
  };

  const handleDuplicate = (alert: Alert) => {
    console.log("Duplicate alert:", alert.id);
  };

  const getTypeIcon = (type: Alert["type"]) => {
    switch (type) {
      case "price":
        return <TrendingUp className="h-4 w-4" />;
      case "ai_insight":
        return <Brain className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const alertsContent = (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <Card 
          key={alert.id} 
          className="group hover:border-primary/30 transition-all duration-200 border-border/50 animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors flex-shrink-0">
                {getTypeIcon(alert.type)}
              </div>
              
              {/* Alert Info - Flex Grow */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {alert.name}
                  </h3>
                  {alert.aiContext && (
                    <Brain className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="truncate">{alert.description}</span>
                  <span className="text-xs whitespace-nowrap">•</span>
                  <span className="text-xs whitespace-nowrap">
                    {alert.trigger.conditions.length} condition{alert.trigger.conditions.length !== 1 ? 's' : ''}
                  </span>
                  {alert.triggerCount > 0 && (
                    <>
                      <span className="text-xs whitespace-nowrap">•</span>
                      <span className="text-xs whitespace-nowrap">{alert.triggerCount} triggers</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={getPriorityColor(alert.priority)} className="capitalize">
                  {alert.priority}
                </Badge>
                {alert.lastTriggered && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(alert.lastTriggered, { addSuffix: true })}
                  </div>
                )}
              </div>
              
              {/* Actions - Visible on Hover */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Switch
                  checked={alert.status === "active"}
                  onCheckedChange={() => handleToggleStatus(alert)}
                  className="data-[state=checked]:bg-primary"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-accent"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-accent"
                  onClick={() => handleDuplicate(alert)}
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(alert.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Wrap with pull-to-refresh on mobile
  if (isMobile && onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        {alertsContent}
      </PullToRefresh>
    );
  }

  return alertsContent;
}
