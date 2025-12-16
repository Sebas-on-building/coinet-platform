/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 AUDIT MODULE INDEX                                                     ║
 * ║                                                                               ║
 * ║   Truth dumps, feature specs, and auditability tools                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH DUMP
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type TruthDump,
  type TruthDumpInput,
  type FeatureContribution,
  
  // Generator
  generateTruthDump,
  
  // Formatters
  formatTruthDumpAsText,
  formatTruthDumpAsJSON,
  formatTruthDumpAsCompact,
} from './truth-dump';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE SPECS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type FeatureSpec,
  type FeatureDirection,
  type FeatureScope,
  type AssetType,
  type Transformation,
  type MissingBehavior,
  
  // Specs
  QS_FEATURE_SPECS,
  OS_FEATURE_SPECS,
  RISK_FEATURE_SPECS,
  ALL_FEATURE_SPECS,
  
  // Helpers
  getFeatureSpec,
  getSpecsForCategory,
  getApplicableSpecs,
  isFeatureApplicable,
  
  // Documentation
  formatSpecsAsMarkdown,
} from './feature-specs';
