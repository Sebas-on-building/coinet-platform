/**
 * Anomaly Classifier
 * Classifies anomalies as benign, threats, or opportunities using domain knowledge and ML
 */

import {
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  DataSource,
  AnomalyClassification
} from '../core/types';

interface ClassificationRule {
  name: string;
  condition: (_anomaly: Anomaly) => boolean;
  type: AnomalyType;
  reasoning: string;
  confidence: number;
}

interface DomainKnowledge {
  category: string;
  indicators: string[];
  implications: string[];
}

export class AnomalyClassifier {
  private domainKnowledgeBase: Map<string, DomainKnowledge> = new Map();
  private classificationRules: ClassificationRule[] = [];

  constructor() {
    this.initializeDomainKnowledge();
    this.initializeClassificationRules();
  }

  /**
   * Classify an anomaly
   */
  async classify(anomaly: Anomaly): Promise<AnomalyClassification> {
    // Apply classification rules
    const matchedRules = this.applyRules(anomaly);
    
    if (matchedRules.length === 0) {
      return this.defaultClassification(anomaly);
    }

    // Aggregate rule results
    const typeVotes = new Map<AnomalyType, number>();
    const allReasoning: string[] = [];
    const allKnowledge: string[] = [];
    let totalConfidence = 0;

    for (const rule of matchedRules) {
      const currentVotes = typeVotes.get(rule.type) || 0;
      typeVotes.set(rule.type, currentVotes + rule.confidence);
      
      allReasoning.push(rule.reasoning);
      totalConfidence += rule.confidence;

      // Add domain knowledge
      const knowledge = this.getDomainKnowledge(anomaly, rule.type);
      allKnowledge.push(...knowledge);
    }

    // Determine primary type
    let primaryType = AnomalyType.BENIGN;
    let maxVotes = 0;

    for (const [type, votes] of typeVotes) {
      if (votes > maxVotes) {
        maxVotes = votes;
        primaryType = type;
      }
    }

    // Update anomaly type
    anomaly.type = primaryType;

    // Generate classification
    const classification: AnomalyClassification = {
      primaryCategory: this.getCategoryName(primaryType, anomaly),
      subCategories: this.getSubCategories(anomaly, matchedRules),
      confidence: Math.min(totalConfidence / matchedRules.length, 1),
      reasoning: allReasoning,
      domainKnowledge: [...new Set(allKnowledge)] // Remove duplicates
    };

    return classification;
  }

  /**
   * Classify multiple anomalies
   */
  async classifyBatch(anomalies: Anomaly[]): Promise<Map<string, AnomalyClassification>> {
    const classifications = new Map<string, AnomalyClassification>();

    for (const anomaly of anomalies) {
      const classification = await this.classify(anomaly);
      anomaly.classification = classification;
      classifications.set(anomaly.id, classification);
    }

    return classifications;
  }

