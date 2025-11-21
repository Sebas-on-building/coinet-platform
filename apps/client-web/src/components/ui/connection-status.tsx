import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'degraded';

export function ConnectionStatus({ className, showDetails = true }: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [lastConnected, setLastConnected] = useState<Date>(new Date());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Simulate connection state changes for demo
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState('connected');
      setLastConnected(new Date());
      setReconnectAttempts(0);
    };

    const handleOffline = () => {
      setConnectionState('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetryConnection = () => {
    setConnectionState('reconnecting');
    setReconnectAttempts(prev => prev + 1);
    
    // Simulate reconnection attempt
    setTimeout(() => {
      if (navigator.onLine) {
        setConnectionState('connected');
        setLastConnected(new Date());
        setReconnectAttempts(0);
      } else {
        setConnectionState('disconnected');
      }
    }, 2000);
  };

  const getStatusConfig = (state: ConnectionState) => {
    switch (state) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          variant: 'default' as const,
          description: 'Real-time data active',
          className: 'bg-success/10 text-success border-success/20'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Offline',
          variant: 'destructive' as const,
          description: 'No connection to servers',
          className: ''
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          label: 'Reconnecting',
          variant: 'secondary' as const,
          description: `Attempt ${reconnectAttempts + 1}`,
          className: ''
        };
      case 'degraded':
        return {
          icon: Clock,
          label: 'Slow Connection',
          variant: 'outline' as const,
          description: 'Data may be delayed',
          className: 'bg-warning/10 text-warning-foreground border-warning/20'
        };
    }
  };

  const config = getStatusConfig(connectionState);
  const Icon = config.icon;

  if (!showDetails && connectionState === 'connected') {
    return null; // Hide when connected and not showing details
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Badge 
        variant={config.variant}
        className={cn(
          "flex items-center gap-2 px-3 py-1",
          connectionState === 'reconnecting' && "animate-pulse",
          config.className
        )}
      >
        <Icon className={cn(
          "w-3 h-3",
          connectionState === 'reconnecting' && "animate-spin"
        )} />
        {config.label}
      </Badge>

      {showDetails && (
        <div className="text-xs text-muted-foreground">
          {config.description}
        </div>
      )}

      {connectionState === 'disconnected' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetryConnection}
          className="text-xs h-7"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Compact version for header/status bar
export function ConnectionIndicator() {
  return (
    <ConnectionStatus 
      showDetails={false}
      className="fixed top-4 right-4 z-50"
    />
  );
}

// Full status panel for settings or info areas
export function ConnectionPanel() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="coinet-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Connection Status</h3>
        <ConnectionStatus showDetails={false} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Last Updated</div>
          <div className="font-medium">{formatTime(lastUpdated)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Data Source</div>
          <div className="font-medium">Real-time API</div>
        </div>
        <div>
          <div className="text-muted-foreground">Latency</div>
          <div className="font-medium">~150ms</div>
        </div>
        <div>
          <div className="text-muted-foreground">Server Region</div>
          <div className="font-medium">US East</div>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Market data updates every 5 seconds during trading hours
        </div>
      </div>
    </div>
  );
}