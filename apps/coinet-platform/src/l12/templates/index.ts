/**
 * L12.5 — Templates barrel + canonical registry bootstrap.
 *
 * Importing this module does NOT auto-register templates. Use
 * `bootstrapL12ProductionTemplateRegistry()` to register the canonical
 * production slate (e.g., from runtime, from invariants, or from tests).
 */

import { L12_CHOP_UNRESOLVED_MULTI_PATH_V1 } from './chop-unresolved-multipath.template';
import { L12_DISTRIBUTION_UNDER_HYPE_REVERSAL_V1 } from './distribution-under-hype-reversal.template';
import { L12_LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1 } from './leverage-driven-continuation.template';
import { L12_NARRATIVE_REFLEXIVE_EXTENSION_V1 } from './narrative-reflexive-extension.template';
import { L12_POST_UNLOCK_DIGESTION_V1 } from './post-unlock-digestion.template';
import { L12_SPOT_LED_CONTINUATION_V1 } from './spot-led-continuation.template';
import { L12_THIN_LIQUIDITY_FAILURE_V1 } from './thin-liquidity-failure.template';

import { L12ScenarioTemplateDefinition } from '../contracts/scenario-template';
import {
  clearL12ScenarioTemplateRegistry,
  registerL12ScenarioTemplate,
} from '../registry/scenario-template.registry';

export * from './_template-helpers';
export * from './chop-unresolved-multipath.template';
export * from './distribution-under-hype-reversal.template';
export * from './leverage-driven-continuation.template';
export * from './narrative-reflexive-extension.template';
export * from './post-unlock-digestion.template';
export * from './spot-led-continuation.template';
export * from './thin-liquidity-failure.template';
export * from './scenario-template-evaluation-engine';

/**
 * Canonical launch slate (§12.5.3). Order encodes the legal rollout priority.
 */
export const L12_CANONICAL_PRODUCTION_TEMPLATES: readonly L12ScenarioTemplateDefinition[] = [
  L12_SPOT_LED_CONTINUATION_V1,
  L12_LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1,
  L12_POST_UNLOCK_DIGESTION_V1,
  L12_THIN_LIQUIDITY_FAILURE_V1,
  L12_DISTRIBUTION_UNDER_HYPE_REVERSAL_V1,
  L12_NARRATIVE_REFLEXIVE_EXTENSION_V1,
  L12_CHOP_UNRESOLVED_MULTI_PATH_V1,
];

export interface L12TemplateRegistryBootstrapResult {
  readonly registered_count: number;
  readonly failures: ReadonlyArray<{ template_id: string; reason?: string }>;
}

export function bootstrapL12ProductionTemplateRegistry(): L12TemplateRegistryBootstrapResult {
  clearL12ScenarioTemplateRegistry();
  const failures: { template_id: string; reason?: string }[] = [];
  let count = 0;
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES) {
    const r = registerL12ScenarioTemplate(t);
    if (r.registered) count += 1;
    else failures.push({ template_id: t.template_id, reason: r.reason });
  }
  return { registered_count: count, failures };
}
