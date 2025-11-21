import React, { useState, useEffect } from "react";
import { X, Bell, BellRing, CheckCircle, AlertTriangle, Info, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertHistory } from "@/types/alerts";
import { useAlerts } from "@/hooks/useAlerts";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  message: string;
  type: "info" | "warning" | "success" | "critical";
  timestamp: number;
  read: boolean;
  priority: Alert["priority"];
  aiContext?: {
    reasoning?: string;
    recommendedAction?: string;
  };
}

interface AlertNotificationCenterProps {
  showNotifications?: boolean;
  onClose?: () => void;
}

export function AlertNotificationCenter({ showNotifications: externalShowNotifications = false, onClose }: AlertNotificationCenterProps = {}) {
  const { alerts, alertHistory, provideFeedback } = useAlerts();
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('coinet-sound-enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const isMobile = useIsMobile();

  // Mock function to simulate real-time alert evaluation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate market data
      const mockMarketData = {
        price: 45000 + Math.random() * 10000,
        volume: 1000000 + Math.random() * 500000,
        sentiment: (Math.random() - 0.5) * 2,
        volume_change_24h: (Math.random() - 0.5) * 200,
      };

      // In a real implementation, this would come from the useAlerts hook
      // For demo purposes, we'll occasionally trigger notifications
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        addNotification({
          id: crypto.randomUUID(),
          alertId: "demo-alert",
          alertName: "Bitcoin Price Alert",
          message: `BTC price reached $${mockMarketData.price.toFixed(0)}`,
          type: mockMarketData.price > 50000 ? "success" : "warning",
          timestamp: Date.now(),
          read: false,
          priority: mockMarketData.price > 55000 ? "high" : "medium",
          aiContext: {
            reasoning: "Price movement detected based on your alert conditions",
            recommendedAction: mockMarketData.price > 50000 ? "Consider taking profits" : "Monitor for further dips",
          },
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (notification: AlertNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Play sound if enabled
    if (soundEnabled) {
      playNotificationSound(notification.type);
    }

    // Show toast for high/critical priority
    if (notification.priority === "high" || notification.priority === "critical") {
      toast({
        title: notification.alertName,
        description: notification.message,
        variant: notification.type === "critical" ? "destructive" : "default",
      });
    }
  };

  const playNotificationSound = (type: AlertNotification["type"]) => {
    if (!('AudioContext' in window)) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different alert types
    switch (type) {
      case "critical":
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case "warning":
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        break;
      case "success":
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        break;
      default:
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(notif => !notif.read).length;

  const getNotificationIcon = (type: AlertNotification["type"]) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: AlertNotification["type"]) => {
    switch (type) {
      case "critical":
        return "border-red-500/20 bg-red-500/5";
      case "warning":
        return "border-orange-500/20 bg-orange-500/5";
      case "success":
        return "border-green-500/20 bg-green-500/5";
      default:
        return "border-blue-500/20 bg-blue-500/5";
    }
  };

  return (
    <>
      {/* Notification Panel */}
      {externalShowNotifications && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-background/20 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Panel */}
          <div className={`fixed z-50 bg-card/95 backdrop-blur-md border border-border/30 rounded-lg shadow-lg animate-fade-in ${
            isMobile 
              ? "bottom-0 left-2 right-2 max-h-[60vh] rounded-b-none" 
              : "top-16 right-4 w-96 max-h-96"
          }`}>
            <div className={`border-b border-border/20 ${isMobile ? "p-3" : "p-4"}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${isMobile ? "text-sm" : ""}`}>Alert Notifications</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className={`${isMobile ? "text-xs px-2" : "text-xs"}`}
                    >
                      {isMobile ? "Read" : "Mark all read"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className={`${isMobile ? "text-xs px-2" : "text-xs"}`}
                  >
                    {isMobile ? "Clear" : "Clear all"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={`overflow-y-auto ${isMobile ? "max-h-[calc(60vh-4rem)]" : "max-h-80"}`}>
              {notifications.length === 0 ? (
                <div className={`text-center text-muted-foreground ${isMobile ? "p-4" : "p-8"}`}>
                  <Bell className={`mx-auto mb-2 opacity-50 ${isMobile ? "h-6 w-6" : "h-8 w-8"}`} />
                  <p className={isMobile ? "text-sm" : ""}>No notifications yet</p>
                  <p className="text-xs">You'll see alert notifications here when they trigger</p>
                </div>
              ) : (
                <div className={`space-y-1 ${isMobile ? "p-1" : "p-2"}`}>
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        getNotificationColor(notification.type)
                      } ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className={isMobile ? "p-2" : "p-3"}>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-2 ${isMobile ? "mb-0.5" : "mb-1"}`}>
                              <h4 className={`font-medium truncate ${isMobile ? "text-xs" : "text-sm"}`}>
                                {notification.alertName}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`${isMobile ? "text-xs px-1 py-0 h-4" : "text-xs"} ${
                                  notification.priority === "critical" ? "border-red-500 text-red-700" :
                                  notification.priority === "high" ? "border-orange-500 text-orange-700" :
                                  "border-gray-500 text-gray-700"
                                }`}
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            
                            <p className={`text-muted-foreground ${isMobile ? "text-xs mb-1" : "text-sm mb-2"}`}>
                              {notification.message}
                            </p>
                            
                            {notification.aiContext?.reasoning && (
                              <div className={`p-1.5 bg-primary/5 rounded border border-primary/20 ${isMobile ? "mb-1" : "mb-2"}`}>
                                <p className={`text-primary font-medium ${isMobile ? "text-xs mb-0.5" : "mb-1"}`}>AI Insight:</p>
                                <p className={`text-muted-foreground ${isMobile ? "text-xs" : ""}`}>
                                  {isMobile 
                                    ? notification.aiContext.reasoning.length > 80 
                                      ? notification.aiContext.reasoning.substring(0, 80) + "..." 
                                      : notification.aiContext.reasoning
                                    : notification.aiContext.reasoning
                                  }
                                </p>
                                {notification.aiContext.recommendedAction && (
                                  <p className={`text-primary ${isMobile ? "text-xs mt-0.5" : "mt-1"}`}>
                                    💡 {isMobile 
                                      ? notification.aiContext.recommendedAction.length > 60 
                                        ? notification.aiContext.recommendedAction.substring(0, 60) + "..." 
                                        : notification.aiContext.recommendedAction
                                      : notification.aiContext.recommendedAction
                                    }
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className={`flex items-center justify-between text-muted-foreground ${isMobile ? "text-xs" : "text-xs"}`}>
                              <span>{formatDistanceToNow(notification.timestamp)} ago</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification.id);
                                }}
                                className={`p-0 hover:text-red-500 ${isMobile ? "h-3 w-3" : "h-4 w-4"}`}
                              >
                                <X className={isMobile ? "h-2.5 w-2.5" : "h-3 w-3"} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}