/**
 * L6.6 — Legal Inputs, Dependency Surfaces, and Production Family Invariants
 *
 * §6.6.8.1 — INV-6.6-A through INV-6.6-G, executable and test-covered.
 */

import { L6ScopeType } from '../contracts/primitive-contract';
import { L6PrimitiveClass } from '../contracts/primitive-class';
import {
  L6LegalInputSurfaceClass,
  L6LegalInputSurfaceSpec,
} from '../contracts/legal-input-surface';
import {
  L6DependencyClass,
  isDependencyMisuse,
} from '../contracts/dependency-class';
import {
  L6FeatureFamilyId,
  ALL_FEATURE_FAMILY_IDS,
} from '../contracts/feature-family-definition';
import {
  L6EventFamilyId,
  ALL_EVENT_FAMILY_IDS,
} from '../contracts/event-family-definition';
import {
  L6EventSuppressionMode,
} from '../contracts/event-suppression-spec';
import { canonicalDedupeKey } from '../contracts/event-dedupe-spec';

import { LegalInputSurfaceRegistry } from '../registry/legal-input-surface.registry';
import { FeatureFamilyRegistry } from '../registry/feature-family.registry';
import { EventFamilyRegistry } from '../registry/event-family.registry';

import { IllegalInputBypassValidator } from '../validation/legal-input.validator';
import { EventDedupeValidator } from '../validation/event-dedupe.validator';
import { EventSuppressionPolicyValidator } from '../validation/event-suppression.validator';

import {
  MARKET_FAMILY,
} from '../families/market.family';
import {
  DEX_FAMILY,
} from '../families/dex.family';
import {
  DERIVATIVES_FAMILY,
} from '../families/derivatives.family';
import {
  PROTOCOL_FAMILY,
} from '../families/protocol.family';
import {
  ONCHAIN_FAMILY,
} from '../families/onchain.family';
import {
  SECURITY_FAMILY,
} from '../families/security.family';
import {
  NARRATIVE_FAMILY,
} from '../families/narrative.family';
import {
  ENTITY_FAMILY,
} from '../families/entity.family';
import {
  ALL_PRODUCTION_EVENT_FAMILIES,
} from '../events/production-event-families';

export interface L6_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ---------- helpers ----------

function buildTestRegistry(): LegalInputSurfaceRegistry {
  const reg = new LegalInputSurfaceRegistry();
  const surfaces = collectAllFamilySurfaces();
  for (const sid of surfaces) {
    reg.register(buildMinimalSurface(sid));
  }
  return reg;
}

function collectAllFamilySurfaces(): Set<string> {
  const all = new Set<string>();
  const families = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];
  for (const f of families) {
    for (const b of f.dependency_template.bindings) {
      all.add(b.surface_id);
    }
  }
  return all;
}

function buildMinimalSurface(surface_id: string): L6LegalInputSurfaceSpec {
  const isL4 = surface_id.startsWith('l4.');
  const isL6 = surface_id.startsWith('l6.');
  return {
    surface_id,
    source_layer: isL4 ? 'L4' : isL6 ? 'L5' : 'L5',
    surface_class: isL4
      ? L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT
      : L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    description: `test surface for ${surface_id}`,
    scope_types_allowed: [L6ScopeType.ASSET, L6ScopeType.PAIR, L6ScopeType.PROJECT, L6ScopeType.CONTRACT, L6ScopeType.MARKET, L6ScopeType.NARRATIVE],
    primitive_classes_allowed: [L6PrimitiveClass.FEATURE, L6PrimitiveClass.EVENT],
    historical_allowed: true,
    current_allowed: true,
    baseline_allowed: true,
    replay_allowed: true,
    evidence_only_allowed: true,
    contract_requirements: [],
    freshness_constraint: null,
    confidence_caveats: [],
  };
}

function buildFeatureRegistry(inputReg: LegalInputSurfaceRegistry): FeatureFamilyRegistry {
  const reg = new FeatureFamilyRegistry();
  const families = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];
  for (const f of families) reg.register(f);
  return reg;
}

function buildEventRegistry(featureReg: FeatureFamilyRegistry): EventFamilyRegistry {
  const reg = new EventFamilyRegistry();
  for (const fid of ALL_FEATURE_FAMILY_IDS) reg.registerKnownFeatureFamily(fid);
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) reg.register(ef);
  return reg;
}

// ---------- invariants ----------

/** INV-6.6-A: Layer 6 may consume only registered legal input surfaces. */
export function checkINV_66_A(): L6_6InvariantResult {
  const reg = buildTestRegistry();
  const v = new IllegalInputBypassValidator(reg);

  const legal = v.validate(['l5.price_series', 'l5.ohlcv']);
  const illegal = v.validate(['raw.binance_ws', 'cache.stale_price']);
  const unregistered = v.validate(['l5.unknown_surface']);

  const ok = legal.ok && !illegal.ok && !unregistered.ok;
  return {
    id: 'INV-6.6-A',
    name: 'only registered legal input surfaces accepted',
    holds: ok,
    evidence: `legal=${legal.ok} illegal=${!illegal.ok} unregistered=${!unregistered.ok}`,
  };
}

/** INV-6.6-B: Every primitive dependency is explicitly classed. */
export function checkINV_66_B(): L6_6InvariantResult {
  const families = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];
  let allClassed = true;
  for (const f of families) {
    for (const b of f.dependency_template.bindings) {
      if (!b.dependency_class) { allClassed = false; break; }
    }
  }

  const misuse = isDependencyMisuse(L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_TRUTH);
  const noMisuse = isDependencyMisuse(L6DependencyClass.HARD_TRUTH, L6DependencyClass.HARD_TRUTH);

  const ok = allClassed && misuse !== null && noMisuse === null;
  return {
    id: 'INV-6.6-B',
    name: 'every dependency explicitly classed; misuse detected',
    holds: ok,
    evidence: `allClassed=${allClassed} misuse=${!!misuse} noMisuse=${!noMisuse}`,
  };
}

