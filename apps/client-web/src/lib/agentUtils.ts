import { 
  CustomAgent, 
  AgentPerformance, 
  BacktestResult, 
  AgentTrigger, 
  AgentStrategy,
  LearningConfig,
  AgentExecution
} from "@/types/agents";

// ====== PERFORMANCE CALCULATIONS ======
export function calculateSuccessRate(performance: AgentPerformance): number {
  if (performance.totalExecutions === 0) return 0;
  return (performance.successfulExecutions / performance.totalExecutions) * 100;
}

export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate) / stdDev;
}

export function updateAgentPerformance(
  agent: CustomAgent,
  execution: AgentExecution
): AgentPerformance {
  const updated: AgentPerformance = { ...agent.performance };
  
  updated.totalExecutions += 1;
  updated.lastExecution = execution.timestamp;
  
  if (execution.result === "success") {
    updated.successfulExecutions += 1;
  } else if (execution.result === "failure") {
    updated.failedExecutions += 1;
  }
  
  updated.successRate = calculateSuccessRate(updated);
  updated.averageExecutionTime = (
    (updated.averageExecutionTime * (updated.totalExecutions - 1) + execution.executionTime) /
    updated.totalExecutions
  );
  
  return updated;
}

// ====== TRIGGER VALIDATION ======
export function validateTrigger(trigger: AgentTrigger): boolean {
  if (!trigger.conditions || trigger.conditions.length === 0) return false;
  
  return trigger.conditions.every(condition => {
    return (
      condition.field &&
      condition.operator &&
      condition.value !== undefined &&
      condition.value !== null
    );
  });
}

export function evaluateTriggerConditions(
  trigger: AgentTrigger,
  data: Record<string, any>
): boolean {
  if (!trigger.enabled || !validateTrigger(trigger)) return false;
  
  const results = trigger.conditions.map(condition => {
    const fieldValue = data[condition.field];
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
  
  return trigger.logicalOperator === "AND" 
    ? results.every(Boolean)
    : results.some(Boolean);
}

// ====== BACKTESTING UTILITIES ======
export function calculateBacktestMetrics(result: BacktestResult): Record<string, number> {
  const { trades, initialCapital, finalCapital } = result;
  
  if (trades.length === 0) return {};
  
  const returns = trades.map(trade => trade.pnl / initialCapital);
  const winningTrades = trades.filter(trade => trade.pnl > 0);
  const losingTrades = trades.filter(trade => trade.pnl < 0);
  
  const totalReturn = (finalCapital - initialCapital) / initialCapital;
  const winRate = winningTrades.length / trades.length;
  const averageWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
    : 0;
  const averageLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length)
    : 0;
  
  let runningCapital = initialCapital;
  let maxCapital = initialCapital;
  let maxDrawdown = 0;
  
  trades.forEach(trade => {
    runningCapital += trade.pnl;
    maxCapital = Math.max(maxCapital, runningCapital);
    const drawdown = (maxCapital - runningCapital) / maxCapital;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  
  const sharpeRatio = calculateSharpeRatio(returns);
  const calmarRatio = totalReturn / (maxDrawdown || 1);
  
  return {
    totalReturn,
    winRate,
    averageWin,
    averageLoss,
    maxDrawdown,
    sharpeRatio,
    calmarRatio,
    profitFactor: averageWin / (averageLoss || 1),
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
  };
}

// ====== AGENT VALIDATION ======
export function validateAgent(agent: Partial<CustomAgent>): string[] {
  const errors: string[] = [];
  
  if (!agent.name?.trim()) errors.push("Agent name is required");
  if (!agent.description?.trim()) errors.push("Agent description is required");
  if (!agent.systemPrompt?.trim()) errors.push("System prompt is required");
  if (!agent.expertise || agent.expertise.length === 0) errors.push("At least one expertise is required");
  
  if (agent.triggers) {
    agent.triggers.forEach((trigger, index) => {
      if (!validateTrigger(trigger)) {
        errors.push(`Trigger ${index + 1} has invalid conditions`);
      }
    });
  }
  
  return errors;
}

// ====== MIGRATION UTILITIES ======
export function migrateAgentToV2(oldAgent: any): CustomAgent {
  // Handle migration from v1 agents to v2 enhanced agents
  return {
    ...oldAgent,
    triggers: oldAgent.triggers || [],
    strategies: oldAgent.strategies || [],
    dataSources: oldAgent.dataSources || [],
    performance: oldAgent.performance || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
    },
    backtestResults: oldAgent.backtestResults || [],
    learningConfig: oldAgent.learningConfig || {
      enabled: false,
      adaptationRate: 0.1,
      minSampleSize: 100,
      optimizationGoals: ["profit"],
      parameterBounds: {},
    },
    executions: oldAgent.executions || [],
    maxExecutionsPerDay: oldAgent.maxExecutionsPerDay || 100,
    executionTimeout: oldAgent.executionTimeout || 30,
    retryAttempts: oldAgent.retryAttempts || 3,
    notificationPreferences: oldAgent.notificationPreferences || {
      email: true,
      push: true,
      frequency: "realtime",
      types: ["execution", "error"],
    },
    tags: oldAgent.tags || [],
    version: oldAgent.version || "2.0.0",
    isPublic: oldAgent.isPublic || false,
    collaborators: oldAgent.collaborators || [],
  };
}

// ====== PERFORMANCE FORMATTING ======
export function formatPerformanceMetric(value: number, type: "percentage" | "currency" | "number" | "ratio"): string {
  switch (type) {
    case "percentage":
      return `${(value * 100).toFixed(2)}%`;
    case "currency":
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "ratio":
      return value.toFixed(3);
    case "number":
    default:
      return value.toLocaleString();
  }
}