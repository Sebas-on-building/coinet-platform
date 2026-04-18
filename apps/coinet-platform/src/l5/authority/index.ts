/**
 * L5.2 — Core Doctrine and Authority Model
 *
 * Public API surface for storage sovereignty law.
 */

// Authority errors
export { L5AuthorityErrorCode, L5AuthorityError } from './authority-errors';

// Authority tiers
export { L5AuthorityTier, ALL_AUTHORITY_TIERS, isAuthorityTier, isProjectionTier } from './authority-tier';

// Authority stores
export { L5AuthorityStore, ALL_AUTHORITY_STORES, getStoreSovereigntyProfile } from './authority-store';
export type { StoreSovereigntyProfile, StoreLossConsequenceClass } from './authority-store';

// Projection categories
export { L5ProjectionCategory, ALL_PROJECTION_CATEGORIES, isRequiredProjectionCategory } from './projection-category';

// Repairability classes
export { L5RepairabilityClass, ALL_REPAIRABILITY_CLASSES, isRepairable, requiresHumanReview, isCriticalRepair } from './repairability-class';

// Authority allocation engine
export { allocateL5Authority, validateStoreClassLegality, getLegalPrimaryStore } from './authority-allocation';
export type { L5ProjectionPlan, L5AuthorityAllocation } from './authority-allocation';

// Projection policy
export {
  detectShadowAuthorityRisk,
  validateProjectionPlan,
  registerProjection,
  getProjection,
  getProjectionsForDatumFamily,
  resetProjectionRegistry,
} from './projection-policy';
export type { ProjectionDescriptor, ShadowAuthorityRisk, ShadowAuthorityCheckInput, ProjectionPlanValidation } from './projection-policy';

// Manifest lifecycle
export {
  ManifestState,
  ALL_MANIFEST_STATES,
  TERMINAL_STATES,
  isTerminal,
  isLegalTransition,
  getLegalTransitions,
  createManifest,
  transitionManifest,
  validateFinalization,
  getManifest,
  getAllManifests,
  resetManifestRegistry,
} from './manifest-lifecycle';
export type { ManifestRecord } from './manifest-lifecycle';

// Loss semantics
export { getStoreLossConsequence, assessLossImpact, isRedisLossTruthLoss } from './loss-semantics';
export type { StoreLossConsequence, LossImpactAssessment, LossSeverity } from './loss-semantics';

// Authority invariants
export {
  assertL5AuthorityInvariant,
  assertAllAuthorityInvariants,
  enforceAllAuthorityInvariants,
  ALL_AUTHORITY_INVARIANT_IDS,
} from './authority-invariants';
export type { L5AuthorityInvariantId, AuthorityInvariantResult, AuthorityInvariantContext } from './authority-invariants';

// Authority registry
export {
  declareAuthorityHome,
  getAuthorityHome,
  getAllAuthorityHomes,
  hasAuthorityHome,
  isAuthorityHomeFor,
  resetAuthorityRegistry,
} from './authority-registry';
export type { AuthorityRegistration } from './authority-registry';

// Authority evaluator
export { evaluateL5Authority, dryRunL5Authority } from './authority-evaluator';
export type { L5AuthorityEvaluation } from './authority-evaluator';
