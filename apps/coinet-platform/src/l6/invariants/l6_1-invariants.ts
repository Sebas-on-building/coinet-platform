/**
 * L6.1 — Constitutional Invariants
 *
 * §6.1.9.1 — INV-6.1-A through INV-6.1-H, all executable and test-covered.
 */

import { L6_DEPENDENCY_SURFACES, isRegisteredDependency } from '../contracts/l6-dependency-surfaces';
import { L6_OUTPUT_SURFACES, isRegisteredOutput, isRegisteredOutputClass } from '../contracts/l6-output-surfaces';
import { ALL_OUTPUT_SURFACE_CLASSES, ALL_DEPENDENCY_SURFACE_CLASSES } from '../contracts/l6-constitutional-types';
import { L6_MISSION_CONSTRAINT, isForbiddenOutputClass } from '../contracts/l6-mission';
import { containsForbiddenNaming, getForbiddenNamePatterns } from '../contracts/l6-boundary';
import { FORBIDDEN_ACTION_DEFINITIONS } from '../contracts/l6-forbidden-actions';
import { validateRawInputAbsence, validateNeutralFillAbsence } from '../constitution/l6-boundary-validator';

export interface L6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── INV-6.1-A ──
// Layer 6 may only consume dependency surfaces registered in DependencySurfaceRegistry.
export function checkINV_61_A(): L6InvariantResult {
  const allSurfaces = L6_DEPENDENCY_SURFACES;
  const allRegistered = allSurfaces.every(s => isRegisteredDependency(s.surfaceId));
  const unregisteredBlocked = !isRegisteredDependency('fake:unregistered_surface');
  return {
    id: 'INV-6.1-A', name: 'Only registered dependency surfaces are consumable',
    holds: allRegistered && unregisteredBlocked,
    evidence: `registered=${allSurfaces.length}, unregistered_blocked=${unregisteredBlocked}`,
  };
}

// ── INV-6.1-B ──
// Layer 6 may only emit output classes registered in L6OutputSurfaceRegistry.
export function checkINV_61_B(): L6InvariantResult {
  const allOutputs = L6_OUTPUT_SURFACES;
  const allRegistered = allOutputs.every(s => isRegisteredOutput(s.surfaceId));
  const allClassesRegistered = ALL_OUTPUT_SURFACE_CLASSES.every(c => isRegisteredOutputClass(c));
  const unregisteredBlocked = !isRegisteredOutput('fake:unregistered_output');
  return {
    id: 'INV-6.1-B', name: 'Only registered output classes may be emitted',
    holds: allRegistered && allClassesRegistered && unregisteredBlocked,
    evidence: `outputs=${allOutputs.length}, classes=${ALL_OUTPUT_SURFACE_CLASSES.length}`,
  };
}

// ── INV-6.1-C ──
// No Layer 6 primitive may directly consume raw provider-native payloads.
export function checkINV_61_C(): L6InvariantResult {
  const rawInputTest = validateRawInputAbsence(['raw:provider_json', 'cache_blob:coingecko']);
  const rawBlocked = !rawInputTest.valid;
  const cleanInputTest = validateRawInputAbsence(['l3:canonical_objects', 'l4:graph_relations']);
  const cleanPasses = cleanInputTest.valid;
  return {
    id: 'INV-6.1-C', name: 'No direct raw provider-native payload consumption',
    holds: rawBlocked && cleanPasses,
    evidence: `raw_blocked=${rawBlocked}, clean_passes=${cleanPasses}`,
  };
}

// ── INV-6.1-D ──
// No Layer 6 definition may contain forbidden judgment semantics.
export function checkINV_61_D(): L6InvariantResult {
  const forbiddenNames = ['buy_signal', 'bullish_confirmation', 'strong_thesis_validated'];
  const allBlocked = forbiddenNames.every(n => containsForbiddenNaming(n));
  const validNames = ['funding_z_score', 'whale_accumulation_cluster', 'liquidation_burst'];
  const allAllowed = validNames.every(n => !containsForbiddenNaming(n));
  const patternsExist = getForbiddenNamePatterns().length >= 10;
  return {
    id: 'INV-6.1-D', name: 'No forbidden judgment semantics in definitions',
    holds: allBlocked && allAllowed && patternsExist,
    evidence: `forbidden_blocked=${allBlocked}, valid_allowed=${allAllowed}, patterns=${getForbiddenNamePatterns().length}`,
  };
}