/** INV-6.6-C: Optional context may not be treated as required truth. */
export function checkINV_66_C(): L6_6InvariantResult {
  const rule = isDependencyMisuse(L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_TRUTH);
  const ruleCtx = isDependencyMisuse(L6DependencyClass.OPTIONAL_CONTEXT, L6DependencyClass.HARD_CONTEXT);
  const evidOnly = isDependencyMisuse(L6DependencyClass.EVIDENCE_ONLY, L6DependencyClass.HARD_TRUTH);

  const ok = rule !== null && ruleCtx !== null && evidOnly !== null;
  return {
    id: 'INV-6.6-C',
    name: 'optional context as required truth blocked; evidence-only misuse blocked',
    holds: ok,
    evidence: `optAsTruth=${!!rule} optAsCtx=${!!ruleCtx} evidAsTruth=${!!evidOnly}`,
  };
}

/** INV-6.6-D: Every production feature family bound to legal scopes/inputs/baselines. */
export function checkINV_66_D(): L6_6InvariantResult {
  const families = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];
  let allValid = true;
  for (const f of families) {
    if (f.allowed_scopes.length === 0) { allValid = false; break; }
    if (f.legal_input_surface_classes.length === 0) { allValid = false; break; }
    if (f.baseline_classes_allowed.length === 0) { allValid = false; break; }
    if (f.output_kinds_allowed.length === 0) { allValid = false; break; }
    if (f.dependency_template.bindings.length === 0) { allValid = false; break; }
  }

  const inputReg = buildTestRegistry();
  const fReg = buildFeatureRegistry(inputReg);
  const ok = allValid && fReg.count() === 8;
  return {
    id: 'INV-6.6-D',
    name: 'all 8 feature families bound to legal scopes/inputs/baselines',
    holds: ok,
    evidence: `allValid=${allValid} count=${fReg.count()}`,
  };
}

/** INV-6.6-E: Every production event family bound to triggers/confirmation/suppression. */
export function checkINV_66_E(): L6_6InvariantResult {
  const inputReg = buildTestRegistry();
  const fReg = buildFeatureRegistry(inputReg);
  const eReg = buildEventRegistry(fReg);

  let allValid = true;
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) {
    if (ef.triggering_feature_families.length === 0) { allValid = false; break; }
    if (ef.confirmation_window_durations_ms.length === 0) { allValid = false; break; }
    if (!ef.suppression_family_id) { allValid = false; break; }
    if (ef.resolution_classes.length === 0) { allValid = false; break; }
    if (ef.evidence_requirements.length === 0) { allValid = false; break; }
  }

  const ok = allValid && eReg.count() === 8;
  return {
    id: 'INV-6.6-E',
    name: 'all 8 event families bound to triggers/confirmation/suppression/evidence/resolution',
    holds: ok,
    evidence: `allValid=${allValid} count=${eReg.count()}`,
  };
}

/** INV-6.6-F: No event family may launch without evidence and resolution rules. */
export function checkINV_66_F(): L6_6InvariantResult {
  let evidencePresent = true;
  let resolutionPresent = true;
  for (const ef of ALL_PRODUCTION_EVENT_FAMILIES) {
    if (ef.evidence_requirements.length === 0) evidencePresent = false;
    if (ef.resolution_classes.length === 0) resolutionPresent = false;
  }
  const ok = evidencePresent && resolutionPresent;
  return {
    id: 'INV-6.6-F',
    name: 'every event family has evidence and resolution rules',
    holds: ok,
    evidence: `evidence=${evidencePresent} resolution=${resolutionPresent}`,
  };
}

/** INV-6.6-G: No first production family bypasses L6.1-L6.5 law. */
export function checkINV_66_G(): L6_6InvariantResult {
  const families = [MARKET_FAMILY, DEX_FAMILY, DERIVATIVES_FAMILY, PROTOCOL_FAMILY, ONCHAIN_FAMILY, SECURITY_FAMILY, NARRATIVE_FAMILY, ENTITY_FAMILY];
  let allHaveInvariants = true;
  let allHaveForbidden = true;
  let allHaveWarmup = true;
  let allHaveNullPolicy = true;

  for (const f of families) {
    if (f.family_invariants.length === 0) allHaveInvariants = false;
    if (f.forbidden_semantic_shortcuts.length === 0) allHaveForbidden = false;
    if (f.default_warmup_multiplier < 1) allHaveWarmup = false;
    if (f.default_null_policy_range.length === 0) allHaveNullPolicy = false;
  }

  const ok = allHaveInvariants && allHaveForbidden && allHaveWarmup && allHaveNullPolicy;
  return {
    id: 'INV-6.6-G',
    name: 'no family bypasses lower-layer law (invariants, forbidden shortcuts, warmup, null)',
    holds: ok,
    evidence: `inv=${allHaveInvariants} forbidden=${allHaveForbidden} warmup=${allHaveWarmup} null=${allHaveNullPolicy}`,
  };
}

export function checkAllL6_6Invariants(): readonly L6_6InvariantResult[] {
  return [
    checkINV_66_A(),
    checkINV_66_B(),
    checkINV_66_C(),
    checkINV_66_D(),
    checkINV_66_E(),
    checkINV_66_F(),
    checkINV_66_G(),
  ];
}
