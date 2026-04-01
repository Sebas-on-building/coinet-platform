/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     SOURCE SYSTEMS LAYER — Layer 1                                            ║
 * ║                                                                               ║
 * ║   The observational foundation of Coinet AI.                                  ║
 * ║                                                                               ║
 * ║   A role-disciplined, truth-hierarchical, multi-source architecture that      ║
 * ║   captures the major dimensions of crypto market reality:                     ║
 * ║     - market surface                                                          ║
 * ║     - DEX emergence                                                           ║
 * ║     - derivatives pressure                                                    ║
 * ║     - protocol substance                                                      ║
 * ║     - on-chain behavior                                                       ║
 * ║     - structural safety                                                       ║
 * ║     - narrative attention                                                     ║
 * ║     - entity context                                                          ║
 * ║     - reasoning expression                                                    ║
 * ║                                                                               ║
 * ║   ...and prepares them for transformation into coherent market judgment.       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ── Registry ────────────────────────────────────────────────────────────────
export {
  TRUTH_CLASSES,
  TRUTH_CLASS_LABELS,
  TRUTH_CLASS_DESCRIPTIONS,
  SOURCE_CLASSES,
  SOURCE_CLASS_TO_TRUTH,
  TRUTH_PRECEDENCE,
  SOURCE_CLASS_DOCTRINES,
  PROVIDERS,
  getProvider,
  getProvidersByClass,
  getPrimaryProviders,
  getFallbackChain,
  getDoctrine,
  getTruthPrecedence,
  getAllSourceClasses,
  isProviderConfigured,
  getConfiguredProviders,
  getSourceClassCoverage,
} from './registry';

export type {
  TruthClass,
  SourceClass,
  TruthDomain,
  ProviderTier,
  SourceProviderDef,
  SourceClassDoctrine,
} from './registry';

// ── Health Monitor ──────────────────────────────────────────────────────────
export {
  recordSuccess,
  recordFailure,
  getProviderHealth,
  isProviderAvailable,
  getClassHealth,
  getAllClassHealth,
  getSystemHealth,
  resetProviderHealth,
  resetAllHealth,
} from './health-monitor';

export type {
  CircuitState,
  ProviderHealthState,
  SourceClassHealth,
} from './health-monitor';

// ── Truth Resolver ──────────────────────────────────────────────────────────
export {
  resolveTruth,
  resolveAuthorityForDomain,
  crossValidateNumeric,
} from './truth-resolver';

export type {
  SourceClaim,
  TruthResolution,
  CrossValidationResult,
} from './truth-resolver';

// ── Quality Assessor ────────────────────────────────────────────────────────
export {
  assessProviderQuality,
  assessClassQuality,
  assessAllSources,
} from './quality-assessor';

export type {
  SourceQualityDimensions,
  SourceQualityReport,
} from './quality-assessor';

// ── Doctrine Enforcer ───────────────────────────────────────────────────────
export {
  enforceR3TruthRole,
  enforceR5FastSourceConfidence,
  enforceR6SecurityCap,
  enforceR7ReasoningBoundary,
  enforceR4R8CoverageTransparency,
  enforceMultiClassJudgment,
  auditDoctrine,
} from './doctrine-enforcer';

export type {
  DoctrineViolationType,
  DoctrineViolation,
  DoctrineAuditResult,
} from './doctrine-enforcer';

// ── Degradation Manager ─────────────────────────────────────────────────────
export {
  assessDegradation,
  getClassConfidenceMultiplier,
  getAggregateConfidencePenalty,
  getBlindSpots,
} from './degradation-manager';

export type {
  DegradationState,
  ClassDegradationDetail,
} from './degradation-manager';

// ── Truth Diagnostics ──────────────────────────────────────────────────────
export {
  buildTruthDiagnostics,
} from './truth-diagnostics';

export type {
  TruthDiagnosticsReport,
  SourceConsultation,
  DomainResolution,
  ConfidencePenalty,
  EvidenceModuleTrace,
} from './truth-diagnostics';

