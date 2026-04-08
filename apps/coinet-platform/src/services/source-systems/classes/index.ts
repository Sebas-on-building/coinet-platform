/**
 * L1.1 Source Class Doctrine — barrel exports.
 *
 * The observational constitution of Coinet.
 */

export * from './types';
export * from './doctrine';
export * from './source-mapping';
export * from './claim-boundaries';
export * from './class-interactions';
export * from './cross-class-tension';
export * from './class-coverage-state';
export * from './class-health';
export * from './truth-fingerprint-builder';
export * from './authority-constitution';
export * from './authority-resolver';
export * from './substitution-types';
export * from './substitution-constitution';
export * from './substitution-engine';
export * from './health-types';
export * from './field-health-engine';
export * from './class-health-engine';
export * from './epistemic-integrity-engine';
export * from './claim-permission-compiler';
export * from './field-criticality-map';
export * from './recovery-governor';
export * from './conflict-types';
export * from './conflict-constitution';
export * from './conflict-adjudicator';
export * from './conflict-ledger';
export {
  L16_PLATFORM_VERSION, DEGRADATION_RANK, DEGRADATION_LABELS, TRUTH_STATE_TO_LEVEL,
  DOWNSTREAM_BLOCKS, CONFIDENCE_PENALTY_RANGE, DISCLOSURE_TEMPLATES, CLAIM_RESTRICTIONS,
  getClaimRestrictions,
} from './degradation-types';
export type {
  DegradationLevel, TruthState, VisibilityLoss, DownstreamComponent,
  DegradationInput, FieldDegradationInput, DegradationAssessment, DomainClaimRestriction,
} from './degradation-types';

export {
  CLASS_DEGRADATION_PROFILES, getClassProfile, getLevelProfile, getAllClassProfiles,
} from './degradation-constitution';
export type { LevelProfile, ClassDegradationProfile } from './degradation-constitution';

export {
  evaluateDegradation, evaluateAllDegradation, buildDegradationFingerprint,
  buildPropagationMap, getLockedClasses, getClassesUnsafeForThesis, getAllDisclosures,
} from './degradation-evaluator';
export { getDegradedClasses as getL16DegradedClasses } from './degradation-evaluator';
export type {
  DegradationFingerprintEntry, DegradationFingerprint, PropagationEffect,
} from './degradation-evaluator';

export {
  getCurrentLevel, getAllCurrentLevels, recordDegradation, recordDegradationBatch,
  constrainRestoration, attemptRestoration, getDegradationEvents, getRestorationEvents,
  resetAllLevels, resetState as resetDegradationState,
} from './degradation-ledger';
export {
  getLedger as getDegradationLedger,
  getLedgerForClass as getDegradationLedgerForClass,
  getLedgerSince as getDegradationLedgerSince,
  clearLedger as clearDegradationLedger,
} from './degradation-ledger';
export type { DegradationLedgerEvent } from './degradation-ledger';
