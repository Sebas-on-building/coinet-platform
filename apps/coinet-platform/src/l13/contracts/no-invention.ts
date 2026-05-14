/**
 * L13.4 — No-Invention Gate Contract
 *
 * §13.4.6 / §13.4.12 — The no-invention gate blocks the output if
 * any emitted claim invents unsupported information. Twelve
 * invention families are recognized; financial-instruction invention
 * is unconditionally blocking.
 */

/**
 * §13.4.12.2 — Invention class taxonomy.
 */
export enum L13InventionClass {
  INVENTED_EVIDENCE = 'INVENTED_EVIDENCE',
  INVENTED_SCORE_DRIVER = 'INVENTED_SCORE_DRIVER',
  INVENTED_SCENARIO_TRIGGER = 'INVENTED_SCENARIO_TRIGGER',
  INVENTED_SCENARIO_INVALIDATION = 'INVENTED_SCENARIO_INVALIDATION',
  INVENTED_HYPOTHESIS_SUPPORT = 'INVENTED_HYPOTHESIS_SUPPORT',
  INVENTED_CONTRADICTION_ABSENCE = 'INVENTED_CONTRADICTION_ABSENCE',
  INVENTED_CONFIDENCE = 'INVENTED_CONFIDENCE',
  INVENTED_REGIME_STATE = 'INVENTED_REGIME_STATE',
  INVENTED_SEQUENCE_STATE = 'INVENTED_SEQUENCE_STATE',
  INVENTED_MISSING_CONFIRMATION_STATUS = 'INVENTED_MISSING_CONFIRMATION_STATUS',
  INVENTED_DATA_COMPLETENESS = 'INVENTED_DATA_COMPLETENESS',
  INVENTED_FINANCIAL_INSTRUCTION = 'INVENTED_FINANCIAL_INSTRUCTION',
}

export const ALL_L13_INVENTION_CLASSES: readonly L13InventionClass[] =
  Object.values(L13InventionClass);

/**
 * §13.4.12.4 — Invention classes that always block output.
 */
export const L13_BLOCKING_INVENTION_CLASSES:
  readonly L13InventionClass[] = [
  L13InventionClass.INVENTED_FINANCIAL_INSTRUCTION,
  L13InventionClass.INVENTED_SCENARIO_TRIGGER,
  L13InventionClass.INVENTED_SCENARIO_INVALIDATION,
  L13InventionClass.INVENTED_SCORE_DRIVER,
  L13InventionClass.INVENTED_CONTRADICTION_ABSENCE,
  L13InventionClass.INVENTED_CONFIDENCE,
  L13InventionClass.INVENTED_REGIME_STATE,
  L13InventionClass.INVENTED_SEQUENCE_STATE,
  L13InventionClass.INVENTED_DATA_COMPLETENESS,
];

export function isL13BlockingInvention(cls: L13InventionClass): boolean {
  return L13_BLOCKING_INVENTION_CLASSES.includes(cls);
}

/**
 * §13.4.12.3 — Single invention detected on a claim.
 */
export interface L13DetectedInvention {
  readonly detected_invention_id: string;

  readonly output_id: string;
  readonly claim_ref: string;

  readonly invention_class: L13InventionClass;

  readonly evidence_text: string;
  readonly missing_support_codes: readonly string[];

  readonly blocks_output: boolean;
  readonly requires_rewrite: boolean;

  readonly suggested_rewrite?: string;

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.4.12.3 — Gate output.
 */
export interface L13NoInventionGateResult {
  readonly gate_result_id: string;

  readonly output_id: string;

  readonly detected_inventions: readonly L13DetectedInvention[];

  readonly gate_passed: boolean;

  readonly blocking_invention_refs: readonly string[];
  readonly rewrite_required_refs: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
