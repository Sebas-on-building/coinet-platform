/**
 * L13.8 — Language Resolution Engine
 *
 * §13.8.17 — Resolves the output language by priority:
 *   1. explicit user request
 *   2. product locale
 *   3. dominant detected query language
 *   4. safe fallback (English)
 * Unsupported explicit requests collapse to BLOCKED.
 */

import {
  L13LanguageResolutionStatus,
  L13SupportedLanguage,
  type L13LanguageResolutionProfile,
  type L13ResolvedOutputLanguage,
} from '../contracts/language-profile';
import { detectL13Language } from './language-detector';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

export interface L13LanguageResolutionInput {
  readonly request_id: string;
  readonly user_query: string;
  readonly explicit_user_language_request?: L13SupportedLanguage;
  readonly product_locale_language?: L13SupportedLanguage;
  /**
   * When the explicit user request is a language that is NOT in
   * `L13SupportedLanguage` we cannot accept it but we still want
   * to record the rejection. The caller passes the original
   * string here; the engine maps known unsupported codes to
   * BLOCKED.
   */
  readonly explicit_user_language_request_unsupported?: string;
  readonly code_switching_allowed?: boolean;
}

/**
 * §13.8.17.1 — Resolution priority.
 */
export function resolveL13Language(
  input: L13LanguageResolutionInput,
): L13LanguageResolutionProfile {
  const detected = detectL13Language(input.user_query);
  let resolved: L13ResolvedOutputLanguage;
  let status: L13LanguageResolutionStatus;

  if (input.explicit_user_language_request_unsupported) {
    resolved = 'BLOCKED';
    status = L13LanguageResolutionStatus.BLOCKED_UNSUPPORTED_LANGUAGE;
  } else if (input.explicit_user_language_request) {
    resolved = input.explicit_user_language_request;
    status =
      L13LanguageResolutionStatus.RESOLVED_FROM_EXPLICIT_USER_REQUEST;
  } else if (input.product_locale_language) {
    resolved = input.product_locale_language;
    status = L13LanguageResolutionStatus.RESOLVED_FROM_PRODUCT_LOCALE;
  } else if (detected) {
    resolved = detected;
    status =
      L13LanguageResolutionStatus.RESOLVED_FROM_QUERY_DETECTION;
  } else {
    resolved = L13SupportedLanguage.ENGLISH;
    status = L13LanguageResolutionStatus.FALLBACK_TO_ENGLISH;
  }

  const replayHash = fnv1a(
    [
      input.request_id,
      input.explicit_user_language_request ?? '',
      input.product_locale_language ?? '',
      detected ?? '',
      input.explicit_user_language_request_unsupported ?? '',
      resolved,
      status,
      String(input.code_switching_allowed ?? false),
      POLICY_V,
    ].join('|'),
  );

  return {
    language_resolution_id: `l13.lang.${replayHash}`,
    request_id: input.request_id,
    explicit_user_language_request:
      input.explicit_user_language_request,
    detected_query_language: detected,
    product_locale_language: input.product_locale_language,
    resolved_output_language: resolved,
    language_resolution_status: status,
    code_switching_allowed: input.code_switching_allowed ?? false,
    preserve_asset_symbols_untranslated: true,
    preserve_protocol_names_untranslated: true,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
