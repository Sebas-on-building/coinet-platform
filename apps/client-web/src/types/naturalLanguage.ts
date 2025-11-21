import { AgentTrigger, AgentStrategy, DataSource, CustomAgent } from "./agents";

// ====== NATURAL LANGUAGE PROCESSING ======
export interface NLPRequest {
  description: string;
  context?: {
    existingAgents?: string[];
    preferences?: UserPreferences;
    domain?: "crypto" | "trading" | "defi" | "general";
  };
}

export interface NLPResponse {
  success: boolean;
  agent: ParsedAgentStructure;
  explanation: AgentExplanation;
  confidence: number;
  suggestions: string[];
  errors?: string[];
}

export interface ParsedAgentStructure {
  name: string;
  description: string;
  personality: string;
  expertise: string[];
  systemPrompt: string;
  triggers: AgentTrigger[];
  strategies: AgentStrategy[];
  dataSources: DataSource[];
  tags: string[];
  color: string;
}

export interface AgentExplanation {
  overview: string;
  triggerLogic: TriggerExplanation[];
  dataSourcesUsed: DataSourceExplanation[];
  decisionTree: DecisionNode[];
  riskFactors: string[];
  expectedBehavior: string[];
}

export interface TriggerExplanation {
  trigger: AgentTrigger;
  humanReadable: string;
  examples: string[];
  dataPoints: string[];
}

export interface DataSourceExplanation {
  source: DataSource;
  purpose: string;
  frequency: string;
  reliability: "high" | "medium" | "low";
  cost: "free" | "low" | "medium" | "high";
}

export interface DecisionNode {
  id: string;
  type: "condition" | "action" | "data" | "logic";
  label: string;
  description: string;
  children: string[];
  parent?: string;
  metadata: Record<string, any>;
}

// ====== USER PREFERENCES ======
export interface UserPreferences {
  riskTolerance: "conservative" | "moderate" | "aggressive";
  tradingStyle: "scalping" | "day" | "swing" | "position" | "hodl";
  assetTypes: string[];
  notificationFrequency: "realtime" | "hourly" | "daily";
  maxExecutionsPerDay: number;
  preferredDataSources: string[];
}

// ====== CONCEPT TRANSPILATION ======
export interface ConceptRequest {
  concept: string;
  hypothesis: string;
  targetAssets?: string[];
  timeframe?: string;
  validation?: boolean;
}

export interface ConceptResponse {
  agentStructure: ParsedAgentStructure;
  validationPlan: ValidationPlan;
  implementationSteps: ImplementationStep[];
  expectedOutcomes: OutcomeProjection[];
  confidence: number;
}

export interface ValidationPlan {
  backtestPeriod: string;
  successMetrics: string[];
  failureConditions: string[];
  sampleSize: number;
  statisticalTests: string[];
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  type: "setup" | "configuration" | "testing" | "deployment";
  estimatedTime: string;
  dependencies: string[];
}

export interface OutcomeProjection {
  scenario: "best" | "expected" | "worst";
  description: string;
  probability: number;
  metrics: Record<string, number>;
}

// ====== REFINEMENT SYSTEM ======
export interface RefinementRequest {
  originalStructure: ParsedAgentStructure;
  feedback: UserFeedback;
  adjustments: string[];
}

export interface UserFeedback {
  type: "trigger_adjustment" | "strategy_change" | "data_source_change" | "general_feedback";
  content: string;
  targetComponent?: string;
  severity: "minor" | "moderate" | "major";
}

export interface RefinementResponse {
  updatedStructure: ParsedAgentStructure;
  changes: ChangeLog[];
  explanation: string;
  impactAnalysis: ImpactAnalysis;
}

export interface ChangeLog {
  component: string;
  changeType: "added" | "modified" | "removed";
  before?: any;
  after?: any;
  reason: string;
}

export interface ImpactAnalysis {
  performanceImpact: "positive" | "negative" | "neutral";
  riskImpact: "increased" | "decreased" | "unchanged";
  complexityChange: "simpler" | "more_complex" | "unchanged";
  estimatedEffectiveness: number; // 0-100
}