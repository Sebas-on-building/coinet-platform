/**
 * L8.6 — Regime Template Registry
 *
 * §8.6.7.3 / §8.6.7.4 — Canonical registry of regime templates. No
 * regime candidate may be emitted from an unregistered template, a
 * template whose family is unregistered, or a template whose semantic
 * fields are incomplete.
 */

import type { L8RegimeFamily } from '../contracts/regime-family';
import type { L8RegimeClass } from '../contracts/regime-class';
import type { L8RegimeTemplate } from '../contracts/regime-template';
import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
} from '../contracts/regime-rollout-phase';
import type { L8RegimeInputFamily } from '../contracts/regime-input-family';
import { L8_ALL_REGIME_TEMPLATES } from '../templates';

export class L8RegimeTemplateRegistry {
  private readonly byId: Map<string, L8RegimeTemplate>;

  constructor(
    templates: readonly L8RegimeTemplate[] = L8_ALL_REGIME_TEMPLATES,
  ) {
    this.byId = new Map(templates.map(t => [t.template_id, t]));
  }

  list(): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values());
  }

  get(templateId: string): L8RegimeTemplate | undefined {
    return this.byId.get(templateId);
  }

  isRegistered(templateId: string): boolean {
    return this.byId.has(templateId);
  }

  /** §8.6.7.5 — list templates by family. */
  listForFamily(family: L8RegimeFamily): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values())
      .filter(t => t.regime_family === family);
  }

  /** §8.6.7.5 — list templates by rollout phase. */
  listForPhase(phase: L8RegimeRolloutPhase): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values())
      .filter(t => t.rollout_phase === phase);
  }

  /** §8.6.7.5 — list templates by template state. */
  listForState(state: L8RegimeTemplateState): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values())
      .filter(t => t.template_state === state);
  }

  /** §8.6.7.5 — list templates legal for a given scope. */
  listForScope(scopeType: string): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values())
      .filter(t =>
        (t.applicable_scope_types as readonly string[]).includes(scopeType));
  }

  /** §8.6.7.5 — list templates that consume a given input family. */
  listByInputFamily(family: L8RegimeInputFamily): readonly L8RegimeTemplate[] {
    return Array.from(this.byId.values())
      .filter(t => t.legal_input_families.includes(family));
  }

  /** §8.6.7.5 — find the template for a regime class in a family. */
  findForClass(
    family: L8RegimeFamily,
    regimeClass: L8RegimeClass,
  ): L8RegimeTemplate | undefined {
    return Array.from(this.byId.values()).find(t =>
      t.regime_family === family && t.regime_class === regimeClass);
  }
}

const defaultRegistry = new L8RegimeTemplateRegistry();

export function getDefaultL8RegimeTemplateRegistry():
  L8RegimeTemplateRegistry {
  return defaultRegistry;
}
