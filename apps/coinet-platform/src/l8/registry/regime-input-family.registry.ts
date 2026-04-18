/**
 * L8.5 — Regime Input Family Registry
 *
 * §8.5.3.3 / §8.5.4.3 — Canonical registry of all legal regime input
 * families. Wraps the descriptor table and provides runtime predicates
 * used by the binding, admissibility, and consumption validators.
 */

import {
  L8RegimeInputFamily,
  L8RegimeInputFamilyDescriptor,
  L8RegimeInputFamilyTier,
  L8RegimeInputSourceLayer,
  L8_REGIME_INPUT_FAMILY_DESCRIPTORS,
  getL8RegimeInputFamilyDescriptor,
  isL8RegisteredInputFamily,
  getInputFamilyTier,
  getInputFamilySourceLayer,
} from '../contracts/regime-input-family';

export class L8RegimeInputFamilyRegistry {
  private readonly byFamily:
    Map<L8RegimeInputFamily, L8RegimeInputFamilyDescriptor>;

  constructor(
    descriptors: readonly L8RegimeInputFamilyDescriptor[] =
      L8_REGIME_INPUT_FAMILY_DESCRIPTORS,
  ) {
    this.byFamily = new Map(descriptors.map(d => [d.family, d]));
  }

  list(): readonly L8RegimeInputFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }

  get(
    family: L8RegimeInputFamily,
  ): L8RegimeInputFamilyDescriptor | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(value: string): boolean {
    return this.byFamily.has(value as L8RegimeInputFamily);
  }

  tierOf(family: L8RegimeInputFamily): L8RegimeInputFamilyTier | undefined {
    return this.byFamily.get(family)?.tier;
  }

  sourceLayerOf(
    family: L8RegimeInputFamily,
  ): L8RegimeInputSourceLayer | undefined {
    return this.byFamily.get(family)?.source_layer;
  }

  allowsSurfaceClass(
    family: L8RegimeInputFamily,
    surfaceClass: string,
  ): boolean {
    return this.byFamily.get(family)?.legal_source_surface_classes
      .includes(surfaceClass) ?? false;
  }

  requiresRestriction(family: L8RegimeInputFamily): boolean {
    return this.byFamily.get(family)?.requires_restriction_consumption ?? false;
  }

  requiresContradiction(family: L8RegimeInputFamily): boolean {
    return this.byFamily.get(family)?.requires_contradiction_consumption ?? false;
  }

  evidenceOnlyEligible(family: L8RegimeInputFamily): boolean {
    return this.byFamily.get(family)?.evidence_only_eligible ?? false;
  }

  listForTier(tier: L8RegimeInputFamilyTier):
    readonly L8RegimeInputFamilyDescriptor[] {
    return Array.from(this.byFamily.values()).filter(d => d.tier === tier);
  }

  listForSourceLayer(layer: L8RegimeInputSourceLayer):
    readonly L8RegimeInputFamilyDescriptor[] {
    return Array.from(this.byFamily.values())
      .filter(d => d.source_layer === layer);
  }
}

const defaultRegistry = new L8RegimeInputFamilyRegistry();

export function getDefaultL8RegimeInputFamilyRegistry():
  L8RegimeInputFamilyRegistry {
  return defaultRegistry;
}

export {
  getL8RegimeInputFamilyDescriptor,
  isL8RegisteredInputFamily,
  getInputFamilyTier,
  getInputFamilySourceLayer,
};