  /**
   * Initialize domain knowledge base
   */
  private initializeDomainKnowledge(): void {
    // Trading Volume Anomalies
    this.domainKnowledgeBase.set('volume_spike_opportunity', {
      category: 'Trading Volume - Opportunity',
      indicators: [
        'Sudden increase in trading volume',
        'Positive price correlation',
        'High liquidity'
      ],
      implications: [
        'Potential accumulation by smart money',
        'Upcoming news or developments',
        'Breakout opportunity'
      ]
    });

    this.domainKnowledgeBase.set('volume_spike_threat', {
      category: 'Trading Volume - Threat',
      indicators: [
        'Sudden increase in volume with price drop',
        'High sell pressure',
        'Exchange outflows'
      ],
      implications: [
        'Potential distribution/dumping',
        'Insider selling',
        'Market manipulation'
      ]
    });

    // Price Movement Anomalies
    this.domainKnowledgeBase.set('price_pump', {
      category: 'Price Movement - Opportunity',
      indicators: [
        'Rapid price increase',
        'Strong momentum',
        'Increasing volume'
      ],
      implications: [
        'Momentum trade opportunity',
        'Potential trend reversal',
        'Market sentiment shift'
      ]
    });

    this.domainKnowledgeBase.set('price_crash', {
      category: 'Price Movement - Threat',
      indicators: [
        'Rapid price decrease',
        'High volatility',
        'Panic selling'
      ],
      implications: [
        'Exit positions to avoid losses',
        'Potential buying opportunity after capitulation',
        'Check for fundamental issues'
      ]
    });

    // Sentiment Anomalies
    this.domainKnowledgeBase.set('sentiment_surge', {
      category: 'Sentiment - Opportunity',
      indicators: [
        'Rapid positive sentiment increase',
        'High social volume',
        'Influential accounts engaging'
      ],
      implications: [
        'Growing community interest',
        'Potential price momentum',
        'Increased awareness'
      ]
    });

    this.domainKnowledgeBase.set('sentiment_collapse', {
      category: 'Sentiment - Threat',
      indicators: [
        'Rapid negative sentiment increase',
        'FUD spreading',
        'Community concerns'
      ],
      implications: [
        'Potential selloff',
        'Reputational damage',
        'Need for damage control'
      ]
    });

    // Wallet Activity Anomalies
    this.domainKnowledgeBase.set('whale_accumulation', {
      category: 'Wallet Activity - Opportunity',
      indicators: [
        'Large wallets accumulating',
        'Exchange inflows decreasing',
        'HODLer behavior increasing'
      ],
      implications: [
        'Smart money positioning',
        'Supply shock potential',
        'Bullish long-term signal'
      ]
    });

    this.domainKnowledgeBase.set('whale_distribution', {
      category: 'Wallet Activity - Threat',
      indicators: [
        'Large wallets selling',
        'Exchange inflows increasing',
        'Insider movements'
      ],
      implications: [
        'Potential price pressure',
        'Insider knowledge of issues',
        'Consider reducing exposure'
      ]
    });

    // Network Fee Anomalies
    this.domainKnowledgeBase.set('fee_spike', {
      category: 'Network Fees - Threat',
      indicators: [
        'Abnormally high gas prices',
        'Network congestion',
        'Front-running activity'
      ],
      implications: [
        'Network stress',
        'Potential attack or exploit',
        'Trading costs increased'
      ]
    });

    // On-Chain Metrics
    this.domainKnowledgeBase.set('onchain_growth', {
      category: 'On-Chain - Opportunity',
      indicators: [
        'Increasing active addresses',
        'Growing transaction count',
        'DeFi protocol growth'
      ],
      implications: [
        'Network adoption increasing',
        'Fundamental strength',
        'Long-term bullish'
      ]
    });
  }

