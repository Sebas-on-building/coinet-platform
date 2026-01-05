/**
 * 🚀 COINET RETENTION INTELLIGENCE ENGINE
 * 
 * The master orchestrator for the Intelligence Ritual retention system
 * 
 * This engine coordinates all retention mechanics:
 * - Trigger System (7 trigger types)
 * - Variable Rewards (Tribe, Hunt, Self)
 * - Daily Rituals (Morning, Midday, Evening)
 * - Investment Actions (10 actions)
 * - Lifecycle Segmentation (6 segments)
 * - A/B Testing (8 pre-defined tests)
 * - Failure Mode Detection
 * - Personalization
 * 
 * Divine Perfection Standards:
 * - Empirically calibrated (data-driven weights)
 * - Regime-aware (lifecycle segment)
 * - Quality-scored (all outputs have confidence)
 * - Uncertainty-quantified (probabilistic guidance)
 * 
 * @module retention/retention-intelligence-engine
 * @version 1.0.0
 */

import { logger } from '../../utils/logger';
import {
  TriggerEvent,
  Reward,
  RitualCard,
  RitualTime,
  InvestmentAction,
  UserLifecycleContext,
  PersonalizationContext,
  PersonalizedContent,
  FailureDetection,
  NotificationDeliveryRequest,
  NotificationDeliveryResult,
  RetentionMetrics,
  GUARDRAILS,
} from './types';

// Import sub-services
import { triggerSystem } from './trigger-system';
import { rewardEngine } from './reward-engine';
import { dailyRitualGenerator } from './daily-ritual-generator';
import { investmentTracker } from './investment-tracker';
import { lifecycleSegmentation } from './lifecycle-segmentation';
import { abTestingFramework } from './ab-testing-framework';
import { notificationComposer } from './notification-composer';
import { personalizationEngine } from './personalization-engine';
import { retentionAnalytics } from './retention-analytics';

// =============================================================================
// MAIN ORCHESTRATOR CLASS
// =============================================================================

export class RetentionIntelligenceEngine {
  private static instance: RetentionIntelligenceEngine;
  
  private constructor() {
    logger.info('🚀 Retention Intelligence Engine initialized');
  }
  
  public static getInstance(): RetentionIntelligenceEngine {
    if (!RetentionIntelligenceEngine.instance) {
      RetentionIntelligenceEngine.instance = new RetentionIntelligenceEngine();
    }
    return RetentionIntelligenceEngine.instance;
  }
  
  // ===========================================================================
  // TRIGGER SYSTEM
  // ===========================================================================
  
  /**
   * Evaluate all triggers for a user
   * Returns triggers that should fire based on current state
   */
  async evaluateTriggers(userId: string): Promise<TriggerEvent[]> {
    const startTime = performance.now();
    
    try {
      // Get personalization context to filter/prioritize triggers
      const [context, personalizedContent] = await Promise.all([
        personalizationEngine.getContext(userId),
        personalizationEngine.getContent(userId),
      ]);
      
      // Evaluate all trigger types
      const triggers = await triggerSystem.evaluate(userId);
      
      // Filter and prioritize based on personalization
      const personalizedTriggers = personalizationEngine.filterTriggers(
        triggers,
        context,
        personalizedContent
      );
      
      const processingTime = performance.now() - startTime;
      logger.debug('🚀 Triggers evaluated', {
        userId,
        triggersFound: personalizedTriggers.length,
        processingTimeMs: processingTime.toFixed(1),
      });
      
      return personalizedTriggers;
    } catch (error) {
      logger.error('🚀 Trigger evaluation failed', { userId, error });
      return [];
    }
  }
  
  /**
   * Process a trigger and deliver notification if appropriate
   */
  async processTrigger(trigger: TriggerEvent): Promise<NotificationDeliveryResult> {
    // Get personalized content settings
    const personalizedContent = await personalizationEngine.getContent(trigger.userId);
    
    // Adapt notification content
    const adaptedContent = personalizationEngine.adaptNotification(
      trigger.userId,
      trigger.type,
      { title: trigger.title, body: trigger.body },
      personalizedContent
    );
    
    // Check for A/B test variant
    const abVariant = await abTestingFramework.getVariantConfig(
      trigger.userId,
      'notification_copy'
    );
    
    // Deliver notification
    const request: NotificationDeliveryRequest = {
      userId: trigger.userId,
      type: trigger.type,
      channel: trigger.channel,
      title: adaptedContent.title,
      body: adaptedContent.body,
      symbol: trigger.symbol,
      metadata: trigger.metadata,
      priority: trigger.priority,
      abTestId: abVariant ? 'notification_copy' : undefined,
    };
    
    return notificationComposer.deliver(request);
  }
  
  // ===========================================================================
  // REWARD SYSTEM
  // ===========================================================================
  