// ── L1.1 Source Class Doctrine ─────────────────────────────────────────────
export {
  FULL_DOCTRINES,
  getFullDoctrine,
  getAllFullDoctrines,
} from './classes/doctrine';

export {
  CLAIM_BOUNDARIES,
  CLAIM_ESCALATION_RULES,
  getClaimBoundary,
  canClassJustifyClaim,
  getEscalationRequirements,
} from './classes/claim-boundaries';

export {
  CLASS_INTERACTIONS,
  getInteractionsFor,
  getInteractionBetween,
  getContradictions,
  getEscalations,
  getTensionSignals,
} from './classes/class-interactions';

export {
  computeTensions,
  getContradictionTensionSignals,
} from './classes/cross-class-tension';

export {
  getClassCoverage,
  getBlindClasses,
  getDegradedClasses,
  getHealthyClasses,
  getClassVisibility,
  getCoverageMap,
  getCoverageSummary,
} from './classes/class-coverage-state';

export {
  CLASS_DEGRADATION_RULES,
  getDegradationRule,
  getConfidencePenaltyForDegraded,
  isHardBlocker,
  getDegradationMessages,
  getAffectedHypothesisIds,
  computeAggregatePenalty,
} from './classes/class-health';

export {
  PROVIDER_CLASS_MAPPINGS,
  getProviderMapping,
  getProviderPrimaryClass,
  getProviderSecondaryScopes,
  getProvidersForClass,
  getAllMappedProviderIds,
  getUnmappedProviders,
  validateAllProvidersMapped,
} from './classes/source-mapping';

export {
  buildTruthFingerprint,
  formatFingerprintForAI,
  formatFingerprintCompact,
} from './classes/truth-fingerprint-builder';

export type {
  ClaimStrength,
  FreshnessProfile,
  DegradationImpact,
  ClassVisibility,
  TensionDirection,
  ClassClaimRight,
  ClassForbiddenClaim,
  FullSourceClassDoctrine,
  InteractionType,
  ClassInteraction,
  ClassCoverageEntry,
  CrossClassTension,
  ClaimEscalationRule,
  TruthFingerprint,
  TruthFingerprintEntry,
} from './classes/types';

export { L11_DOCTRINE_VERSION } from './classes/types';

// ── L1.1 Cryptographic Integrity Sub-Layer ─────────────────────────────────
export {
  produceCryptographicIntegrityState,
  formatCIStateForAI,
} from './classes/cryptographic-integrity/orchestrator';

export {
  buildCIDiagnostics,
} from './classes/cryptographic-integrity/diagnostics';

export {
  buildCIAuthorityDiagnostics,
  buildDefaultClaimsFromFields,
} from './classes/cryptographic-integrity/authority/diagnostics';

export {
  resolveFieldAuthority as resolveCryptoFieldAuthority,
  resolveAuthorityForFields as resolveCryptoAuthorityForFields,
  classifySourceForDomain as classifyCryptoAuthoritySource,
} from './classes/cryptographic-integrity/authority/resolver';

export {
  parseProtocolStructure,
  getKnownChains,
} from './classes/cryptographic-integrity/protocol-parser';

export {
  analyzeExposure,
  classifyExposureSeverity,
} from './classes/cryptographic-integrity/exposure-analyzer';

export {
  classifySecurityStructure,
} from './classes/cryptographic-integrity/security-classifier';

export {
  trackPqcMigration,
  getMigrationRiskScore,
} from './classes/cryptographic-integrity/pqc-tracker';

export {
  estimateDormantVulnerableSupply,
  getDormantProfile,
} from './classes/cryptographic-integrity/dormant-supply';

export {
  computeDiagnosticMetrics as computeCIDiagnosticMetrics,
  assessDegradation as assessCIDegradation,
} from './classes/cryptographic-integrity/degradation';

export {
  ALLOWED_CLAIMS as CI_ALLOWED_CLAIMS,
  FORBIDDEN_CLAIMS as CI_FORBIDDEN_CLAIMS,
  CLAIM_BOUNDARY as CI_CLAIM_BOUNDARY,
  TRUTH_DIMENSIONS as CI_TRUTH_DIMENSIONS,
} from './classes/cryptographic-integrity/doctrine';

