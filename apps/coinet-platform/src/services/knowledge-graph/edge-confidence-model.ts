/**
 * L4.2 — Edge Confidence and Evidence Lineage: Confidence Model
 *
 * Admissibility and rights engine for graph edges. Scores edge confidence
 * from seven factor families, applies caps and scars, derives rights profiles,
 * computes recency, and emits auditable state.
 *
 * An edge is usable only to the extent that its evidence, confidence,
 * freshness, and traceability justify its use.
 */

import type { EdgeType, SemanticFamily, TemporalMode, UseDomain } from './relation-ontology';
import { getEdgeContract } from './relation-ontology';
import type { EdgeEvidenceRecord, EdgeEvidenceClass } from './edge-evidence-ledger';
import { EVIDENCE_STRENGTH_RANK, getEvidenceForEdge } from './edge-evidence-ledger';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE BANDS AND RIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

export type EdgeConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export type EdgeRight = 'ALLOW' | 'ALLOW_WITH_SCAR' | 'CONDITIONAL' | 'DENY';

export interface EdgeRightsProfile {
  contextEnrichment: EdgeRight;
  comparison: EdgeRight;
  clustering: EdgeRight;
  propagation: EdgeRight;
  judgmentSupport: EdgeRight;
  explanation: EdgeRight;
  competitorDiscovery: EdgeRight;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE SCARS
// ═══════════════════════════════════════════════════════════════════════════════

export type EdgeScarCode =
  | 'SUBJECT_CONFIDENCE_FLOOR_LOW'
  | 'OBJECT_CONFIDENCE_FLOOR_LOW'
  | 'EVIDENCE_SPARSE'
  | 'EVIDENCE_MONOCULTURE'
  | 'SOURCE_DISAGREEMENT'
  | 'STALE_EDGE'
  | 'EVENT_DECAYING'
  | 'INFERRED_ONLY'
  | 'CLUSTER_DERIVED_ONLY'
  | 'REPLAY_TRACE_WEAK'
  | 'CAUSALITY_WEAK'
  | 'BEHAVIORAL_NOT_STRUCTURAL';

// ═══════════════════════════════════════════════════════════════════════════════
// RECENCY
// ═══════════════════════════════════════════════════════════════════════════════

export type RecencyBand = 'FRESH' | 'SLIPPING' | 'STALE' | 'EXPIRED';

// ═══════════════════════════════════════════════════════════════════════════════
// NODE CONFIDENCE INPUT — passed from L3.3
// ═══════════════════════════════════════════════════════════════════════════════

export interface NodeConfidenceInput {
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  score: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FactorEvaluation {
  factorName: string;
  score: number;
  weight: number;
  scars: EdgeScarCode[];
  vetoes: string[];
  rationale: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CONFIDENCE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeConfidenceInput {
  edgeId: string;
  edgeType: EdgeType;
  subjectNodeId: string;
  objectNodeId: string;
  subjectConfidence?: NodeConfidenceInput;
  objectConfidence?: NodeConfidenceInput;
  evidence: EdgeEvidenceRecord[];
  currentTime?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH EDGE STATE — the core output artifact
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphEdgeState {
  edgeId: string;
  edgeType: string;
  subjectNodeId: string;
  objectNodeId: string;
  contractVersion: string;
  confidenceBand: EdgeConfidenceBand;
  confidenceScore: number;
  rightsProfile: EdgeRightsProfile;
  evidenceRefs: string[];
  lineageRefs: string[];
  recencyScore: number;
  recencyBand: RecencyBand;
  scars: EdgeScarCode[];
  capChain: string[];
  factorEvaluations: FactorEvaluation[];
  evaluationReasonCodes: string[];
  admissibilityState: 'ADMISSIBLE' | 'CONDITIONAL' | 'INADMISSIBLE';
  policyVersion: string;
  evaluationVersion: string;
  createdAt: string;
  lastConfirmedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_WEIGHTS: Record<string, number> = {
  nodeConfidenceFloor: 0.20,
  evidenceCountDiversity: 0.15,
  evidenceTypeStrength: 0.20,
  crossSourceAgreement: 0.15,
  temporalFreshness: 0.10,
  structuralVsInferred: 0.10,
  replayTraceability: 0.10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateNodeConfidenceFloor(input: EdgeConfidenceInput): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  let score = 1.0;

  const subBand = input.subjectConfidence?.band ?? 'UNRESOLVED';
  const objBand = input.objectConfidence?.band ?? 'UNRESOLVED';

  const bandPenalty: Record<string, number> = { HIGH: 0, MEDIUM: 0.2, LOW: 0.5, UNRESOLVED: 0.8 };
  score -= bandPenalty[subBand] * 0.5;
  score -= bandPenalty[objBand] * 0.5;

  if (subBand === 'LOW' || subBand === 'UNRESOLVED') scars.push('SUBJECT_CONFIDENCE_FLOOR_LOW');
  if (objBand === 'LOW' || objBand === 'UNRESOLVED') scars.push('OBJECT_CONFIDENCE_FLOOR_LOW');

  return {
    factorName: 'nodeConfidenceFloor',
    score: Math.max(0, score),
    weight: DEFAULT_WEIGHTS.nodeConfidenceFloor,
    scars,
    vetoes: subBand === 'UNRESOLVED' && objBand === 'UNRESOLVED' ? ['BOTH_ENDPOINTS_UNRESOLVED'] : [],
    rationale: `subject=${subBand} object=${objBand}`,
  };
}

function evaluateEvidenceCountDiversity(evidence: EdgeEvidenceRecord[]): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  if (evidence.length === 0) {
    return { factorName: 'evidenceCountDiversity', score: 0, weight: DEFAULT_WEIGHTS.evidenceCountDiversity,
      scars: ['EVIDENCE_SPARSE'], vetoes: ['NO_EVIDENCE'], rationale: 'zero evidence records' };
  }

  const classSet = new Set(evidence.map(e => e.evidenceClass));
  const sourceSet = new Set(evidence.map(e => e.sourceModule));

  let score = Math.min(1.0, evidence.length * 0.25);
  score += Math.min(0.3, classSet.size * 0.1);
  score += Math.min(0.2, sourceSet.size * 0.1);
  score = Math.min(1.0, score);

  if (evidence.length < 2) scars.push('EVIDENCE_SPARSE');
  if (classSet.size === 1 && sourceSet.size === 1) scars.push('EVIDENCE_MONOCULTURE');

  return { factorName: 'evidenceCountDiversity', score, weight: DEFAULT_WEIGHTS.evidenceCountDiversity,
    scars, vetoes: [], rationale: `count=${evidence.length} classes=${classSet.size} sources=${sourceSet.size}` };
}

function evaluateEvidenceTypeStrength(evidence: EdgeEvidenceRecord[]): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  if (evidence.length === 0) {
    return { factorName: 'evidenceTypeStrength', score: 0, weight: DEFAULT_WEIGHTS.evidenceTypeStrength,
      scars: ['EVIDENCE_SPARSE'], vetoes: [], rationale: 'no evidence' };
  }

  const ranks = evidence.map(e => EVIDENCE_STRENGTH_RANK[e.evidenceClass] ?? 0.3);
  const maxRank = Math.max(...ranks);
  const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const score = maxRank * 0.6 + avgRank * 0.4;

  const allWeak = evidence.every(e =>
    ['CLUSTER_DERIVED', 'NARRATIVE_SIGNAL'].includes(e.evidenceClass));
  if (allWeak) scars.push('INFERRED_ONLY');

  const allCluster = evidence.every(e => e.evidenceClass === 'CLUSTER_DERIVED');
  if (allCluster) scars.push('CLUSTER_DERIVED_ONLY');

  const allBehavioral = evidence.every(e => e.evidenceClass === 'BEHAVIORAL_INTERACTION');
  if (allBehavioral) scars.push('BEHAVIORAL_NOT_STRUCTURAL');

  return { factorName: 'evidenceTypeStrength', score: Math.min(1.0, score),
    weight: DEFAULT_WEIGHTS.evidenceTypeStrength, scars, vetoes: [],
    rationale: `maxRank=${maxRank.toFixed(2)} avgRank=${avgRank.toFixed(2)}` };
}

function evaluateCrossSourceAgreement(evidence: EdgeEvidenceRecord[]): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  if (evidence.length < 2) {
    return { factorName: 'crossSourceAgreement', score: 0.3, weight: DEFAULT_WEIGHTS.crossSourceAgreement,
      scars: [], vetoes: [], rationale: 'single evidence, no cross-source comparison' };
  }

  const sources = new Set(evidence.map(e => e.sourceModule));
  const hints = evidence.flatMap(e => e.confidenceHints ?? []);
  const hasDisagreement = hints.some(h => h.includes('DISAGREE') || h.includes('CONFLICT'));

  let score = Math.min(1.0, sources.size * 0.35);
  if (hasDisagreement) { score *= 0.5; scars.push('SOURCE_DISAGREEMENT'); }

  return { factorName: 'crossSourceAgreement', score: Math.min(1.0, score),
    weight: DEFAULT_WEIGHTS.crossSourceAgreement, scars, vetoes: [],
    rationale: `sources=${sources.size} disagreement=${hasDisagreement}` };
}

function evaluateTemporalFreshness(
  evidence: EdgeEvidenceRecord[],
  edgeType: EdgeType,
  currentTime: string,
): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  const contract = getEdgeContract(edgeType);
  const now = new Date(currentTime).getTime();

