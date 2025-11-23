import { useState, useCallback, useEffect } from "react";
import { Alert, AlertHistory, AlertAnalytics, NotificationPreferences, AlertTemplate } from "@/types/alerts";
import { toast } from "@/hooks/use-toast";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ====== ALERT MANAGEMENT ======
  
  const createAlert = useCallback(async (alertData: Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">) => {
    setLoading(true);
    try {
      const newAlert: Alert = {
        ...alertData,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        triggerCount: 0,
      };
      
      setAlerts(prev => [...prev, newAlert]);
      
      toast({
        title: "Alert Created",
        description: `"${newAlert.name}" is now active and monitoring.`,
      });
      
      return newAlert;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAlert = useCallback(async (id: string, updates: Partial<Alert>) => {
    setLoading(true);
    try {
      setAlerts(prev => prev.map(alert => 
        alert.id === id 
          ? { ...alert, ...updates, updatedAt: Date.now() }
          : alert
      ));
      
      toast({
        title: "Alert Updated",
        description: "Your alert settings have been saved.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAlert = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const alert = alerts.find(a => a.id === id);
      setAlerts(prev => prev.filter(alert => alert.id !== id));
      
      toast({
        title: "Alert Deleted",
        description: `"${alert?.name}" has been removed.`,
        variant: "destructive",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [alerts]);

  const pauseAlert = useCallback(async (id: string) => {
    await updateAlert(id, { status: "paused" });
  }, [updateAlert]);

  const resumeAlert = useCallback(async (id: string) => {
    await updateAlert(id, { status: "active" });
  }, [updateAlert]);

  const duplicateAlert = useCallback(async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    const { id: _, createdAt, updatedAt, triggerCount, lastTriggered, ...alertData } = alert;
    return await createAlert({
      ...alertData,
      name: `${alert.name} (Copy)`,
      status: "paused", // Start duplicated alerts as paused
    });
  }, [alerts, createAlert]);

  // ====== ALERT EVALUATION ======
  
  const evaluateAlerts = useCallback((marketData: Record<string, any>) => {
    const triggeredAlerts: Alert[] = [];
    
    alerts.forEach(alert => {
      if (alert.status !== "active") return;
      
      // Check cooldown period
      if (alert.lastTriggered && alert.trigger.cooldownPeriod) {
        const timeSinceLastTrigger = Date.now() - alert.lastTriggered;
        if (timeSinceLastTrigger < alert.trigger.cooldownPeriod * 60 * 1000) {
          return;
        }
      }
      
      // Check frequency limits
      if (alert.trigger.frequencyLimit) {
        const recentTriggers = alertHistory.filter(h => 
          h.alertId === alert.id && 
          Date.now() - h.triggeredAt < alert.trigger.frequencyLimit!.timeWindow * 60 * 1000
        );
        
        if (recentTriggers.length >= alert.trigger.frequencyLimit.maxTriggers) {
          return;
        }
      }
      
      // Evaluate conditions
      const conditionResults = alert.trigger.conditions.map(condition => {
        const fieldValue = marketData[condition.field];
        if (fieldValue === undefined) return false;
        
        switch (condition.operator) {
          case "gt": return Number(fieldValue) > Number(condition.value);
          case "lt": return Number(fieldValue) < Number(condition.value);
          case "eq": return fieldValue === condition.value;
          case "gte": return Number(fieldValue) >= Number(condition.value);
          case "lte": return Number(fieldValue) <= Number(condition.value);
          case "contains": return String(fieldValue).includes(String(condition.value));
          case "regex": return new RegExp(String(condition.value)).test(String(fieldValue));
          default: return false;
        }
      });
      
      const isTriggered = alert.trigger.logicalOperator === "AND" 
        ? conditionResults.every(Boolean)
        : conditionResults.some(Boolean);
      
      if (isTriggered) {
        triggeredAlerts.push(alert);
        
        // Update alert trigger count and timestamp
        setAlerts(prev => prev.map(a => 
          a.id === alert.id 
            ? { 
                ...a, 
                triggerCount: a.triggerCount + 1, 
                lastTriggered: Date.now(),
                status: alert.expiresAt && Date.now() > alert.expiresAt ? "expired" : "triggered"
              }
            : a
        ));
        
        // Add to history
        const historyEntry: AlertHistory = {
          id: crypto.randomUUID(),
          alertId: alert.id,
          triggeredAt: Date.now(),
          conditions: alert.trigger.conditions,
          marketContext: {
            timestamp: Date.now(),
            asset: marketData.symbol || "UNKNOWN",
            price: marketData.price || 0,
            volume: marketData.volume || 0,
            ...marketData
          }
        };
        
        setAlertHistory(prev => [historyEntry, ...prev.slice(0, 999)]); // Keep last 1000 entries
      }
    });
    
    return triggeredAlerts;
  }, [alerts, alertHistory]);

  // ====== SEMANTIC & AI FEATURES ======
  
  const createSemanticAlert = useCallback(async (query: string) => {
    setLoading(true);
    try {
      // This would typically call an AI service to parse the natural language
      // For now, we'll create a basic implementation
      const semanticAlert = await parseSemanticQuery(query);
      return await createAlert(semanticAlert);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create semantic alert");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [createAlert]);

  const provideFeedback = useCallback(async (historyId: string, feedback: AlertHistory["userFeedback"]) => {
    setAlertHistory(prev => prev.map(entry => 
      entry.id === historyId 
        ? { ...entry, userFeedback: feedback }
        : entry
    ));
    
    // Update alert's feedback score
    const historyEntry = alertHistory.find(h => h.id === historyId);
    if (historyEntry && feedback.rating) {
      const alert = alerts.find(a => a.id === historyEntry.alertId);
      if (alert) {
        const currentScore = alert.feedbackScore || 3;
        const newScore = (currentScore + feedback.rating) / 2;
        await updateAlert(alert.id, { feedbackScore: newScore });
      }
    }
    
    toast({
      title: "Feedback Recorded",
      description: "Your feedback helps improve our alert system.",
    });
  }, [alertHistory, alerts, updateAlert]);

  // ====== ANALYTICS ======
  
  const getAlertAnalytics = useCallback((period: { start: number; end: number }): AlertAnalytics => {
    const periodHistory = alertHistory.filter(h => 
      h.triggeredAt >= period.start && h.triggeredAt <= period.end
    );
    
    const totalAlerts = alerts.length;
    const triggeredAlerts = periodHistory.length;
    const successfulAlerts = periodHistory.filter(h => h.userFeedback?.useful).length;
    const falsePositives = periodHistory.filter(h => h.userFeedback?.useful === false).length;
    
    const averageResponseTime = periodHistory.reduce((sum, h) => {
      if (h.userAction) {
        // Estimate response time (would be tracked properly in real implementation)
        return sum + 5 * 60 * 1000; // 5 minutes average
      }
      return sum;
    }, 0) / Math.max(periodHistory.filter(h => h.userAction).length, 1);
    
    const ratingSum = periodHistory.reduce((sum, h) => sum + (h.userFeedback?.rating || 0), 0);
    const userSatisfactionScore = ratingSum / Math.max(periodHistory.length, 1);
    
    return {
      userId: "current-user",
      period,
      metrics: {
        totalAlerts,
        triggeredAlerts,
        falsePositives,
        successfulAlerts,
        averageResponseTime,
        mostUsefulAlertType: "price", // Would be calculated from actual data
        optimalTriggerFrequency: 3,
        accuracyByType: {
          price: 0.85,
          technical: 0.72,
          sentiment: 0.68,
          volume: 0.91,
          onchain: 0.78,
          news: 0.63,
          ai_insight: 0.89,
          agent_trigger: 0.94,
          comparative: 0.76,
          predictive: 0.71,
          semantic: 0.82,
          multi_dimensional: 0.88,
          time_based: 0.95,
        },
        userSatisfactionScore,
      },
      patterns: {
        peakAlertHours: [9, 10, 14, 15, 21], // 9-10 AM, 2-3 PM, 9 PM
        preferredChannels: ["in_app", "push"],
        responsePatterns: {
          immediate: 0.3,
          within_hour: 0.5,
          within_day: 0.15,
          ignored: 0.05,
        },
        dismissalReasons: {
          false_positive: 0.4,
          too_frequent: 0.3,
          not_relevant: 0.2,
          timing: 0.1,
        },
      },
      recommendations: {
        suggestedImprovements: [
          "Reduce frequency of volume alerts during low activity periods",
          "Increase confidence threshold for news-based alerts",
          "Add market context to price alerts",
        ],
        alertsToModify: [],
        newAlertSuggestions: [],
      },
    };
  }, [alerts, alertHistory]);

  // ====== UTILITY FUNCTIONS ======
  
  const getActiveAlerts = useCallback(() => {
    return alerts.filter(alert => alert.status === "active");
  }, [alerts]);

  const getAlertsByType = useCallback((type: Alert["type"]) => {
    return alerts.filter(alert => alert.type === type);
  }, [alerts]);

  const getTriggeredAlertsToday = useCallback(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return alertHistory.filter(h => h.triggeredAt >= today);
  }, [alertHistory]);

  return {
    // State
    alerts,
    alertHistory,
    loading,
    error,
    
    // Alert Management
    createAlert,
    updateAlert,
    deleteAlert,
    pauseAlert,
    resumeAlert,
    duplicateAlert,
    
    // Evaluation
    evaluateAlerts,
    
    // AI Features
    createSemanticAlert,
    provideFeedback,
    
    // Analytics
    getAlertAnalytics,
    
    // Utilities
    getActiveAlerts,
    getAlertsByType,
    getTriggeredAlertsToday,
  };
}

// ====== HELPER FUNCTIONS ======

async function parseSemanticQuery(query: string): Promise<Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount">> {
  // This is a simplified parser - in reality, this would use AI/NLP
  const lowerQuery = query.toLowerCase();
  
  let asset = "BTC";
  let alertType: Alert["type"] = "price";
  let conditions: Alert["trigger"]["conditions"] = [];
  
  // Extract asset
  const assetMatches = query.match(/\b(BTC|ETH|SOL|ADA|DOT|LINK|UNI|AAVE|CRV|SUSHI)\b/i);
  if (assetMatches) {
    asset = assetMatches[0].toUpperCase();
  }
  
  // Extract price conditions
  const pricePattern = /(?:price|cost|value)\s*(?:goes|drops|rises|falls|above|below|over|under)\s*\$?(\d+(?:,\d{3})*)/i;
  const priceMatch = query.match(pricePattern);
  
  if (priceMatch) {
    const price = parseInt(priceMatch[1].replace(/,/g, ''));
    const operator = lowerQuery.includes('above') || lowerQuery.includes('over') || lowerQuery.includes('rises') ? 'gt' : 'lt';
    
    conditions.push({
      id: crypto.randomUUID(),
      type: "price",
      asset,
      field: "price",
      operator,
      value: price,
    });
  }
  
  return {
    name: `Semantic Alert: ${query.slice(0, 50)}...`,
    description: `Alert created from: "${query}"`,
    type: alertType,
    trigger: {
      conditions,
      logicalOperator: "AND",
    },
    actions: [
      {
        id: crypto.randomUUID(),
        type: "notification",
        config: {
          channels: ["in_app", "push"],
          message: `Alert triggered: ${query}`,
        },
        enabled: true,
      }
    ],
    status: "active",
    priority: "medium",
    tags: ["semantic", asset.toLowerCase()],
    aiContext: {
      confidence: 0.8,
      reasoning: `Alert created from semantic query: "${query}"`,
    },
  };
}