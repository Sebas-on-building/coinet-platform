/**
 * L13.6 — Model Draft Output Contract
 *
 * §13.6.12 — The model returns a bounded structured draft. The
 * draft is NOT a legal user-facing output — it must flow through
 * L13.3 output build, L13.4 grounding, and L13.5 expression
 * governance before any emission decision.
 */

import type { L13AnswerMode } from './explanation-restriction-profile';
import type { L13AIOutputClass } from './ai-output';

export interface L13ModelDraftOutput {
  readonly model_draft_output_id: string;

  readonly request_id: string;
  readonly prompt_assembly_id: string;

  readonly output_class_hint: L13AIOutputClass;
  readonly answer_mode_hint: L13AnswerMode;

  readonly headline_draft: string;
  readonly summary_draft: string;
  readonly observation_draft: string;
  readonly inference_draft: string;
  readonly uncertainty_draft: string;
  readonly contradiction_draft: string;
  readonly scenario_draft: string;
  readonly trigger_invalidation_draft: string;
  readonly refusal_draft?: string;

  readonly provider_finish_reason: string;
  readonly raw_provider_response_ref: string;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
