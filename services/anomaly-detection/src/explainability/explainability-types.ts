import { Anomaly } from '../core/types';

/**
 * Shared Types for Explainability Module
 * Common interfaces used across explainability components
 */

export interface ReasoningChain {
  id: string;
  startTime: Date;
  endTime: Date;
  steps: ReasoningStep[];
  finalOutput: unknown;
  confidence: number;
  humanReadable: string;
  causalLinks: CausalLink[];
}

export interface ReasoningStep {
  stepId: string;
  component: string;
  input: unknown;
  processing: string;
  output: unknown;
  confidence: number;
  timestamp: Date;
  causalInputs: string[];
  causalOutputs: string[];
}

export interface ExplanationTemplate {
  id: string;
  trigger: string;
  format: 'user_friendly' | 'technical' | 'regulatory' | 'visual';
  structure: {
    summary: string;
    reasoning: string[];
    evidence: string[];
    alternatives: string[];
    nextSteps: string[];
  };
  personalization: {
    userLevel: 'beginner' | 'intermediate' | 'expert';
    context: string[];
  };
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: Map<string, CausalEdge>;
  propagationRules: Map<string, PropagationRule>;
}

export interface CausalNode {
  id: string;
  type: 'input' | 'process' | 'output' | 'context';
  value: unknown;
  confidence: number;
  importance: number;
  humanReadable: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  relationship: 'causes' | 'enables' | 'modifies' | 'prevents' | 'influences';
  strength: number; // 0-1
  mechanism: string;
  direction: 'unidirectional' | 'bidirectional';
}

export interface PropagationRule {
  condition: string;
  action: string;
  confidence: number;
  explanation: string;
}

export interface CausalLink {
  fromStep: string;
  toStep: string;
  relationship: string;
  strength: number;
  explanation: string;
}

export interface PsychologicalPattern {
  id: string;
  patternType: 'fear' | 'greed' | 'panic' | 'euphoria' | 'herd' | 'manipulation';
  confidence: number;
  indicators: string[];
  reasoning: string;
  marketImpact: {
    direction: 'bullish' | 'bearish' | 'neutral';
    magnitude: number;
    duration: string;
  };
  explanation: {
    psychological: string;
    behavioral: string;
    market: string;
  };
}

export interface FeatureContribution {
  feature: string;
  contribution: number;
  importance: number;
  value: number;
  expectedValue: number;
  difference: number;
  percentChange: number;
}

export interface Explanation {
  id: string;
  anomalyId: string;
  timestamp: Date;
  method: 'lime' | 'shap' | 'counterfactual' | 'causal' | 'hybrid' | 'attribution' | 'attention';
  summary: string;
  featureContributions: FeatureContribution[];
  visualExplanation?: string; // SVG or URL to image
  confidence: number;
  humanReadable: string;
  technicalDetails?: Record<string, unknown>;
  causalChain?: ReasoningChain;
  counterfactuals?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>; // Added metadata property
}

export interface GlobalExplanation {
  timestamp: Date;
  topFeatures: Array<{
    feature: string;
    importance: number;
    avgContribution: number;
  }>;
  interactionEffects: Array<{
    features: string[];
    interaction: number;
  }>;
  decisionBoundaries: Record<string, unknown>;
  globalInsights?: string[];
}

export interface ComprehensiveReport {
  id: string;
  anomaly: Anomaly; // The original anomaly
  explanations: Explanation[];
  globalExplanation: GlobalExplanation;
  recommendations: string[];
  insights: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  auditTrail: Array<{
    timestamp: Date;
    event: string;
    details: string;
  }>;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface ExplanationQuality {
  completeness: number; // 0-1
  clarity: number; // 0-1
  accuracy: number; // 0-1
  relevance: number; // 0-1
  overall: number; // 0-100
}
