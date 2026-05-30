/**
 * L13.9 — Advice-Adjacent Rewriter
 *
 * §13.9.15 / §13.9.16 — Repairs rewriteable outputs that are close
 * to advice but can safely be reframed into conditional /
 * what-to-watch / non-action language.
 *
 * Direct trade instructions, leverage/sizing language, liquidation-
 * targeting, and market-manipulation patterns are NOT
 * rewriteable here. Those route to refusal or block.
 *
 * Any successful semantic rewrite must re-enter L13.3 → L13.4 →
 * L13.5 → L13.7 → L13.8 (§13.9.16.1). The booleans on the result
 * encode that revalidation requirement.
 */

import {
  L13AdviceAdjacentLanguageFamily,
} from '../contracts/market-manipulation-pattern';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';
import type { L13AdviceAdjacentRewriteResult } from '../contracts/advice-adjacent-rewrite-result';
import { L13_ADVICE_ADJACENT_PATTERNS } from './forbidden-financial-language';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

const REWRITE_TEMPLATES:
  Readonly<Record<L13AdviceAdjacentLanguageFamily, string>> = {
  [L13AdviceAdjacentLanguageFamily.IMPLIED_ENTRY_BIAS]:
    'The engine sees the setup but does not convert it into an entry instruction.',
  [L13AdviceAdjacentLanguageFamily.IMPLIED_EXIT_BIAS]:
    'The engine does not convert the current posture into an exit instruction.',
  [L13AdviceAdjacentLanguageFamily.BEST_SETUP_FRAMING]:
    'This is one of the stronger current setups under the engine\'s governed interpretation, though it remains conditional and not a trade instruction.',
  [L13AdviceAdjacentLanguageFamily.BEST_ENTRY_FRAMING]:
    'The engine reads the setup as currently constructive but does not designate a best entry.',
  [L13AdviceAdjacentLanguageFamily.ACTIONABLE_SOUNDING_OPPORTUNITY]:
    'The setup looks readable under governed evidence; the engine does not turn that into actionable guidance.',
  [L13AdviceAdjacentLanguageFamily.IMPLIED_ASSET_PREFERENCE]:
    'One asset has stronger scenario clarity while the other has different upside-risk posture; the comparison does not become a buy preference.',
  [L13AdviceAdjacentLanguageFamily.IMPLIED_EXECUTION_TIMING]:
    'The engine describes timing context but does not call a moment to enter or exit.',
};

const NON_REWRITEABLE_RISK_CLASSES: ReadonlySet<L13SafetyRiskClass> =
  new Set([
    L13SafetyRiskClass.FINANCIAL_ADVICE_BLOCKED,
    L13SafetyRiskClass.TRADE_EXECUTION_INSTRUCTION_BLOCKED,
    L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED,
    L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED,
  ]);

export interface L13AdviceAdjacentRewriterInput {
  readonly original_output_ref: string;
  readonly user_visible_corpus: string;
  readonly source_risk_classes: readonly L13SafetyRiskClass[];
  readonly lineage_refs?: readonly string[];
}

/**
 * §13.9.15 — Rewriter. Pure function.
 */
export function runL13AdviceAdjacentRewriter(
  input: L13AdviceAdjacentRewriterInput,
): L13AdviceAdjacentRewriteResult {
  const lineage = input.lineage_refs ?? ['l13.safety.lineage'];

  // Hard-stop: any non-rewriteable risk class blocks the rewrite.
  for (const cls of input.source_risk_classes) {
    if (NON_REWRITEABLE_RISK_CLASSES.has(cls)) {
      const replayHash = fnv1a(
        [
          input.original_output_ref,
          input.source_risk_classes.slice().sort().join(','),
          'NON_REWRITEABLE',
          POLICY_V,
        ].join('|'),
      );
      return {
        rewrite_result_id: `l13.rewrite.${replayHash}`,
        original_output_ref: input.original_output_ref,
        rewrite_attempted: false,
        rewrite_successful: false,
        source_risk_classes: input.source_risk_classes,
        rewritten_text_ref: undefined,
        preserved_grounding_required: true,
        preserved_expression_governance_required: true,
        preserved_mode_shape_required: true,
        preserved_style_envelope_required: true,
        requires_revalidation_from_l13_3: false,
        requires_revalidation_from_l13_4: false,
        requires_revalidation_from_l13_5: false,
        requires_revalidation_from_l13_7: false,
        requires_revalidation_from_l13_8: false,
        policy_version: POLICY_V,
        lineage_refs: lineage,
        replay_hash: replayHash,
      };
    }
  }

  // Scan for advice-adjacent patterns and gather rewrite templates.
  const replacements: string[] = [];
  const corpus = input.user_visible_corpus ?? '';
  for (const entry of L13_ADVICE_ADJACENT_PATTERNS) {
    if (entry.pattern.test(corpus)) {
      const template = REWRITE_TEMPLATES[entry.family];
      if (template && !replacements.includes(template)) {
        replacements.push(template);
      }
    }
  }
  const attempted = replacements.length > 0;
  const successful = attempted;
  const rewritten_text_ref = attempted
    ? `l13.rewrite.text.${fnv1a(
        [input.original_output_ref, replacements.join('|'), POLICY_V].join(
          '|',
        ),
      )}`
    : undefined;

  const replayHash = fnv1a(
    [
      input.original_output_ref,
      input.source_risk_classes.slice().sort().join(','),
      replacements.join('|'),
      String(attempted),
      String(successful),
      POLICY_V,
    ].join('|'),
  );
  return {
    rewrite_result_id: `l13.rewrite.${replayHash}`,
    original_output_ref: input.original_output_ref,
    rewrite_attempted: attempted,
    rewrite_successful: successful,
    source_risk_classes: input.source_risk_classes,
    rewritten_text_ref,
    preserved_grounding_required: true,
    preserved_expression_governance_required: true,
    preserved_mode_shape_required: true,
    preserved_style_envelope_required: true,
    requires_revalidation_from_l13_3: attempted,
    requires_revalidation_from_l13_4: attempted,
    requires_revalidation_from_l13_5: attempted,
    requires_revalidation_from_l13_7: attempted,
    requires_revalidation_from_l13_8: attempted,
    policy_version: POLICY_V,
    lineage_refs: lineage,
    replay_hash: replayHash,
  };
}
