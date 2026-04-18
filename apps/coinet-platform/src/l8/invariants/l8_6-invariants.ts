/**
 * L8.6 — Template Law Invariants
 *
 * §8.6.9.1 — INV-8.6-A through INV-8.6-G as executable functions.
 *
 *   INV-8.6-A : Every regime class used in runtime must be backed by a
 *               registered regime template.
 *   INV-8.6-B : Every template must declare support / challenge
 *               domains, transition + ambiguity signatures, confidence
 *               posture defaults, multiplier defaults, and rollout
 *               priority.
 *   INV-8.6-C : No template may consume illegal input families or
 *               illegal scope types for its family.
 *   INV-8.6-D : No template may ignore contradiction, ambiguity, or
 *               transition posture in a way that permits fake clean
 *               emission (no support/challenge overlap, transitions +
 *               ambiguity present).
 *   INV-8.6-E : Rollout phase ordering is binding; later families may
 *               not bypass earlier family phases.
 *   INV-8.6-F : Shadow-only / certification-only templates may not emit
 *               production-clean results.
 *   INV-8.6-G : Template and family registries must remain mutually
 *               consistent and replay-safe.
 */

import {
  L8RegimeFamily,
  ALL_L8_REGIME_FAMILIES,
} from '../contracts/regime-family';
import {
  L8RegimeInputDomain,
} from '../contracts/regime-input-domain';
import {
  L8RegimeInputFamily,
} from '../contracts/regime-input-family';
import {
  L8RegimeTemplate,
  buildL8RegimeTemplateIdV6,
} from '../contracts/regime-template';
import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
  ALL_L8_REGIME_ROLLOUT_PHASES,
} from '../contracts/regime-rollout-phase';
import {
  L8RegimeSignatureClass,
  buildL8RegimeSignatureId,
} from '../contracts/regime-signature';
import {
  L8MacroRegimeClass,
  L8TokenRegimeClass,
} from '../contracts/regime-class';
import { getDefaultL8RegimeTemplateRegistry } from '../registry/regime-template.registry';
import { getDefaultL8RegimeRolloutRegistry } from '../registry/regime-rollout.registry';
import { getDefaultL8RegimeFamilyDefinitionRegistry } from '../registry/regime-family-definition.registry';
import { validateRegimeTemplate } from '../validation/regime-template.validator';
import {
  validateRegimeFamilyRollout,
  validateFamilyRolloutReadiness,
} from '../validation/regime-family-rollout.validator';
import { validateRegimeTemplateConsistency } from '../validation/regime-template-consistency.validator';
import { L8RegimeTemplateViolationCode } from '../validation/l8-template-violation-codes';

export interface L8_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// Helper: build a green macro template for drift / rejection tests.
// ──────────────────────────────────────────────────────────────────

