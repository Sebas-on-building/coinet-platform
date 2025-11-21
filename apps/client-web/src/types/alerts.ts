// ====== ALERT SYSTEM TYPES ======

export interface Alert {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  trigger: AlertTrigger;
  actions: AlertAction[];
  status: "active" | "paused" | "expired" | "triggered";
  createdAt: number;
  updatedAt: number;
  lastTriggered?: number;
  triggerCount: number;
  priority: "low" | "medium" | "high" | "critical";
  expiresAt?: number;
  userId?: string;
  tags: string[];
  // AI Features
  aiContext?: AIAlertContext;
  feedbackScore?: number; // User feedback on alert usefulness (1-5)
  smartSettings?: SmartAlertSettings;
}

export type AlertType = 
  | "price" 
  | "technical" 
  | "sentiment" 
  | "volume" 
  | "onchain" 
  | "news" 
  | "ai_insight" 
  | "agent_trigger" 
  | "comparative"
  | "predictive"
  | "semantic"
  | "multi_dimensional"
  | "time_based";

export interface AlertTrigger {
  conditions: AlertCondition[];
  logicalOperator: "AND" | "OR";
  cooldownPeriod?: number; // minutes between same alert triggers
  frequencyLimit?: {
    maxTriggers: number;
    timeWindow: number; // minutes
  };
}

export interface AlertCondition {
  id: string;
  type: "price" | "indicator" | "sentiment" | "volume" | "ai_insight" | "agent" | "custom" | "technical" | "onchain" | "news";
  asset?: string;
  field: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains" | "regex" | "crosses_above" | "crosses_below" | "divergence";
  value: string | number;
  timeframe?: string;
  // AI Features
  confidence?: number; // AI confidence in condition (0-1)
  semanticQuery?: string; // Natural language interpretation
}

export interface AlertAction {
  id: string;
  type: "notification" | "webhook" | "email" | "sms" | "push" | "sound" | "agent_execute";
  config: AlertActionConfig;
  enabled: boolean;
}

export interface AlertActionConfig {
  // Notification configs
  channels?: NotificationChannel[];
  message?: string;
  sound?: string;
  vibration?: boolean;
  
  // Webhook config
  url?: string;
  headers?: Record<string, string>;
  payload?: Record<string, any>;
  
  // Email config
  subject?: string;
  template?: string;
  recipients?: string[];
  
  // Agent execution config
  agentId?: string;
  agentAction?: string;
  parameters?: Record<string, any>;
}

export type NotificationChannel = "in_app" | "email" | "push" | "sms" | "discord" | "telegram" | "slack";

// ====== AI-ENHANCED FEATURES ======

export interface AIAlertContext {
  insightType?: "bullish_thesis" | "bearish_thesis" | "risk_flag" | "catalyst" | "sentiment_shift" | "pattern_recognition";
  confidence: number; // 0-1
  reasoning: string; // AI explanation for the alert
  relatedBriefs?: string[]; // IDs of related Coinet AI briefs
  rootCauseAnalysis?: string; // Why this alert triggered
  recommendedAction?: string; // AI suggested next steps
  historicalContext?: string; // Similar past events
}

export interface SmartAlertSettings {
  adaptiveFrequency: boolean; // Learns user preferences
  patternRecognition: boolean; // Identifies repeated false positives
  contextualAdjustment: boolean; // Adjusts based on market conditions
  learningEnabled: boolean; // Uses user feedback to improve
  anticipatoryMode: boolean; // Predictive alerts
  relativeAnalysis: boolean; // Comparative alerts vs peers
}

// ====== ALERT HISTORY & ANALYTICS ======

export interface AlertHistory {
  id: string;
  alertId: string;
  triggeredAt: number;
  conditions: AlertCondition[];
  marketContext: MarketContext;
  userAction?: "viewed" | "dismissed" | "acted" | "modified_alert";
  userFeedback?: {
    useful: boolean;
    reason?: string;
    rating: number; // 1-5
  };
  outcome?: {
    priceChangeAfter24h?: number;
    accuracyScore?: number; // For predictive alerts
  };
}

export interface MarketContext {
  timestamp: number;
  asset: string;
  price: number;
  volume: number;
  marketCap?: number;
  dominance?: number;
  fearGreedIndex?: number;
  volatility?: number;
  socialSentiment?: number;
  newsCount?: number;
  majorEvents?: string[];
}

// ====== ALERT TEMPLATES & PRESETS ======

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  category: "beginner" | "intermediate" | "advanced" | "ai_powered";
  template: Omit<Alert, "id" | "createdAt" | "updatedAt" | "triggerCount" | "lastTriggered">;
  popularityScore: number;
  successRate?: number; // Historical success rate
  tags: string[];
}

// ====== NOTIFICATION PREFERENCES ======

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    discord?: string;
    telegram?: string;
    slack?: string;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;
    timezone: string;
  };
  priorityOverride: boolean; // Allow critical alerts during quiet hours
  grouping: boolean; // Group similar alerts
  maxDailyAlerts: number;
  soundSettings: {
    enabled: boolean;
    volume: number; // 0-1
    customSounds: Record<AlertType, string>;
  };
}

// ====== VOICE & SEMANTIC FEATURES ======

export interface SemanticAlertRequest {
  query: string; // Natural language query
  parsedIntent?: {
    action: "create" | "modify" | "delete" | "pause" | "resume";
    asset?: string;
    conditions?: string[];
    timeframe?: string;
    priority?: string;
  };
  confidence: number; // AI confidence in parsing
  suggestions?: string[]; // Alternative interpretations
}

export interface VoiceCommand {
  id: string;
  command: string;
  transcript: string;
  intent: "create_alert" | "list_alerts" | "pause_alert" | "resume_alert" | "get_status";
  parameters: Record<string, any>;
  confidence: number;
  timestamp: number;
}

// ====== ALERT ANALYTICS ======

export interface AlertAnalytics {
  userId: string;
  period: {
    start: number;
    end: number;
  };
  metrics: {
    totalAlerts: number;
    triggeredAlerts: number;
    falsePositives: number;
    successfulAlerts: number; // Based on user feedback
    averageResponseTime: number; // Time from trigger to user action
    mostUsefulAlertType: AlertType;
    optimalTriggerFrequency: number;
    accuracyByType: Record<AlertType, number>;
    userSatisfactionScore: number; // Average feedback rating
  };
  patterns: {
    peakAlertHours: number[];
    preferredChannels: NotificationChannel[];
    responsePatterns: Record<string, number>;
    dismissalReasons: Record<string, number>;
  };
  recommendations: {
    suggestedImprovements: string[];
    alertsToModify: string[];
    newAlertSuggestions: AlertTemplate[];
  };
}

// ====== INTEGRATION TYPES ======

export interface AgentAlertIntegration {
  agentId: string;
  alertId: string;
  triggerConditions: string[]; // Which agent states trigger the alert
  executionActions: string[]; // What the agent should do when triggered
  feedback: {
    accuracy: number;
    usefulness: number;
    frequency: "too_often" | "perfect" | "too_rarely";
  };
}

export interface WebhookIntegration {
  id: string;
  name: string;
  url: string;
  method: "POST" | "GET" | "PUT";
  headers: Record<string, string>;
  authType?: "none" | "bearer" | "api_key" | "basic";
  credentials?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    timeoutMs: number;
  };
  successCriteria: {
    statusCodes: number[];
    responseContains?: string;
  };
}