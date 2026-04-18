/**
 * L5.1 Purpose — Public API
 *
 * This barrel exports every constitutional type, enum, function,
 * and constant that the L5.1 purpose layer defines.
 */

export {
  L5PurposeErrorCode,
  L5PurposeError,
} from './purpose-errors';

export {
  L5StateClass,
  ALL_STATE_CLASSES,
  type StateClassProperties,
  type StateLossConsequence,
  getStateClassProperties,
  type L5PurposeClassification,
  type AuthorityHomeDeclaration,
  declareAuthorityHome,
  getAuthorityHome,
  getAllAuthorityHomes,
  hasAuthorityHome,
  resetStateClassRegistry,
} from './state-class';

export {
  AllowedL5Capability,
  ALL_CAPABILITIES,
  type L5ModuleCapabilityDeclaration,
  registerL5ModuleCapabilities,
  getModuleCapabilities,
  getAllRegisteredModules,
  assertLayer5Capability,
  resetCapabilityRegistry,
} from './allowed-capability';

export {
  ForbiddenL5Action,
  ALL_FORBIDDEN_ACTIONS,
  type ForbiddenActionSignal,
  type WriteIntentSignals,
  reportForbiddenAction,
  getForbiddenActionLog,
  assertNoForbiddenL5Action,
  resetForbiddenActionLog,
} from './forbidden-action';

export {
  type L5WriteDomain,
  ALL_WRITE_DOMAINS,
  type ClassifyWriteInput,
  classifyL5WritePurpose,
  getPrimaryStateClassForDomain,
  getDomainsForStateClass,
} from './purpose-classifier';

export {
  type L5PurposeInvariantId,
  type InvariantDefinition,
  L5_PURPOSE_INVARIANTS,
  type InvariantCheckResult,
  type InvariantCheckContext,
  assertL5PurposeInvariant,
  enforceL5PurposeInvariants,
} from './purpose-invariants';

export {
  L5_MISSION,
  type FailureSignatureId,
  type FailureSignature,
  FAILURE_SIGNATURES,
  type LayerDependencyContract,
  LAYER_DEPENDENCIES,
  L5_BOUNDARY_ASSERTION,
  type StateDoctrineRule,
  STATE_DOCTRINE,
  L5_PURPOSE_CHARTER,
} from './l5-purpose';
