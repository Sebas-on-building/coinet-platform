/**
 * L13.8 — Style Policy Contract
 *
 * §13.8.4 / §13.8.5 — Canonical style traits, forbidden style
 * classes, and forbidden-style detection patterns. Bound into the
 * style-control plan that L13.6 consumes via `style_policy_ref`.
 *
 * Style may shape delivery; style may never reshape truth.
 */

export enum L13StyleTrait {
  CLEAR = 'CLEAR',
  CONCISE_DEFAULT = 'CONCISE_DEFAULT',
  DIRECT = 'DIRECT',
  TRADER_USEFUL = 'TRADER_USEFUL',
  NON_HYPE = 'NON_HYPE',
  UNCERTAINTY_AWARE = 'UNCERTAINTY_AWARE',
  HUMAN_READABLE = 'HUMAN_READABLE',
  MULTILINGUAL_CAPABLE = 'MULTILINGUAL_CAPABLE',
  EMOTIONALLY_CONTROLLED = 'EMOTIONALLY_CONTROLLED',
  NON_DASHBOARDY = 'NON_DASHBOARDY',
  NON_OVEREXPLANATORY = 'NON_OVEREXPLANATORY',
}

export const ALL_L13_STYLE_TRAITS: readonly L13StyleTrait[] =
  Object.values(L13StyleTrait);

export enum L13ForbiddenStyleClass {
  HYPE_INFLUENCER = 'HYPE_INFLUENCER',
  FINANCIAL_ADVISOR = 'FINANCIAL_ADVISOR',
  PROPHECY_ENGINE = 'PROPHECY_ENGINE',
  SALES_COPY = 'SALES_COPY',
  OVERCONFIDENT_ANALYST = 'OVERCONFIDENT_ANALYST',
  LEGAL_DISCLAIMER_MACHINE = 'LEGAL_DISCLAIMER_MACHINE',
  ROBOTIC_DASHBOARD = 'ROBOTIC_DASHBOARD',
  PANIC_BROADCASTER = 'PANIC_BROADCASTER',
  EMPTY_GENERIC_ASSISTANT = 'EMPTY_GENERIC_ASSISTANT',
}

export const ALL_L13_FORBIDDEN_STYLE_CLASSES:
  readonly L13ForbiddenStyleClass[] =
  Object.values(L13ForbiddenStyleClass);

/**
 * §13.8.5.1 — Pattern catalogue per forbidden style class. The
 * persona validator and the response shaper scan output text
 * against these patterns.
 */
export interface L13ForbiddenStylePattern {
  readonly style_class: L13ForbiddenStyleClass;
  readonly pattern: RegExp;
}

