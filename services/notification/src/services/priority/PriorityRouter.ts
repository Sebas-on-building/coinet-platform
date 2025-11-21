import { Logger } from '@/utils/Logger';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationChannel = 'email' | 'sms' | 'discord' | 'telegram' | 'push' | 'in_app';

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  fallbackChannels: NotificationChannel[];
  costWeight: number; // 1-10 scale (1 = cheapest, 10 = most expensive)
  reliabilityWeight: number; // 1-10 scale (1 = least reliable, 10 = most reliable)
  urgencyWeight: number; // 1-10 scale (1 = least urgent, 10 = most urgent)
}

export interface PriorityConfig {
  priority: NotificationPriority;
  channels: ChannelConfig[];
  maxChannels: number;
  requireConfirmation: boolean;
  escalationDelay: number; // milliseconds
  autoEscalate: boolean;
}

export interface NotificationContext {
  userId: string;
  eventType: string;
  priority?: NotificationPriority;
  confidence?: number; // 0-100 confidence score
  marketImpact?: number; // 0-100 market impact score
  estimatedValue?: number; // monetary value of notification
  urgency?: number; // 0-100 urgency score
  category?: string; // notification category (e.g., 'security', 'financial', 'system')
  metadata?: Record<string, any>;
}

export interface RoutingDecision {
  priority: NotificationPriority;
  channels: NotificationChannel[];
  reasoning: string;
  confidence: number;
  shouldEscalate: boolean;
  escalationDelay?: number;
  requireConfirmation: boolean;
}

export interface UserPriorityOverride {
  userId: string;
  eventType?: string;
  category?: string;
  priorityMappings: Record<string, NotificationPriority>;
  channelPreferences: Record<NotificationPriority, NotificationChannel[]>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PriorityRouter {
  private static instance: PriorityRouter;
  private logger: Logger;

  // Default priority configurations
  private defaultPriorityConfigs: Map<NotificationPriority, PriorityConfig> = new Map();

  // User overrides storage (in production, use database)
  private userOverrides: Map<string, UserPriorityOverride> = new Map();

  // Channel cost-effectiveness matrix
  private channelMatrix: Map<NotificationChannel, ChannelConfig> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeDefaultConfigurations();
  }

  static getInstance(): PriorityRouter {
    if (!PriorityRouter.instance) {
      PriorityRouter.instance = new PriorityRouter();
    }
    return PriorityRouter.instance;
  }

