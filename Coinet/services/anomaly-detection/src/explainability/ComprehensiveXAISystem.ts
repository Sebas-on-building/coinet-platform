import { EventEmitter } from 'events';
import { DataPoint, Anomaly, AnomalyType, AnomalySeverity, DataSource } from '../core/types';
import {
  Explanation,
  FeatureContribution,
  CounterfactualExplanation,
  AttentionVisualization,
  HybridPrediction,
  AttributionAnalysis,
  GlobalExplanation,
  ComprehensiveReport,
  InstrumentedModel
} from './explainability-types';
import { UniversalExplainableAISystem } from './UniversalExplainableAISystem';
import { AdvancedFeatureAttributionEngine } from './AdvancedFeatureAttributionEngine';

export interface ComprehensiveXAIConfig {
  explainAllAnomalies: boolean;
  methods: {
    lime: boolean;
    shap: boolean;
    counterfactual: boolean;
    causal: boolean;
    hybrid: boolean;
    attribution: boolean;
    attention: boolean;
  };
  defaultAudience: 'user' | 'technical' | 'regulator' | 'auditor';
  storeExplanations: boolean;
  logAllAccess: boolean;
  generateAuditTrail: boolean;
}

export interface ExplanationQuality {
  completeness: number; // 0-1
  clarity: number; // 0-1
  accuracy: number; // 0-1
  relevance: number; // 0-1
  overall: number; // 0-100
}

export class ComprehensiveXAISystem extends EventEmitter {
  private config: ComprehensiveXAIConfig;
  private explainabilitySystem: UniversalExplainableAISystem;

  private explanationHistory: Map<string, Explanation> = new Map();

  constructor(config: ComprehensiveXAIConfig) {
    super();
    this.config = config;
    this.explainabilitySystem = new UniversalExplainableAISystem();
    // this.featureAttributionSystem = new FeatureAttributionSystem();
    // this.reasoningChainTracker = new ReasoningChainTracker();

    this.setupEventHandlers();
  }

  /**
   * Initialize with existing models
   */
  async initialize(models: Array<{ id: string; model: object; type: InstrumentedModel['type']; inputSchema: object; outputSchema: object }>): Promise<void> {
    // console.log('Initializing Comprehensive XAI System...');
    for (const modelDef of models) {
      await this.explainabilitySystem.instrumentModel(
        modelDef.id,
        modelDef.model,
        modelDef.type,
        modelDef.inputSchema,
        modelDef.outputSchema
      );
    }
    // console.log(`✅ ${models.length} models instrumented for explainability`);
  }

  /**
   * Generate an explanation for a given anomaly or decision
   */
  async generateExplanation(anomaly: Anomaly, method: Explanation['method'] = 'shap'): Promise<Explanation> {
    // console.log(`Generating ${method} explanation for anomaly ${anomaly.id}...`);
    
    let explanation: Explanation;

    // Delegate to UniversalExplainableAISystem for core explanation generation
    const instrumentedModel = this.explainabilitySystem.getExplainableModel('anomaly_detector'); // Assuming 'anomaly_detector' model ID

    if (!instrumentedModel) {
      throw new Error('Anomaly detector model not instrumented for explainability');
    }

    // For now, directly call the AdvancedFeatureAttributionEngine if it's the underlying mechanism
    // In a full implementation, UniversalExplainableAISystem would abstract this.
    const advancedAttributionEngine = new AdvancedFeatureAttributionEngine();
    const attributions = await advancedAttributionEngine.calculateAdvancedAttributions(anomaly);

    // Convert AdvancedAttribution[] to Explanation
    explanation = {
      id: `${method}_${anomaly.id}_${Date.now()}`,
      anomalyId: anomaly.id,
      timestamp: new Date(),
      method: method,
      summary: `Explanation generated using ${method}`,
      featureContributions: attributions.map(attr => ({
        feature: attr.feature,
        contribution: attr.combinedAttribution,
        importance: attr.importanceRanking,
        value: 0, // Placeholder, actual value not directly available from AdvancedAttribution
        expectedValue: 0, // Placeholder
        difference: 0, // Placeholder
        percentChange: 0 // Placeholder
      })),
      visualExplanation: advancedAttributionEngine.generateAttributionVisualization(attributions).waterfallChart, // Using one visualization
      confidence: attributions.length > 0 ? attributions[0].confidence : 0.8,
      humanReadable: attributions.length > 0 ? attributions[0].humanReadable : 'No specific explanation generated.'
    };

    this.explanationHistory.set(explanation.id, explanation);
    this.emit('explanation_generated', explanation);

    // console.log(`✅ Explanation for anomaly ${anomaly.id} generated using ${method}`);
    return explanation;
  }

  /**
   * Get all explanations generated
   */
  getAllExplanations(): Explanation[] {
    return Array.from(this.explanationHistory.values());
  }

  /**
   * Get explanation by ID
   */
  getExplanation(id: string): Explanation | undefined {
    return this.explanationHistory.get(id);
  }