  /**
   * Initialize classification rules
   */
  private initializeClassificationRules(): void {
    // OPPORTUNITY RULES

    // Volume spike with price increase = Accumulation opportunity
    this.classificationRules.push({
      name: 'volume_price_surge',
      condition: (a) => 
        a.source === DataSource.TRADING_VOLUME &&
        a.deviation.standardDeviations > 3 &&
        a.context.marketConditions.trend === 'bullish' &&
        a.context.marketConditions.volume === 'high',
      type: AnomalyType.OPPORTUNITY,
      reasoning: 'Unusual volume spike with bullish price action suggests accumulation',
      confidence: 0.8
    });

    // Positive sentiment surge
    this.classificationRules.push({
      name: 'sentiment_surge',
      condition: (a) =>
        a.source === DataSource.SENTIMENT &&
        a.dataPoint.value > 0.6 &&
        a.deviation.relativeDifference > 30,
      type: AnomalyType.OPPORTUNITY,
      reasoning: 'Strong positive sentiment shift indicates growing interest',
      confidence: 0.7
    });

    // Whale accumulation
    this.classificationRules.push({
      name: 'whale_accumulation',
      condition: (a) =>
        a.source === DataSource.WALLET_ACTIVITY &&
        (a.dataPoint.metadata?.whaleActivity as number) > 5 &&
        a.deviation.standardDeviations > 2,
      type: AnomalyType.OPPORTUNITY,
      reasoning: 'Increased whale activity suggests smart money positioning',
      confidence: 0.75
    });

    // Network growth
    this.classificationRules.push({
      name: 'network_growth',
      condition: (a) =>
        a.source === DataSource.ON_CHAIN_METRICS &&
        a.deviation.relativeDifference > 20 &&
        (a.dataPoint.metadata?.uniqueAddresses as number) > 0,
      type: AnomalyType.OPPORTUNITY,
      reasoning: 'Rapid network growth indicates increasing adoption',
      confidence: 0.7
    });

    // THREAT RULES

    // Volume spike with price crash = Distribution threat
    this.classificationRules.push({
      name: 'distribution_pattern',
      condition: (a) =>
        a.source === DataSource.TRADING_VOLUME &&
        a.deviation.standardDeviations > 3 &&
        a.context.marketConditions.trend === 'bearish' &&
        a.severity === AnomalySeverity.HIGH,
      type: AnomalyType.EMERGING_THREAT,
      reasoning: 'High volume with bearish trend suggests distribution or panic',
      confidence: 0.85
    });

    // Negative sentiment collapse
    this.classificationRules.push({
      name: 'sentiment_collapse',
      condition: (a) =>
        a.source === DataSource.SENTIMENT &&
        a.dataPoint.value < -0.5 &&
        a.deviation.relativeDifference < -30,
      type: AnomalyType.EMERGING_THREAT,
      reasoning: 'Severe negative sentiment shift indicates reputational risk',
      confidence: 0.8
    });

    // Suspicious wallet activity
    this.classificationRules.push({
      name: 'suspicious_wallet',
      condition: (a) =>
        a.source === DataSource.WALLET_ACTIVITY &&
        a.severity === AnomalySeverity.CRITICAL,
      type: AnomalyType.EMERGING_THREAT,
      reasoning: 'Critical wallet activity anomaly detected',
      confidence: 0.9
    });

    // Network fee spike (potential attack)
    this.classificationRules.push({
      name: 'network_attack',
      condition: (a) =>
        a.source === DataSource.NETWORK_FEES &&
        a.deviation.standardDeviations > 5,
      type: AnomalyType.EMERGING_THREAT,
      reasoning: 'Extreme network fee spike may indicate attack or congestion',
      confidence: 0.7
    });

    // Price crash
    this.classificationRules.push({
      name: 'price_crash',
      condition: (a) =>
        a.source === DataSource.PRICE_MOVEMENT &&
        a.deviation.relativeDifference < -20 &&
        a.severity >= AnomalySeverity.HIGH,
      type: AnomalyType.EMERGING_THREAT,
      reasoning: 'Severe price drop indicates potential systemic issue',
      confidence: 0.85
    });

    // CRITICAL RULES (override others)

    // Multiple correlated threats
    this.classificationRules.push({
      name: 'correlated_threats',
      condition: (a) =>
        a.context.correlatedEvents.length >= 3 &&
        a.severity >= AnomalySeverity.HIGH,
      type: AnomalyType.CRITICAL,
      reasoning: 'Multiple correlated anomalies suggest systemic risk',
      confidence: 0.95
    });

    // Extreme deviation
    this.classificationRules.push({
      name: 'extreme_anomaly',
      condition: (a) =>
        a.deviation.standardDeviations > 6 ||
        a.score > 0.95,
      type: AnomalyType.CRITICAL,
      reasoning: 'Extreme statistical deviation requires immediate attention',
      confidence: 0.9
    });

    // BENIGN RULES

    // Low severity with expected pattern
    this.classificationRules.push({
      name: 'expected_variation',
      condition: (a) =>
        a.severity === AnomalySeverity.LOW &&
        !!a.baseline.seasonalPatterns &&
        a.baseline.seasonalPatterns.length > 0,
      type: AnomalyType.BENIGN,
      reasoning: 'Low severity anomaly matches known seasonal pattern',
      confidence: 0.8
    });

    // Weekend/holiday pattern
    this.classificationRules.push({
      name: 'time_based_pattern',
      condition: (a) =>
        (a.context.timeContext.dayOfWeek === 'Saturday' ||
         a.context.timeContext.dayOfWeek === 'Sunday' ||
         a.context.timeContext.isHoliday) &&
        a.severity <= AnomalySeverity.MEDIUM,
      type: AnomalyType.BENIGN,
      reasoning: 'Anomaly aligns with typical weekend/holiday patterns',
      confidence: 0.7
    });
  }

  /**
   * Apply classification rules to anomaly
   */
  private applyRules(anomaly: Anomaly): ClassificationRule[] {
    return this.classificationRules.filter(rule => rule.condition(anomaly));
  }

  /**
   * Get domain knowledge for anomaly
   */
  private getDomainKnowledge(anomaly: Anomaly, type: AnomalyType): string[] {
    const knowledge: string[] = [];

    // Map anomaly characteristics to knowledge base
    const knowledgeKeys: string[] = [];

    if (anomaly.source === DataSource.TRADING_VOLUME) {
      if (type === AnomalyType.OPPORTUNITY) {
        knowledgeKeys.push('volume_spike_opportunity');
      } else if (type === AnomalyType.EMERGING_THREAT) {
        knowledgeKeys.push('volume_spike_threat');
      }
    }

    if (anomaly.source === DataSource.PRICE_MOVEMENT) {
      if (anomaly.deviation.relativeDifference > 0 && type === AnomalyType.OPPORTUNITY) {
        knowledgeKeys.push('price_pump');
      } else if (anomaly.deviation.relativeDifference < 0 && type === AnomalyType.EMERGING_THREAT) {
        knowledgeKeys.push('price_crash');
      }
    }

    if (anomaly.source === DataSource.SENTIMENT) {
      if (anomaly.dataPoint.value > 0 && type === AnomalyType.OPPORTUNITY) {
        knowledgeKeys.push('sentiment_surge');
      } else if (anomaly.dataPoint.value < 0 && type === AnomalyType.EMERGING_THREAT) {
        knowledgeKeys.push('sentiment_collapse');
      }
    }

    if (anomaly.source === DataSource.WALLET_ACTIVITY) {
      if (type === AnomalyType.OPPORTUNITY) {
        knowledgeKeys.push('whale_accumulation');
      } else if (type === AnomalyType.EMERGING_THREAT) {
        knowledgeKeys.push('whale_distribution');
      }
    }

    if (anomaly.source === DataSource.NETWORK_FEES) {
      knowledgeKeys.push('fee_spike');
    }

    if (anomaly.source === DataSource.ON_CHAIN_METRICS && type === AnomalyType.OPPORTUNITY) {
      knowledgeKeys.push('onchain_growth');
    }

    // Extract knowledge
    for (const key of knowledgeKeys) {
      const domainKnowledge = this.domainKnowledgeBase.get(key);
      if (domainKnowledge) {
        knowledge.push(`Indicators: ${domainKnowledge.indicators.join(', ')}`);
        knowledge.push(`Implications: ${domainKnowledge.implications.join(', ')}`);
      }
    }

    return knowledge;
  }

