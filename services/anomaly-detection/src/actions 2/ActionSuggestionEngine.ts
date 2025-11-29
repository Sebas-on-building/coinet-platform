/**
 * Action Suggestion Engine
 * Generates actionable recommendations based on detected anomalies and domain knowledge
 */

import {
  Anomaly,
  Action,
  AnomalyType,
  AnomalySeverity,
  DataSource
} from '../core/types';
import { v4 as uuidv4 } from 'uuid';

interface ActionTemplate {
  priority: Action['priority'];
  category: Action['category'];
  description: string;
  detailsGenerator: (_anomaly: Anomaly) => string;
  estimatedImpact?: {
    potential: string;
    risk: string;
    timeframe: string;
  };
  prerequisites?: string[];
  automatable: boolean;
}

interface ActionRule {
  condition: (_anomaly: Anomaly) => boolean;
  template: ActionTemplate;
}

export class ActionSuggestionEngine {
  private actionRules: ActionRule[] = [];

  constructor() {
    this.initializeActionRules();
  }

  /**
   * Suggest actions for an anomaly
   */
  async suggestActions(anomaly: Anomaly): Promise<Action[]> {
    const actions: Action[] = [];

    // Apply action rules
    for (const rule of this.actionRules) {
      if (rule.condition(anomaly)) {
        const action = this.createAction(anomaly, rule.template);
        actions.push(action);
      }
    }

    // Add context-specific actions
    const contextActions = this.generateContextualActions(anomaly);
    actions.push(...contextActions);

    // Sort by priority
    return this.prioritizeActions(actions);
  }

  /**
   * Suggest actions for multiple anomalies (with deduplication)
   */
  async suggestActionsBatch(anomalies: Anomaly[]): Promise<Map<string, Action[]>> {
    const actionMap = new Map<string, Action[]>();

    for (const anomaly of anomalies) {
      const actions = await this.suggestActions(anomaly);
      anomaly.suggestedActions = actions;
      actionMap.set(anomaly.id, actions);
    }

    return actionMap;
  }

  /**
   * Create action from template
   */
  private createAction(anomaly: Anomaly, template: ActionTemplate): Action {
    return {
      id: uuidv4(),
      priority: template.priority,
      category: template.category,
      description: template.description,
      details: template.detailsGenerator(anomaly),
      estimatedImpact: template.estimatedImpact,
      prerequisites: template.prerequisites,
      automatable: template.automatable
    };
  }