export type {
  CryptographicIntegrityState,
  CitedField,
  CryptographicAttackSurface,
  DormantSupplyEstimate,
  FragilityClass,
  SignatureSchemeFamily,
  SignatureSchemeVariant,
  PqcSupportStatus,
  PqcMigrationStage,
  CIDiagnosticMetrics,
  CryptoEntityType,
} from './classes/cryptographic-integrity/types';

export type {
  SourceAuthorityObject as CISourceAuthorityObject,
  FieldAuthorityResolution as CIFieldAuthorityResolution,
  CIAuthorityDiagnosticsReport,
  CIAuthorityMetrics,
  CIAuthorityAlert,
  AuthorityClaim as CIAuthorityClaim,
  AuthorityLevel as CIAuthorityLevel,
  TrustClass as CITrustClass,
  CryptoTruthDomain,
  ConflictType as CIConflictType,
} from './classes/cryptographic-integrity/authority/types';

export {
  evaluateAuthority as evaluateCIAuthority,
} from './classes/cryptographic-integrity/authority/evaluation';

export type {
  EvaluationResult as CIEvaluationResult,
} from './classes/cryptographic-integrity/authority/evaluation';

export {
  GOVERNANCE_RULES as CI_GOVERNANCE_RULES,
  CHANGE_CONTROL_TRIGGERS as CI_CHANGE_CONTROL_TRIGGERS,
  getGovernanceSummary as getCIGovernanceSummary,
  recordAuthorityChange as recordCIAuthorityChange,
  getChangeLog as getCIAuthorityChangeLog,
  getRequiredReviewers as getCIRequiredReviewers,
} from './classes/cryptographic-integrity/authority/governance';

export {
  DOCTRINE_OVERRIDE_RULES as CI_DOCTRINE_OVERRIDE_RULES,
  shouldOverride as shouldCIOverride,
  STRONG_INFERENCE_MIN_CONFIDENCE as CI_STRONG_INFERENCE_MIN_CONFIDENCE,
} from './classes/cryptographic-integrity/authority/doctrine';

export type {
  ConsensusState as CIConsensusState,
} from './classes/cryptographic-integrity/authority/types';

export { CI_VERSION } from './classes/cryptographic-integrity/types';
export { CI_AUTHORITY_VERSION } from './classes/cryptographic-integrity/authority/types';

// ── Quantum Risk V1 Loop ───────────────────────────────────────────────────
export {
  runQuantumRiskPipeline,
  runBtcQuantumRisk,
} from './classes/cryptographic-integrity/quantum-risk/pipeline';

export {
  recordOutcome as recordQuantumOutcome,
  getOutcomesForSnapshot as getQuantumOutcomes,
} from './classes/cryptographic-integrity/quantum-risk/outcome-tracker';

export {
  getSnapshot as getQuantumSnapshot,
  getLatestSnapshot as getLatestQuantumSnapshot,
  getAllSnapshots as getAllQuantumSnapshots,
} from './classes/cryptographic-integrity/quantum-risk/snapshot';

export type {
  QuantumRiskSnapshot,
  QuantumRiskScore,
  QuantumJudgment,
  QuantumRiskPipelineInput,
  ScriptDistribution,
  DormantCohorts,
  PQEvidence,
  OutcomeData as QuantumOutcomeData,
} from './classes/cryptographic-integrity/quantum-risk/types';

export { LOGIC_VERSION as QUANTUM_LOGIC_VERSION } from './classes/cryptographic-integrity/quantum-risk/types';

export {
  evaluateQRSBand,
  buildCalibrationReport,
} from './classes/cryptographic-integrity/quantum-risk/evaluation';

export type {
  BandEvaluation,
  CalibrationReport,
} from './classes/cryptographic-integrity/quantum-risk/evaluation';

// ── L1.2 Source Authority Hierarchy ────────────────────────────────────────
export {
  TRUTH_ATOMS,
  getTruthAtom,
  getTruthAtomsForClass,
  getAllTruthAtomIds,
} from './authority/truth-atoms';

