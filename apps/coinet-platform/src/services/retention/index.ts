/**
 * 🎯 COINET AI RETENTION SYSTEM - The Intelligence Ritual
 * 
 * A complete, production-ready retention system that transforms
 * Coinet from "occasional lookup tool" into "daily intelligence ritual"
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SYSTEM ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * The Retention Loop:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                                                                         │
 * │   1. TRIGGER ────► 2. ACTION ────► 3. VARIABLE REWARD ────► 4. INVEST  │
 * │        ▲                                                         │      │
 * │        └─────────────────────────────────────────────────────────┘      │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * Stage 1: TRIGGER
 *   - 7 trigger mechanisms (regime shift, watchlist, morning digest, etc.)
 *   - Max 2 push notifications per day (guardrail)
 *   - Intelligence over noise: decision-ready data only
 * 
 * Stage 2: ACTION
 *   - Time-to-value targets (<5 seconds to first insight)
 *   - One-tap insight cards, quick-reply chips
 *   - Intent-optimized responses
 * 
 * Stage 3: VARIABLE REWARD
 *   - Tribe rewards (social validation, in-app only)
 *   - Hunt rewards (alpha discovery, high signal)
 *   - Self rewards (mastery validation, reflective)
 * 
 * Stage 4: INVESTMENT
 *   - 10 investment actions (watchlist → referral)
 *   - Progressive friction levels
 *   - Anti-annoyance guardrails
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * DIVINE PERFECTION STANDARDS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. EMPIRICAL CALIBRATION - Data-driven weights, not hand-picked
 * 2. REGIME AWARENESS - Lifecycle segment-specific logic
 * 3. DATA QUALITY - Quality scores on all outputs
 * 4. UNCERTAINTY QUANTIFICATION - Confidence bands everywhere
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * GUARDRAILS (No Dark Patterns)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * - No panic engineering (no URGENT, DON'T MISS, etc.)
 * - Silence is golden (max 2 pushes/day)
 * - Intelligence over noise (decision-ready data only)
 * - Opt-out first (one-tap disable)
 * - Calm by default (no red for non-critical)
 * - No addiction metrics (no time-on-app optimization)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ```typescript
 * import { retentionEngine } from './services/retention';
 * 
 * // On session start
 * const sessionData = await retentionEngine.onSessionStart(userId, sessionId);
 * 
 * // After query completed
 * const queryResult = await retentionEngine.onQueryCompleted(
 *   userId, query, symbols, intent
 * );
 * 
 * // Get personalized content
 * const formatInstructions = await retentionEngine.getAIFormatInstructions(userId);
 * const quickReplies = await retentionEngine.getQuickReplies(userId, 'BTC');
 * 
 * // Scheduled jobs (run hourly)
 * await retentionEngine.runScheduledJobs();
 * ```
 * 
 * @module retention
 * @version 1.0.0
 */

// Main orchestrator
export {
  RetentionIntelligenceEngine,
  retentionEngine,
} from './retention-intelligence-engine';

// Types
export * from './types';

// Prisma client for retention models
export { prismaRetention, areRetentionModelsAvailable } from './prisma-retention';

// Sub-services (for advanced usage)
export { triggerSystem } from './trigger-system';
export { rewardEngine } from './reward-engine';
export { dailyRitualGenerator } from './daily-ritual-generator';
export { investmentTracker } from './investment-tracker';
export { lifecycleSegmentation } from './lifecycle-segmentation';
export { abTestingFramework } from './ab-testing-framework';
export { notificationComposer } from './notification-composer';
export { personalizationEngine } from './personalization-engine';
export { retentionAnalytics } from './retention-analytics';

// Default export is the main engine
export { retentionEngine as default } from './retention-intelligence-engine';