// ── INV-6.1-E ──
// Layer 6 may not redefine L3 identity, L4 graph meaning, or L5 storage authority.
export function checkINV_61_E(): L6InvariantResult {
  const hasRedefinitionProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'LOWER_LAYER_REDEFINITION');
  const hasIdentityProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'ILLEGAL_IDENTITY_INFERENCE');
  const hasGraphProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'ILLEGAL_GRAPH_REINTERPRETATION');
  const hasStorageProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'ILLEGAL_STORAGE_BYPASS');
  return {
    id: 'INV-6.1-E', name: 'Lower-layer law may not be redefined',
    holds: hasRedefinitionProhibition && hasIdentityProhibition && hasGraphProhibition && hasStorageProhibition,
    evidence: `redefine=${hasRedefinitionProhibition}, identity=${hasIdentityProhibition}, graph=${hasGraphProhibition}, storage=${hasStorageProhibition}`,
  };
}

// ── INV-6.1-F ──
// Missing inputs may not be silently converted into neutral values.
export function checkINV_61_F(): L6InvariantResult {
  const neutralTest = validateNeutralFillAbsence([
    { field: 'metric_value', handler: 'default to 0' },
    { field: 'context', handler: 'fallback neutral' },
  ]);
  const neutralBlocked = !neutralTest.valid;

  const cleanTest = validateNeutralFillAbsence([
    { field: 'metric_value', handler: 'propagate_missing_explicitly' },
    { field: 'context', handler: 'return_incomplete_with_reason' },
  ]);
  const cleanPasses = cleanTest.valid;

  return {
    id: 'INV-6.1-F', name: 'Missing inputs remain explicit, never silently neutralized',
    holds: neutralBlocked && cleanPasses,
    evidence: `neutral_blocked=${neutralBlocked}, clean_passes=${cleanPasses}`,
  };
}

// ── INV-6.1-G ──
// Late-arriving data may not silently mutate current state.
export function checkINV_61_G(): L6InvariantResult {
  const hasLateDataProhibition = FORBIDDEN_ACTION_DEFINITIONS.some(d => d.action === 'LATE_DATA_SILENT_MUTATION');
  return {
    id: 'INV-6.1-G', name: 'Late data cannot silently mutate current state',
    holds: hasLateDataProhibition,
    evidence: `late_data_prohibition=${hasLateDataProhibition}`,
  };
}

// ── INV-6.1-H ──
// Every legal Layer 6 output class must be traceable to lower-layer governed surfaces.
export function checkINV_61_H(): L6InvariantResult {
  const allOutputsHaveLineage = L6_OUTPUT_SURFACES.every(s => s.requiredLineageFields.length > 0);
  const allOutputsHaveRoute = L6_OUTPUT_SURFACES.every(s => s.l5StorageRoute.length > 0);
  const allOutputsReplayable = L6_OUTPUT_SURFACES.every(s => s.replayRequired === true);
  return {
    id: 'INV-6.1-H', name: 'All output classes traceable to governed lower-layer surfaces',
    holds: allOutputsHaveLineage && allOutputsHaveRoute && allOutputsReplayable,
    evidence: `lineage=${allOutputsHaveLineage}, route=${allOutputsHaveRoute}, replay=${allOutputsReplayable}`,
  };
}

export function checkAllL61Invariants(): readonly L6InvariantResult[] {
  return [
    checkINV_61_A(), checkINV_61_B(), checkINV_61_C(), checkINV_61_D(),
    checkINV_61_E(), checkINV_61_F(), checkINV_61_G(), checkINV_61_H(),
  ];
}