  /**
   * Get category name
   */
  private getCategoryName(type: AnomalyType, anomaly: Anomaly): string {
    const sourceMap: Record<DataSource, string> = {
      [DataSource.TRADING_VOLUME]: 'Trading Volume',
      [DataSource.PRICE_MOVEMENT]: 'Price Movement',
      [DataSource.SENTIMENT]: 'Market Sentiment',
      [DataSource.WALLET_ACTIVITY]: 'Wallet Activity',
      [DataSource.NETWORK_FEES]: 'Network Fees',
      [DataSource.SOCIAL_VOLUME]: 'Social Activity',
      [DataSource.ON_CHAIN_METRICS]: 'On-Chain Metrics',
      [DataSource.NEWS_FLOW]: 'News Flow',
      [DataSource.LIQUIDITY]: 'Liquidity',
      [DataSource.MARKET_DEPTH]: 'Market Depth'
    };

    const typeMap: Record<AnomalyType, string> = {
      [AnomalyType.BENIGN]: 'Benign',
      [AnomalyType.EMERGING_THREAT]: 'Threat',
      [AnomalyType.OPPORTUNITY]: 'Opportunity',
      [AnomalyType.CRITICAL]: 'Critical'
    };

    return `${sourceMap[anomaly.source]} - ${typeMap[type]}`;
  }

  /**
   * Get sub-categories
   */
  private getSubCategories(
    anomaly: Anomaly,
    rules: ClassificationRule[]
  ): string[] {
    const categories = new Set<string>();

    for (const rule of rules) {
      categories.add(rule.name);
    }

    // Add context-based categories
    if (anomaly.context.correlatedEvents.length > 0) {
      categories.add('correlated_event');
    }

    if (anomaly.severity === AnomalySeverity.CRITICAL) {
      categories.add('critical_severity');
    }

    if (anomaly.context.marketConditions.volatility > 0.5) {
      categories.add('high_volatility');
    }

    return Array.from(categories);
  }

  /**
   * Default classification when no rules match
   */
  private defaultClassification(anomaly: Anomaly): AnomalyClassification {
    // Default to benign for low severity, threat for high severity
    let type = AnomalyType.BENIGN;
    let confidence = 0.5;

    if (anomaly.severity === AnomalySeverity.CRITICAL) {
      type = AnomalyType.CRITICAL;
      confidence = 0.7;
    } else if (anomaly.severity === AnomalySeverity.HIGH) {
      type = AnomalyType.EMERGING_THREAT;
      confidence = 0.6;
    }

    anomaly.type = type;

    return {
      primaryCategory: this.getCategoryName(type, anomaly),
      subCategories: ['unclassified'],
      confidence,
      reasoning: ['No specific classification rule matched'],
      domainKnowledge: ['General anomaly detected - requires manual review']
    };
  }

  /**
   * Add custom classification rule
   */
  addRule(rule: ClassificationRule): void {
    this.classificationRules.push(rule);
  }

  /**
   * Add domain knowledge
   */
  addDomainKnowledge(key: string, knowledge: DomainKnowledge): void {
    this.domainKnowledgeBase.set(key, knowledge);
  }

  /**
   * Get all classification rules
   */
  getRules(): ClassificationRule[] {
    return [...this.classificationRules];
  }

  /**
   * Get domain knowledge base
   */
  getDomainKnowledgeBase(): Map<string, DomainKnowledge> {
    return new Map(this.domainKnowledgeBase);
  }
}

