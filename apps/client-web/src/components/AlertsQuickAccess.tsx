import React from "react";
import { Bell, Plus, TrendingUp, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AlertsQuickAccess() {
  const quickAlerts = [
    {
      id: "btc-price",
      name: "Bitcoin Price Alert",
      description: "Monitor BTC for significant moves",
      icon: TrendingUp,
      color: "text-orange-500",
      gradient: "from-orange-500/10 to-orange-500/5",
    },
    {
      id: "ai-insights",
      name: "AI Market Insights",
      description: "Get notified of AI-detected opportunities",
      icon: Brain,
      color: "text-primary",
      gradient: "from-primary/10 to-primary/5",
    },
  ];

  return (
    <div className="coinet-card bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/20 p-4 relative overflow-hidden coinet-hover-lift">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/3 to-transparent" />
      
      <div className="relative">
        {/* Compact Header Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-foreground">Smart Alerts</h3>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs h-4 px-1.5">
                  AI
                </Badge>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.location.href = "/alerts"}
            className="coinet-btn-primary text-xs h-7 px-3 shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create
          </Button>
        </div>
        
        {/* Compact Quick Alert Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickAlerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => window.location.href = "/alerts"}
              className={`p-3 rounded-lg border border-border/40 bg-gradient-to-br ${alert.gradient} hover:border-primary/40 transition-all duration-300 coinet-press-effect group backdrop-blur-sm relative overflow-hidden text-left w-full`}
            >
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <alert.icon className={`h-3 w-3 ${alert.color}`} />
                  </div>
                  <span className="font-medium text-sm text-foreground">{alert.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}