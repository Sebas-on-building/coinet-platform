/**
 * Mentor card templates — Phase 2 (Approach B).
 *
 * Deterministic, downstream of produceJudgment. Composes the verdict card's
 * user-facing strings in the mentor's voice from the ALREADY-PROJECTED judgment
 * fields. It lives in the projection layer (api/chat), never in services/judgment,
 * so the certified engine and the AJP.1 fingerprint are untouched by construction.
 *
 * Two operations, both claim-neutral (Law 1 / Law 7):
 *  1. Humanize enum identifiers (state/thesis/timing/contradiction/cluster) into
 *     display labels — "distribution_under_hype" -> "Distribution Under Hype".
 *  2. Frame the engine's specific prose with mentor connective tissue, folding
 *     the engine's detail in VERBATIM so the card never regresses to generic text.
 *     Framing words are voice, not new claims; the engine's content is preserved.
 *
 * Pure: no I/O, no randomness, no mutation of the input object.
 */

import {
  MARKET_STATE_LABELS,
  HYPOTHESIS_LABELS,
  CONTRADICTION_LABELS,
  TIMING_LABELS,
} from '../../services/judgment/taxonomies';
import type { CoinetJudgmentPromptPackageJudgment } from './judgment-prompt-package.types';

// ── Humanization ───────────────────────────────────────────────────────────

