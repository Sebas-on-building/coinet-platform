/**
 * Advanced Monitoring System
 * REVOLUTIONARY: Integrates ALL cutting-edge features into one unified system
 * Predictive, causal, autonomous, and cross-chain aware
 */

import { EventEmitter } from 'events';
import { ProactiveMonitoringSystem, SystemConfig } from '../ProactiveMonitoringSystem';
import { PredictiveAnomalyEngine, Prediction } from './PredictiveAnomalyEngine';
import { CausalAnalysisEngine, RootCause } from './CausalAnalysisEngine';
import { MarketManipulationDetector, ManipulationDetection } from './MarketManipulationDetector';
import { GraphNeuralNetworkAnalyzer, WalletCluster, SybilDetection } from './GraphNeuralNetworkAnalyzer';
import { AutonomousTradingAgent, TradingDecision } from './AutonomousTradingAgent';
import { CrossChainCorrelationEngine, CrossChainAnomaly } from './CrossChainCorrelationEngine';
import { Anomaly, DataPoint, DataSource } from '../core/types';

export interface AdvancedSystemConfig {
  baseSystem: unknown; // Config for base ProactiveMonitoringSystem
  predictive: {
    enabled: boolean;
    lookAheadHours: number;
    minPredictionConfidence: number;
  };
  causal: {
    enabled: boolean;
    depthOfAnalysis: 'shallow' | 'medium' | 'deep';
  };
  manipulation: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
  };
  graph: {
    enabled: boolean;
    maxGraphSize: number;
    clusteringInterval: number; // milliseconds
  };
  autonomous: {
    enabled: boolean;
    requiresApproval: boolean;
    maxPositionSize: number;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  crossChain: {
    enabled: boolean;
    chains: string[];
    monitorBridges: boolean;
  };
}

export interface SystemInsights {
  timestamp: Date;
  anomaliesDetected: number;
  predictionsGenerated: number;
  manipulationCases: number;
  tradingDecisions: number;
  crossChainEvents: number;
  rootCausesIdentified: number;
  topInsights: string[];
  criticalActions: string[];
  systemHealth: number; // 0-1
}

export class AdvancedMonitoringSystem extends EventEmitter {
  private baseSystem: ProactiveMonitoringSystem;
  private predictiveEngine: PredictiveAnomalyEngine;
  private causalEngine: CausalAnalysisEngine;
  private manipulationDetector: MarketManipulationDetector;
  private graphAnalyzer: GraphNeuralNetworkAnalyzer;
  private tradingAgent: AutonomousTradingAgent;
  private crossChainEngine: CrossChainCorrelationEngine;
  
  private config: AdvancedSystemConfig;
  private insights: SystemInsights[] = [];
  private running: boolean = false;

  constructor(config: AdvancedSystemConfig) {
    super();
    this.config = config;

    // Initialize all engines
    this.baseSystem = new ProactiveMonitoringSystem(config.baseSystem as SystemConfig);
    this.predictiveEngine = new PredictiveAnomalyEngine();
    this.causalEngine = new CausalAnalysisEngine();
    this.manipulationDetector = new MarketManipulationDetector();
    this.graphAnalyzer = new GraphNeuralNetworkAnalyzer();
    this.tradingAgent = new AutonomousTradingAgent(
      {
        enabled: config.autonomous.enabled,
        maxPositionSize: config.autonomous.maxPositionSize,
        maxDailyTrades: 50,
        minConfidence: 0.75,
        riskTolerance: config.autonomous.riskTolerance,
        allowedAssets: [],
        prohibitedAssets: [],
        requiresApproval: config.autonomous.requiresApproval,
        stopLossPercentage: 5,
        takeProfitPercentage: 15,
        maxDrawdown: 20
      },
      1000000 // $1M initial capital
    );
    this.crossChainEngine = new CrossChainCorrelationEngine();

    this.setupAdvancedEventHandlers();
  }