export const L13_FORBIDDEN_STYLE_PATTERNS:
  readonly L13ForbiddenStylePattern[] = [
  // HYPE_INFLUENCER
  { style_class: L13ForbiddenStyleClass.HYPE_INFLUENCER, pattern: /\b(absolutely|literally)\s+exploding\b/i },
  { style_class: L13ForbiddenStyleClass.HYPE_INFLUENCER, pattern: /\bsetup\s+is\s+insane\b/i },
  { style_class: L13ForbiddenStyleClass.HYPE_INFLUENCER, pattern: /\bmassive\s+breakout\s+incoming\b/i },
  { style_class: L13ForbiddenStyleClass.HYPE_INFLUENCER, pattern: /\bto\s+the\s+moon\b/i },
  { style_class: L13ForbiddenStyleClass.HYPE_INFLUENCER, pattern: /!{2,}/ },

  // FINANCIAL_ADVISOR
  { style_class: L13ForbiddenStyleClass.FINANCIAL_ADVISOR, pattern: /\byou\s+should\s+(buy|sell|short|long|hold|avoid)\b/i },
  { style_class: L13ForbiddenStyleClass.FINANCIAL_ADVISOR, pattern: /\bmy\s+recommendation\s+is\b/i },
  { style_class: L13ForbiddenStyleClass.FINANCIAL_ADVISOR, pattern: /\bi\s+(would|advise)\s+(you\s+)?(to\s+)?(buy|sell|exit|enter)\b/i },

  // PROPHECY_ENGINE
  { style_class: L13ForbiddenStyleClass.PROPHECY_ENGINE, pattern: /\bthis\s+is\s+going\s+to\s+(pump|dump|moon|crash)\b/i },
  { style_class: L13ForbiddenStyleClass.PROPHECY_ENGINE, pattern: /\bwill\s+(definitely|certainly)\s+(go\s+up|go\s+down|pump|dump)\b/i },
  { style_class: L13ForbiddenStyleClass.PROPHECY_ENGINE, pattern: /\bguaranteed\s+to\s+(rally|drop)\b/i },

  // SALES_COPY
  { style_class: L13ForbiddenStyleClass.SALES_COPY, pattern: /\b(coinet|we)\s+(deliver|guarantee|outperform)\b/i },
  { style_class: L13ForbiddenStyleClass.SALES_COPY, pattern: /\b(unlock|maximize)\s+your\s+(returns?|portfolio)\b/i },
  { style_class: L13ForbiddenStyleClass.SALES_COPY, pattern: /\bdon'?t\s+miss\s+this\s+opportunity\b/i },

  // OVERCONFIDENT_ANALYST
  { style_class: L13ForbiddenStyleClass.OVERCONFIDENT_ANALYST, pattern: /\b(definitive|conclusive)\s+(view|call|read)\b/i },
  { style_class: L13ForbiddenStyleClass.OVERCONFIDENT_ANALYST, pattern: /\bno\s+room\s+for\s+doubt\b/i },

  // LEGAL_DISCLAIMER_MACHINE
  { style_class: L13ForbiddenStyleClass.LEGAL_DISCLAIMER_MACHINE, pattern: /\bthis\s+is\s+not\s+financial\s+advice\b/i },
  { style_class: L13ForbiddenStyleClass.LEGAL_DISCLAIMER_MACHINE, pattern: /\balways\s+do\s+your\s+own\s+research\b/i },
  { style_class: L13ForbiddenStyleClass.LEGAL_DISCLAIMER_MACHINE, pattern: /\bnfa[,\s]*dyor\b/i },

  // ROBOTIC_DASHBOARD — leading uppercase-only stat block ("REGIME: X / SEQUENCE: Y")
  { style_class: L13ForbiddenStyleClass.ROBOTIC_DASHBOARD, pattern: /\b(REGIME|SEQUENCE|HYPOTHESIS|SCORE)\s*:\s*[A-Z_]+\s*\.\s*(REGIME|SEQUENCE|HYPOTHESIS|SCORE)\s*:/ },

  // PANIC_BROADCASTER
  { style_class: L13ForbiddenStyleClass.PANIC_BROADCASTER, pattern: /\bcrashing\s+now\b/i },
  { style_class: L13ForbiddenStyleClass.PANIC_BROADCASTER, pattern: /\bget\s+out\s+(now|immediately)\b/i },

  // EMPTY_GENERIC_ASSISTANT
  { style_class: L13ForbiddenStyleClass.EMPTY_GENERIC_ASSISTANT, pattern: /\bi'?m\s+(just\s+)?an\s+ai\s+(assistant|language\s+model)\b/i },
  { style_class: L13ForbiddenStyleClass.EMPTY_GENERIC_ASSISTANT, pattern: /\bi\s+cannot\s+browse\s+the\s+internet\b/i },
];

/**
 * §13.8.26 — Required semantic anchor classes. The integrity engine
 * verifies that each anchor required by L13.5 / L13.7 survives the
 * response shaper's pass.
 */
export enum L13RequiredSemanticAnchorClass {
  UNCERTAINTY_DISCLOSURE = 'UNCERTAINTY_DISCLOSURE',
  CONTRADICTION_DISCLOSURE = 'CONTRADICTION_DISCLOSURE',
  TRIGGER_DISCLOSURE = 'TRIGGER_DISCLOSURE',
  INVALIDATION_DISCLOSURE = 'INVALIDATION_DISCLOSURE',
  RESTRICTION_DISCLOSURE = 'RESTRICTION_DISCLOSURE',
  MISSING_DATA_DISCLOSURE = 'MISSING_DATA_DISCLOSURE',
  DRIFT_DISCLOSURE = 'DRIFT_DISCLOSURE',
  CONFIDENCE_CAP_DISCLOSURE = 'CONFIDENCE_CAP_DISCLOSURE',
}

export const ALL_L13_REQUIRED_SEMANTIC_ANCHOR_CLASSES:
  readonly L13RequiredSemanticAnchorClass[] =
  Object.values(L13RequiredSemanticAnchorClass);

/**
 * §13.8.26 — Semantic-anchor keyword catalogue. Each class maps to
 * a set of natural-language keyword anchors that the integrity
 * engine searches for, in any supported language. Anchors are
 * compared case-insensitively against the corpus.
 */
export const L13_SEMANTIC_ANCHOR_KEYWORDS:
  Readonly<Record<L13RequiredSemanticAnchorClass, readonly string[]>> = {
  [L13RequiredSemanticAnchorClass.UNCERTAINTY_DISCLOSURE]: [
    'uncertainty',
    'not clean',
    'remains conditional',
    'confidence-capped',
    'preserves alternatives',
    'unsicher',
    'unsicherheit',
    'incierto',
    'incertidumbre',
  ],
  [L13RequiredSemanticAnchorClass.CONTRADICTION_DISCLOSURE]: [
    'contradiction',
    'contradictory',
    'narrows the interpretation',
    'widerspruch',
    'contradicción',
  ],
  [L13RequiredSemanticAnchorClass.TRIGGER_DISCLOSURE]: [
    'trigger',
    'confirmation',
    'auslöser',
    'bestätigung',
    'disparador',
    'confirmación',
  ],
  [L13RequiredSemanticAnchorClass.INVALIDATION_DISCLOSURE]: [
    'invalidation',
    'failure condition',
    'invalidates',
    'invalidierung',
    'invalidación',
  ],
  [L13RequiredSemanticAnchorClass.RESTRICTION_DISCLOSURE]: [
    'restriction',
    'limited by',
    'not a trade recommendation',
    'einschränkung',
    'restricción',
  ],
  [L13RequiredSemanticAnchorClass.MISSING_DATA_DISCLOSURE]: [
    'missing visibility',
    'missing data',
    'fehlende daten',
    'datos faltantes',
  ],
  [L13RequiredSemanticAnchorClass.DRIFT_DISCLOSURE]: [
    'drift',
    'drift in',
    'abdrift',
    'desviación',
  ],
  [L13RequiredSemanticAnchorClass.CONFIDENCE_CAP_DISCLOSURE]: [
    'confidence-capped',
    'confidence cap',
    'capped',
    'vertrauensgrenze',
    'límite de confianza',
  ],
};
