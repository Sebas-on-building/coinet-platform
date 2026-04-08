/**
 * L1.4.1 Recovery Governor
 *
 * A source should not instantly regain full speaking authority
 * the moment it becomes reachable again.
 *
 * A venue feed that failed 12 times and comes back for 30 seconds
 * should NOT immediately restore claim authority.
 *
 * Recovery states:
 *   STABLE               → no recent incident, full authority
 *   RECOVERING_UNVERIFIED → source returned but not yet verified
 *   RECOVERING_PROBATION  → source must prove N consecutive clean windows
 *   RECOVERED_LIMITED     → some fields re-qualified, others still locked
 *   FULLY_RESTORED        → all fields re-qualified, recovery complete
 */

import { getProviderHealth } from '../health-monitor';
import {
  type RecoveryState, type RecoveryRecord,
  RECOVERY_TRUST_HAIRCUT,
} from './health-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_CLEAN_WINDOWS = 5;
const CLEAN_WINDOW_DURATION_MS = 60_000;
const INCIDENT_THRESHOLD_FAILURES = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// STATE STORE
// ═══════════════════════════════════════════════════════════════════════════════

const recoveryStore = new Map<string, RecoveryRecord>();

function getOrCreate(providerId: string): RecoveryRecord {
  let record = recoveryStore.get(providerId);
  if (record) return record;
  record = {
    providerId,
    state: 'STABLE',
    incidentTimestamp: null,
    recoveryTimestamp: null,
    cleanWindowCount: 0,
    requiredCleanWindows: REQUIRED_CLEAN_WINDOWS,
    trustHaircut: 0,
    requalifiedFields: [],
    lockedFields: [],
  };
  recoveryStore.set(providerId, record);
  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Record an incident (consecutive failures crossed threshold).
 * Transitions provider to RECOVERING_UNVERIFIED.
 */
export function recordIncident(providerId: string): void {
  const record = getOrCreate(providerId);
  record.state = 'RECOVERING_UNVERIFIED';
  record.incidentTimestamp = new Date().toISOString();
  record.recoveryTimestamp = null;
  record.cleanWindowCount = 0;
  record.trustHaircut = RECOVERY_TRUST_HAIRCUT.RECOVERING_UNVERIFIED;
  record.requalifiedFields = [];
}

/**
 * Record a successful clean window (provider was healthy for the window duration).
 * Progresses recovery state.
 */
export function recordCleanWindow(providerId: string): void {
  const record = getOrCreate(providerId);

  if (record.state === 'STABLE' || record.state === 'FULLY_RESTORED') return;

  if (record.state === 'RECOVERING_UNVERIFIED') {
    record.state = 'RECOVERING_PROBATION';
    record.recoveryTimestamp = new Date().toISOString();
    record.cleanWindowCount = 1;
    record.trustHaircut = RECOVERY_TRUST_HAIRCUT.RECOVERING_PROBATION;
    return;
  }

  if (record.state === 'RECOVERING_PROBATION') {
    record.cleanWindowCount++;
    if (record.cleanWindowCount >= Math.floor(record.requiredCleanWindows * 0.6)) {
      record.state = 'RECOVERED_LIMITED';
      record.trustHaircut = RECOVERY_TRUST_HAIRCUT.RECOVERED_LIMITED;
    }
    return;
  }

  if (record.state === 'RECOVERED_LIMITED') {
    record.cleanWindowCount++;
    if (record.cleanWindowCount >= record.requiredCleanWindows) {
      record.state = 'FULLY_RESTORED';
      record.trustHaircut = 0;
    }
    return;
  }
}

/**
 * Record a failure during recovery — resets to RECOVERING_UNVERIFIED.
 */
export function recordRecoveryFailure(providerId: string): void {
  const record = getOrCreate(providerId);
  if (record.state === 'STABLE') return;

  record.state = 'RECOVERING_UNVERIFIED';
  record.cleanWindowCount = 0;
  record.trustHaircut = RECOVERY_TRUST_HAIRCUT.RECOVERING_UNVERIFIED;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Automatically detect whether a provider should enter or progress recovery
 * based on its current health-monitor state.
 */
export function evaluateRecoveryFromHealth(providerId: string): void {
  const health = getProviderHealth(providerId);
  const record = getOrCreate(providerId);

  if (record.state === 'STABLE') {
    if (health.consecutiveFailures >= INCIDENT_THRESHOLD_FAILURES) {
      recordIncident(providerId);
    }
    return;
  }

  if (!health.isAvailable) {
    recordRecoveryFailure(providerId);
    return;
  }

  if (health.isAvailable && health.successRate > 0.8 && !health.isStale) {
    recordCleanWindow(providerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY API
// ═══════════════════════════════════════════════════════════════════════════════

export function getRecoveryState(providerId: string): RecoveryRecord {
  evaluateRecoveryFromHealth(providerId);
  return { ...getOrCreate(providerId) };
}

export function isInRecovery(providerId: string): boolean {
  const record = getRecoveryState(providerId);
  return record.state !== 'STABLE' && record.state !== 'FULLY_RESTORED';
}

export function getRecoveryTrustHaircut(providerId: string): number {
  return getRecoveryState(providerId).trustHaircut;
}

export function getAllRecoveryStates(): RecoveryRecord[] {
  return [...recoveryStore.values()].map(r => ({ ...r }));
}

export function getProvidersInRecovery(): RecoveryRecord[] {
  return getAllRecoveryStates().filter(r =>
    r.state !== 'STABLE' && r.state !== 'FULLY_RESTORED',
  );
}

export function resetRecoveryState(providerId: string): void {
  recoveryStore.delete(providerId);
}

export function resetAllRecoveryStates(): void {
  recoveryStore.clear();
}
