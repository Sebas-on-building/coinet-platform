import React, { useState } from "react";
import { Plus, Bell, Settings, TrendingUp, Brain, Mic, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAlerts } from "@/hooks/useAlerts";
import { Alert } from "@/types/alerts";
import { AlertCreationWizard } from "@/components/AlertCreationWizard";
import { AlertList } from "@/components/AlertList";
import { SemanticAlertCreator } from "@/components/SemanticAlertCreator";
import { VoiceAlertInterface } from "@/components/VoiceAlertInterface";

export function AlertManager() {
  const { 
    alerts, 
    loading, 
    createAlert, 
    updateAlert, 
    deleteAlert, 
    getActiveAlerts, 
    getTriggeredAlertsToday,
    getAlertAnalytics 
  } = useAlerts();
  
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showSemanticCreator, setShowSemanticCreator] = useState(false);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const activeAlerts = getActiveAlerts();
  const todayTriggers = getTriggeredAlertsToday();
  const analytics = getAlertAnalytics({
    start: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
    end: Date.now(),
  });

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === "all" || alert.type === filterType || alert.status === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: Alert["status"]) => {
    switch (status) {
      case "active": return "bg-primary text-primary-foreground";
      case "paused": return "bg-secondary text-secondary-foreground";
      case "triggered": return "bg-accent text-accent-foreground";
      case "expired": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-blue-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      {/* Header with Hero Metric */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Smart Alerts</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              AI-powered alerts that adapt to market conditions
            </p>
          </div>
          
          {/* Single Create Button - Mobile Optimized */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="default" className="gap-2 shrink-0">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Create Alert</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover z-[100]">
              <DropdownMenuItem onClick={() => setShowCreateWizard(true)}>
                <Bell className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Quick Alert</div>
                  <div className="text-xs text-muted-foreground">Manual setup</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSemanticCreator(true)}>
                <Brain className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">AI-Assisted</div>
                  <div className="text-xs text-muted-foreground">Describe in plain English</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowVoiceInterface(true)}>
                <Mic className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Voice Command</div>
                  <div className="text-xs text-muted-foreground">Speak your alert</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Hero Metric - Active Alerts - Mobile Optimized */}
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 p-3 bg-muted/30 rounded-xl">
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent mb-0.5">
              {activeAlerts.length}
            </div>
            <div className="text-[10px] sm:text-sm font-medium text-muted-foreground">Active Alerts</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {todayTriggers.length} today
            </span>
            <span>•</span>
            <span>{Math.round(analytics.metrics.userSatisfactionScore * 20)}% success</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Filter className="h-4 w-4 mr-2" />
                <span className="truncate">{filterType === "all" ? "All Alerts" : filterType}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover z-[100] w-[200px]">
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                All Alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("paused")}>
                Paused
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("triggered")}>
                Recently Triggered
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("ai_insight")}>
                AI Insights
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("price")}>
                Price Alerts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("technical")}>
                Technical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {filteredAlerts.length} of {alerts.length}
          </div>
        </div>
      </div>

      {/* Alert List - Single View */}
      <div className="min-h-[500px]">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bell className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {alerts.length === 0 ? "No alerts yet" : "No matching alerts"}
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {alerts.length === 0 
                  ? "Create your first alert to start monitoring the market."
                  : "Try adjusting your search or filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <AlertList 
            alerts={filteredAlerts}
            onUpdate={updateAlert}
            onDelete={deleteAlert}
            loading={loading}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateWizard && (
        <AlertCreationWizard
          onClose={() => setShowCreateWizard(false)}
          onCreate={createAlert}
        />
      )}
      
      {showSemanticCreator && (
        <SemanticAlertCreator
          onClose={() => setShowSemanticCreator(false)}
          onCreate={createAlert}
        />
      )}
      
      {showVoiceInterface && (
        <VoiceAlertInterface
          onClose={() => setShowVoiceInterface(false)}
          alerts={alerts}
          onUpdate={updateAlert}
        />
      )}
    </div>
  );
}