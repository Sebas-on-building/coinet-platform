/**
 * L8.5 — Regime Input Domain Registry
 *
 * §8.5.2.5 — Canonical registry of all legal regime input domains.
 * Wraps the descriptor table and provides runtime predicates used by
 * the binding and admissibility validators.
 */

import {
  L8RegimeInputDomain,
  L8RegimeInputDomainDescriptor,
  L8RegimeDomainScopeType,
  L8_REGIME_INPUT_DOMAIN_DESCRIPTORS,
  getL8RegimeInputDomainDescriptor,
  isL8RegisteredInputDomain,
  domainAllowsFamily,
  domainAllowsScope,
} from '../contracts/regime-input-domain';
import type {
  L8RegimeInputFamily,
  L8RegimeInputSourceLayer,
} from '../contracts/regime-input-family';

export class L8RegimeInputDomainRegistry {
  private readonly byDomain:
    Map<L8RegimeInputDomain, L8RegimeInputDomainDescriptor>;

  constructor(
    descriptors: readonly L8RegimeInputDomainDescriptor[] =
      L8_REGIME_INPUT_DOMAIN_DESCRIPTORS,
  ) {
    this.byDomain = new Map(descriptors.map(d => [d.domain, d]));
  }

  list(): readonly L8RegimeInputDomainDescriptor[] {
    return Array.from(this.byDomain.values());
  }

  get(
    domain: L8RegimeInputDomain,
  ): L8RegimeInputDomainDescriptor | undefined {
    return this.byDomain.get(domain);
  }

  isRegistered(value: string): boolean {
    return this.byDomain.has(value as L8RegimeInputDomain);
  }

  allowsFamily(
    domain: L8RegimeInputDomain,
    family: L8RegimeInputFamily,
  ): boolean {
    return domainAllowsFamily(domain, family);
  }

  allowsScope(
    domain: L8RegimeInputDomain,
    scope: L8RegimeDomainScopeType,
  ): boolean {
    return domainAllowsScope(domain, scope);
  }

  allowsSourceLayer(
    domain: L8RegimeInputDomain,
    layer: L8RegimeInputSourceLayer,
  ): boolean {
    return this.byDomain.get(domain)?.legal_source_layers.includes(layer) ?? false;
  }

  requiresContradiction(domain: L8RegimeInputDomain): boolean {
    return this.byDomain.get(domain)?.must_consume_contradiction_posture ?? false;
  }

  requiresRestriction(domain: L8RegimeInputDomain): boolean {
    return this.byDomain.get(domain)?.must_consume_restriction_posture ?? false;
  }
}

const defaultRegistry = new L8RegimeInputDomainRegistry();

export function getDefaultL8RegimeInputDomainRegistry():
  L8RegimeInputDomainRegistry {
  return defaultRegistry;
}

export {
  getL8RegimeInputDomainDescriptor,
  isL8RegisteredInputDomain,
  domainAllowsFamily,
  domainAllowsScope,
};