  /**
   * Start the advanced system
   */
  async start(): Promise<void> {
    if (this.running) throw new Error('System already running');

    // console.log('🚀 Starting REVOLUTIONARY Advanced Monitoring System...');
    // console.log('   🔮 Predictive Engine: Enabled');
    // console.log('   🧬 Causal Analysis: Enabled');
    // console.log('   🎯 Manipulation Detection: Enabled');
    // console.log('   🕸️  Graph Neural Network: Enabled');
    // console.log('   🤖 Autonomous Trading: Enabled');
    // console.log('   🌐 Cross-Chain Analysis: Enabled');
    // console.log('');

    // Start base system
    await this.baseSystem.start();

    // Start periodic tasks
    if (this.config.graph.enabled) {
      this.startGraphClustering();
    }

    this.running = true;
    this.emit('advanced_system_started');

    // console.log('✅ Advanced Monitoring System fully operational!\n');
  }

  /**
   * Stop the system
   */
  async stop(): Promise<void> {
    if (!this.running) throw new Error('System not running');

    // console.log('🛑 Stopping Advanced Monitoring System...');

    await this.baseSystem.stop();
    this.running = false;

    this.emit('advanced_system_stopped');
    // console.log('✅ System stopped successfully');
  }

  /**
   * Setup advanced event handlers
   */
  private setupAdvancedEventHandlers(): void {
    // When anomaly is detected, run advanced analysis
    this.baseSystem.on('anomaly_detected', async (anomaly: Anomaly) => {
      await this.runAdvancedAnalysis(anomaly);
    });

    // Predictive engine events
    this.predictiveEngine.on('prediction_made', (prediction: Prediction) => {
      // console.log(`🔮 Prediction: ${prediction.type} in ${(prediction.timeToEvent / 60000).toFixed(0)} minutes (${(prediction.confidence * 100).toFixed(0)}%)`);
      this.emit('prediction_made', prediction);
    });

    // Causal engine events
    this.causalEngine.on('root_cause_identified', (rootCause: RootCause) => {
      // console.log(`🧬 Root Cause: ${rootCause.primaryCause} (${(rootCause.confidence * 100).toFixed(0)}%)`);
      this.emit('root_cause_identified', rootCause);
    });

    // Manipulation detector events
    this.manipulationDetector.on('manipulation_detected', (detection: ManipulationDetection) => {
      // console.log(`🚨 MANIPULATION: ${detection.type} - Severity: ${detection.severity}`);
      this.emit('manipulation_detected', detection);
    });

    // Graph analyzer events
    this.graphAnalyzer.on('cluster_detected', (cluster: WalletCluster) => {
      // console.log(`🕸️  Wallet Cluster: ${cluster.wallets.length} wallets - Purpose: ${cluster.purpose}`);
      this.emit('cluster_detected', cluster);
    });

    this.graphAnalyzer.on('sybil_detected', (sybil: SybilDetection) => {
      // console.log(`⚠️  Sybil Attack: ${sybil.sybilWallets.length} fake wallets detected`);
      this.emit('sybil_detected', sybil);
    });

    // Trading agent events
    this.tradingAgent.on('decision_made', (decision: TradingDecision) => {
      // console.log(`🤖 Trading Decision: ${decision.type} ${decision.symbol} - Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
      this.emit('trading_decision', decision);
    });

    this.tradingAgent.on('trade_executed', (data: { decision: TradingDecision; result: unknown }) => {
      // console.log(`💰 Trade Executed: ${data.decision.type} ${data.decision.symbol} @ ${data.result.entryPrice}`);
      this.emit('trade_executed', data);
    });

    // Cross-chain events
    this.crossChainEngine.on('cross_chain_anomaly', (anomaly: CrossChainAnomaly) => {
      // console.log(`🌐 Cross-Chain Anomaly: ${anomaly.type} across ${anomaly.chains.join(', ')}`);
      this.emit('cross_chain_anomaly', anomaly);
    });
  }