  /**
   * Initialize default priority configurations
   */
  private initializeDefaultConfigurations(): void {
    // Channel configurations with cost/reliability/urgency weights
    const channelConfigs: Map<NotificationChannel, ChannelConfig> = new Map([
      ['push', {
        channel: 'push',
        enabled: true,
        fallbackChannels: ['sms', 'email'],
        costWeight: 1, // Cheapest (no cost)
        reliabilityWeight: 9, // Very reliable
        urgencyWeight: 10 // Most urgent
      }],
      ['sms', {
        channel: 'sms',
        enabled: true,
        fallbackChannels: ['push', 'email'],
        costWeight: 8, // Expensive
        reliabilityWeight: 10, // Most reliable
        urgencyWeight: 9 // Very urgent
      }],
      ['email', {
        channel: 'email',
        enabled: true,
        fallbackChannels: ['push', 'in_app'],
        costWeight: 3, // Moderate cost
        reliabilityWeight: 8, // Reliable
        urgencyWeight: 5 // Moderate urgency
      }],
      ['discord', {
        channel: 'discord',
        enabled: true,
        fallbackChannels: ['telegram', 'push'],
        costWeight: 2, // Low cost
        reliabilityWeight: 6, // Moderate reliability
        urgencyWeight: 4 // Low-moderate urgency
      }],
      ['telegram', {
        channel: 'telegram',
        enabled: true,
        fallbackChannels: ['discord', 'push'],
        costWeight: 2, // Low cost
        reliabilityWeight: 6, // Moderate reliability
        urgencyWeight: 4 // Low-moderate urgency
      }],
      ['in_app', {
        channel: 'in_app',
        enabled: true,
        fallbackChannels: [],
        costWeight: 1, // Cheapest
        reliabilityWeight: 5, // Moderate reliability
        urgencyWeight: 1 // Least urgent
      }]
    ]);

    this.channelMatrix = channelConfigs;

    // Priority configurations
    this.defaultPriorityConfigs.set('critical', {
      priority: 'critical',
      channels: [
        channelConfigs.get('push')!,
        channelConfigs.get('sms')!
      ],
      maxChannels: 2,
      requireConfirmation: true,
      escalationDelay: 0, // Immediate
      autoEscalate: true
    });

    this.defaultPriorityConfigs.set('high', {
      priority: 'high',
      channels: [
        channelConfigs.get('sms')!,
        channelConfigs.get('push')!
      ],
      maxChannels: 2,
      requireConfirmation: false,
      escalationDelay: 30000, // 30 seconds
      autoEscalate: true
    });

    this.defaultPriorityConfigs.set('medium', {
      priority: 'medium',
      channels: [
        channelConfigs.get('email')!,
        channelConfigs.get('push')!
      ],
      maxChannels: 2,
      requireConfirmation: false,
      escalationDelay: 300000, // 5 minutes
      autoEscalate: false
    });

    this.defaultPriorityConfigs.set('low', {
      priority: 'low',
      channels: [
        channelConfigs.get('in_app')!
      ],
      maxChannels: 1,
      requireConfirmation: false,
      escalationDelay: 3600000, // 1 hour
      autoEscalate: false
    });

    this.logger.info('Priority router default configurations initialized');
  }

  /**
   * Determine priority and routing for a notification
   */
  async determineRouting(context: NotificationContext): Promise<RoutingDecision> {
    try {
      // Apply user overrides first
      const userOverride = this.getUserOverride(context.userId, context.eventType, context.category);

      // Determine priority (use override or auto-detect)
      const priority = userOverride?.priorityMappings[context.eventType || context.category || 'default'] || context.priority || await this.detectPriority(context);

      // Get priority configuration
      const priorityConfig = userOverride ?
        this.buildUserPriorityConfig(priority, userOverride) :
        this.defaultPriorityConfigs.get(priority)!;

      if (!priorityConfig) {
        throw new Error(`No configuration found for priority: ${priority}`);
      }

      // Select optimal channels based on cost-effectiveness and reliability
      const selectedChannels = this.selectOptimalChannels(priorityConfig, context);

      // Determine if escalation is needed
      const shouldEscalate = await this.shouldEscalate(context, priority);

      return {
        priority,
        channels: selectedChannels,
        reasoning: this.buildReasoning(context, priority, selectedChannels, shouldEscalate),
        confidence: this.calculateConfidence(context),
        shouldEscalate,
        ...(shouldEscalate && { escalationDelay: priorityConfig.escalationDelay }),
        requireConfirmation: priorityConfig.requireConfirmation
      };

    } catch (error) {
      this.logger.error('Failed to determine routing', { error, context });

      // Fallback to medium priority with email
      return {
        priority: 'medium',
        channels: ['email'],
        reasoning: 'Routing determination failed - using fallback configuration',
        confidence: 50,
        shouldEscalate: false,
        requireConfirmation: false
      };
    }
  }

