/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ LEGITIMACY GATE                                                        ║
 * ║                                                                               ║
 * ║   First gate: Is this project legitimate?                                    ║
 * ║   Hard fails = instant block. Soft fails = gate if 3+.                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  LegitimacyResult,
  LegitimacyHardFails,
  LegitimacySoftFails,
  LegitimacyStatus,
  DataPoint,
} from '../types';
import { LEGITIMACY_THRESHOLDS } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegitimacyInput {
  projectId: string;
  dataPoints: DataPoint[];
  
  // Direct flags (from external sources)
  knownRugPull?: boolean;
  activeSecWarning?: boolean;
  honeypotDetected?: boolean;
  fakeAuditDetected?: boolean;
  
  // Derived checks
  projectAgeDays?: number;
  holderCount?: number;
  teamPublic?: boolean;
  hasAudit?: boolean;
  washTradingScore?: number;  // 0-1, higher = more suspicious
}

/**
 * Run legitimacy checks
 * Returns status: 'passed' | 'failed' | 'gated'
 */
export function checkLegitimacy(input: LegitimacyInput): LegitimacyResult {
  // Check hard fails
  const hardFails: LegitimacyHardFails = {
    rugPullHistory: input.knownRugPull === true,
    activeSecWarning: input.activeSecWarning === true,
    contractHoneypot: input.honeypotDetected === true,
    fakeAuditPdf: input.fakeAuditDetected === true,
  };
  
  // Check soft fails
  const softFails: LegitimacySoftFails = {
    noPublicTeam: input.teamPublic === false,
    lessThan30dOld: input.projectAgeDays !== undefined && input.projectAgeDays < 30,
    lessThan100Holders: input.holderCount !== undefined && input.holderCount < 100,
    washTradingDetected: input.washTradingScore !== undefined && input.washTradingScore > 0.5,
    noAudit: input.hasAudit === false,
  };
  
  // Count failures
  const hardFailCount = Object.values(hardFails).filter(Boolean).length;
  const softFailCount = Object.values(softFails).filter(Boolean).length;
  
  // Determine status
  let status: LegitimacyStatus;
  let reason: string | undefined;
  
  if (hardFailCount >= LEGITIMACY_THRESHOLDS.hardFailsToGate) {
    status = 'failed';
    const failedChecks = Object.entries(hardFails)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    reason = `Hard fail: ${failedChecks.join(', ')}`;
  } else if (softFailCount >= LEGITIMACY_THRESHOLDS.softFailsToGate) {
    status = 'gated';
    const failedChecks = Object.entries(softFails)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    reason = `${softFailCount} soft fails: ${failedChecks.join(', ')}`;
  } else {
    status = 'passed';
  }
  
  return {
    status,
    hardFails,
    softFails,
    hardFailCount,
    softFailCount,
    reason,
  };
}

/**
 * Extract legitimacy-relevant data from data points
 */
export function extractLegitimacyData(
  projectId: string,
  dataPoints: DataPoint[]
): LegitimacyInput {
  const input: LegitimacyInput = {
    projectId,
    dataPoints,
  };
  
  // Extract values from data points (support raw and legacy value)
  for (const dp of dataPoints) {
    const val = dp.raw ?? (dp as { value?: number | null }).value;
    if (val === null || val === undefined) continue;
    
    switch (dp.key) {
      case 'known_rug_pull':
        input.knownRugPull = val === 1;
        break;
      case 'sec_warning_active':
        input.activeSecWarning = val === 1;
        break;
      case 'honeypot_detected':
        input.honeypotDetected = val === 1;
        break;
      case 'fake_audit_detected':
        input.fakeAuditDetected = val === 1;
        break;
      case 'project_age_days':
        input.projectAgeDays = val;
        break;
      case 'holder_count':
        input.holderCount = val;
        break;
      case 'team_public':
        input.teamPublic = val === 1;
        break;
      case 'has_audit':
        input.hasAudit = val === 1;
        break;
      case 'wash_trading_score':
        input.washTradingScore = val;
        break;
    }
  }
  
  return input;
}

/**
 * Check if legitimacy result allows scoring
 */
export function canProceedWithScoring(result: LegitimacyResult): boolean {
  return result.status === 'passed';
}

/**
 * Get human-readable legitimacy summary
 */
export function getLegitimacySummary(result: LegitimacyResult): string {
  switch (result.status) {
    case 'passed':
      return 'Legitimacy check passed';
    case 'gated':
      return `Legitimacy warning: ${result.reason}`;
    case 'failed':
      return `Legitimacy FAILED: ${result.reason}`;
  }
}