  /**
   * Generate a comprehensive report combining multiple explanations and global insights
   */
  async generateComprehensiveReport(anomalyId: string): Promise<ComprehensiveReport> {
    // console.log(`Generating comprehensive report for anomaly ${anomalyId}...`);

    const anomaly = this.getAnomalyFromHistory(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly with ID ${anomalyId} not found in history.`);
    }

    const explanations = Array.from(this.explanationHistory.values()).filter(e => e.anomalyId === anomalyId);

    // Simulate global explanation
    const globalExplanation: GlobalExplanation = {
      timestamp: new Date(),
      topFeatures: [{ feature: 'volatility', importance: 0.9, avgContribution: 0.2 }],
      interactionEffects: [{ features: ['volatility', 'volume'], interaction: 0.7 }],
      decisionBoundaries: {},
    };

    const report: ComprehensiveReport = {
      id: `report_${anomalyId}_${Date.now()}`,
      anomaly,
      explanations,
      globalExplanation,
      recommendations: this.generateReportRecommendations(anomaly, explanations),
      insights: this.generateReportInsights(anomaly, explanations, globalExplanation),
      riskAssessment: this.assessExplanationRisk(explanations),
      auditTrail: this.getExplanationAuditTrail(anomalyId),
      confidence: this.calculateReportConfidence(explanations),
      metadata: { generatedBy: 'ComprehensiveXAISystem' },
    };

    // console.log(`✅ Comprehensive report for anomaly ${anomalyId} generated.`);
    return report;
  }

  /**
   * Generate recommendations based on explanations and insights
   */
  private generateReportRecommendations(anomaly: Anomaly, explanations: Explanation[]): string[] {
    const recommendations: string[] = [];
    // Example: if a feature strongly contributes to an anomaly, suggest monitoring it
    explanations.forEach(exp => {
      exp.featureContributions.forEach(fc => {
        if (Math.abs(fc.contribution) > 0.3 && fc.importance > 0.7) {
          recommendations.push(`Monitor feature '${fc.feature}' due to its significant contribution to the anomaly.`);
        }
      });
    });
    if (anomaly.severity === AnomalySeverity.CRITICAL) {
      recommendations.push('Immediately review this critical anomaly and consider manual intervention.');
    }
    return recommendations;
  }

  /**
   * Generate insights from explanations
   */
  private generateReportInsights(
    anomaly: Anomaly,
    explanations: Explanation[],
    globalExplanation: GlobalExplanation
  ): string[] {
    const insights: string[] = [];
    insights.push(`Anomaly Type: ${anomaly.type}, Severity: ${anomaly.severity}, Score: ${anomaly.score.toFixed(2)}`);
    insights.push(`Top contributing features: ${globalExplanation.topFeatures.map(f => f.feature).join(', ')}`);
    if (explanations.length > 0) {
      insights.push(`Most confident explanation method: ${explanations.sort((a, b) => b.confidence - a.confidence)[0].method}`);
    }
    return insights;
  }

  /**
   * Assess risk associated with explanations (e.g., potential for misleading explanations)
   */
  private assessExplanationRisk(explanations: Explanation[]): { level: 'low' | 'medium' | 'high'; factors: string[] } {
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const factors: string[] = [];
    const lowConfidenceExplanations = explanations.filter(exp => exp.confidence < 0.7);
    if (lowConfidenceExplanations.length > 0) {
      riskLevel = 'medium';
      factors.push(`Low confidence explanations (${lowConfidenceExplanations.length} instances)`);
    }
    // Add more risk factors as needed
    return { level: riskLevel, factors };
  }

  /**
   * Get audit trail of explanation generation
   */
  private getExplanationAuditTrail(anomalyId: string): Array<{ timestamp: Date; event: string; details: string }> {
    // This is a placeholder. In a real system, you would query an audit log.
    return [];
  }

  /**
   * Calculate overall report confidence
   */
  private calculateReportConfidence(explanations: Explanation[]): number {
    if (explanations.length === 0) return 0.5;
    return explanations.reduce((sum, exp) => sum + exp.confidence, 0) / explanations.length;
  }

  private getAnomalyFromHistory(anomalyId: string): Anomaly | undefined {
    // This is a placeholder. In a real system, you would query an anomaly store.
    // For demonstration, we'll create a dummy anomaly.
    return {
      id: anomalyId,
      timestamp: new Date(),
      source: DataSource.TRADING_VOLUME,
      type: AnomalyType.EMERGING_THREAT,
      severity: AnomalySeverity.HIGH,
      score: 0.85,
      dataPoint: {
        timestamp: new Date(),
        source: DataSource.TRADING_VOLUME,
        value: 1200,
        metadata: {},
      },
      baseline: {
        source: DataSource.TRADING_VOLUME,
        mean: 1000,
        standardDeviation: 50,
        percentiles: { p5: 900, p25: 950, p50: 1000, p75: 1050, p95: 1100, p99: 1150 },
        lastUpdated: new Date(),
        sampleSize: 1000,
        confidenceInterval: { lower: 990, upper: 1010 },
      },
      deviation: {
        standardDeviations: 4,
        percentileRank: 99,
        absoluteDifference: 200,
        relativeDifference: 20,
      },
      context: {
        historicalComparison: { similarEvents: 5, lastOccurrence: new Date(), averageImpact: 0.1 },
        marketConditions: { volatility: 0.1, trend: 'bullish', volume: 'high' },
        correlatedEvents: [],
        timeContext: { dayOfWeek: 'Monday', hour: 10, isHoliday: false, isTradingHours: true },
      },
      classification: {
        primaryCategory: 'Price Spike',
        subCategories: ['Volume Surge'],
        confidence: 0.9,
        reasoning: ['Volume increased significantly'],
        domainKnowledge: ['Common pump pattern'],
      },
      suggestedActions: [],
      relatedAnomalies: [],
      metadata: {},
    };
  }

  private setupEventHandlers(): void {
    // Add event handlers here if needed
  }
}