  /**
   * Run comprehensive advanced analysis on detected anomaly
   */
  private async runAdvancedAnalysis(anomaly: Anomaly): Promise<void> {
    // console.log(`\n🔬 Running Advanced Analysis for ${anomaly.source} anomaly...`);

    const analyses: Promise<unknown | null>[] = [];

    // 1. Predictive Analysis
    if (this.config.predictive.enabled && anomaly.dataPoint.symbol) {
      analyses.push(
        this.runPredictiveAnalysis(anomaly).catch((_err: unknown) => {
          // console.error('Predictive analysis failed:', _err);
          return null;
        })
      );
    }

    // 2. Causal Analysis
    if (this.config.causal.enabled) {
      analyses.push(
        this.runCausalAnalysis(anomaly).catch((_err: unknown) => {
          // console.error('Causal analysis failed:', _err);
          return null;
        })
      );
    }

    // 3. Manipulation Detection
    if (this.config.manipulation.enabled) {
      analyses.push(
        this.runManipulationAnalysis(anomaly).catch((_err: unknown) => {
          // console.error('Manipulation detection failed:', _err);
          return null;
        })
      );
    }

    // Run analyses in parallel
    const [predictions, rootCause, _manipulations] = await Promise.all([
      this.runPredictiveAnalysis(anomaly).catch((_err: unknown) => null) as Promise<Prediction[] | null>,
      this.runCausalAnalysis(anomaly).catch((_err: unknown) => null) as Promise<RootCause | null>,
      this.runManipulationAnalysis(anomaly).catch((_err: unknown) => null) as Promise<ManipulationDetection[] | null>
    ]);

    // 4. Autonomous Trading Decision (if confidence is high enough)
    if (this.config.autonomous.enabled && predictions && predictions.length > 0) {
      await this.makeAutonomousDecision(anomaly, predictions?.[0], rootCause ?? undefined);
    } else if (this.config.autonomous.enabled && rootCause) {
        await this.makeAutonomousDecision(anomaly, undefined, rootCause ?? undefined);
    }

    // 5. Graph Neural Network Analysis (assuming it runs periodically or triggered separately)
    // For this demonstration, we'll ensure the periodic clustering is active.
    if (this.config.graph.enabled && !(this.graphAnalyzer as any)['clusteringInterval']) { // Access private interval to prevent duplicate starts
        this.startGraphClustering();
    }

    // Generate system insights
    await this.generateSystemInsights();

    // console.log(`✅ Advanced Analysis Complete\n`);
  }

  /**
   * Run predictive analysis
   */
  private async runPredictiveAnalysis(anomaly: Anomaly): Promise<Prediction[] | null> {
    // Get recent data for symbol
    const recentData = await this.getRecentData(
      anomaly.source,
      anomaly.dataPoint.symbol!,
      100
    );

    if (recentData.length < 50) return null;

    const predictions = await this.predictiveEngine.predictFutureAnomalies(
      recentData,
      anomaly.baseline,
      anomaly.dataPoint.symbol!
    );

    if (predictions.length > 0) {
      // console.log(`   🔮 ${predictions.length} predictions generated`);
    }

    return predictions;
  }

  /**
   * Run causal analysis
   */
  private async runCausalAnalysis(anomaly: Anomaly): Promise<RootCause | null> {
    // Collect related data from multiple sources
    const relatedData = await this.collectRelatedData(anomaly);

    const rootCause = await this.causalEngine.identifyRootCause(anomaly, relatedData);

    // console.log(`   🧬 Root cause identified: ${rootCause.primaryCause.slice(0, 50)}...`);

    return rootCause;
  }

  /**
   * Run manipulation detection
   */
  private async runManipulationAnalysis(anomaly: Anomaly): Promise<ManipulationDetection[] | null> {
    // Get trading, price, volume, and wallet data
    const tradingData = await this.getRecentData(DataSource.TRADING_VOLUME, anomaly.dataPoint.symbol, 50);
    const priceData = await this.getRecentData(DataSource.PRICE_MOVEMENT, anomaly.dataPoint.symbol, 50);
    const volumeData = tradingData; // Same for now

    const detections = await this.manipulationDetector.detectManipulation(
      tradingData,
      priceData,
      volumeData
    );

    if (detections.length > 0) {
      // console.log(`   🚨 ${detections.length} manipulation patterns detected`);
    }

    return detections;
  }

  /**
   * Make autonomous trading decision
   */
  private async makeAutonomousDecision(
    anomaly: Anomaly,
    prediction?: Prediction,
    rootCause?: RootCause
  ): Promise<void> {
    const decision = await this.tradingAgent.evaluateAnomaly(anomaly, prediction, rootCause);
    
    if (decision) {
      // console.log(`   🤖 Trading Decision: ${decision.type} ${decision.symbol} - ${(decision.confidence * 100).toFixed(0)}% confidence`);
      
      if (decision.status === 'pending') {
        // console.log(`   ⏳ Awaiting approval...`);
      }
    }
  }

