/**
 * 🧵 MULTI-TURN TOKEN CARRY-OVER (Law-1 safe)
 *
 * When a user's current message names no token but is clearly continuing a
 * thread ("wie sicher bist du?", "und das Timing?"), we may inherit the token
 * the thread is already about — but ONLY under a hard uniqueness gate.
 *
 * THE HARD RULE (size-1 uniqueness):
 *   Carry a token forward if and only if the recent conversation history
 *   contains EXACTLY ONE distinct, unambiguous token across the user's own
 *   turns. Zero tokens, or two-or-more different tokens, carries NOTHING —
 *   the caller then falls back to its existing clarifying question.
 *
 * This deliberately PRESERVES the Law-1 anti-hallucination hardening: when in
 * doubt we ask, we never guess. A hallucinated coin is worse than a follow-up
 * question. Ambiguity is resolved by asking, not by picking the most recent or
 * highest-confidence token.
 *
 * Only the USER's own turns are scanned. Assistant turns are ignored on purpose
 * — an assistant reply may legitimately mention several coins (e.g. comparisons,
 * correlations), which would manufacture false ambiguity or false subjects.
 */
import { symbolDetector, type DetectedCoin } from './symbol-detector';

export interface ConversationTurn {
  role: string;
  content: string;
}

export type CarryOverReason =
  | 'carried' // exactly one distinct token in history → carried
  | 'no_history' // no usable prior user turns
  | 'no_token_in_history' // user turns exist but mention no token
  | 'ambiguous'; // two or more distinct tokens → carry nothing, ask instead

export interface CarryOverResult {
  /** The single carried token, or null when the hard gate is not satisfied. */
  carried: DetectedCoin | null;
  reason: CarryOverReason;
  /** Distinct token symbols seen across user turns (for logging/diagnostics). */
  distinctSymbols: string[];
}

/**
 * Infer the single unambiguous token to carry forward from conversation history.
 *
 * @param history Recent conversation turns (role + content). May include the
 *   current token-less message; that turn simply contributes no token.
 */
export async function inferCarriedToken(
  history: ConversationTurn[] | undefined | null,
): Promise<CarryOverResult> {
  const userTurns = (history ?? []).filter(
    (t): t is ConversationTurn =>
      !!t && t.role === 'user' && typeof t.content === 'string' && t.content.trim().length > 0,
  );

  if (userTurns.length === 0) {
    return { carried: null, reason: 'no_history', distinctSymbols: [] };
  }

  // Collect distinct tokens by canonical id across all user turns. Keyed by
  // coinGeckoId so "BTC" and "bitcoin" don't double-count, and so two genuinely
  // different tokens (BTC vs ETH) register as ambiguous.
  const byId = new Map<string, DetectedCoin>();
  for (const turn of userTurns) {
    const coins = await symbolDetector.detectCoins(turn.content);
    for (const coin of coins) {
      if (!byId.has(coin.coinGeckoId)) byId.set(coin.coinGeckoId, coin);
    }
  }

  const distinctSymbols = [...byId.values()].map((c) => c.symbol.toUpperCase());

  if (byId.size === 0) {
    return { carried: null, reason: 'no_token_in_history', distinctSymbols };
  }

  // HARD GATE: only a single, unambiguous token may be carried. Two or more
  // distinct tokens → carry nothing → caller asks which token the user means.
  if (byId.size > 1) {
    return { carried: null, reason: 'ambiguous', distinctSymbols };
  }

  return { carried: [...byId.values()][0], reason: 'carried', distinctSymbols };
}
