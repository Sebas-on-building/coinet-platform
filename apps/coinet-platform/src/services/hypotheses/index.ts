/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     HYPOTHESIS ENGINE — Phase 3 Wave 2                                        ║
 * ║                                                                               ║
 * ║   12 canonical market-explanation classes. Explicit evidence links.           ║
 * ║   Formal invalidation and confirmation rules. Ranked with spread.            ║
 * ║   Explanations for why primary outranks secondary. Persistent logging.       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Types
export type {
  HypothesisId,
  EvidencePolarity,
  RuleStrength,
  HypothesisRuleRef,
  HypothesisEvidenceLink,
  HypothesisSupportProfile,
  HypothesisConfirmationRule,
  HypothesisInvalidationRule,
  HypothesisDefinition,
  RankedHypothesis,
  AmbiguityLevel,
  HypothesisOutput,
  CoverageState,
} from './types';
export { HYPOTHESIS_IDS } from './types';

// Registry
export {
  HYPOTHESIS_DEFINITIONS,
  HYPOTHESIS_REGISTRY_VERSION,
  getHypothesisDefinition,
  getAllHypothesisDefinitions,
} from './registry';

// Evidence mapping
export { mapEvidenceForHypothesis, buildCoverageState } from './evidence-mapper';
export { EVIDENCE_KEY_MAP } from './evidence-mapper-keys';

// Support engine
export {
  computeSupportScore,
  computeContradictionScore,
  computeMissingPenalty,
  computeStalePenalty,
  buildSupportProfile,
} from './support-engine';

// Invalidation engine
export { evaluateInvalidation } from './invalidation-engine';
export type { InvalidationResult } from './invalidation-engine';

// Modifiers
export {
  computeRegimeModifier,
  computeSequenceModifier,
  computeCoverageModifier,
} from './modifiers';

// Ranker
export { rankAllHypotheses } from './ranker';

// Explainer
export { buildRankingExplanation, formatHypothesisForAI } from './explainer';

// Orchestrator
export { produceHypothesisOutput } from './orchestrator';
export type { ProduceHypothesisInput, ProduceHypothesisResult } from './orchestrator';

// Versioning
export {
  HYPOTHESIS_ENGINE_VERSION,
  HYPOTHESIS_SCORING_VERSION,
  getConfigVersions,
} from './versioning';
export type { HypothesisConfigVersions } from './versioning';

// Persistence
export {
  buildHypothesisSnapshot,
  persistHypothesisJudgmentSnapshot,
  getRecentSnapshots,
} from './logging';
export type {
  PersistHypothesisJudgmentInput,
  HypothesisSnapshotRecord,
} from './logging';