  /**
   * Generate comprehensive system insights
   */
  private async generateSystemInsights(): Promise<void> {
    const stats = this.baseSystem.getStatistics();
    const _portfolio = this.tradingAgent.getPortfolio();
    
    const insights: SystemInsights = {
      timestamp: new Date(),
      anomaliesDetected: stats.totalAnomaliesDetected,
      predictionsGenerated: 0, // Would track from predictive engine
      manipulationCases: this.manipulationDetector.getDetectionHistory().length,
      tradingDecisions: this.tradingAgent.getPendingDecisions().length,
      crossChainEvents: this.crossChainEngine.getAnomalyHistory().length,
      rootCausesIdentified: this.causalEngine.getRootCauseHistory().size,
      topInsights: this.generateTopInsights(),
      criticalActions: this.generateCriticalActions(),
      systemHealth: this.calculateSystemHealth()
    };

    this.insights.push(insights);
    this.emit('insights_generated', insights);
  }

  /**
   * Generate top insights
   */
  private generateTopInsights(): string[] {
    const insights: string[] = [];

    // Market manipulation insights
    const manipHistory = this.manipulationDetector.getDetectionHistory();
    const recentManip = manipHistory.filter(m => 
      Date.now() - m.timestamp.getTime() < 3600000
    );
    
    if (recentManip.length > 0) {
      insights.push(`🚨 ${recentManip.length} manipulation attempts detected in last hour`);
    }

    // Graph analysis insights
    const suspiciousWallets = Array.from(
      this.manipulationDetector.getSuspiciousWallets().entries()
    ).filter(([_key, score]) => score > 10);
    
    if (suspiciousWallets.length > 0) {
      insights.push(`⚠️  ${suspiciousWallets.length} wallets flagged as highly suspicious`);
    }

    // Trading performance
    const performance = this.tradingAgent.getPerformance();
    if (performance.totalReturn !== 0) {
      insights.push(`💰 Autonomous trading: ${performance.totalReturn > 0 ? '+' : ''}${performance.totalReturn.toFixed(2)}% return, ${(performance.winRate * 100).toFixed(0)}% win rate`);
    }

    // Cross-chain insights
    const crossChainAnomalies = this.crossChainEngine.getAnomalyHistory();
    const criticalCrossChain = crossChainAnomalies.filter(a => a.severity === 'critical');
    
    if (criticalCrossChain.length > 0) {
      insights.push(`🌐 ${criticalCrossChain.length} critical cross-chain events require attention`);
    }

    return insights.slice(0, 5);
  }

