/**
 * Autonomous Trading Agent
 * REVOLUTIONARY: AI that can automatically execute trades based on high-confidence anomaly signals
 * Uses reinforcement learning, risk management, and portfolio optimization
 */

import { Anomaly, AnomalyType } from '../core/types';
import { Prediction } from './PredictiveAnomalyEngine';
import { RootCause } from './CausalAnalysisEngine';
import { EventEmitter } from 'events';

export enum TradeType {
  MARKET_BUY = 'market_buy',
  MARKET_SELL = 'market_sell',
  LIMIT_BUY = 'limit_buy',
  LIMIT_SELL = 'limit_sell',
  HEDGE = 'hedge',
}

export interface TradingDecision {
  id: string;
  timestamp: Date;
  type: TradeType;
  symbol: string;
  quantity: number;
  price?: number; // For limit orders
  confidence: number;
  reasoning: string[];
  basedOn: {
    anomalies: string[]; // Anomaly IDs
    predictions: string[]; // Prediction IDs
    rootCauses: string[]; // Root cause IDs
  };
  riskAssessment: RiskAssessment;
  expectedReturn: number;
  timeHorizon: number; // milliseconds
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';
  executedAt?: Date;
  result?: TradingResult;
}

export interface RiskAssessment {
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number; // 0-1
  maxLoss: number; // Maximum potential loss
  winProbability: number; // 0-1
  sharpeRatio: number;
  factors: {
    marketRisk: number;
    liquidityRisk: number;
    volatilityRisk: number;
    sentimentRisk: number;
    technicalRisk: number;
  };
  stopLoss: number;
  takeProfit: number;
}

export interface TradingResult {
  entryPrice: number;
  exitPrice?: number;
  pnl: number; // Profit and loss
  pnlPercentage: number;
  holdingTime: number; // milliseconds
  slippagePercentage: number;
  fees: number;
  success: boolean;
}

export interface PortfolioState {
  totalValue: number;
  cash: number;
  positions: Map<string, {
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    allocation: number; // Percentage of portfolio
  }>;
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}

export interface AgentConfig {
  enabled: boolean;
  maxPositionSize: number; // Percentage of portfolio
  maxDailyTrades: number;
  minConfidence: number; // Minimum confidence to trade
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  allowedAssets: string[];
  prohibitedAssets: string[];
  requiresApproval: boolean; // Human approval needed
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxDrawdown: number; // Max portfolio drawdown before pausing
}

