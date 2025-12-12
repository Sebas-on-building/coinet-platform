// Shared thresholds for QS/OS quadrants to avoid drift across UI, chat, and API docs
export const DEFAULT_QS_THRESHOLD = 60;
export const DEFAULT_OS_THRESHOLD = 60;

/**
 * TIER THRESHOLDS (FIXED - DO NOT CHANGE WITHOUT UPDATING ALL DOCS)
 * These are the AUTHORITATIVE tier boundaries used by OmniScore v2.3.3+
 * 
 * Elite:    85-100   (Top performers)
 * Strong:   70-84    (Above average)
 * Neutral:  50-69    (Average)
 * Weak:     30-49    (Below average)
 * Critical: 0-29     (Poor performers)
 * 
 * IMPORTANT: The chat/AI MUST use the exact tier from the engine payload.
 * NEVER derive tier from score - always use the provided `tier` field.
 */
export const TIER_THRESHOLDS = {
  Elite: 85,
  Strong: 70,
  Neutral: 50,
  Weak: 30,
  Critical: 0,
} as const;

export type TierLabel = 'Elite' | 'Strong' | 'Neutral' | 'Weak' | 'Critical';

/**
 * Get tier label from score (ONLY used by engine, not chat)
 * Chat should always use the tier from the payload
 */
export function getTierFromScore(score: number): TierLabel {
  if (score >= TIER_THRESHOLDS.Elite) return 'Elite';
  if (score >= TIER_THRESHOLDS.Strong) return 'Strong';
  if (score >= TIER_THRESHOLDS.Neutral) return 'Neutral';
  if (score >= TIER_THRESHOLDS.Weak) return 'Weak';
  return 'Critical';
}
