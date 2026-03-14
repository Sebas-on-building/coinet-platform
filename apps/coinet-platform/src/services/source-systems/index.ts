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