  /**
   * Generate critical actions
   */
  private generateCriticalActions(): string[] {
    const actions: string[] = [];

    // Check for manipulation
    const recentManip = this.manipulationDetector.getDetectionHistory()
      .filter(m => m.severity === 'critical' && Date.now() - m.timestamp.getTime() < 3600000);
    
    recentManip.forEach(m => {
      actions.push(`Investigate ${m.type} - ${m.pattern.description}`);
    });

    // Check pending trading decisions
    const pendingDecisions = this.tradingAgent.getPendingDecisions();
    pendingDecisions.forEach(d => {
      if (d.confidence > 0.9) {
        actions.push(`Approve high-confidence trade: ${d.type} ${d.symbol}`);
      }
    });

    // Check cross-chain critical events
    const criticalCrossChain = this.crossChainEngine.getAnomalyHistory()
      .filter(a => a.severity === 'critical');
    
    criticalCrossChain.forEach(a => {
      actions.push(`Cross-chain critical: ${a.description}`);
    });

    return actions.slice(0, 10);
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(): number {
    const baseHealth = 0.9; // Assume base system is healthy
    const portfolio = this.tradingAgent.getPortfolio();
    const performanceHealth = Math.max(0, Math.min(1, (portfolio.performance.totalReturn + 50) / 100));
    
    return (baseHealth + performanceHealth) / 2;
  }

  /**
   * Get recent data (stub - would query from storage)
   */
  private async getRecentData(
    _source: DataSource,
    _symbol?: string,
    _limit: number = 100
  ): Promise<DataPoint[]> {
    // In production, query from database
    // For now, return empty array
    return [];
  }

  /**
   * Collect related data from multiple sources
   */
  private async collectRelatedData(_anomaly: Anomaly): Promise<Map<DataSource, DataPoint[]>> {
    const relatedData = new Map<DataSource, DataPoint[]>();

    // Collect data from all sources
    for (const source of Object.values(DataSource)) {
      const data = await this.getRecentData(source, _anomaly.dataPoint.symbol, 50);
      if (data.length > 0) {
        relatedData.set(source, data);
      }
    }

    return relatedData;
  }

  /**
   * Start periodic graph clustering
   */
  private startGraphClustering(): void {
    setInterval(async () => {
      try {
        const clusters = await this.graphAnalyzer.detectClusters();
        const sybils = await this.graphAnalyzer.detectSybilAttacks();
        
        if (clusters.length > 0 || sybils.length > 0) {
          // console.log(`🕸️  Graph Analysis: ${clusters.length} clusters, ${sybils.length} Sybil attacks detected`);
        }
      } catch (error: unknown) {
        // console.error('Graph clustering error:', error);
      }
    }, this.config.graph.clusteringInterval);
  }

  /**
   * Get comprehensive system report
   */
  async getComprehensiveReport(): Promise<{
    baseSystem: unknown;
    predictive: unknown;
    causal: unknown;
    manipulation: unknown;
    graph: unknown;
    trading: unknown;
    crossChain: unknown;
    insights: SystemInsights;
  }> {
    return {
      baseSystem: this.baseSystem.getStatistics(),
      predictive: {
        totalPredictions: 0 // Would aggregate from engine
      },
      causal: {
        rootCausesIdentified: this.causalEngine.getRootCauseHistory().size,
        causalGraph: this.causalEngine.getCausalGraph().size
      },
      manipulation: {
        detectionsTotal: this.manipulationDetector.getDetectionHistory().length,
        suspiciousWallets: this.manipulationDetector.getSuspiciousWallets().size
      },
      graph: {
        totalNodes: this.graphAnalyzer.getGraphStats().totalNodes,
        totalEdges: this.graphAnalyzer.getGraphStats().totalEdges,
        density: this.graphAnalyzer.getGraphStats().density
      },
      trading: {
        portfolio: this.tradingAgent.getPortfolio(),
        performance: this.tradingAgent.getPerformance(),
        pendingDecisions: this.tradingAgent.getPendingDecisions().length
      },
      crossChain: {
        correlations: this.crossChainEngine.getAllCorrelations().size,
        anomalies: this.crossChainEngine.getAnomalyHistory().length
      },
      insights: this.insights[this.insights.length - 1] || {
        timestamp: new Date(),
        anomaliesDetected: 0,
        predictionsGenerated: 0,
        manipulationCases: 0,
        tradingDecisions: 0,
        crossChainEvents: 0,
        rootCausesIdentified: 0,
        topInsights: [],
        criticalActions: [],
        systemHealth: 1
      }
    };
  }

  /**
   * Get all engines (for direct access)
   */
  getEngines() {
    return {
      base: this.baseSystem,
      predictive: this.predictiveEngine,
      causal: this.causalEngine,
      manipulation: this.manipulationDetector,
      graph: this.graphAnalyzer,
      trading: this.tradingAgent,
      crossChain: this.crossChainEngine
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdvancedSystemConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.autonomous) {
      this.tradingAgent.updateConfig(config.autonomous);
    }

    this.emit('config_updated', this.config);
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason: string): Promise<void> {
    // console.log(`🚨 EMERGENCY SHUTDOWN: ${reason}`);
    
    // Stop autonomous trading
    await this.tradingAgent.emergencyStop(reason);
    
    // Stop system
    await this.stop();
    
    this.emit('emergency_shutdown', { reason, timestamp: new Date() });
  }

  /**
   * Get latest insights
   */
  getLatestInsights(): SystemInsights | null {
    return this.insights[this.insights.length - 1] || null;
  }

  /**
   * Get insight history
   */
  getInsightHistory(_limit: number = 100): SystemInsights[] {
    return this.insights.slice(-_limit);
  }
}

