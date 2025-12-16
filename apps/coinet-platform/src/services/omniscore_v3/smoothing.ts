/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔄 TEMPORAL SMOOTHING                                                     ║
 * ║                                                                               ║
 * ║   Prevents wild score swings by smoothing changes over time.                 ║
 * ║   QS: Slow (fundamentals), OS: Fast (opportunity), POS: Medium               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { SmoothingResult, SmoothingState } from './types';
import { SMOOTHING_CONFIG, ENGINE_VERSION } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// SMOOTHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

type SmoothingTarget = 'qs' | 'os' | 'pos';

/**
 * Apply smoothing to a score
 */
export function applySmoothing(
  target: SmoothingTarget,
  rawValue: number,
  previousState: SmoothingState | null,
  eventRiskSeverity: number = 0
): SmoothingResult {
  const config = SMOOTHING_CONFIG[target];
  
  // No previous state = cold start, no smoothing
  if (!previousState) {
    return {
      applied: false,
      previousValue: null,
      rawValue,
      smoothedValue: rawValue,
      delta: 0,
      wasLimited: false,
      timeSinceLastHours: null,
    };
  }
  
  // Check version compatibility
  if (previousState.engineVersion !== ENGINE_VERSION) {
    // Version change = reset smoothing
    return {
      applied: false,
      previousValue: null,
      rawValue,
      smoothedValue: rawValue,
      delta: 0,
      wasLimited: false,
      timeSinceLastHours: null,
    };
  }
  
  // Get previous value for this target
  const previousValue = getPreviousValue(target, previousState);
  if (previousValue === null) {
    return {
      applied: false,
      previousValue: null,
      rawValue,
      smoothedValue: rawValue,
      delta: 0,
      wasLimited: false,
      timeSinceLastHours: null,
    };
  }
  
  // Calculate time since last update
  const now = new Date();
  const timeSinceLastMs = now.getTime() - previousState.timestamp.getTime();
  const timeSinceLastHours = timeSinceLastMs / (1000 * 60 * 60);
  
  // Check if enough time has passed
  if (timeSinceLastHours < config.minHoursBetweenUpdates) {
    // Not enough time, return previous value
    return {
      applied: true,
      previousValue,
      rawValue,
      smoothedValue: previousValue,
      delta: 0,
      wasLimited: true,
      timeSinceLastHours,
    };
  }
  
  // Check for event mode bypass
  const isEventMode = eventRiskSeverity >= SMOOTHING_CONFIG.eventThreshold;
  if (isEventMode && config.bypassOnEvent) {
    return {
      applied: false,
      previousValue,
      rawValue,
      smoothedValue: rawValue,
      delta: rawValue - previousValue,
      wasLimited: false,
      timeSinceLastHours,
    };
  }
  
  // Calculate raw delta
  const rawDelta = rawValue - previousValue;
  
  // Calculate max allowed delta based on time elapsed
  const daysFraction = timeSinceLastHours / 24;
  const maxDelta = config.maxDailyDelta * daysFraction;
  
  // Apply delta limiting
  let limitedDelta: number;
  let wasLimited = false;
  
  if (Math.abs(rawDelta) > maxDelta) {
    limitedDelta = Math.sign(rawDelta) * maxDelta;
    wasLimited = true;
  } else {
    limitedDelta = rawDelta;
  }
  
  // Apply exponential smoothing
  const smoothedDelta = limitedDelta * config.smoothingAlpha;
  const smoothedValue = Math.max(0, Math.min(100, previousValue + smoothedDelta));
  
  return {
    applied: true,
    previousValue,
    rawValue,
    smoothedValue: Math.round(smoothedValue * 10) / 10,
    delta: smoothedDelta,
    wasLimited,
    timeSinceLastHours,
  };
}

/**
 * Get previous value for a smoothing target
 */
function getPreviousValue(target: SmoothingTarget, state: SmoothingState): number | null {
  switch (target) {
    case 'qs':
      return state.qs;
    case 'os':
      return state.os;
    case 'pos':
      return state.pos;
    default:
      return null;
  }
}

/**
 * Create a new smoothing state
 */
export function createSmoothingState(
  projectId: string,
  qs: number,
  os: number | null,
  pos: number,
  risk: number
): SmoothingState {
  return {
    projectId,
    qs,
    os,
    pos,
    risk,
    timestamp: new Date(),
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Check if smoothing should be applied
 */
export function shouldApplySmoothing(
  target: SmoothingTarget,
  previousState: SmoothingState | null
): boolean {
  if (!previousState) return false;
  if (previousState.engineVersion !== ENGINE_VERSION) return false;
  
  const config = SMOOTHING_CONFIG[target];
  const timeSinceLastMs = Date.now() - previousState.timestamp.getTime();
  const timeSinceLastHours = timeSinceLastMs / (1000 * 60 * 60);
  
  return timeSinceLastHours >= config.minHoursBetweenUpdates;
}