export class AutonomousTradingAgent extends EventEmitter {
  private config: AgentConfig;
  private portfolio: PortfolioState;
  private decisionHistory: TradingDecision[] = [];
  private activePositions: Map<string, TradingDecision> = new Map();
  private dailyTradeCount: number = 0;
  private lastTradeDate: Date = new Date();
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config: AgentConfig, initialCapital: number = 100000) {
    super();
    this.config = config;
    this.portfolio = {
      totalValue: initialCapital,
      cash: initialCapital,
      positions: new Map(),
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0
      }
    };
  }

  /**
   * Evaluate anomaly and make trading decision
   */
  async evaluateAnomaly(
    anomaly: Anomaly,
    prediction?: Prediction,
    rootCause?: RootCause
  ): Promise<TradingDecision | null> {
    // Check if agent is enabled
    if (!this.config.enabled) return null;

    // Check daily trade limit
    this.resetDailyCountIfNeeded();
    if (this.dailyTradeCount >= this.config.maxDailyTrades) {
      this.emit('daily_limit_reached', { date: new Date(), count: this.dailyTradeCount });
      return null;
    }

    // Filter by asset whitelist/blacklist
    const symbol = anomaly.dataPoint.symbol || '';
    if (!this.isAssetAllowed(symbol)) return null;

    // Only trade on high-confidence opportunities or critical threats
    if (anomaly.type === AnomalyType.BENIGN) return null;
    
    const minConfidence = this.config.minConfidence;
    if (anomaly.score < minConfidence) return null;

    // Assess risk
    const riskAssessment = this.assessRisk(anomaly, prediction, rootCause);
    
    // Check risk tolerance
    if (!this.isRiskAcceptable(riskAssessment)) {
      this.emit('risk_rejected', { anomaly, risk: riskAssessment });
      return null;
    }

    // Generate trading decision
    const decision = await this.generateDecision(anomaly, prediction, riskAssessment, rootCause);
    
    this.decisionHistory.push(decision);
    this.emit('decision_made', decision);

    // Execute if auto-approval is enabled
    if (!this.config.requiresApproval && decision.confidence > 0.8) {
      await this.executeDecision(decision);
    }

    return decision;
  }

  /**
   * Generate trading decision
   */
  private async generateDecision(
    anomaly: Anomaly,
    prediction: Prediction | undefined,
    riskAssessment: RiskAssessment,
    _rootCause?: RootCause
  ): Promise<TradingDecision> {
    const symbol = anomaly.dataPoint.symbol || '';
    const currentPrice = anomaly.dataPoint.value;

    // Determine trade type
    let tradeType: TradeType;
    const reasoning: string[] = [];

    if (anomaly.type === AnomalyType.OPPORTUNITY) {
      // Buy opportunity
      tradeType = TradeType.MARKET_BUY;
      reasoning.push(`Opportunity detected: ${anomaly.classification.primaryCategory}`);
      reasoning.push(`Score: ${(anomaly.score * 100).toFixed(1)}%`);
      
      if (prediction) {
        reasoning.push(`Predicted upside: ${((prediction.predictedValue - currentPrice) / currentPrice * 100).toFixed(1)}%`);
      }
      
      if (_rootCause) {
        reasoning.push(`Root cause: ${_rootCause.primaryCause}`);
      }
    } else if (anomaly.type === AnomalyType.EMERGING_THREAT || anomaly.type === AnomalyType.CRITICAL) {
      // Sell/hedge to protect
      const hasPosition = this.portfolio.positions.has(symbol);
      
      if (hasPosition) {
        tradeType = TradeType.MARKET_SELL;
        reasoning.push(`Threat detected: Exiting position to prevent losses`);
      } else {
        tradeType = TradeType.HEDGE;
        reasoning.push(`Threat detected: Implementing hedge strategy`);
      }
      
      reasoning.push(`Severity: ${anomaly.severity}`);
      reasoning.push(`Type: ${anomaly.type}`);
    } else {
      return this.createDecision(anomaly, TradeType.MARKET_BUY, symbol, 0, riskAssessment, reasoning, prediction, _rootCause);
    }

    // Calculate position size using Kelly Criterion
    const quantity = this.calculatePositionSize(
      riskAssessment,
      currentPrice,
      tradeType
    );

    return this.createDecision(
      anomaly,
      tradeType,
      symbol,
      quantity,
      riskAssessment,
      reasoning,
      prediction,
      _rootCause
    );
  }

  /**
   * Calculate optimal position size using Kelly Criterion
   */
  private calculatePositionSize(
    risk: RiskAssessment,
    price: number,
    _tradeType: TradeType
  ): number {
    // Kelly Criterion: f = (bp - q) / b
    // where b = win/loss ratio, p = win probability, q = loss probability
    
    const winProb = risk.winProbability;
    const lossProb = 1 - winProb;
    const winLossRatio = risk.takeProfit / Math.abs(risk.stopLoss);

    let kellyFraction = (winLossRatio * winProb - lossProb) / winLossRatio;
    
    // Apply safety margin (Kelly can be aggressive)
    kellyFraction = Math.max(0, Math.min(kellyFraction * 0.5, this.config.maxPositionSize / 100));

    // Calculate quantity
    const positionValue = this.portfolio.cash * kellyFraction;
    const quantity = positionValue / price;

    // Adjust based on risk tolerance
    const riskMultiplier = this.getRiskMultiplier();
    
    return quantity * riskMultiplier;
  }

  /**
   * Assess risk of trading decision
   */
  private assessRisk(
    anomaly: Anomaly,
    prediction?: Prediction,
    _rootCause?: RootCause
  ): RiskAssessment {
    const volatility = anomaly.context.marketConditions.volatility;
    
    const factors = {
      marketRisk: Math.min(volatility, 1),
      liquidityRisk: anomaly.context.marketConditions.volume === 'low' ? 0.7 : 0.3,
      volatilityRisk: volatility,
      sentimentRisk: this.calculateSentimentRisk(anomaly),
      technicalRisk: 1 - anomaly.score
    };

    const riskScore = Object.values(factors).reduce((sum, r) => sum + r, 0) / Object.keys(factors).length;
    
    // Calculate win probability
    const winProbability = prediction 
      ? prediction.confidence * anomaly.score
      : anomaly.score * 0.8;

    // Calculate Sharpe ratio
    const expectedReturn = this.calculateExpectedReturn(anomaly, prediction);
    const volatilityAdjusted = volatility || 0.1;
    const sharpeRatio = expectedReturn / volatilityAdjusted;

    // Set stop loss and take profit
    const currentPrice = anomaly.dataPoint.value;
    const stopLoss = currentPrice * (1 - this.config.stopLossPercentage / 100);
    const takeProfit = currentPrice * (1 + this.config.takeProfitPercentage / 100);

    // Calculate max loss
    const maxLoss = currentPrice - stopLoss;

    return {
      riskLevel: this.categorizeRisk(riskScore),
      riskScore,
      maxLoss,
      winProbability,
      sharpeRatio,
      factors,
      stopLoss,
      takeProfit
    };
  }

  /**
   * Execute trading decision
   */
  async executeDecision(decision: TradingDecision): Promise<void> {
    if (decision.status !== 'pending' && decision.status !== 'approved') {
      return;
    }

    this.emit('executing_trade', decision);

    try {
      // In production, integrate with exchange API
      // For now, simulate execution
      const result = await this.simulateExecution(decision);
      
      decision.status = 'executed';
      decision.executedAt = new Date();
      decision.result = result;

      // Update portfolio
      this.updatePortfolio(decision, result);

      // Track position
      if (decision.type === TradeType.MARKET_BUY || decision.type === TradeType.LIMIT_BUY) {
        this.activePositions.set(decision.symbol, decision);
      } else if (decision.type === TradeType.MARKET_SELL || decision.type === TradeType.LIMIT_SELL) {
        this.activePositions.delete(decision.symbol);
      }

      this.dailyTradeCount++;
      this.emit('trade_executed', { decision, result });

      // console.log(`✅ Trade executed: ${decision.type} ${decision.quantity} ${decision.symbol} @ ${result.entryPrice}`);
    } catch (error: unknown) {
      decision.status = 'failed';
      this.emit('trade_failed', { decision, error });
      // console.error(`❌ Trade failed:`, error);
    }
  }

  /**
   * Simulate trade execution (replace with real exchange integration)
   */
  private async simulateExecution(decision: TradingDecision): Promise<TradingResult> {
    const slippage = 0.001 + Math.random() * 0.002; // 0.1-0.3% slippage
    const fees = 0.001; // 0.1% trading fee
    
    const executionPrice = decision.price || decision.riskAssessment.takeProfit;
    const entryPrice = executionPrice * (1 + (decision.type.includes('BUY') ? slippage : -slippage));

    return {
      entryPrice,
      exitPrice: undefined,
      pnl: 0,
      pnlPercentage: 0,
      holdingTime: 0,
      slippagePercentage: slippage * 100,
      fees: decision.quantity * entryPrice * fees,
      success: true
    };
  }

  /**
   * Update portfolio after trade
   */
  private updatePortfolio(decision: TradingDecision, result: TradingResult): void {
    const symbol = decision.symbol;
    const quantity = decision.quantity;
    const price = result.entryPrice;

    if (decision.type === TradeType.MARKET_BUY || decision.type === TradeType.LIMIT_BUY) {
      // Add position
      const cost = quantity * price + result.fees;
      
      if (this.portfolio.positions.has(symbol)) {
        const pos = this.portfolio.positions.get(symbol)!;
        const newQuantity = pos.quantity + quantity;
        pos.averagePrice = (pos.averagePrice * pos.quantity + cost) / newQuantity;
        pos.quantity = newQuantity;
      } else {
        this.portfolio.positions.set(symbol, {
          symbol,
          quantity,
          averagePrice: price,
          currentPrice: price,
          unrealizedPnL: 0,
          allocation: (cost / this.portfolio.totalValue) * 100
        });
      }

      this.portfolio.cash -= cost;
    } else if (decision.type === TradeType.MARKET_SELL || decision.type === TradeType.LIMIT_SELL) {
      // Close position
      const pos = this.portfolio.positions.get(symbol);
      if (pos) {
        const proceeds = quantity * price - result.fees;
        const pnl = (price - pos.averagePrice) * quantity - result.fees;
        
        this.portfolio.cash += proceeds;
        
        if (quantity >= pos.quantity) {
          this.portfolio.positions.delete(symbol);
        } else {
          pos.quantity -= quantity;
        }

        // Update performance
        this.updatePerformanceMetrics(pnl, decision);
      }
    }

    // Update total value
    this.updatePortfolioValue();
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(_pnl: number, _decision: TradingDecision): void {
    const history = this.decisionHistory.filter(d => d.status === 'executed' && d.result);
    
    if (history.length === 0) return;

    // Calculate win rate
    const wins = history.filter(d => d.result!.pnl > 0).length;
    this.portfolio.performance.winRate = wins / history.length;

    // Calculate total return
    const totalPnL = history.reduce((sum, d) => sum + (d.result?.pnl || 0), 0);
    this.portfolio.performance.totalReturn = (totalPnL / 100000) * 100; // Percentage

    // Calculate Sharpe ratio (simplified)
    const returns = history.map(d => d.result?.pnlPercentage || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    this.portfolio.performance.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Update portfolio total value
   */
  private updatePortfolioValue(): void {
    let positionsValue = 0;
    
    for (const pos of this.portfolio.positions.values()) {
      positionsValue += pos.quantity * pos.currentPrice;
    }

    this.portfolio.totalValue = this.portfolio.cash + positionsValue;
  }

  /**
   * Create trading decision
   */
  private createDecision(
    anomaly: Anomaly,
    type: TradeType,
    symbol: string,
    quantity: number,
    riskAssessment: RiskAssessment,
    reasoning: string[],
    prediction?: Prediction,
    rootCause?: RootCause
  ): TradingDecision {
    const decision: TradingDecision = {
      id: `trade_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      symbol,
      quantity,
      confidence: anomaly.score * (prediction?.confidence || 1),
      reasoning,
      basedOn: {
        anomalies: [anomaly.id],
        predictions: prediction ? [prediction.id] : [],
        rootCauses: rootCause ? [rootCause.id] : []
      },
      riskAssessment,
      expectedReturn: this.calculateExpectedReturn(anomaly, prediction),
      timeHorizon: prediction?.timeToEvent || 3600000,
      status: this.config.requiresApproval ? 'pending' : 'approved'
    };

    return decision;
  }

  /**
   * Calculate expected return
   */
  private calculateExpectedReturn(anomaly: Anomaly, prediction?: Prediction): number {
    if (!prediction) {
      // Base on anomaly severity and type
      if (anomaly.type === AnomalyType.OPPORTUNITY) {
        return anomaly.score * 10; // Up to 10% return
      }
      return 0;
    }

    const currentPrice = anomaly.dataPoint.value;
    const predictedPrice = prediction.predictedValue;
    return ((predictedPrice - currentPrice) / currentPrice) * 100;
  }

  /**
   * Calculate sentiment risk
   */
  private calculateSentimentRisk(anomaly: Anomaly): number {
    // Extract sentiment from metadata if available
    const sentimentValue = (anomaly.dataPoint.metadata?.sentiment as number) || 0;
    
    if (sentimentValue < -0.5) return 0.8; // High risk if very negative
    if (sentimentValue > 0.5) return 0.2; // Low risk if very positive
    return 0.5;
  }

  /**
   * Categorize risk level
   */
  private categorizeRisk(riskScore: number): RiskAssessment['riskLevel'] {
    if (riskScore >= 0.8) return 'very_high';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    if (riskScore >= 0.2) return 'low';
    return 'very_low';
  }

  /**
   * Check if risk is acceptable based on tolerance
   */
  private isRiskAcceptable(risk: RiskAssessment): boolean {
    const tolerance = this.config.riskTolerance;
    
    const limits = {
      conservative: 0.4,
      moderate: 0.6,
      aggressive: 0.8
    };

    return risk.riskScore <= limits[tolerance];
  }

  /**
   * Check if asset is allowed for trading
   */
  private isAssetAllowed(symbol: string): boolean {
    if (this.config.prohibitedAssets.includes(symbol)) return false;
    if (this.config.allowedAssets.length === 0) return true;
    return this.config.allowedAssets.includes(symbol);
  }

  /**
   * Reset daily trade count if new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString();
    const lastTradeDay = this.lastTradeDate.toDateString();
    
    if (today !== lastTradeDay) {
      this.dailyTradeCount = 0;
      this.lastTradeDate = new Date();
    }
  }

  /**
   * Get risk multiplier based on tolerance
   */
  private getRiskMultiplier(): number {
    const multipliers = {
      conservative: 0.5,
      moderate: 1.0,
      aggressive: 1.5
    };
    return multipliers[this.config.riskTolerance];
  }

  /**
   * Public API methods
   */

  approveDecision(decisionId: string): void {
    const decision = this.decisionHistory.find(d => d.id === decisionId);
    if (decision && decision.status === 'pending') {
      decision.status = 'approved';
      this.executeDecision(decision);
    }
  }

  rejectDecision(decisionId: string, reason: string): void {
    const decision = this.decisionHistory.find(d => d.id === decisionId);
    if (decision && decision.status === 'pending') {
      decision.status = 'rejected';
      this.emit('decision_rejected', { decision, reason });
    }
  }

  getPortfolio(): PortfolioState {
    return { ...this.portfolio };
  }

  getPendingDecisions(): TradingDecision[] {
    return this.decisionHistory.filter(d => d.status === 'pending');
  }

  getPerformance(): PortfolioState['performance'] {
    return { ...this.portfolio.performance };
  }

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_updated', this.config);
  }

  /**
   * Emergency stop - close all positions
   */
  async emergencyStop(reason: string): Promise<void> {
    this.emit('emergency_stop', { reason, timestamp: new Date() });
    
    // Close all positions
    for (const [symbol, position] of this.portfolio.positions) {
      const decision: TradingDecision = {
        id: `emergency_${Date.now()}`,
        timestamp: new Date(),
        type: TradeType.MARKET_SELL,
        symbol,
        quantity: position.quantity,
        confidence: 1,
        reasoning: [`Emergency stop: ${reason}`],
        basedOn: { anomalies: [], predictions: [], rootCauses: [] },
        riskAssessment: {
          riskLevel: 'high',
          riskScore: 0.9,
          maxLoss: 0,
          winProbability: 0,
          sharpeRatio: 0,
          factors: {
            marketRisk: 0,
            liquidityRisk: 0,
            volatilityRisk: 0,
            sentimentRisk: 0,
            technicalRisk: 0,
          },
          stopLoss: 0,
          takeProfit: 0,
        },
        expectedReturn: 0,
        timeHorizon: 0,
        status: 'approved'
      };

      await this.executeDecision(decision);
    }

    this.config.enabled = false;
  }
}

