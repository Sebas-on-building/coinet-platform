/**
 * L1.6 — Degradation Engine for BTC Quantum Loop
 *
 * Runtime system that:
 *   1. Detects degradation from L1.3 (redundancy), L1.4 (health), L1.5 (conflict)
 *   2. Maps field degradation to truth-domain impacts
 *   3. Composes penalties across features, scores, scenarios
 *   4. Propagates claim restrictions
 *   5. Builds user-facing, AI-facing, and diagnostics disclosures
 *   6. Determines if judgment must become insufficient_data
 */

import type {
  DegradationType,
  DegradationSeverity,
  DegradationEvent,
  DegradationDiagnostics,
  FeatureImpact,
  ScoreImpact,
  ScenarioImpact,
  ClaimRestrictionClass,
} from './degradation-types';
import { L16_QR_VERSION } from './degradation-types';
import { getDegradationRule } from './degradation-rules';
import type { SourceHealthRecord, HealthBand, FreshnessBand } from './source-health-types';
import type { SourceResolutionRecord, ResolutionDegradation } from './redundancy-types';
import type { ConflictResolutionRecord, ConflictSeverity } from './conflict-types';

const degradationLedger: DegradationEvent[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — DEGRADATION DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface DetectionInput {
  fieldName: string;
  sourceId?: string;
  dataPresent: boolean;
  healthRecord?: SourceHealthRecord;
  redundancyRecord?: SourceResolutionRecord;
  conflictRecord?: ConflictResolutionRecord;
}

function detectDegradationType(input: DetectionInput): DegradationType {
  if (!input.dataPresent) return 'missing';

  if (input.conflictRecord) {
    const action = input.conflictRecord.action;
    if (action === 'unresolved') return 'unresolved';
    if (action === 'preserved_contradiction') return 'conflicted';
  }

  if (input.redundancyRecord) {
    const deg = input.redundancyRecord.degradationState;
    if (deg === 'unresolved') return 'unresolved';
    if (deg === 'stale') return 'stale';
    if (deg === 'partial') return 'weak_substituted';
  }

  if (input.healthRecord) {
    if (input.healthRecord.payloadValidityScore < 0.50) return 'invalid';
    if (input.healthRecord.freshnessBand === 'unresolved') return 'stale';
    if (input.healthRecord.freshnessBand === 'degraded') return 'stale';
    if (input.healthRecord.healthBand === 'unusable') return 'unresolved';
    if (input.healthRecord.healthBand === 'degraded') return 'weak_substituted';
  }

  return 'missing';
}

function detectSeverity(
  degradationType: DegradationType,
  input: DetectionInput,
): DegradationSeverity {
  if (degradationType === 'missing') return 'critical';
  if (degradationType === 'unresolved') return 'unresolved';

  if (degradationType === 'invalid') {
    const payloadScore = input.healthRecord?.payloadValidityScore ?? 0;
    if (payloadScore < 0.3) return 'critical';
    if (payloadScore < 0.5) return 'degraded';
    return 'partial';
  }

  if (degradationType === 'conflicted') {
    const conflictSev = input.conflictRecord?.severity;
    if (conflictSev === 'critical') return 'critical';
    if (conflictSev === 'high') return 'degraded';
    if (conflictSev === 'moderate') return 'partial';
    return 'advisory';
  }

  if (degradationType === 'stale') {
    const freshBand = input.healthRecord?.freshnessBand;
    if (freshBand === 'unresolved') return 'critical';
    if (freshBand === 'degraded') return 'degraded';
    if (freshBand === 'acceptable') return 'partial';
    return 'advisory';
  }

  if (degradationType === 'weak_substituted') {
    const healthBand = input.healthRecord?.healthBand;
    if (healthBand === 'degraded') return 'degraded';
    if (healthBand === 'weak') return 'partial';
    return 'advisory';
  }

  return 'advisory';
}

function isFieldDegraded(input: DetectionInput): boolean {
  if (!input.dataPresent) return true;

  if (input.healthRecord) {
    const hb = input.healthRecord.healthBand;
    if (hb === 'unusable' || hb === 'degraded' || hb === 'weak') return true;
    if (input.healthRecord.freshnessBand === 'degraded' || input.healthRecord.freshnessBand === 'unresolved') return true;
    if (input.healthRecord.payloadValidityScore < 0.70) return true;
  }

  if (input.redundancyRecord) {
    const rd = input.redundancyRecord.degradationState;
    if (rd !== 'healthy') return true;
  }

  if (input.conflictRecord) {
    const action = input.conflictRecord.action;
    if (action === 'unresolved' || action === 'preserved_contradiction' || action === 'degraded_resolution') return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — IMPACT MAPPER
// ═══════════════════════════════════════════════════════════════════════════════

function mapFeatureImpacts(
  fieldName: string,
  severity: DegradationSeverity,
  penalty: number,
): FeatureImpact[] {
  const rule = getDegradationRule(fieldName);
  if (!rule) return [];
  return rule.featureTargets.map(f => ({
    feature: f,
    penalty,
    state: severity === 'unresolved' ? 'unresolved' as const
      : severity === 'critical' || severity === 'degraded' ? 'degraded' as const
      : severity === 'partial' ? 'weakened' as const
      : 'healthy' as const,
  }));
}

function mapScoreImpacts(
  fieldName: string,
  severity: DegradationSeverity,
  penalty: number,
): ScoreImpact[] {
  const rule = getDegradationRule(fieldName);
  if (!rule) return [];
  return rule.scoreTargets.map(s => ({
    score: s,
    penalty: penalty * 0.8,
    state: severity === 'unresolved' || severity === 'critical' ? 'degraded' as const
      : severity === 'degraded' ? 'weakened' as const
      : 'healthy' as const,
  }));
}

function mapScenarioImpacts(
  fieldName: string,
  severity: DegradationSeverity,
  penalty: number,
): ScenarioImpact[] {
  const rule = getDegradationRule(fieldName);
  if (!rule) return [];
  return rule.scenarioTargets.map(s => ({
    scenario: s,
    penalty: penalty * 0.6,
    restricted: severity === 'critical' || severity === 'unresolved',
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — DISCLOSURE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildUserDisclosure(fieldName: string, degradationType: DegradationType): string {
  const rule = getDegradationRule(fieldName);
  if (!rule) return `${fieldName} source is degraded.`;
  return rule.disclosureTemplates[degradationType] ?? `${fieldName} source is degraded (${degradationType}).`;
}

function buildReasoningDisclosure(
  fieldName: string,
  degradationType: DegradationType,
  severity: DegradationSeverity,
  restrictions: ClaimRestrictionClass[],
): string {
  const parts: string[] = [];
  parts.push(`[L1.6] ${fieldName}: ${degradationType} (severity=${severity})`);
  if (restrictions.length > 0) {
    parts.push(`RESTRICTIONS: ${restrictions.join(', ')}`);
  }
  return parts.join(' | ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — SINGLE FIELD EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateFieldDegradation(input: DetectionInput): DegradationEvent | null {
  if (!isFieldDegraded(input)) return null;

  const rule = getDegradationRule(input.fieldName);
  if (!rule) return null;

  const degradationType = detectDegradationType(input);
  const severity = detectSeverity(degradationType, input);
  const penalty = rule.severityPenalties[severity];
  const restrictions = rule.claimRestrictionsAbove[severity];
  const calibration = rule.calibrationAbove[severity];

  const visibilityLoss: string[] = [];
  if (severity === 'critical' || severity === 'unresolved') {
    visibilityLoss.push(rule.visibilityDescription);
  } else if (severity === 'degraded') {
    visibilityLoss.push(`Partial loss: ${rule.visibilityDescription}`);
  }

  const event: DegradationEvent = {
    fieldName: input.fieldName,
    sourceId: input.sourceId,
    degradationType,
    severity,
    truthDomain: rule.truthDomain,
    visibilityLoss,
    fieldConfidencePenalty: penalty,
    featureImpacts: mapFeatureImpacts(input.fieldName, severity, penalty),
    scoreImpacts: mapScoreImpacts(input.fieldName, severity, penalty),
    scenarioImpacts: mapScenarioImpacts(input.fieldName, severity, penalty),
    claimRestrictions: restrictions,
    calibrationHandling: calibration,
    userDisclosure: buildUserDisclosure(input.fieldName, degradationType),
    reasoningDisclosure: buildReasoningDisclosure(input.fieldName, degradationType, severity, restrictions),
    diagnosticsDisclosure: [
      `field=${input.fieldName}`,
      `type=${degradationType}`,
      `severity=${severity}`,
      `domain=${rule.truthDomain}`,
      `penalty=${penalty}`,
      `restrictions=[${restrictions.join(',')}]`,
      `calibration=${calibration}`,
    ],
    policyVersion: L16_QR_VERSION,
  };

  degradationLedger.push(event);
  return event;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — BATCH EVALUATOR FOR ALL PIPELINE FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineDegradationInputs {
  fields: Record<string, DetectionInput>;
}

export function evaluateAllDegradation(inputs: PipelineDegradationInputs): {
  events: DegradationEvent[];
  diagnostics: DegradationDiagnostics;
} {
  const events: DegradationEvent[] = [];

  for (const [, input] of Object.entries(inputs.fields)) {
    const event = evaluateFieldDegradation(input);
    if (event) events.push(event);
  }

  return {
    events,
    diagnostics: buildDegradationDiagnostics(events),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — DIAGNOSTICS BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildDegradationDiagnostics(events: DegradationEvent[]): DegradationDiagnostics {
  const counts = { advisory: 0, partial: 0, degraded: 0, critical: 0, unresolvedCount: 0 };
  for (const e of events) {
    if (e.severity === 'unresolved') counts.unresolvedCount++;
    else counts[e.severity]++;
  }

  const totalFieldPenalty = events.reduce((s, e) => s + e.fieldConfidencePenalty, 0);
  const totalFeaturePenalty = events.reduce((s, e) =>
    s + e.featureImpacts.reduce((fs, f) => fs + f.penalty, 0), 0);
  const totalScorePenalty = events.reduce((s, e) =>
    s + e.scoreImpacts.reduce((ss, sc) => ss + sc.penalty, 0), 0);

  const allRestrictions = [...new Set(events.flatMap(e => e.claimRestrictions))];
  const userDisc = events.filter(e => e.severity !== 'advisory').map(e => e.userDisclosure);
  const reasoningDisc = events.map(e => e.reasoningDisclosure);

  const calibrationExclusions = events
    .filter(e => e.calibrationHandling === 'exclude')
    .map(e => e.fieldName);

  // Force insufficient_data if any core field reaches its forceInsufficientData threshold
  let forceInsufficient = false;
  for (const e of events) {
    const rule = getDegradationRule(e.fieldName);
    if (rule) {
      const thresholdSev = rule.forceInsufficientDataAt;
      if (compareSeverity(e.severity, thresholdSev) >= 0) {
        forceInsufficient = true;
        break;
      }
    }
  }

  // Multiple critical degradations also force insufficient_data
  if (counts.critical >= 2 || counts.unresolvedCount >= 1) {
    forceInsufficient = true;
  }

  return {
    timestamp: new Date().toISOString(),
    events,
    totalEvents: events.length,
    ...counts,
    totalFieldPenalty: round(totalFieldPenalty),
    totalFeaturePenalty: round(totalFeaturePenalty),
    totalScorePenalty: round(totalScorePenalty),
    activeRestrictions: allRestrictions,
    userDisclosures: userDisc,
    reasoningDisclosures: reasoningDisc,
    forceInsufficientData: forceInsufficient,
    calibrationExclusions,
    version: L16_QR_VERSION,
  };
}

const SEVERITY_ORDER: Record<DegradationSeverity, number> = {
  advisory: 0, partial: 1, degraded: 2, critical: 3, unresolved: 4,
};

function compareSeverity(a: DegradationSeverity, b: DegradationSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

export function getDegradationLedger(): DegradationEvent[] {
  return [...degradationLedger];
}

export function getDegradationCount(): number {
  return degradationLedger.length;
}

export function clearDegradationLedger(): void {
  degradationLedger.length = 0;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
