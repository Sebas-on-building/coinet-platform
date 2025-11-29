import { useState, useEffect } from "react";
import { CustomAgent, AgentPerformance, AgentExecution } from "@/types/agents";
import { updateAgentPerformance } from "@/lib/agentUtils";

export function useAgentPerformance(agent: CustomAgent | null) {
  const [performance, setPerformance] = useState<AgentPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      setPerformance(agent.performance);
    } else {
      setPerformance(null);
    }
  }, [agent]);

  const addExecution = (execution: AgentExecution) => {
    if (!agent || !performance) return;

    const updatedPerformance = updateAgentPerformance(agent, execution);
    setPerformance(updatedPerformance);
    
    // This would typically also update the agent in storage
    return updatedPerformance;
  };

  const getPerformanceStats = () => {
    if (!performance) return null;

    return {
      successRate: performance.successRate,
      totalExecutions: performance.totalExecutions,
      averageExecutionTime: performance.averageExecutionTime,
      profitLoss: performance.profitLoss || 0,
      sharpeRatio: performance.sharpeRatio || 0,
      maxDrawdown: performance.maxDrawdown || 0,
      winRate: performance.winRate || 0,
    };
  };

  const getPerformanceTrend = (days: number = 30) => {
    if (!agent?.executions) return [];

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentExecutions = agent.executions.filter(
      execution => execution.timestamp >= cutoffTime
    );

    // Group by day and calculate daily success rates
    const dailyStats = recentExecutions.reduce((acc, execution) => {
      const day = new Date(execution.timestamp).toDateString();
      if (!acc[day]) {
        acc[day] = { total: 0, successful: 0 };
      }
      acc[day].total++;
      if (execution.result === "success") {
        acc[day].successful++;
      }
      return acc;
    }, {} as Record<string, { total: number; successful: number }>);

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      successRate: (stats.successful / stats.total) * 100,
      totalExecutions: stats.total,
    }));
  };

  return {
    performance,
    isLoading,
    addExecution,
    getPerformanceStats,
    getPerformanceTrend,
  };
}