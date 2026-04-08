/**
 * L4.0 — Graph Object Model Bootstrap: Validator
 *
 * Enforcement layer for node creation and mutation. Prevents hybrid nodes,
 * graph-native identity leakage, and missing required metadata.
 */

import type {
  GraphNodeRecord, CanonicalNodeType, GraphNativeNodeType,
} from './graph-node-types';
import {
  ALL_CANONICAL_NODE_TYPES, ALL_GRAPH_NATIVE_NODE_TYPES,
  REQUIRED_NATIVE_METADATA,
} from './graph-node-types';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface GraphNodeValidationResult {
  valid: boolean;
  violations: GraphNodeViolation[];
}

export interface GraphNodeViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

function pass(): GraphNodeValidationResult {
  return { valid: true, violations: [] };
}

function fail(violations: GraphNodeViolation[]): GraphNodeValidationResult {
  return { valid: false, violations };
}

function error(code: string, message: string): GraphNodeViolation {
  return { code, message, severity: 'ERROR' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function validateGraphNode(node: GraphNodeRecord): GraphNodeValidationResult {
  const violations: GraphNodeViolation[] = [];

  if (!node.nodeId) violations.push(error('MISSING_NODE_ID', 'Node must have an ID'));
  if (!node.label) violations.push(error('MISSING_LABEL', 'Node must have a label'));
  if (!node.nodeClass) violations.push(error('MISSING_NODE_CLASS', 'Node must declare a class'));
  if (!node.origin) violations.push(error('MISSING_ORIGIN', 'Node must declare an origin'));

  if (node.canonicalNodeType && node.nativeNodeType) {
    violations.push(error('HYBRID_NODE', 'Node has both canonical and graph-native subtype'));
  }

  if (node.nodeClass === 'CANONICAL' && node.nativeNodeType) {
    violations.push(error('CANONICAL_WITH_NATIVE_SUBTYPE', 'Canonical node must not have graph-native subtype'));
  }
  if (node.nodeClass === 'GRAPH_NATIVE' && node.canonicalNodeType) {
    violations.push(error('GRAPH_NATIVE_WITH_CANONICAL_SUBTYPE', 'Graph-native node must not have canonical subtype'));
  }

  if (node.capabilities.canMutateL3Identity) {
    violations.push(error('L3_MUTATION_AUTHORITY', 'No graph node may mutate L3 identity'));
  }

  if (violations.length > 0) return fail(violations);

  if (node.nodeClass === 'CANONICAL') {
    const cv = validateCanonicalProjection(node);
    if (!cv.valid) return cv;
  } else if (node.nodeClass === 'GRAPH_NATIVE') {
    const nv = validateGraphNativeNode(node);
    if (!nv.valid) return nv;
  }

  return pass();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL PROJECTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateCanonicalProjection(node: GraphNodeRecord): GraphNodeValidationResult {
  const violations: GraphNodeViolation[] = [];

  if (!node.canonicalNodeType) {
    violations.push(error('MISSING_CANONICAL_SUBTYPE', 'Canonical node must declare canonical subtype'));
  } else if (!ALL_CANONICAL_NODE_TYPES.includes(node.canonicalNodeType)) {
    violations.push(error('INVALID_CANONICAL_SUBTYPE', `Unknown canonical subtype: ${node.canonicalNodeType}`));
  }

  if (!node.canonicalObjectId) {
    violations.push(error('MISSING_CANONICAL_OBJECT_ID', 'Canonical node must reference a Layer 3 canonical object'));
  }

  if (node.origin !== 'L3_CANONICAL_PROJECTION') {
    violations.push(error('WRONG_CANONICAL_ORIGIN', 'Canonical node origin must be L3_CANONICAL_PROJECTION'));
  }

  if (node.nativeNodeType) {
    violations.push(error('CANONICAL_HAS_NATIVE_TYPE', 'Canonical node must not carry graph-native subtype'));
  }

  if (!node.restrictions.blockedFromCanonicalMutation) {
    violations.push(error('CANONICAL_MUTATION_NOT_BLOCKED', 'Canonical node must block L4-level canonical mutation'));
  }

  return violations.length > 0 ? fail(violations) : pass();
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH-NATIVE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateGraphNativeNode(node: GraphNodeRecord): GraphNodeValidationResult {
  const violations: GraphNodeViolation[] = [];

  if (!node.nativeNodeType) {
    violations.push(error('MISSING_NATIVE_SUBTYPE', 'Graph-native node must declare subtype'));
  } else if (!ALL_GRAPH_NATIVE_NODE_TYPES.includes(node.nativeNodeType)) {
    violations.push(error('INVALID_NATIVE_SUBTYPE', `Unknown graph-native subtype: ${node.nativeNodeType}`));
  }

  if (node.canonicalNodeType) {
    violations.push(error('NATIVE_HAS_CANONICAL_TYPE', 'Graph-native node must not carry canonical subtype'));
  }

  if (node.canonicalObjectId && node.origin !== 'L3_CANONICAL_PROJECTION') {
    violations.push(error('NATIVE_HAS_CANONICAL_ID', 'Graph-native node must not claim Layer 3 canonical object ID as identity'));
  }

  if (!node.restrictions.blockedFromIdentityAuthority) {
    violations.push(error('NATIVE_IDENTITY_AUTHORITY_NOT_BLOCKED', 'Graph-native node must be blocked from identity authority'));
  }

  if (!node.restrictions.blockedFromCanonicalMutation) {
    violations.push(error('NATIVE_CANONICAL_MUTATION_NOT_BLOCKED', 'Graph-native node must be blocked from canonical mutation'));
  }

  if (!node.restrictions.blockedFromOntologyProjection) {
    violations.push(error('NATIVE_ONTOLOGY_PROJECTION_NOT_BLOCKED', 'Graph-native node must be blocked from ontology projection'));
  }

  if (node.capabilities.canMutateL3Identity) {
    violations.push(error('NATIVE_L3_MUTATION', 'Graph-native node cannot mutate L3 identity'));
  }

  if (node.nativeNodeType) {
    const requiredFields = REQUIRED_NATIVE_METADATA[node.nativeNodeType];
    if (requiredFields) {
      for (const field of requiredFields) {
        if (node.metadata[field] === undefined || node.metadata[field] === null || node.metadata[field] === '') {
          violations.push(error(
            `MISSING_REQUIRED_METADATA:${field}`,
            `Graph-native ${node.nativeNodeType} requires metadata field: ${field}`,
          ));
        }
      }
    }
  }

  return violations.length > 0 ? fail(violations) : pass();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION GUARD
// ═══════════════════════════════════════════════════════════════════════════════

export function assertGraphNodeMutationAllowed(
  node: GraphNodeRecord,
  mutationType: 'IDENTITY' | 'LIFECYCLE' | 'METADATA' | 'CAPABILITY',
): { allowed: boolean; reason?: string } {
  if (mutationType === 'IDENTITY') {
    if (node.nodeClass === 'CANONICAL') {
      return { allowed: false, reason: 'CANONICAL_IDENTITY_IMMUTABLE_AT_L4' };
    }
    if (node.restrictions.blockedFromIdentityAuthority) {
      return { allowed: false, reason: 'BLOCKED_FROM_IDENTITY_AUTHORITY' };
    }
  }

  if (mutationType === 'CAPABILITY' && node.nodeClass === 'GRAPH_NATIVE') {
    return { allowed: false, reason: 'GRAPH_NATIVE_CAPABILITIES_FROZEN' };
  }

  if (node.lifecycleState === 'DEPRECATED') {
    return { allowed: false, reason: 'NODE_DEPRECATED' };
  }

  return { allowed: true };
}
