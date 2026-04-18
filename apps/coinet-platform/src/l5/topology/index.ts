/**
 * L5.3 — Multi-store Architecture
 *
 * Public API surface for production storage topology.
 */

// Topology errors
export { L5TopologyErrorCode, L5TopologyError } from './topology-errors';

// Deployment modes
export { L5DeploymentMode, ALL_DEPLOYMENT_MODES, isReferenceMode, isConstrainedMode, isValidDeploymentMode } from './deployment-mode';

// Store profiles
export { L5StoreKind, L5StorePlane, ALL_STORE_KINDS, ALL_STORE_PLANES, REFERENCE_STORE_PROFILES, getStoreProfile, getStoreForPlane, getPlaneForStore } from './store-profile';
export type { L5StoreProfile } from './store-profile';

// Store ownership
export { getOwnedDataClasses, getForbiddenDataClasses, classifyDataClassOwnership } from './store-ownership';
export type { DataClassOwnership, OwnershipEntry } from './store-ownership';

// Store topology (interaction matrix)
export { L5InteractionLegality, getInteractionRule, getInteractionLegality, isLegalInteraction, getAllInteractionRules, getIllegalInteractions, getCoordinationRequiredInteractions } from './store-topology';
export type { InteractionRule } from './store-topology';

// Service boundaries
export { L5ServiceRole, ALL_SERVICE_ROLES, getAllowedWriteStores, canWrite, registerServiceBoundary, assertServiceWriteAccess, getServiceBoundary, getAllServiceBoundaries, resetServiceBoundaryRegistry } from './service-boundary';
export type { ServiceBoundaryDeclaration } from './service-boundary';

// Namespace policy
export { getNamespacePolicy, hasNamespacePolicy, resolveNamespace, validateNamespaceIsolation } from './namespace-policy';
export type { NamespacePolicy } from './namespace-policy';

// Config schema
export { ALL_CONFIG_GROUPS, validateConfigForMode, getRequiredConfigKeys, getConfigGroupForStore } from './config-schema';
export type { ConfigKeyGroup, ConfigValidationResult } from './config-schema';

// Constrained variant
export { getLegalSubstitutions, getForbiddenConstrainedDrift, evaluateConstrainedMode, assertNoSilentDowngrade, isLegalSubstitution } from './constrained-variant';
export type { ConstrainedSubstitution, ConstrainedDriftViolation, ConstrainedModeEvaluation } from './constrained-variant';

// Topology invariants
export { assertTopologyInvariant, assertAllTopologyInvariants, enforceAllTopologyInvariants, ALL_TOPOLOGY_INVARIANT_IDS } from './topology-invariants';
export type { L5TopologyInvariantId, TopologyInvariantResult, TopologyInvariantContext } from './topology-invariants';

// Topology evaluator
export { evaluateL5Topology, isTopologyValid } from './topology-evaluator';
export type { L5TopologyMap } from './topology-evaluator';