  /**
   * Auto-detect priority based on context factors
   */
  private async detectPriority(context: NotificationContext): Promise<NotificationPriority> {
    const { confidence = 50, marketImpact = 50, urgency = 50, estimatedValue = 0, category } = context;

    // Base scoring
    let score = 0;

    // Confidence factor (higher confidence = potentially higher priority)
    if (confidence >= 90) score += 25;
    else if (confidence >= 75) score += 15;
    else if (confidence >= 60) score += 10;

    // Market impact factor
    if (marketImpact >= 80) score += 30;
    else if (marketImpact >= 60) score += 20;
    else if (marketImpact >= 40) score += 10;

    // Urgency factor
    if (urgency >= 80) score += 20;
    else if (urgency >= 60) score += 10;

    // Financial impact factor
    if (estimatedValue >= 100000) score += 15; // High value transactions
    else if (estimatedValue >= 10000) score += 10;
    else if (estimatedValue >= 1000) score += 5;

    // Category-based adjustments
    if (category) {
      switch (category.toLowerCase()) {
        case 'security':
        case 'breach':
          score += 20; // Security issues are always high priority
          break;
        case 'financial':
        case 'transaction':
          if (estimatedValue >= 50000) score += 15;
          break;
        case 'system':
        case 'maintenance':
          score -= 5; // System notifications typically lower priority
          break;
      }
    }

    // Map score to priority
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Select optimal channels based on priority config and context
   */
  private selectOptimalChannels(priorityConfig: PriorityConfig, context: NotificationContext): NotificationChannel[] {
    const { userId, confidence = 50, marketImpact = 50, urgency = 50 } = context;

    // Start with primary channels for this priority
    let selectedChannels: NotificationChannel[] = priorityConfig.channels
      .filter(ch => ch.enabled)
      .map(ch => ch.channel);

    // Apply user channel preferences if available
    const userOverride = this.getUserOverride(userId);
    if (userOverride?.channelPreferences[priorityConfig.priority]) {
      const preferredChannels = userOverride.channelPreferences[priorityConfig.priority];
      // Replace default channels with user preferences
      selectedChannels = preferredChannels.filter(ch => this.channelMatrix.get(ch)?.enabled);
    }

    // Optimize based on context factors
    if (confidence < 50 && selectedChannels.includes('sms')) {
      // Low confidence - prefer cheaper channels
      selectedChannels = selectedChannels.filter(ch => ch !== 'sms');
      if (!selectedChannels.includes('email')) selectedChannels.push('email');
    }

    if (marketImpact > 80 && !selectedChannels.includes('sms')) {
      // High market impact - ensure SMS is included if not already
      selectedChannels.push('sms');
    }

    if (urgency < 30) {
      // Low urgency - prefer in-app only
      selectedChannels = selectedChannels.filter(ch => ch === 'in_app');
      if (selectedChannels.length === 0) selectedChannels.push('in_app');
    }

    // Limit to max channels for this priority
    if (selectedChannels.length > priorityConfig.maxChannels) {
      // Sort by cost-effectiveness and keep top channels
      selectedChannels = this.rankChannelsByCostEffectiveness(selectedChannels, context)
        .slice(0, priorityConfig.maxChannels);
    }

    return selectedChannels;
  }

  /**
   * Rank channels by cost-effectiveness for the given context
   */
  private rankChannelsByCostEffectiveness(channels: NotificationChannel[], context: NotificationContext): NotificationChannel[] {
    const { urgency = 50, marketImpact = 50 } = context;

    return channels.sort((a, b) => {
      const configA = this.channelMatrix.get(a)!;
      const configB = this.channelMatrix.get(b)!;

      // Calculate cost-effectiveness score (higher is better)
      const scoreA = (configA.urgencyWeight * (urgency / 100) +
                     configA.reliabilityWeight * 0.7 +
                     (10 - configA.costWeight) * 0.3); // Prefer lower cost

      const scoreB = (configB.urgencyWeight * (urgency / 100) +
                     configB.reliabilityWeight * 0.7 +
                     (10 - configB.costWeight) * 0.3);

      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Determine if notification should be escalated
   */
  private async shouldEscalate(context: NotificationContext, priority: NotificationPriority): Promise<boolean> {
    const { confidence = 50, marketImpact = 50, urgency = 50 } = context;

    // Critical and high priority notifications auto-escalate if factors are high
    if (priority === 'critical') return true;
    if (priority === 'high' && (confidence > 80 || marketImpact > 70 || urgency > 80)) return true;

    // Check if user has escalation preferences
    const userOverride = this.getUserOverride(context.userId);
    return userOverride?.priorityMappings[context.eventType || 'default'] === 'critical';
  }

  /**
   * Build reasoning string for routing decision
   */
  private buildReasoning(context: NotificationContext, priority: NotificationPriority, channels: NotificationChannel[], shouldEscalate: boolean): string {
    const factors = [];

    if (context.confidence && context.confidence > 80) factors.push(`high confidence (${context.confidence}%)`);
    if (context.marketImpact && context.marketImpact > 70) factors.push(`high market impact (${context.marketImpact}%)`);
    if (context.urgency && context.urgency > 80) factors.push(`high urgency (${context.urgency}%)`);
    if (context.estimatedValue && context.estimatedValue > 10000) factors.push(`high value ($${context.estimatedValue})`);

    const factorText = factors.length > 0 ? ` based on ${factors.join(', ')}` : '';
    const escalationText = shouldEscalate ? ' (will escalate)' : '';

    return `Priority ${priority} determined${factorText}, routing via ${channels.join(', ')}${escalationText}`;
  }

  /**
   * Calculate overall confidence in the routing decision
   */
  private calculateConfidence(context: NotificationContext): number {
    const { confidence = 50, marketImpact = 50, urgency = 50 } = context;

    // Average of available confidence factors
    const factors = [confidence, marketImpact, urgency].filter(f => f !== undefined);
    return factors.length > 0 ? Math.round(factors.reduce((sum, f) => sum + f, 0) / factors.length) : 50;
  }

  /**
   * Get user priority override
   */
  private getUserOverride(userId: string, eventType?: string, category?: string): UserPriorityOverride | undefined {
    return this.userOverrides.get(userId);
  }

  /**
   * Set user priority override
   */
  setUserOverride(override: UserPriorityOverride): void {
    this.userOverrides.set(override.userId, override);
    this.logger.info('User priority override set', {
      userId: override.userId,
      eventType: override.eventType,
      category: override.category
    });
  }

  /**
   * Remove user priority override
   */
  removeUserOverride(userId: string): boolean {
    const deleted = this.userOverrides.delete(userId);
    if (deleted) {
      this.logger.info('User priority override removed', { userId });
    }
    return deleted;
  }

  /**
   * Build user-specific priority configuration
   */
  private buildUserPriorityConfig(priority: NotificationPriority, override: UserPriorityOverride): PriorityConfig {
    const defaultConfig = this.defaultPriorityConfigs.get(priority)!;
    const userChannels = override.channelPreferences[priority] || defaultConfig.channels.map(c => c.channel);

    return {
      ...defaultConfig,
      channels: userChannels.map(channel => this.channelMatrix.get(channel)!).filter(Boolean)
    };
  }

  /**
   * Get available channels for a priority level
   */
  getAvailableChannels(priority: NotificationPriority): NotificationChannel[] {
    const config = this.defaultPriorityConfigs.get(priority);
    return config?.channels.map(c => c.channel) || [];
  }

  /**
   * Get priority configuration details
   */
  getPriorityConfig(priority: NotificationPriority): PriorityConfig | undefined {
    return this.defaultPriorityConfigs.get(priority);
  }

  /**
   * Get all priority configurations
   */
  getAllPriorityConfigs(): Map<NotificationPriority, PriorityConfig> {
    return new Map(this.defaultPriorityConfigs);
  }

  /**
   * Get channel configuration
   */
  getChannelConfig(channel: NotificationChannel): ChannelConfig | undefined {
    return this.channelMatrix.get(channel);
  }

  /**
   * Update channel configuration
   */
  updateChannelConfig(channel: NotificationChannel, config: Partial<ChannelConfig>): void {
    const existing = this.channelMatrix.get(channel);
    if (existing) {
      Object.assign(existing, config);
      this.logger.info('Channel configuration updated', { channel, config });
    }
  }
}