export function buildGreenMacroRiskOnTemplate(): L8RegimeTemplate {
  return {
    template_id: buildL8RegimeTemplateIdV6(
      L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON, '2.0.0'),
    regime_family: L8RegimeFamily.MACRO,
    regime_class: L8MacroRegimeClass.RISK_ON,
    template_version: '2.0.0',
    applicable_scope_types: ['MARKET'],
    required_validation_patterns: ['MARKET_STRENGTH_VALIDATION'],
    required_feature_patterns: ['BREADTH'],
    support_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
    challenge_domains: [L8RegimeInputDomain.VOLATILITY_DOMAIN],
    legal_input_families: [
      L8RegimeInputFamily.BREADTH_FAMILY,
      L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
      L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
      L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
    ],
    transition_signatures: [{
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, 'macro', 'green_tr'),
      description: 'green transition signature',
      triggered_by_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
      transition_weight: 0.4,
      forces_transitional_overlap: false,
    }],
    ambiguity_signatures: [{
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, 'macro', 'green_amb'),
      description: 'green ambiguity signature',
      triggered_by_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
      ambiguity_weight: 0.3,
      blocks_clean_single: false,
    }],
    confidence_posture_defaults: ['BREADTH_SENSITIVE'],
    multiplier_derivation_defaults: ['TREND_AMPLIFICATION_BIAS'],
    rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
    rollout_priority: 1,
    template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
    description: 'governed macro risk-on regime environment',
    created_by: 'regime-engine',
    created_at: '2026-04-17T12:00:00Z',
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-A
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_A(): L8_6InvariantResult {
  const templateRegistry = getDefaultL8RegimeTemplateRegistry();
  const famDefRegistry = getDefaultL8RegimeFamilyDefinitionRegistry();
  const missing: string[] = [];
  for (const def of famDefRegistry.list()) {
    for (const cls of def.member_regime_classes) {
      const t = templateRegistry.findForClass(def.family, cls);
      if (!t) missing.push(`${def.family}:${cls}`);
    }
  }
  // Should be 21 total templates (4 + 4 + 7 + 6)
  const total = templateRegistry.list().length;
  return {
    id: 'INV-8.6-A',
    name: 'Every regime class used in runtime is backed by a registered template',
    holds: missing.length === 0 && total === 21,
    evidence: `missing=[${missing.join(',')}], total=${total}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-B
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_B(): L8_6InvariantResult {
  const templateRegistry = getDefaultL8RegimeTemplateRegistry();
  const offenders: string[] = [];
  for (const t of templateRegistry.list()) {
    const rep = validateRegimeTemplate(t);
    if (!rep.valid) {
      offenders.push(
        `${t.template_id}:${rep.violations.map(v => v.code).join('|')}`,
      );
    }
  }

  // Dropping any required field surfaces a violation
  const green = buildGreenMacroRiskOnTemplate();
  const noSupport = validateRegimeTemplate({
    ...green, support_domains: [],
  });
  const noChallenge = validateRegimeTemplate({
    ...green, challenge_domains: [],
  });
  const noTransition = validateRegimeTemplate({
    ...green, transition_signatures: [],
  });
  const noAmbiguity = validateRegimeTemplate({
    ...green, ambiguity_signatures: [],
  });
  const noConfidence = validateRegimeTemplate({
    ...green, confidence_posture_defaults: [],
  });
  const noMultiplier = validateRegimeTemplate({
    ...green, multiplier_derivation_defaults: [],
  });
  const noPriority = validateRegimeTemplate({
    ...green, rollout_priority: -1,
  });

  const allBlocked =
    !noSupport.valid && !noChallenge.valid && !noTransition.valid &&
    !noAmbiguity.valid && !noConfidence.valid && !noMultiplier.valid &&
    !noPriority.valid;

  return {
    id: 'INV-8.6-B',
    name: 'Templates declare support / challenge / signatures / defaults / rollout',
    holds: offenders.length === 0 && allBlocked,
    evidence:
      `offenders=[${offenders.join(',')}], all_drops_blocked=${allBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-C
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_C(): L8_6InvariantResult {
  const green = buildGreenMacroRiskOnTemplate();

  // Input family not legal for family
  const badInput = validateRegimeTemplate({
    ...green,
    legal_input_families: [
      ...green.legal_input_families,
      L8RegimeInputFamily.SEQUENCE_STATE_FAMILY, // token-only family
    ],
  });
  const inputBlocked = !badInput.valid &&
    badInput.violations.some(vi =>
      vi.code === L8RegimeTemplateViolationCode
        .TEMPLATE_INPUT_FAMILY_NOT_ALLOWED);

  // Scope not legal for family
  const badScope = validateRegimeTemplate({
    ...green,
    applicable_scope_types: ['TOKEN'],
  });
  const scopeBlocked = !badScope.valid &&
    badScope.violations.some(vi =>
      vi.code === L8RegimeTemplateViolationCode.TEMPLATE_SCOPE_NOT_IN_FAMILY);

  // Class not in family
  const badClass = validateRegimeTemplate({
    ...green,
    regime_class: L8TokenRegimeClass.EARLY_ACCUMULATION,
  });
  const classBlocked = !badClass.valid &&
    badClass.violations.some(vi =>
      vi.code === L8RegimeTemplateViolationCode.TEMPLATE_CLASS_NOT_IN_FAMILY);

  return {
    id: 'INV-8.6-C',
    name: 'No template consumes illegal input families or illegal scopes',
    holds: inputBlocked && scopeBlocked && classBlocked,
    evidence:
      `input_blocked=${inputBlocked}, scope_blocked=${scopeBlocked}, ` +
      `class_blocked=${classBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-D
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_D(): L8_6InvariantResult {
  const green = buildGreenMacroRiskOnTemplate();

  // Support / challenge overlap is illegal
  const overlap = validateRegimeTemplate({
    ...green,
    challenge_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
  });
  const overlapBlocked = !overlap.valid &&
    overlap.violations.some(vi =>
      vi.code ===
        L8RegimeTemplateViolationCode.TEMPLATE_SUPPORT_CHALLENGE_OVERLAP);

  // Missing transition signatures is illegal
  const noTr = validateRegimeTemplate({
    ...green, transition_signatures: [],
  });
  const trBlocked = !noTr.valid;

  // Missing ambiguity signatures is illegal
  const noAmb = validateRegimeTemplate({
    ...green, ambiguity_signatures: [],
  });
  const ambBlocked = !noAmb.valid;

  // Judgment leak in description
  const judgment = validateRegimeTemplate({
    ...green,
    description: 'best regime for buy signal',
  });
  const judgmentBlocked = !judgment.valid &&
    judgment.violations.some(vi =>
      vi.code === L8RegimeTemplateViolationCode.TEMPLATE_JUDGMENT_LEAK);

  return {
    id: 'INV-8.6-D',
    name: 'Templates cannot ignore contradiction / ambiguity / transition or leak judgment',
    holds: overlapBlocked && trBlocked && ambBlocked && judgmentBlocked,
    evidence:
      `overlap=${overlapBlocked}, transition=${trBlocked}, ambiguity=${ambBlocked}, ` +
      `judgment=${judgmentBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-E
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_E(): L8_6InvariantResult {
  const rolloutRegistry = getDefaultL8RegimeRolloutRegistry();

  // Phases are ordered 1..4
  const orderOk = ALL_L8_REGIME_ROLLOUT_PHASES[0] ===
    L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL &&
    ALL_L8_REGIME_ROLLOUT_PHASES[3] === L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM;

  // Real registry: no template should skip earlier phases
  const offenders = rolloutRegistry.listTemplatesSkippingEarlierPhases();
  const noSkips = offenders.length === 0;

  // Fabricated violation: a shadow phase-4 template and a phase-1 one
  // that's not production → phase-4 template skipping earlier phases.
  // We simulate via the rollout validator directly.
  const green = buildGreenMacroRiskOnTemplate();
  const skipper = validateRegimeFamilyRollout({
    template: {
      ...green,
      rollout_phase: L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM,
      template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
    },
    runtime_mode: 'PRODUCTION',
    attempting_production_clean: false,
  }, {
    // Isolated rollout registry with only this template — earlier phases
    // will be detected as incomplete since they have no production-enabled
    // templates. We use the default registry logic by supplying an empty
    // isolated environment isn't necessary; the default already reports
    // whether earlier phases are complete given only a single template.
    // Here we just re-use the default registry to confirm the detector
    // surfaces a skip when the phase is 4 and earlier phases are not full.
    // In practice the default registry has all 4 phases registered, so we
    // additionally confirm skip-detection by checking the offenders list.
    phaseOrder() { return rolloutRegistry.phaseOrder(); },
    indexOf(p: L8RegimeRolloutPhase) { return rolloutRegistry.indexOf(p); },
    compare(a: L8RegimeRolloutPhase, b: L8RegimeRolloutPhase) {
      return rolloutRegistry.compare(a, b);
    },
    isStateLegalForMode(s: L8RegimeTemplateState, m) {
      return rolloutRegistry.isStateLegalForMode(s, m);
    },
    canEmitProductionClean(s: L8RegimeTemplateState, m) {
      return rolloutRegistry.canEmitProductionClean(s, m);
    },
    isPhaseFullyEnabled(p: L8RegimeRolloutPhase) {
      // Force earlier phase incomplete for this fabricated scenario.
      return p === L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM;
    },
    earlierPhasesComplete(p: L8RegimeRolloutPhase) {
      return p === L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL;
    },
    listTemplatesSkippingEarlierPhases() { return []; },
  } as unknown as ReturnType<typeof getDefaultL8RegimeRolloutRegistry>);
  const skipBlocked = !skipper.valid &&
    skipper.violations.some(vi =>
      vi.code ===
        L8RegimeTemplateViolationCode.TEMPLATE_SKIPS_EARLIER_PHASE);

  return {
    id: 'INV-8.6-E',
    name: 'Rollout phase ordering is binding; later families may not bypass earlier phases',
    holds: orderOk && noSkips && skipBlocked,
    evidence:
      `order_ok=${orderOk}, no_skips=${noSkips}, ` +
      `fabricated_skip_blocked=${skipBlocked}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-F
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_F(): L8_6InvariantResult {
  const green = buildGreenMacroRiskOnTemplate();

  // Shadow-only template attempting production-clean → blocked
  const shadow = validateRegimeFamilyRollout({
    template: { ...green, template_state: L8RegimeTemplateState.SHADOW_ONLY },
    runtime_mode: 'PRODUCTION',
    attempting_production_clean: true,
  });
  const shadowBlocked = !shadow.valid &&
    shadow.violations.some(vi =>
      vi.code ===
        L8RegimeTemplateViolationCode.SHADOW_EMITS_PRODUCTION_CLEAN);

  // Certification-only under production mode → blocked
  const cert = validateRegimeFamilyRollout({
    template: {
      ...green,
      template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
    },
    runtime_mode: 'PRODUCTION',
    attempting_production_clean: false,
  });
  const certBlocked = !cert.valid &&
    cert.violations.some(vi =>
      vi.code ===
        L8RegimeTemplateViolationCode.TEMPLATE_STATE_ILLEGAL_FOR_MODE);

  // Blocked state always rejected
  const blocked = validateRegimeFamilyRollout({
    template: { ...green, template_state: L8RegimeTemplateState.BLOCKED },
    runtime_mode: 'PRODUCTION',
    attempting_production_clean: false,
  });
  const blockedRejected = !blocked.valid;

  // Shadow template under shadow mode, NOT attempting production-clean → ok
  const shadowShadow = validateRegimeFamilyRollout({
    template: { ...green, template_state: L8RegimeTemplateState.SHADOW_ONLY },
    runtime_mode: 'SHADOW',
    attempting_production_clean: false,
  });
  const shadowOk = shadowShadow.valid;

  // Readiness: an ecosystem family mixes SHADOW_ONLY / CERTIFICATION_ONLY
  // templates. Under SHADOW mode, all non-BLOCKED states are legal, so
  // family readiness passes.
  const readinessShadow = validateFamilyRolloutReadiness({
    family: L8RegimeFamily.ECOSYSTEM,
    runtime_mode: 'SHADOW',
    templates: getDefaultL8RegimeTemplateRegistry()
      .listForFamily(L8RegimeFamily.ECOSYSTEM),
  });
  const readinessOk = readinessShadow.valid;

  // Under PRODUCTION mode the ecosystem family is NOT ready (expected):
  const readinessProd = validateFamilyRolloutReadiness({
    family: L8RegimeFamily.ECOSYSTEM,
    runtime_mode: 'PRODUCTION',
    templates: getDefaultL8RegimeTemplateRegistry()
      .listForFamily(L8RegimeFamily.ECOSYSTEM),
  });
  const prodNotReady = !readinessProd.valid;

  return {
    id: 'INV-8.6-F',
    name: 'Shadow / certification templates cannot emit production-clean',
    holds: shadowBlocked && certBlocked && blockedRejected && shadowOk &&
      readinessOk && prodNotReady,
    evidence:
      `shadow_blocked=${shadowBlocked}, cert_blocked=${certBlocked}, ` +
      `blocked_rejected=${blockedRejected}, shadow_ok=${shadowOk}, ` +
      `readiness_ok=${readinessOk}, prod_not_ready=${prodNotReady}`,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-8.6-G
// ──────────────────────────────────────────────────────────────────

export function checkINV_86_G(): L8_6InvariantResult {
  const templateRegistry = getDefaultL8RegimeTemplateRegistry();
  const famDefRegistry = getDefaultL8RegimeFamilyDefinitionRegistry();

  // Full consistency scan across the live registries
  const rep = validateRegimeTemplateConsistency();
  const defaultClean = rep.valid;

  // Every family must have ≥ 1 template
  const allFamiliesCovered = ALL_L8_REGIME_FAMILIES.every(f =>
    templateRegistry.listForFamily(f).length > 0);

  // Every family member class has a template
  let allClassesCovered = true;
  for (const def of famDefRegistry.list()) {
    for (const cls of def.member_regime_classes) {
      if (!templateRegistry.findForClass(def.family, cls)) {
        allClassesCovered = false;
        break;
      }
    }
  }

  // Replay safety: same registries produce same results twice.
  const rep1 = validateRegimeTemplateConsistency();
  const rep2 = validateRegimeTemplateConsistency();
  const replaySafe =
    rep1.violations.length === rep2.violations.length;

  return {
    id: 'INV-8.6-G',
    name: 'Template + family registries remain mutually consistent and replay-safe',
    holds: defaultClean && allFamiliesCovered && allClassesCovered && replaySafe,
    evidence:
      `consistency_clean=${defaultClean}, all_families_covered=${allFamiliesCovered}, ` +
      `all_classes_covered=${allClassesCovered}, replay_safe=${replaySafe}`,
  };
}

export function checkAllL86Invariants(): readonly L8_6InvariantResult[] {
  return [
    checkINV_86_A(),
    checkINV_86_B(),
    checkINV_86_C(),
    checkINV_86_D(),
    checkINV_86_E(),
    checkINV_86_F(),
    checkINV_86_G(),
  ];
}
