// ====== TRIGGER SYSTEM ======
export interface AgentTrigger {
  id: string;
  type: "price" | "sentiment" | "volume" | "technical" | "onchain" | "news" | "time" | "custom";
  conditions: TriggerCondition[];
  logicalOperator: "AND" | "OR";
  enabled: boolean;
}

export interface TriggerCondition {
  field: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains" | "regex";
  value: string | number;
  timeframe?: string; // e.g., "1h", "1d", "7d"
}

// ====== PERFORMANCE TRACKING ======
export interface AgentPerformance {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecution?: number;
  profitLoss?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  winRate?: number;
  averageReturn?: number;
  bestTrade?: number;
  worstTrade?: number;
  totalReturn?: number;
  volatility?: number;
}

// ====== BACKTESTING ======
export interface BacktestResult {
  id: string;
  agentId: string;
  startDate: number;
  endDate: number;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  trades: BacktestTrade[];
  performanceMetrics: Record<string, number>;
  createdAt: number;
}

export interface BacktestTrade {
  timestamp: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number;
  reason: string;
}

// ====== DATA SOURCES ======
export interface DataSource {
  id: string;
  name: string;
  type: "api" | "webhook" | "websocket" | "file";
  config: {
    url?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
  };
  schema: Record<string, string>; // field -> type mapping
  enabled: boolean;
  lastUpdated?: number;
}

// ====== STRATEGY SYSTEM ======
export interface AgentStrategy {
  id: string;
  name: string;
  description: string;
  category: "momentum" | "meanReversion" | "arbitrage" | "scalping" | "swing" | "hodl" | "custom";
  components: StrategyComponent[];
  riskManagement: RiskManagement;
  enabled: boolean;
}

export interface StrategyComponent {
  id: string;
  type: "entry" | "exit" | "stopLoss" | "takeProfit" | "sizing" | "filter";
  config: Record<string, any>;
  priority: number;
}

export interface RiskManagement {
  maxPositionSize: number;
  maxDailyLoss: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxConcurrentTrades: number;
  cooldownPeriod: number; // minutes
}

// ====== LEARNING & ADAPTATION ======
export interface LearningConfig {
  enabled: boolean;
  adaptationRate: number; // 0-1
  minSampleSize: number;
  optimizationGoals: ("profit" | "winRate" | "sharpe" | "drawdown")[];
  parameterBounds: Record<string, { min: number; max: number }>;
  lastOptimization?: number;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  timestamp: number;
  triggerType: string;
  triggerData: Record<string, any>;
  action: string;
  result: "success" | "failure" | "pending";
  executionTime: number;
  error?: string;
  metadata: Record<string, any>;
}

// ====== NOTIFICATIONS ======
export interface NotificationConfig {
  email: boolean;
  push: boolean;
  discord?: string;
  telegram?: string;
  webhook?: string;
  frequency: "realtime" | "hourly" | "daily" | "weekly";
  types: ("execution" | "performance" | "error" | "optimization")[];
}

// ====== ENHANCED CUSTOM AGENT ======
export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  personality: string;
  expertise: string[];
  systemPrompt: string;
  avatar?: string;
  color: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Enhanced capabilities
  triggers: AgentTrigger[];
  strategies: AgentStrategy[];
  dataSources: DataSource[];
  performance: AgentPerformance;
  backtestResults: BacktestResult[];
  learningConfig: LearningConfig;
  executions: AgentExecution[];
  
  // Configuration
  maxExecutionsPerDay: number;
  executionTimeout: number; // seconds
  retryAttempts: number;
  notificationPreferences: NotificationConfig;
  
  // Advanced features
  tags: string[];
  version: string;
  isPublic: boolean;
  parentAgentId?: string; // for forked agents
  collaborators: string[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  personality: string;
  expertise: string[];
  systemPrompt: string;
  color: string;
  category: "trading" | "research" | "defi" | "analysis" | "general";
}