  /**
   * Initialize action rules
   */
  private initializeActionRules(): void {
    // CRITICAL ACTIONS

    // Critical anomaly - immediate investigation
    this.actionRules.push({
      condition: (a) => a.type === AnomalyType.CRITICAL,
      template: {
        priority: 'urgent',
        category: 'investigate',
        description: 'URGENT: Investigate critical anomaly immediately',
        detailsGenerator: (a) => 
          `Critical ${a.source} anomaly detected for ${a.dataPoint.symbol || 'system'}. ` +
          `Deviation: ${a.deviation.standardDeviations.toFixed(2)}σ. ` +
          `${a.context.correlatedEvents.length > 0 ? `Correlated with ${a.context.correlatedEvents.length} other events.` : ''} ` +
          `Review all related systems and data sources immediately.`,
        estimatedImpact: {
          potential: 'System-wide impact possible',
          risk: 'Very High',
          timeframe: 'Immediate'
        },
        prerequisites: ['Admin access', 'System monitoring access'],
        automatable: false
      }
    });

    // OPPORTUNITY ACTIONS

    // Volume spike opportunity
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.OPPORTUNITY &&
        a.source === DataSource.TRADING_VOLUME &&
        a.deviation.standardDeviations > 3,
      template: {
        priority: 'high',
        category: 'trade',
        description: 'Trading opportunity: Unusual volume spike detected',
        detailsGenerator: (a) =>
          `${a.dataPoint.symbol} showing ${a.deviation.relativeDifference.toFixed(1)}% increase in trading volume. ` +
          `Current volume: ${a.dataPoint.metadata?.tradeCount || 'N/A'} trades. ` +
          `Market trend: ${a.context.marketConditions.trend}. ` +
          `Consider: ${a.context.marketConditions.trend === 'bullish' ? 'Long position entry' : 'Monitor for confirmation'}.`,
        estimatedImpact: {
          potential: 'Momentum trade opportunity',
          risk: 'Medium',
          timeframe: '1-24 hours'
        },
        prerequisites: ['Trading account active', 'Sufficient capital'],
        automatable: true
      }
    });

    // Positive sentiment surge
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.OPPORTUNITY &&
        a.source === DataSource.SENTIMENT &&
        a.dataPoint.value > 0.5,
      template: {
        priority: 'medium',
        category: 'monitor',
        description: 'Monitor positive sentiment surge',
        detailsGenerator: (a) =>
          `${a.dataPoint.symbol} experiencing strong positive sentiment shift to ${(a.dataPoint.value * 100).toFixed(1)}%. ` +
          `Social volume: ${a.dataPoint.metadata?.messageCount || 0} mentions. ` +
          `Distribution: ${JSON.stringify(a.dataPoint.metadata?.sentimentDistribution || {})}. ` +
          `Action: Monitor for price movement confirmation and consider position sizing.`,
        estimatedImpact: {
          potential: 'Price appreciation if sustained',
          risk: 'Low to Medium',
          timeframe: '1-7 days'
        },
        automatable: true
      }
    });

    // Whale accumulation
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.OPPORTUNITY &&
        a.source === DataSource.WALLET_ACTIVITY &&
        (a.dataPoint.metadata.whaleActivity as number) > 3,
      template: {
        priority: 'high',
        category: 'investigate',
        description: 'Smart money activity detected',
        detailsGenerator: (a) =>
          `Whale wallets showing increased activity on ${a.dataPoint.chain}. ` +
          `${(a.dataPoint.metadata.whaleActivity as number) || 0} large transactions detected. ` +
          `Unique addresses: ${a.dataPoint.metadata?.uniqueAddresses || 0}. ` +
          `Action: Analyze wallet addresses, track flow of funds, consider following smart money.`,
        estimatedImpact: {
          potential: 'Early position in accumulation phase',
          risk: 'Medium',
          timeframe: '1-30 days'
        },
        prerequisites: ['On-chain analytics access'],
        automatable: false
      }
    });

    // THREAT ACTIONS

    // Price crash - risk management
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.EMERGING_THREAT &&
        a.source === DataSource.PRICE_MOVEMENT &&
        a.deviation.relativeDifference < -15,
      template: {
        priority: 'urgent',
        category: 'hedge',
        description: 'Risk Alert: Significant price drop detected',
        detailsGenerator: (a) =>
          `${a.dataPoint.symbol} dropped ${Math.abs(a.deviation.relativeDifference).toFixed(1)}% rapidly. ` +
          `Current price: ${a.dataPoint.value}. Volatility: ${a.context.marketConditions.volatility.toFixed(2)}. ` +
          `ACTIONS: ` +
          `1. Review existing positions and consider stop-loss orders. ` +
          `2. Check for fundamental news or events. ` +
          `3. Assess if this is temporary or systemic. ` +
          `4. Consider hedging strategies or reducing exposure.`,
        estimatedImpact: {
          potential: 'Prevent further losses',
          risk: 'High',
          timeframe: 'Immediate'
        },
        automatable: true
      }
    });

    // Negative sentiment collapse
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.EMERGING_THREAT &&
        a.source === DataSource.SENTIMENT &&
        a.dataPoint.value < -0.5,
      template: {
        priority: 'high',
        category: 'investigate',
        description: 'Reputation risk: Negative sentiment spike',
        detailsGenerator: (a) =>
          `${a.dataPoint.symbol} experiencing severe negative sentiment: ${(a.dataPoint.value * 100).toFixed(1)}%. ` +
          `Change: ${a.deviation.relativeDifference.toFixed(1)}%. ` +
          `Top sources: ${JSON.stringify(a.dataPoint.metadata?.bySource || {})}. ` +
          `ACTIONS: ` +
          `1. Identify the source and cause of negative sentiment. ` +
          `2. Review recent news, announcements, and social media. ` +
          `3. Assess if concerns are valid or FUD. ` +
          `4. Consider public response or damage control.`,
        estimatedImpact: {
          potential: 'Mitigate reputational damage',
          risk: 'High',
          timeframe: '1-7 days'
        },
        prerequisites: ['Social media access', 'PR team'],
        automatable: false
      }
    });

    // Suspicious wallet activity
    this.actionRules.push({
      condition: (a) =>
        a.type === AnomalyType.EMERGING_THREAT &&
        a.source === DataSource.WALLET_ACTIVITY &&
        a.severity === AnomalySeverity.CRITICAL,
      template: {
        priority: 'urgent',
        category: 'investigate',
        description: 'Security Alert: Suspicious wallet activity',
        detailsGenerator: (a) =>
          `Critical wallet activity anomaly on ${a.dataPoint.chain}. ` +
          `Transaction count: ${a.dataPoint.metadata?.transactionCount || 0}. ` +
          `SECURITY ACTIONS: ` +
          `1. Investigate wallet addresses for known threats. ` +
          `2. Check for potential exploit or attack patterns. ` +
          `3. Review smart contract interactions. ` +
          `4. Consider alerting security team or pausing contracts if necessary.`,
        estimatedImpact: {
          potential: 'Prevent security breach or exploit',
          risk: 'Critical',
          timeframe: 'Immediate'
        },
        prerequisites: ['Security team access', 'Contract admin rights'],
        automatable: false
      }
    });

    // Network fee spike
    this.actionRules.push({
      condition: (a) =>
        a.source === DataSource.NETWORK_FEES &&
        a.deviation.standardDeviations > 4,
      template: {
        priority: 'high',
        category: 'investigate',
        description: 'Network congestion or attack detected',
        detailsGenerator: (a) =>
          `Network fees on ${a.dataPoint.chain} spiked ${a.deviation.relativeDifference.toFixed(1)}%. ` +
          `Current average: ${a.dataPoint.value} ${a.dataPoint.chain === 'ethereum' ? 'Gwei' : 'units'}. ` +
          `ACTIONS: ` +
          `1. Investigate cause (congestion, spam, or attack). ` +
          `2. Delay non-urgent transactions. ` +
          `3. Monitor for front-running or MEV activity. ` +
          `4. Check if this affects your protocol or users.`,
        estimatedImpact: {
          potential: 'Reduce transaction costs and risks',
          risk: 'Medium',
          timeframe: '1-6 hours'
        },
        automatable: true
      }
    });

    // MONITORING ACTIONS

    // Correlated events
    this.actionRules.push({
      condition: (a) => a.context.correlatedEvents.length >= 2,
      template: {
        priority: 'medium',
        category: 'monitor',
        description: 'Monitor correlated anomalies',
        detailsGenerator: (a) =>
          `This anomaly is correlated with ${a.context.correlatedEvents.length} other events: ` +
          `${a.context.correlatedEvents.map(e => `${e.source} (${(e.correlation * 100).toFixed(0)}%)`).join(', ')}. ` +
          `This may indicate a broader market movement or systemic pattern. ` +
          `Continue monitoring for pattern development.`,
        estimatedImpact: {
          potential: 'Better understanding of market dynamics',
          risk: 'Low',
          timeframe: 'Ongoing'
        },
        automatable: true
      }
    });

    // High volatility period
    this.actionRules.push({
      condition: (a) => a.context.marketConditions.volatility > 0.5,
      template: {
        priority: 'medium',
        category: 'alert',
        description: 'High volatility alert',
        detailsGenerator: (a) =>
          `${a.dataPoint.symbol || 'Market'} experiencing high volatility (${(a.context.marketConditions.volatility * 100).toFixed(1)}%). ` +
          `Consider: ` +
          `1. Tighter stop-losses. ` +
          `2. Reduced position sizes. ` +
          `3. Increased monitoring frequency. ` +
          `4. Avoiding new positions until volatility subsides.`,
        automatable: true
      }
    });
  }

  /**
   * Generate contextual actions based on anomaly context
   */
  private generateContextualActions(anomaly: Anomaly): Action[] {
    const actions: Action[] = [];

    // Time-based actions
    if (!anomaly.context.timeContext.isTradingHours) {
      actions.push({
        id: uuidv4(),
        priority: 'low',
        category: 'monitor',
        description: 'After-hours anomaly',
        details: 'Anomaly detected outside normal trading hours. Monitor for continuation or reversal during regular hours.',
        automatable: true
      });
    }

    // Historical comparison actions
    if (anomaly.context.historicalComparison.similarEvents > 5) {
      actions.push({
        id: uuidv4(),
        priority: 'low',
        category: 'investigate',
        description: 'Review historical pattern',
        details: `Similar anomalies have occurred ${anomaly.context.historicalComparison.similarEvents} times before. ` +
                `Review historical outcomes to inform current strategy.`,
        automatable: false
      });
    }

    // Market condition actions
    if (anomaly.context.marketConditions.trend === 'bearish' && 
        anomaly.type === AnomalyType.OPPORTUNITY) {
      actions.push({
        id: uuidv4(),
        priority: 'medium',
        category: 'alert',
        description: 'Opportunity in bearish market',
        details: 'Opportunity detected in bearish market conditions. Exercise extra caution and wait for confirmation.',
        automatable: true
      });
    }

    return actions;
  }

  /**
   * Prioritize and deduplicate actions
   */
  private prioritizeActions(actions: Action[]): Action[] {
    // Remove duplicates based on description similarity
    const unique = actions.filter((action, index, self) =>
      index === self.findIndex(a => 
        a.description === action.description &&
        a.category === action.category
      )
    );

    // Sort by priority
    const priorityOrder = {
      'urgent': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    };

    return unique.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Generate action summary for multiple anomalies
   */
  generateActionSummary(anomalies: Anomaly[]): {
    totalActions: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    topActions: Action[];
    automatable: number;
  } {
    const allActions = anomalies.flatMap(a => a.suggestedActions);
    
    const byPriority: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const byCategory: Record<string, number> = {
      investigate: 0,
      alert: 0,
      trade: 0,
      monitor: 0,
      hedge: 0
    };

    let automatable = 0;

    for (const action of allActions) {
      byPriority[action.priority]++;
      byCategory[action.category]++;
      if (action.automatable) automatable++;
    }

    // Get top 10 actions by priority
    const topActions = this.prioritizeActions(allActions).slice(0, 10);

    return {
      totalActions: allActions.length,
      byPriority,
      byCategory,
      topActions,
      automatable
    };
  }

  /**
   * Filter actions by criteria
   */
  filterActions(
    actions: Action[],
    criteria: {
      priority?: Action['priority'][];
      category?: Action['category'][];
      automatable?: boolean;
    }
  ): Action[] {
    return actions.filter(action => {
      if (criteria.priority && !criteria.priority.includes(action.priority)) {
        return false;
      }
      if (criteria.category && !criteria.category.includes(action.category)) {
        return false;
      }
      if (criteria.automatable !== undefined && action.automatable !== criteria.automatable) {
        return false;
      }
      return true;
    });
  }

  /**
   * Add custom action rule
   */
  addActionRule(rule: ActionRule): void {
    this.actionRules.push(rule);
  }

  /**
   * Get all action rules
   */
  getActionRules(): ActionRule[] {
    return [...this.actionRules];
  }
}

