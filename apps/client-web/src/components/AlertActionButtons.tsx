import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Eye, 
  MoreHorizontal, 
  Pause, 
  Play, 
  Copy, 
  Trash2, 
  TestTube, 
  BarChart3,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';
import { smartRoutingEngine } from '@/services/smartRouting';
import type { AdvancedAlert, AlertTrigger } from '@/types/advancedAlerts';

interface AlertActionButtonsProps {
  alert: AdvancedAlert;
  trigger?: AlertTrigger;
  onView?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onBacktest?: () => void;
  onAnalytics?: () => void;
  onSnooze?: (minutes: number) => void;
  compact?: boolean;
  className?: string;
}

export function AlertActionButtons({ 
  alert, 
  trigger, 
  onView, 
  onPause, 
  onResume, 
  onDuplicate, 
  onDelete, 
  onBacktest, 
  onAnalytics, 
  onSnooze,
  compact = false,
  className = '' 
}: AlertActionButtonsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAcknowledge = async () => {
    if (!trigger) return;
    
    setLoading(true);
    try {
      await smartRoutingEngine.acknowledgeAlert(trigger.id);
      onView?.();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async (minutes: number) => {
    setLoading(true);
    try {
      await smartRoutingEngine.snoozeAlert(alert.id, minutes);
      onSnooze?.(minutes);
      setSnoozeDialogOpen(false);
    } catch (error) {
      console.error('Failed to snooze alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      onDelete?.();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPaused = alert.status === 'paused';
  const isTriggered = alert.status === 'triggered';

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* Status Badge */}
        <Badge variant={
          alert.status === 'active' ? 'default' :
          alert.status === 'paused' ? 'secondary' :
          alert.status === 'triggered' ? 'destructive' : 'outline'
        }>
          {alert.status}
        </Badge>

        {/* Quick Actions */}
        {trigger && !trigger.viewed_at && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleAcknowledge}
            disabled={loading}
          >
            <Eye className="w-3 h-3" />
          </Button>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPaused ? (
              <DropdownMenuItem onClick={onResume}>
                <Play className="w-4 h-4 mr-2" />
                Resume Alert
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onPause}>
                <Pause className="w-4 h-4 mr-2" />
                Pause Alert
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setSnoozeDialogOpen(true)}>
              <Clock className="w-4 h-4 mr-2" />
              Snooze...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBacktest}>
              <TestTube className="w-4 h-4 mr-2" />
              Backtest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAnalytics}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Snooze Dialog */}
        <AlertDialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Snooze Alert</AlertDialogTitle>
              <AlertDialogDescription>
                How long would you like to pause "{alert.name}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-2 my-4">
              <Button variant="outline" onClick={() => handleSnooze(15)}>
                15 minutes
              </Button>
              <Button variant="outline" onClick={() => handleSnooze(60)}>
                1 hour
              </Button>
              <Button variant="outline" onClick={() => handleSnooze(240)}>
                4 hours
              </Button>
              <Button variant="outline" onClick={() => handleSnooze(1440)}>
                24 hours
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Alert</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{alert.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Alert'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Full action buttons layout
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Primary Actions */}
      {trigger && !trigger.viewed_at && (
        <Button 
          variant="default" 
          size="sm"
          onClick={handleAcknowledge}
          disabled={loading}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Alert
        </Button>
      )}

      {isPaused ? (
        <Button variant="outline" size="sm" onClick={onResume}>
          <Play className="w-4 h-4 mr-2" />
          Resume
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onPause}>
          <Pause className="w-4 h-4 mr-2" />
          Pause
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onBacktest}>
        <TestTube className="w-4 h-4 mr-2" />
        Backtest
      </Button>

      {/* Secondary Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSnoozeDialogOpen(true)}>
            <Clock className="w-4 h-4 mr-2" />
            Snooze Alert
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate Alert
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAnalytics}>
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Alert
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Snooze Dialog */}
      <AlertDialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Snooze Alert</AlertDialogTitle>
            <AlertDialogDescription>
              How long would you like to pause "{alert.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2 my-4">
            <Button variant="outline" onClick={() => handleSnooze(15)}>
              15 minutes
            </Button>
            <Button variant="outline" onClick={() => handleSnooze(60)}>
              1 hour
            </Button>
            <Button variant="outline" onClick={() => handleSnooze(240)}>
              4 hours
            </Button>
            <Button variant="outline" onClick={() => handleSnooze(1440)}>
              24 hours
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{alert.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Alert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}