/** snake_case / lower words -> Title Case, for identifiers without a label map. */
export function titleCase(id: string): string {
  return id
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const label = (map: Record<string, string>, id?: string): string | undefined =>
  id === undefined ? undefined : map[id] ?? titleCase(id);

const humanizeState = (id?: string) => label(MARKET_STATE_LABELS as Record<string, string>, id);
const humanizeThesis = (id?: string) => label(HYPOTHESIS_LABELS as Record<string, string>, id);
const humanizeTiming = (id?: string) => label(TIMING_LABELS as Record<string, string>, id);
const humanizeContradiction = (id?: string) =>
  label(CONTRADICTION_LABELS as Record<string, string>, id);
const humanizeCluster = (id?: string) => (id === undefined ? undefined : titleCase(id));

// ── Small text helpers ───────────────────────────────────────────────────────

const lowerFirst = (s: string): string => (s.length > 0 ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const trimDot = (s: string): string => s.replace(/\s*\.\s*$/, '');

function stripPrefix(s: string, prefixes: string[]): string {
  for (const p of prefixes) {
    if (s.toLowerCase().startsWith(p.toLowerCase())) return s.slice(p.length);
  }
  return s;
}

// ── Mentor framings (vary by thesis / phase / band; fold detail in verbatim) ──

// Per-thesis lead for the failure condition — keeps the engine's specific
// trigger, changes only the mentor framing so dissimilar assets don't read alike.
const FAILURE_LEAD: Record<string, string> = {
  distribution_under_hype: 'Wrong if',
  leverage_driven_squeeze: 'This unwinds if',
  capitulation_reset: 'The base breaks if',
  narrative_only_pump: 'The story breaks if',
  thin_liquidity_risk: 'It snaps if',
  structurally_weak_rally: 'The rally fails if',
  post_unlock_sell_pressure: 'The overhang wins if',
};

// A trailing intensifier verb means the engine appended it to a clause that
// already has its own verb (the contradiction-derived failure: "{X} worsens").
// "Wrong if {X} worsens" reads as a double verb, so reshape to "this worsens: {X}".
const TRAILING_INTENSIFIER = /\s+(worsens|intensifies|deteriorates|widens|accelerates)\.?$/i;

function frameFailure(s?: string, thesisId?: string): string | undefined {
  if (!s) return s;
  const core = trimDot(stripPrefix(s.trim(), ['Thesis fails if ', 'Fails if ']));
  const lead = (thesisId && FAILURE_LEAD[thesisId]) || 'Wrong if';
  const m = core.match(TRAILING_INTENSIFIER);
  if (m) {
    const verb = m[1].toLowerCase();
    const rest = trimDot(core.replace(TRAILING_INTENSIFIER, ''));
    return `${lead} this ${verb}: ${lowerFirst(rest)} — treat that as the exit, not a dip to argue with.`;
  }
  return `${lead} ${lowerFirst(core)} — treat that as the exit, not a dip to argue with.`;
}

// Per-phase maturity line — replaces the flat "Setup shows maturity indicators."
// with a phase-specific read. The phase IS the specificity, so nothing is lost.
const MATURITY_BY_PHASE: Record<string, string> = {
  post_peak: 'This setup is past its peak — the easy part of the move is already behind it.',
  late_reflexive: 'Late in the reflexive phase — risk/reward has turned against fresh entries.',
  crowded: 'The trade is crowded here — late money is the fragile money.',
  exhausted: 'The move looks exhausted — most of the fuel has already burned.',
  mature: 'This setup is late in its life — the easy part of the risk/reward is behind it.',
};

function frameMaturity(phaseId?: string, note?: string): string | undefined {
  if (!note) return note; // only reframe when the engine actually flagged maturity
  return (phaseId && MATURITY_BY_PHASE[phaseId]) || note;
}

function frameUncertainty(s?: string, band?: string): string | undefined {
  if (!s) return s;
  if (band === 'very_low') return `Why this is a watchlist note, not a view: ${lowerFirst(s)}`;
  if (band === 'low') return `Why I'm holding this one loosely: ${lowerFirst(s)}`;
  return s;
}

const frameBullish = (s?: string) => (s ? `What would confirm it: ${s}` : s);
const frameBearish = (s?: string) => (s ? `What breaks it: ${s}` : s);
// Drop the engine's leading "Watch for"/"Watch:" so we don't double it ("watching: Watch for").
const frameNext = (s?: string): string | undefined =>
  s ? `Next thing I'm watching: ${lowerFirst(stripPrefix(s.trim(), ['Watch for ', 'Watch: ']))}` : s;

// ── Horizon lens correction (Law 4) ─────────────────────────────────────────
// The engine's longer-horizon lines default to fundamentals language ("fundamental
// metrics validate growth thesis"). That is the WRONG lens for assets with no
// fundamentals (memecoins, stablecoins), so for those sectors we re-lens the
// fundamentals-language horizon lines into the right vocabulary.
const FUNDAMENTALS_LENS_SECTORS = new Set([
  'L1', 'L2', 'DeFi', 'Infrastructure', 'Payment', 'Exchange', 'Gaming', 'Privacy',
]);
const FUNDAMENTALS_LANGUAGE =
  /\b(fundamentals?|growth thesis|adoption metrics?|metrics validate|revenue|tvl|capital efficiency)\b/i;

function sectorHasFundamentalsLens(sector?: string): boolean {
  if (!sector || sector === 'Unknown') return true; // conservative: leave engine text
  return FUNDAMENTALS_LENS_SECTORS.has(sector);
}

function relensHorizonLine(
  s: string | undefined,
  kind: 'confirmation' | 'failure',
  sector?: string,
): string | undefined {
  if (!s || sectorHasFundamentalsLens(sector) || !FUNDAMENTALS_LANGUAGE.test(s)) return s;
  if (sector === 'Stablecoin') {
    return kind === 'confirmation'
      ? 'The peg holds and liquidity stays deep.'
      : 'The peg slips or reserves come into question.';
  }
  // Memecoin (and any other non-fundamentals sector): flow / narrative / liquidity.
  return kind === 'confirmation'
    ? 'The narrative holds and liquidity deepens rather than thins.'
    : 'The narrative fades and liquidity dries up.';
}

// ── The transform ────────────────────────────────────────────────────────────

/**
 * Render the projected judgment into the mentor's card voice. Returns a NEW
 * object (no mutation). Every structured number is passed through unchanged;
 * only display identifiers and prose framing are touched.
 */
export function renderMentorCardFields(
  j: CoinetJudgmentPromptPackageJudgment,
  sector?: string,
): CoinetJudgmentPromptPackageJudgment {
  // Capture raw enums BEFORE humanizing (framings key on the identifiers).
  const thesisId = j.thesis;
  const phaseId = j.timing_phase;

  const out: CoinetJudgmentPromptPackageJudgment = { ...j };

  // 1. Humanized identifiers
  if (j.state !== undefined) out.state = humanizeState(j.state);
  if (j.thesis !== undefined) out.thesis = humanizeThesis(j.thesis);
  if (j.timing_phase !== undefined) out.timing_phase = humanizeTiming(j.timing_phase);

  if (j.state_detail) {
    out.state_detail = {
      ...j.state_detail,
      ...(j.state_detail.secondary !== undefined
        ? { secondary: humanizeState(j.state_detail.secondary) }
        : {}),
    };
  }

  if (j.cause_detail) {
    out.cause_detail = {
      ...j.cause_detail,
      ...(j.cause_detail.dominant_cluster !== undefined
        ? { dominant_cluster: humanizeCluster(j.cause_detail.dominant_cluster) }
        : {}),
      ...(j.cause_detail.secondary_cluster !== undefined
        ? { secondary_cluster: humanizeCluster(j.cause_detail.secondary_cluster) }
        : {}),
      ...(j.cause_detail.drivers
        ? {
            drivers: j.cause_detail.drivers.map((d) => ({
              ...d,
              ...(d.family !== undefined ? { family: humanizeCluster(d.family) } : {}),
            })),
          }
        : {}),
    };
  }

  if (j.thesis_detail) {
    out.thesis_detail = {
      ...j.thesis_detail,
      ...(j.thesis_detail.secondary !== undefined
        ? { secondary: humanizeThesis(j.thesis_detail.secondary) }
        : {}),
    };
  }

  if (j.contradiction_items) {
    out.contradiction_items = j.contradiction_items.map((c) => ({
      ...c,
      ...(c.class !== undefined ? { class: humanizeContradiction(c.class) } : {}),
    }));
    const n = j.contradiction_items.length;
    if (n > 0) out.contradiction_summary = `${n} open contradiction${n === 1 ? '' : 's'} to weigh.`;
  }

  // 2. Mentor-framed prose (engine detail folded in verbatim)
  if (j.failure_condition !== undefined)
    out.failure_condition = frameFailure(j.failure_condition, thesisId);

  if (j.timing_detail) {
    out.timing_detail = {
      ...j.timing_detail,
      ...(j.timing_detail.maturity_note !== undefined
        ? { maturity_note: frameMaturity(phaseId, j.timing_detail.maturity_note) }
        : {}),
    };
  }

  if (j.scenario_detail) {
    out.scenario_detail = {
      ...j.scenario_detail,
      ...(j.scenario_detail.bullish_confirmation !== undefined
        ? { bullish_confirmation: frameBullish(j.scenario_detail.bullish_confirmation) }
        : {}),
      ...(j.scenario_detail.bearish_failure !== undefined
        ? { bearish_failure: frameBearish(j.scenario_detail.bearish_failure) }
        : {}),
      ...(j.scenario_detail.next_trigger !== undefined
        ? { next_trigger: frameNext(j.scenario_detail.next_trigger) }
        : {}),
      // Horizons: re-lens fundamentals-language lines for non-fundamentals
      // sectors (Law 4) — memecoins/stablecoins never get "fundamentals validate
      // growth" horizons. Other content is preserved verbatim.
      ...(j.scenario_detail.horizons
        ? {
            horizons: j.scenario_detail.horizons.map((h) => ({
              ...h,
              ...(h.confirmation !== undefined
                ? { confirmation: relensHorizonLine(h.confirmation, 'confirmation', sector) }
                : {}),
              ...(h.failure !== undefined
                ? { failure: relensHorizonLine(h.failure, 'failure', sector) }
                : {}),
            })),
          }
        : {}),
    };
  }

  if (j.confidence_detail) {
    out.confidence_detail = {
      ...j.confidence_detail,
      ...(j.confidence_detail.primary_uncertainty !== undefined
        ? {
            primary_uncertainty: frameUncertainty(
              j.confidence_detail.primary_uncertainty,
              j.confidence_band,
            ),
          }
        : {}),
    };
  }

  return out;
}