  if (evidence.length === 0) {
    return { factorName: 'temporalFreshness', score: 0, weight: DEFAULT_WEIGHTS.temporalFreshness,
      scars: ['STALE_EDGE'], vetoes: [], rationale: 'no evidence' };
  }

  const latestTs = Math.max(...evidence.map(e => new Date(e.lastConfirmedAt ?? e.observedAt).getTime()));
  const ageMs = now - latestTs;

  const staleMs = contract?.staleAfterMs ?? Infinity;
  const expireMs = contract?.expireAfterMs ?? Infinity;

  let score: number;
  if (ageMs <= staleMs * 0.5) score = 1.0;
  else if (ageMs <= staleMs) score = 0.7;
  else if (ageMs <= expireMs) { score = 0.3; scars.push('STALE_EDGE'); }
  else { score = 0.05; scars.push('STALE_EDGE'); }

  if (contract?.temporalMode === 'EVENT_BOUNDED' || contract?.temporalMode === 'DECAYING') {
    if (ageMs > staleMs) scars.push('EVENT_DECAYING');
  }

  return { factorName: 'temporalFreshness', score,
    weight: DEFAULT_WEIGHTS.temporalFreshness, scars, vetoes: [],
    rationale: `ageMs=${ageMs} staleMs=${staleMs} expireMs=${expireMs}` };
}

function evaluateStructuralVsInferred(evidence: EdgeEvidenceRecord[], edgeType: EdgeType): FactorEvaluation {
  const contract = getEdgeContract(edgeType);
  const family = contract?.semanticFamily;

  const structuralClasses: EdgeEvidenceClass[] = [
    'CANONICAL_STRUCTURAL', 'RECONCILIATION_DERIVED', 'METRIC_SUPPORTED', 'MUTATION_DERIVED',
  ];
  const hasStructural = evidence.some(e => structuralClasses.includes(e.evidenceClass));
  const allInferred = evidence.every(e =>
    ['CLUSTER_DERIVED', 'NARRATIVE_SIGNAL', 'BEHAVIORAL_INTERACTION'].includes(e.evidenceClass));

  let score: number;
  if (family === 'STRUCTURAL' || family === 'COMPETITIVE') {
    score = hasStructural ? 1.0 : allInferred ? 0.2 : 0.5;
  } else if (family === 'NARRATIVE' || family === 'DERIVED_CLUSTER') {
    score = 0.6;
  } else {
    score = hasStructural ? 0.9 : allInferred ? 0.3 : 0.6;
  }

  const scars: EdgeScarCode[] = [];
  if (allInferred && (family === 'STRUCTURAL' || family === 'COMPETITIVE')) {
    scars.push('INFERRED_ONLY');
  }

  return { factorName: 'structuralVsInferred', score,
    weight: DEFAULT_WEIGHTS.structuralVsInferred, scars, vetoes: [],
    rationale: `family=${family} hasStructural=${hasStructural} allInferred=${allInferred}` };
}

function evaluateReplayTraceability(evidence: EdgeEvidenceRecord[]): FactorEvaluation {
  const scars: EdgeScarCode[] = [];
  if (evidence.length === 0) {
    return { factorName: 'replayTraceability', score: 0, weight: DEFAULT_WEIGHTS.replayTraceability,
      scars: ['REPLAY_TRACE_WEAK'], vetoes: [], rationale: 'no evidence' };
  }

  let totalLineage = 0;
  let hasReplaySchema = 0;
  for (const e of evidence) {
    totalLineage += e.lineageRefs.length + e.sourceRefs.length;
    if (e.replayCompatibility?.schemaVersion) hasReplaySchema++;
  }

  const avgLineage = totalLineage / evidence.length;
  const replayRatio = hasReplaySchema / evidence.length;
  let score = Math.min(1.0, avgLineage * 0.3 + replayRatio * 0.7);

  if (avgLineage < 1 && replayRatio < 0.5) scars.push('REPLAY_TRACE_WEAK');

  return { factorName: 'replayTraceability', score,
    weight: DEFAULT_WEIGHTS.replayTraceability, scars, vetoes: [],
    rationale: `avgLineage=${avgLineage.toFixed(1)} replayRatio=${replayRatio.toFixed(2)}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

function scoreToBand(score: number): EdgeConfidenceBand {
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.50) return 'MEDIUM';
  if (score >= 0.25) return 'LOW';
  return 'UNRESOLVED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPS
// ═══════════════════════════════════════════════════════════════════════════════

const BAND_ORDER: Record<EdgeConfidenceBand, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNRESOLVED: 0 };
const BAND_FROM_ORDER: EdgeConfidenceBand[] = ['UNRESOLVED', 'LOW', 'MEDIUM', 'HIGH'];

function capBand(current: EdgeConfidenceBand, max: EdgeConfidenceBand): EdgeConfidenceBand {
  return BAND_ORDER[current] <= BAND_ORDER[max] ? current : max;
}

export function applyEdgeConfidenceCaps(
  band: EdgeConfidenceBand,
  scars: EdgeScarCode[],
  input: EdgeConfidenceInput,
  recencyBand: RecencyBand,
): { band: EdgeConfidenceBand; capChain: string[] } {
  let capped = band;
  const capChain: string[] = [];

  const subBand = input.subjectConfidence?.band ?? 'UNRESOLVED';
  const objBand = input.objectConfidence?.band ?? 'UNRESOLVED';
  if (subBand === 'LOW' || objBand === 'LOW') {
    capped = capBand(capped, 'MEDIUM');
    capChain.push('NODE_FLOOR_CAP:MEDIUM');
  }
  if (subBand === 'UNRESOLVED' || objBand === 'UNRESOLVED') {
    capped = capBand(capped, 'LOW');
    capChain.push('NODE_FLOOR_CAP:LOW');
  }

  if (scars.includes('CLUSTER_DERIVED_ONLY') || scars.includes('INFERRED_ONLY')) {
    capped = capBand(capped, 'MEDIUM');
    capChain.push('EVIDENCE_CLASS_CAP:MEDIUM');
  }
  if (scars.includes('EVIDENCE_MONOCULTURE') && scars.includes('EVIDENCE_SPARSE')) {
    capped = capBand(capped, 'LOW');
    capChain.push('EVIDENCE_MONOCULTURE_SPARSE_CAP:LOW');
  }

  if (recencyBand === 'STALE') {
    capped = capBand(capped, 'MEDIUM');
    capChain.push('TEMPORAL_CAP:STALE');
  }
  if (recencyBand === 'EXPIRED') {
    capped = capBand(capped, 'LOW');
    capChain.push('TEMPORAL_CAP:EXPIRED');
  }

  const contract = getEdgeContract(input.edgeType);
  if (contract) {
    const family = contract.semanticFamily;
    if (family === 'NARRATIVE' || family === 'DERIVED_CLUSTER') {
      capped = capBand(capped, 'MEDIUM');
      if (!capChain.some(c => c.includes('FAMILY_CAP'))) capChain.push(`FAMILY_CAP:${family}:MEDIUM`);
    }
    if (family === 'CAUSAL_HYPOTHESIS') {
      capped = capBand(capped, 'LOW');
      capChain.push('FAMILY_CAP:CAUSAL_HYPOTHESIS:LOW');
    }
  }

  if (scars.includes('REPLAY_TRACE_WEAK')) {
    capped = capBand(capped, 'MEDIUM');
    capChain.push('REPLAY_CAP:MEDIUM');
  }

  return { band: capped, capChain };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENCY
// ═══════════════════════════════════════════════════════════════════════════════

export function computeEdgeRecencyScore(
  evidence: EdgeEvidenceRecord[],
  edgeType: EdgeType,
  currentTime: string,
): { score: number; band: RecencyBand } {
  if (evidence.length === 0) return { score: 0, band: 'EXPIRED' };

  const contract = getEdgeContract(edgeType);
  const now = new Date(currentTime).getTime();
  const latestTs = Math.max(...evidence.map(e => new Date(e.lastConfirmedAt ?? e.observedAt).getTime()));
  const ageMs = now - latestTs;

  const staleMs = contract?.staleAfterMs ?? Infinity;
  const expireMs = contract?.expireAfterMs ?? Infinity;

  let score: number;
  let band: RecencyBand;
  if (ageMs <= staleMs * 0.5) { score = 1.0; band = 'FRESH'; }
  else if (ageMs <= staleMs) { score = 0.7; band = 'SLIPPING'; }
  else if (ageMs <= expireMs) { score = 0.3; band = 'STALE'; }
  else { score = 0.05; band = 'EXPIRED'; }

  return { score, band };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RIGHTS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

const USE_DOMAIN_TO_RIGHTS_KEY: Record<UseDomain, keyof EdgeRightsProfile> = {
  context_enrichment: 'contextEnrichment',
  comparison: 'comparison',
  clustering: 'clustering',
  propagation: 'propagation',
  judgment_support: 'judgmentSupport',
  explanation: 'explanation',
  competitor_discovery: 'competitorDiscovery',
  forensic_replay: 'explanation',
};

export function deriveEdgeRightsProfile(
  band: EdgeConfidenceBand,
  edgeType: EdgeType,
  scars: EdgeScarCode[],
): EdgeRightsProfile {
  const contract = getEdgeContract(edgeType);
  const blockedUses = new Set(contract?.blockedUsesUnderUncertainty ?? []);
  const allowedUses = new Set(contract?.allowedUses ?? []);
  const propEligible = contract?.supportsDirectPropagation ?? false;

  const profile: EdgeRightsProfile = {
    contextEnrichment: 'DENY',
    comparison: 'DENY',
    clustering: 'DENY',
    propagation: 'DENY',
    judgmentSupport: 'DENY',
    explanation: 'DENY',
    competitorDiscovery: 'DENY',
  };

  const bandRights: Record<EdgeConfidenceBand, Record<keyof EdgeRightsProfile, EdgeRight>> = {
    HIGH: {
      contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
      propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
      competitorDiscovery: 'ALLOW',
    },
    MEDIUM: {
      contextEnrichment: 'ALLOW', comparison: 'CONDITIONAL', clustering: 'CONDITIONAL',
      propagation: 'CONDITIONAL', judgmentSupport: 'CONDITIONAL',
      explanation: 'ALLOW_WITH_SCAR', competitorDiscovery: 'CONDITIONAL',
    },
    LOW: {
      contextEnrichment: 'ALLOW_WITH_SCAR', comparison: 'CONDITIONAL', clustering: 'DENY',
      propagation: 'DENY', judgmentSupport: 'DENY',
      explanation: 'ALLOW_WITH_SCAR', competitorDiscovery: 'DENY',
    },
    UNRESOLVED: {
      contextEnrichment: 'CONDITIONAL', comparison: 'DENY', clustering: 'DENY',
      propagation: 'DENY', judgmentSupport: 'DENY',
      explanation: 'CONDITIONAL', competitorDiscovery: 'DENY',
    },
  };

  const defaults = bandRights[band];
  for (const key of Object.keys(profile) as (keyof EdgeRightsProfile)[]) {
    profile[key] = defaults[key];
  }

  if (!propEligible && profile.propagation !== 'DENY') {
    profile.propagation = 'DENY';
  }

  for (const blocked of blockedUses) {
    const rightsKey = USE_DOMAIN_TO_RIGHTS_KEY[blocked];
    if (rightsKey && band !== 'HIGH') {
      profile[rightsKey] = 'DENY';
    }
  }

  for (const key of Object.keys(profile) as (keyof EdgeRightsProfile)[]) {
    if (profile[key] !== 'DENY') {
      const useDomain = Object.entries(USE_DOMAIN_TO_RIGHTS_KEY)
        .find(([, v]) => v === key)?.[0] as UseDomain | undefined;
      if (useDomain && !allowedUses.has(useDomain) && useDomain !== 'forensic_replay') {
        profile[key] = 'DENY';
      }
    }
  }

  return profile;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export function evaluateEdgeConfidence(input: EdgeConfidenceInput): GraphEdgeState {
  const now = input.currentTime ?? new Date().toISOString();
  const contract = getEdgeContract(input.edgeType);
  const evidence = input.evidence.length > 0
    ? input.evidence
    : [...getEvidenceForEdge(input.edgeId)];

  const factors: FactorEvaluation[] = [
    evaluateNodeConfidenceFloor(input),
    evaluateEvidenceCountDiversity(evidence),
    evaluateEvidenceTypeStrength(evidence),
    evaluateCrossSourceAgreement(evidence),
    evaluateTemporalFreshness(evidence, input.edgeType, now),
    evaluateStructuralVsInferred(evidence, input.edgeType),
    evaluateReplayTraceability(evidence),
  ];

  let weightedScore = 0;
  for (const f of factors) weightedScore += f.score * f.weight;

  const allScars = [...new Set(factors.flatMap(f => f.scars))];
  const allVetoes = factors.flatMap(f => f.vetoes);

  let provisionalBand = scoreToBand(weightedScore);
  if (allVetoes.length > 0) provisionalBand = 'UNRESOLVED';

  const recency = computeEdgeRecencyScore(evidence, input.edgeType, now);
  const { band: finalBand, capChain } = applyEdgeConfidenceCaps(
    provisionalBand, allScars, input, recency.band,
  );

  const rightsProfile = deriveEdgeRightsProfile(finalBand, input.edgeType, allScars);
  const reasonCodes = capChain.length > 0
    ? [`CAPPED_FROM:${provisionalBand}`, ...capChain]
    : [`CLEAN_BAND:${finalBand}`];

  let admissibilityState: GraphEdgeState['admissibilityState'];
  if (finalBand === 'UNRESOLVED') admissibilityState = 'INADMISSIBLE';
  else if (finalBand === 'HIGH') admissibilityState = 'ADMISSIBLE';
  else admissibilityState = 'CONDITIONAL';

  return {
    edgeId: input.edgeId,
    edgeType: input.edgeType,
    subjectNodeId: input.subjectNodeId,
    objectNodeId: input.objectNodeId,
    contractVersion: contract?.contractVersion ?? 'unknown',
    confidenceBand: finalBand,
    confidenceScore: weightedScore,
    rightsProfile,
    evidenceRefs: evidence.map(e => e.evidenceId),
    lineageRefs: evidence.flatMap(e => e.lineageRefs),
    recencyScore: recency.score,
    recencyBand: recency.band,
    scars: allScars,
    capChain,
    factorEvaluations: factors,
    evaluationReasonCodes: reasonCodes,
    admissibilityState,
    policyVersion: '1.0.0',
    evaluationVersion: '1.0.0',
    createdAt: now,
    lastConfirmedAt: evidence.length > 0
      ? evidence.map(e => e.lastConfirmedAt ?? e.observedAt).sort().pop()
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export function reEvaluateEdgeConfidence(
  priorState: GraphEdgeState,
  input: EdgeConfidenceInput,
): GraphEdgeState {
  return evaluateEdgeConfidence(input);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeConfidenceAuditEvent {
  eventType: 'EDGE_CONFIDENCE_EVALUATED' | 'EDGE_CONFIDENCE_RE_EVALUATED';
  edgeId: string;
  edgeType: string;
  band: EdgeConfidenceBand;
  score: number;
  scars: EdgeScarCode[];
  capChain: string[];
  evaluatedAt: string;
}

export function emitEdgeConfidenceAuditEvent(state: GraphEdgeState): EdgeConfidenceAuditEvent {
  return {
    eventType: 'EDGE_CONFIDENCE_EVALUATED',
    edgeId: state.edgeId,
    edgeType: state.edgeType,
    band: state.confidenceBand,
    score: state.confidenceScore,
    scars: state.scars,
    capChain: state.capChain,
    evaluatedAt: state.createdAt,
  };
}