export {
  PROVIDER_CAPABILITIES,
  getCapabilitiesForSource,
  getCapabilitiesForAtom,
  canSourceSpeakOn,
  getStrongestCapabilityForAtom,
} from './authority/capability-registry';

export {
  AUTHORITY_RULES,
  getRulesForAtom,
  getPrimaryRulesForAtom,
  getSecondaryRulesForAtom,
  getChallengerRulesForAtom,
  getRulesForSource,
} from './authority/authority-registry';

export {
  evaluateAuthorityPolicy,
  selectBestCandidateByPolicy,
} from './authority/authority-policies';

export {
  CHALLENGER_RULES,
  getChallengersForAtom,
  getChallengersForPrimary,
  getChallengersByClass,
  getMetricChallengers,
  getInterpretationChallengers,
} from './authority/challenger-matrix';

export {
  CLAIM_AUTHORITY_REQUIREMENTS,
  getRequirementsForLevel,
  findMatchingRequirement,
  evaluateClaimEligibility,
} from './authority/claim-authority-ladder';

export {
  resolveAuthority,
  resolveMultipleAtoms,
} from './authority/resolver';

export {
  buildContestedState,
  getContestedSummary,
} from './authority/contested-state';

export {
  buildAuthorityFingerprint,
  formatAuthorityFingerprintForAI,
  formatAuthorityFingerprintCompact,
} from './authority/authority-fingerprint';

export {
  buildAuthorityDiagnostics,
} from './authority/diagnostics';

export type {
  TruthAtomId,
  SourceId,
  AuthorityRole,
  AuthorityStrength,
  AuthorityStatus,
  ResolutionOutcome,
  ClaimAuthorityLevel,
  AuthorityCondition,
  TruthAtomDef,
  TruthAtomAuthorityRule,
  ChallengerRule,
  ClaimAuthorityRequirement,
  ResolvedAuthority,
  AuthorityFingerprint,
  AuthorityFingerprintEntry,
  AuthoritySubstitutionEvent,
  ProviderCapability,
} from './authority/types';

export { L12_AUTHORITY_VERSION } from './authority/types';

// ── L1.3 Redundancy & Substitution Matrix ──────────────────────────────
export {
  REDUNDANCY_RULES,
  getRedundancyRule,
  getFailStopAtoms,
  getFailSoftAtoms,
  getAtomsByBlindSeverity,
} from './redundancy/truth-atom-rules';

export {
  computeSubstitutionPenalty,
  computeBlindPenalty,
  computeTemporalFallbackPenalty,
  getClaimRightsReduction,
} from './redundancy/penalty-model';

export {
  CLAIM_LOCKOUT_RULES,
  getActiveLockouts,
  getLockedOutClaimFamilies,
  isClaimLocked,
} from './redundancy/claim-lockouts';

export {
  evaluateBlindSpotEscalation,
} from './redundancy/blind-spot-escalation';

export {
  resolveSubstitution,
  resolveAllSubstitutions,
} from './redundancy/resolver';

export {
  recordSubstitutionEvent,
  getRecentEvents,
  getEventsForAtom,
  getSubstitutionFrequency,
  getMostFragileAtoms,
  getBlindEventCount,
} from './redundancy/substitution-memory';

export {
  buildSubstitutionFingerprint,
  formatSubstitutionFingerprintForAI,
} from './redundancy/fingerprint';

export {
  buildRedundancyDiagnostics,
} from './redundancy/diagnostics';

export type {
  SubstitutionMode,
  SubstitutionStatus,
  ClaimRightsPenalty,
  BlindSpotSeverity,
  EscalationLevel,
  AcceptableSubstitution,
  UnacceptableSubstitution,
  TemporalFallbackPolicy,
  TruthAtomRedundancyRule,
  SubstitutionPenalty,
  ClaimLockout,
  ResolvedSubstitution,
  SubstitutionEvent,
  BlindSpotEscalation,
  SubstitutionFingerprint,
  SubstitutionFingerprintEntry,
} from './redundancy/types';

export { L13_REDUNDANCY_VERSION } from './redundancy/types';
