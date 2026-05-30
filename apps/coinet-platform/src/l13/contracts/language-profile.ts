/**
 * L13.8 — Language Profile Contract
 *
 * §13.8.16 / §13.8.17 / §13.8.18 — Supported languages, resolved
 * output language, language resolution status, and the resolution
 * profile bound onto every style control plan.
 */

export enum L13SupportedLanguage {
  ENGLISH = 'ENGLISH',
  GERMAN = 'GERMAN',
  SPANISH = 'SPANISH',
}

export const ALL_L13_SUPPORTED_LANGUAGES:
  readonly L13SupportedLanguage[] =
  Object.values(L13SupportedLanguage);

/**
 * §13.8.18 — Resolution status taxonomy.
 */
export enum L13LanguageResolutionStatus {
  RESOLVED_FROM_EXPLICIT_USER_REQUEST = 'RESOLVED_FROM_EXPLICIT_USER_REQUEST',
  RESOLVED_FROM_PRODUCT_LOCALE = 'RESOLVED_FROM_PRODUCT_LOCALE',
  RESOLVED_FROM_QUERY_DETECTION = 'RESOLVED_FROM_QUERY_DETECTION',
  MIXED_INPUT_RESOLVED_TO_DOMINANT = 'MIXED_INPUT_RESOLVED_TO_DOMINANT',
  FALLBACK_TO_ENGLISH = 'FALLBACK_TO_ENGLISH',
  BLOCKED_UNSUPPORTED_LANGUAGE = 'BLOCKED_UNSUPPORTED_LANGUAGE',
}

export const ALL_L13_LANGUAGE_RESOLUTION_STATUSES:
  readonly L13LanguageResolutionStatus[] =
  Object.values(L13LanguageResolutionStatus);

/**
 * §13.8.17 — Resolved output language. Distinct from
 * `L13SupportedLanguage` because the resolution profile may
 * report `BLOCKED` for an unsupported request.
 */
export type L13ResolvedOutputLanguage =
  | L13SupportedLanguage
  | 'BLOCKED';

export interface L13LanguageResolutionProfile {
  readonly language_resolution_id: string;
  readonly request_id: string;
  readonly explicit_user_language_request?: L13SupportedLanguage;
  readonly detected_query_language?: L13SupportedLanguage;
  readonly product_locale_language?: L13SupportedLanguage;
  readonly resolved_output_language: L13ResolvedOutputLanguage;
  readonly language_resolution_status: L13LanguageResolutionStatus;
  readonly code_switching_allowed: boolean;
  readonly preserve_asset_symbols_untranslated: true;
  readonly preserve_protocol_names_untranslated: true;
  readonly policy_version: string;
  readonly replay_hash: string;
}