  /**
   * Generate all applicable rewards for a user
   */
  async generateRewards(userId: string): Promise<Reward[]> {
    return rewardEngine.generate(userId);
  }
  
  /**
   * Get pending rewards for display
   */
  async getPendingRewards(userId: string): Promise<Reward[]> {
    return rewardEngine.getPending(userId);
  }
  
  // ===========================================================================
  // DAILY RITUAL
  // ===========================================================================
  
  /**
   * Generate a ritual card for the specified time
   */
  async generateRitualCard(userId: string, time: RitualTime): Promise<RitualCard> {
    return dailyRitualGenerator.generate(userId, time);
  }
  
  /**
   * Determine which ritual time slot is active
   */
  getCurrentRitualTime(): RitualTime | null {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 12 && hour < 14) return 'midday';
    if (hour >= 19 && hour < 22) return 'evening';
    
    return null;
  }
  
  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================
  
  /**
   * Update user's lifecycle state
   */
  async updateLifecycleState(userId: string): Promise<UserLifecycleContext> {
    return lifecycleSegmentation.update(userId);
  }
  
  /**
   * Get next best actions for a user
   */
  async getNextBestActions(userId: string): Promise<string[]> {
    const context = await lifecycleSegmentation.update(userId);
    return lifecycleSegmentation.getNextBestActions(context);
  }
  
  // ===========================================================================
  // INVESTMENT TRACKING
  // ===========================================================================
  
  /**
   * Record a completed investment action
   */
  async recordInvestmentAction(
    userId: string,
    action: InvestmentAction,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return investmentTracker.record(userId, action, metadata);
  }
  
  /**
   * Check if user should be prompted for an action
   */
  async shouldPromptInvestment(
    userId: string,
    action: InvestmentAction,
    context?: Record<string, unknown>
  ): Promise<{ shouldPrompt: boolean; reason?: string }> {
    return investmentTracker.shouldPrompt(userId, action, context);
  }
  
  /**
   * Generate investment prompt content
   */
  generateInvestmentPrompt(
    userId: string,
    action: InvestmentAction,
    context?: Record<string, unknown>
  ) {
    return investmentTracker.generatePrompt(userId, action, context);
  }
  
  // ===========================================================================
  // A/B TESTING
  // ===========================================================================
  
  /**
   * Get user's variant for a test
   */
  async getABTestVariant(userId: string, testId: string): Promise<string | null> {
    return abTestingFramework.getVariant(userId, testId);
  }
  
  /**
   * Record a conversion for an A/B test
   */
  async recordABTestConversion(
    userId: string,
    testId: string,
    metricValue: number
  ): Promise<void> {
    return abTestingFramework.recordMetric(userId, testId, 'primary', metricValue);
  }
  
  // ===========================================================================
  // NOTIFICATION DELIVERY
  // ===========================================================================
  
  /**
   * Deliver a notification with all guardrails
   */
  async deliverNotification(request: NotificationDeliveryRequest): Promise<NotificationDeliveryResult> {
    return notificationComposer.deliver(request);
  }
  
  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string) {
    return notificationComposer.getUnread(userId);
  }
  
  // ===========================================================================
  // PERSONALIZATION
  // ===========================================================================
  
  /**
   * Get personalization context for a user
   */
  async getPersonalizationContext(userId: string): Promise<PersonalizationContext> {
    return personalizationEngine.getContext(userId);
  }
  
  /**
   * Get personalized content settings
   */
  async getPersonalizedContent(userId: string): Promise<PersonalizedContent> {
    return personalizationEngine.getContent(userId);
  }
  
  /**
   * Get personalized quick-reply chips
   */
  async getQuickReplies(userId: string, currentSymbol?: string): Promise<string[]> {
    const context = await personalizationEngine.getContext(userId);
    return personalizationEngine.getQuickReplies(context, currentSymbol);
  }
  
  /**
   * Get personalized AI format instructions
   */
  async getAIFormatInstructions(userId: string): Promise<string> {
    const content = await personalizationEngine.getContent(userId);
    return personalizationEngine.getFormatInstructions(content);
  }
  
  // ===========================================================================
  // ANALYTICS & FAILURE DETECTION
  // ===========================================================================
  
  /**
   * Calculate current retention metrics
   */
  async calculateMetrics(): Promise<RetentionMetrics> {
    return retentionAnalytics.calculate();
  }
  
  /**
   * Detect active failure modes
   */
  async detectFailures(userId?: string): Promise<FailureDetection[]> {
    return retentionAnalytics.detectFailures(userId);
  }
  
  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================
  
  /**
   * Handle session start - trigger lifecycle update and evaluate triggers
   */
  async onSessionStart(userId: string, sessionId: string): Promise<{
    triggers: TriggerEvent[];
    rewards: Reward[];
    ritualCard?: RitualCard;
    nextBestActions: string[];
    quickReplies: string[];
  }> {
    const startTime = performance.now();
    
    try {
      // Update lifecycle state
      await this.updateLifecycleState(userId);
      
      // Parallel evaluation
      const [triggers, rewards, nextBestActions, quickReplies] = await Promise.all([
        this.evaluateTriggers(userId),
        this.getPendingRewards(userId),
        this.getNextBestActions(userId),
        this.getQuickReplies(userId),
      ]);
      
      // Generate ritual card if in ritual window
      const ritualTime = this.getCurrentRitualTime();
      const ritualCard = ritualTime ? 
        await this.generateRitualCard(userId, ritualTime) : undefined;
      
      const processingTime = performance.now() - startTime;
      logger.info('🚀 Session start processed', {
        userId,
        sessionId,
        triggers: triggers.length,
        rewards: rewards.length,
        hasRitualCard: !!ritualCard,
        processingTimeMs: processingTime.toFixed(1),
      });
      
      return {
        triggers,
        rewards,
        ritualCard,
        nextBestActions,
        quickReplies,
      };
    } catch (error) {
      logger.error('🚀 Session start processing failed', { userId, sessionId, error });
      
      return {
        triggers: [],
        rewards: [],
        nextBestActions: [],
        quickReplies: ['Check market sentiment', 'Analyze a coin'],
      };
    }
  }
  
  /**
   * Handle query completed - update tracking and evaluate rewards
   */
  async onQueryCompleted(
    userId: string,
    query: string,
    symbols: string[],
    intent: string
  ): Promise<{
    investmentPrompt?: ReturnType<typeof investmentTracker.generatePrompt>;
    newRewards: Reward[];
  }> {
    try {
      // Check for investment prompts based on query context
      let investmentPrompt;
      
      // After coin analysis, prompt for watchlist add
      if (symbols.length > 0 && intent !== 'troubleshoot') {
        const shouldPrompt = await this.shouldPromptInvestment(
          userId,
          'watchlist_add',
          { symbol: symbols[0] }
        );
        
        if (shouldPrompt.shouldPrompt) {
          investmentPrompt = this.generateInvestmentPrompt(
            userId,
            'watchlist_add',
            { symbol: symbols[0], trigger: 'post_analysis' }
          );
        }
      }
      
      // After decision_help, prompt for risk tolerance if not set
      if (intent === 'decision_help') {
        const shouldPromptRisk = await this.shouldPromptInvestment(userId, 'risk_tolerance');
        if (shouldPromptRisk.shouldPrompt && !investmentPrompt) {
          investmentPrompt = this.generateInvestmentPrompt(
            userId,
            'risk_tolerance',
            { trigger: 'post_decision_help' }
          );
        }
      }
      
      // Check for new rewards
      const newRewards = await this.generateRewards(userId);
      
      return {
        investmentPrompt,
        newRewards,
      };
    } catch (error) {
      logger.error('🚀 Query completion processing failed', { userId, error });
      return { newRewards: [] };
    }
  }
  
  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================
  
  /**
   * Run scheduled retention jobs
   * Call this on a cron schedule (e.g., every hour)
   */
  async runScheduledJobs(): Promise<{
    lifecycleUpdates: number;
    metricsStored: boolean;
    failuresDetected: number;
  }> {
    const startTime = performance.now();
    
    try {
      // Update lifecycle states in batches
      const { updated } = await lifecycleSegmentation.batchUpdate();
      
      // Store daily metrics
      await retentionAnalytics.storeDaily();
      
      // Detect failure modes
      const failures = await retentionAnalytics.detectFailures();
      
      const processingTime = performance.now() - startTime;
      logger.info('🚀 Scheduled jobs completed', {
        lifecycleUpdates: updated,
        failuresDetected: failures.length,
        processingTimeMs: processingTime.toFixed(1),
      });
      
      return {
        lifecycleUpdates: updated,
        metricsStored: true,
        failuresDetected: failures.length,
      };
    } catch (error) {
      logger.error('🚀 Scheduled jobs failed', { error });
      return {
        lifecycleUpdates: 0,
        metricsStored: false,
        failuresDetected: 0,
      };
    }
  }
  
  /**
   * Pre-generate ritual cards for all users
   * Call this before each ritual window
   */
  async preGenerateRitualCards(time: RitualTime): Promise<number> {
    return dailyRitualGenerator.preGenerate(time);
  }
  
  // ===========================================================================
  // GUARDRAILS
  // ===========================================================================
  
  /**
   * Get current guardrail settings
   */
  getGuardrails() {
    return GUARDRAILS;
  }
  
  /**
   * Validate content against guardrails
   */
  validateContent(title: string, body: string) {
    return notificationComposer.validateContent(title, body);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const retentionEngine = RetentionIntelligenceEngine.getInstance();

export default retentionEngine;
