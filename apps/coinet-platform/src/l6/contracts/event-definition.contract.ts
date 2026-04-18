/**
 * L6.3 — Event Definition Contract
 *
 * §6.3.5 — An event definition is the governing constitution of one change
 * primitive. L6.3 extends L6.2's `EventContract` with additional declaration
 * blocks required before compute runtime is allowed:
 *   - evidence source declaration
 *   - suppression-group taxonomy binding
 *   - lifecycle completeness declaration
 *   - freshness-budget classification
 */

import { EventContract } from './event-contract';
import { L6FreshnessBudgetClass } from './materialization-policy';

export enum L6EventEvidenceSourceRole {
  TRIGGER = 'TRIGGER',
  CONFIRMATION = 'CONFIRMATION',
  CONTEXT = 'CONTEXT',
  CORROBORATION = 'CORROBORATION',
}

export interface EventEvidenceSourceDeclaration {
  readonly sourceId: string;
  readonly role: L6EventEvidenceSourceRole;
  readonly required: boolean;
}

export interface EventSuppressionTaxonomyBinding {
  readonly taxonomyId: string;
  readonly suppressionGroupId: string;
  readonly interactionNotes: string;
}

export interface EventLifecycleCompletenessSpec {
  readonly requiresCandidate: boolean;
  readonly requiresConfirmation: boolean;
  readonly requiresActive: boolean;
  readonly requiresResolution: boolean;
  readonly allowsExpiry: boolean;
  readonly allowsSuppression: boolean;
  readonly allowsQuarantine: boolean;
}

export interface EventDefinitionExtensions {
  readonly evidence_source_declarations: readonly EventEvidenceSourceDeclaration[];
  readonly suppression_taxonomy_binding: EventSuppressionTaxonomyBinding;
  readonly lifecycle_completeness: EventLifecycleCompletenessSpec;
  readonly freshness_budget_class: L6FreshnessBudgetClass;
  readonly definition_schema_version: string;
}

export interface EventDefinitionContract extends EventContract, EventDefinitionExtensions {}

export const REQUIRED_EVENT_DEFINITION_BLOCKS: readonly string[] = [
  'identity',
  'scope',
  'trigger_logic',
  'severity_suppression',
  'evidence_quality',
  'late_data_materialization',
];

export const REQUIRED_EVENT_DEFINITION_FIELDS: readonly string[] = [
  'primitive_id', 'family', 'name', 'version',
  'scope',
  'event_kind',
  'trigger_spec', 'confirmation_spec', 'resolution_spec', 'expiry_spec', 'lifecycle_policy',
  'severity_spec', 'dedupe_spec', 'suppression_spec', 'cooldown_policy',
  'evidence_requirements', 'evidence_source_declarations',
  'quality_gate_spec', 'confidence_derivation_spec',
  'late_data_policy', 'materialization_policy',
  'suppression_taxonomy_binding', 'lifecycle_completeness', 'freshness_budget_class',
  'definition_schema_version',
];
