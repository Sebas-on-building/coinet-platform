import type { CSSProperties } from "react";
import { Scale, AlertTriangle, Gauge } from "lucide-react";
import type { ChatVerdict } from "@/types/api";

/**
 * JudgmentVerdictCard — renders the structured 7-field Coinet judgment verdict
 * alongside (never instead of) the prose response. Sourced from the governed
 * ChatVerdict DTO. When status is UNAVAILABLE, no fields are present (governance
 * invariant), so the card shows an explicit unavailable state — it can never
 * fabricate a verdict.
 *
 * Design language (Coinet spec — exact tokens, restrained):
 *   - Solid near-black elevated surface; no translucency, no backdrop blur.
 *   - Color appears ONLY on data, state, or the single electric-blue accent.
 *   - Everything else is greyscale text on the dark surface.
 */

const ACCENT = "#2B4BFF"; // Coinet electric blue — the single accent
const CARD_BG = "#14161D";
const BORDER = "#232733";
const TEXT_PRIMARY = "#F5F6F8";
const TEXT_SECONDARY = "#8A8F9C";
const TEXT_MUTED = "#5A5F6B";

// Status carries meaning → semantic color (the only state color on the card).
const STATUS_COLOR: Record<ChatVerdict["status"], string> = {
  AVAILABLE: "#22C55E",
  DEGRADED: "#F59E0B",
  UNAVAILABLE: "#EF4444",
};

const HAIRLINE = `0.5px solid ${BORDER}`;
const LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TEXT_SECONDARY,
};

type FieldRow = {
  key: keyof NonNullable<ChatVerdict["fields"]>;
  label: string;
};

// Display order follows the 7-field contract: State / Cause / Thesis /
// Contradictions / Timing / Scenario (Confidence is the headline above).
// Pure data layout — label + value only, no decorative icons (Coinet spec).
const FIELD_ROWS: FieldRow[] = [
  { key: "state", label: "State" },
  { key: "cause", label: "Cause" },
  { key: "thesis", label: "Thesis" },
  { key: "contradiction_summary", label: "Contradictions" },
  { key: "timing_phase", label: "Timing" },
  { key: "scenario_summary", label: "Scenario" },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={LABEL_STYLE}>{label}</span>
      <span className="text-sm leading-snug" style={{ color: TEXT_PRIMARY }}>
        {value}
      </span>
    </div>
  );
}

const fmtNum = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

export function JudgmentVerdictCard({ verdict }: { verdict: ChatVerdict }) {
  const fields = verdict.fields;
  const hasFields = !!fields && Object.keys(fields).length > 0;
  const presentRows = FIELD_ROWS.filter((r) => fields?.[r.key]);
  const statusColor = STATUS_COLOR[verdict.status];

  // ── Phase 2 derived display strings (functional; styling rebuilt later) ──
  const thesisDetailParts: string[] = [];
  if (fields?.thesis_detail) {
    const t = fields.thesis_detail;
    if (t.support_score !== undefined) thesisDetailParts.push(`support ${fmtNum(t.support_score)}`);
    if (t.contradiction_score !== undefined) thesisDetailParts.push(`contradiction ${fmtNum(t.contradiction_score)}`);
    if (t.confidence !== undefined) thesisDetailParts.push(`confidence ${fmtNum(t.confidence)}`);
    if (t.clarity !== undefined) thesisDetailParts.push(`clarity ${fmtNum(t.clarity)}`);
    if (t.ambiguous) thesisDetailParts.push("ambiguous");
  }

  const timingDetailParts: string[] = [];
  if (fields?.timing_detail) {
    const t = fields.timing_detail;
    if (t.score !== undefined) timingDetailParts.push(`score ${fmtNum(t.score)}`);
    if (t.position !== undefined && t.total !== undefined) timingDetailParts.push(`step ${t.position}/${t.total}`);
    if (t.maturity_warning) timingDetailParts.push("maturity warning");
  }

  const breakdownParts: string[] = [];
  if (fields?.confidence_detail?.breakdown) {
    const b = fields.confidence_detail.breakdown;
    if (b.market !== undefined) breakdownParts.push(`market ${fmtNum(b.market)}`);
    if (b.fundamentals !== undefined) breakdownParts.push(`fundamentals ${fmtNum(b.fundamentals)}`);
    if (b.onchain !== undefined) breakdownParts.push(`onchain ${fmtNum(b.onchain)}`);
    if (b.narrative !== undefined) breakdownParts.push(`narrative ${fmtNum(b.narrative)}`);
  }

  const scenario = fields?.scenario_detail;
  const horizons = scenario?.horizons ?? [];
  const hasDepth =
    !!fields &&
    (!!fields.signal_24h ||
      !!fields.failure_condition ||
      (fields.contradiction_items?.length ?? 0) > 0 ||
      !!fields.cause_detail ||
      thesisDetailParts.length > 0 ||
      timingDetailParts.length > 0 ||
      !!scenario ||
      breakdownParts.length > 0 ||
      !!fields.confidence_detail?.primary_uncertainty);

  return (
    <div
      className="w-full mb-4 rounded-2xl overflow-hidden"
      style={{ background: CARD_BG, border: HAIRLINE }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-4 md:px-5 py-3"
        style={{ borderBottom: HAIRLINE }}
      >
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4" style={{ color: ACCENT }} />
          <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
            Coinet Verdict
          </span>
          {verdict.symbol && (
            <span className="text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
              {verdict.symbol}
            </span>
          )}
        </div>
        <span
          className="font-semibold px-2 py-0.5 rounded-full"
          style={{
            ...LABEL_STYLE,
            color: statusColor,
            background: `${statusColor}1F`, // ~12% tint
            border: `0.5px solid ${statusColor}4D`, // ~30%
          }}
        >
          {verdict.status}
        </span>
      </div>

      {/* Confidence headline (when present) */}
      {fields?.confidence_band && (
        <div className="flex items-center gap-2 px-4 md:px-5 pt-3">
          <Gauge className="w-4 h-4" style={{ color: ACCENT }} />
          <span style={LABEL_STYLE}>Confidence</span>
          <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
            {fields.confidence_band}
          </span>
        </div>
      )}

      {/* Field grid */}
      {hasFields && presentRows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 px-4 md:px-5 py-4">
          {presentRows.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span style={LABEL_STYLE}>{label}</span>
              <span
                className="text-sm leading-snug"
                style={{ color: TEXT_PRIMARY }}
              >
                {fields?.[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Structured depth (Phase 2) — functional layout, no styling investment */}
      {hasDepth && (
        <div
          className="flex flex-col gap-3 px-4 md:px-5 py-4"
          style={{ borderTop: HAIRLINE }}
        >
          {fields?.signal_24h && (
            <DetailRow label="24h Signal" value={fields.signal_24h} />
          )}
          {fields?.failure_condition && (
            <DetailRow label="Failure Condition" value={fields.failure_condition} />
          )}

          {fields?.contradiction_items && fields.contradiction_items.length > 0 && (
            <div className="flex flex-col gap-1">
              <span style={LABEL_STYLE}>Contradictions</span>
              <ul className="space-y-1">
                {fields.contradiction_items.map((c, i) => (
                  <li
                    key={i}
                    className="text-sm leading-snug"
                    style={{ color: TEXT_PRIMARY }}
                  >
                    <span style={{ color: TEXT_SECONDARY }}>
                      {c.class} · {c.severity}
                      {c.resolvable !== undefined
                        ? ` · ${c.resolvable ? "resolvable" : "structural"}`
                        : ""}
                    </span>
                    {c.summary ? ` — ${c.summary}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fields?.cause_detail && (
            <div className="flex flex-col gap-1">
              <span style={LABEL_STYLE}>Cause Detail</span>
              {fields.cause_detail.dominant_cluster && (
                <span className="text-sm leading-snug" style={{ color: TEXT_PRIMARY }}>
                  Dominant: {fields.cause_detail.dominant_cluster}
                  {fields.cause_detail.secondary_cluster
                    ? ` · Secondary: ${fields.cause_detail.secondary_cluster}`
                    : ""}
                </span>
              )}
              {(fields.cause_detail.drivers ?? []).map((d, i) => (
                <span
                  key={i}
                  className="text-sm leading-snug"
                  style={{ color: TEXT_SECONDARY }}
                >
                  [{d.direction}] {d.family}
                  {d.strength !== undefined ? ` (${fmtNum(d.strength)})` : ""}
                  {d.summary ? `: ${d.summary}` : ""}
                </span>
              ))}
            </div>
          )}

          {thesisDetailParts.length > 0 && (
            <DetailRow label="Thesis Detail" value={thesisDetailParts.join(" · ")} />
          )}
          {fields?.thesis_detail?.secondary && (
            <DetailRow label="Secondary Thesis" value={fields.thesis_detail.secondary} />
          )}

          {timingDetailParts.length > 0 && (
            <DetailRow label="Timing Detail" value={timingDetailParts.join(" · ")} />
          )}
          {fields?.timing_detail?.maturity_note && (
            <DetailRow label="Maturity Note" value={fields.timing_detail.maturity_note} />
          )}

          {scenario?.bullish_confirmation && (
            <DetailRow label="Bullish Confirmation" value={scenario.bullish_confirmation} />
          )}
          {scenario?.bearish_failure && (
            <DetailRow label="Bearish Failure" value={scenario.bearish_failure} />
          )}
          {scenario?.next_trigger && (
            <DetailRow label="Next Trigger" value={scenario.next_trigger} />
          )}
          {horizons.length > 0 && (
            <div className="flex flex-col gap-1">
              <span style={LABEL_STYLE}>Horizons</span>
              {horizons.map((h, i) => (
                <span
                  key={i}
                  className="text-sm leading-snug"
                  style={{ color: TEXT_PRIMARY }}
                >
                  <span style={{ color: TEXT_SECONDARY }}>{h.horizon}</span>
                  {h.confirmation ? ` · confirm: ${h.confirmation}` : ""}
                  {h.failure ? ` · fail: ${h.failure}` : ""}
                </span>
              ))}
            </div>
          )}

          {breakdownParts.length > 0 && (
            <DetailRow label="Confidence Breakdown" value={breakdownParts.join(" · ")} />
          )}
          {fields?.confidence_detail?.primary_uncertainty && (
            <DetailRow
              label="Primary Uncertainty"
              value={fields.confidence_detail.primary_uncertainty}
            />
          )}
        </div>
      )}

      {/* Unavailable / no-fields state */}
      {!hasFields && (
        <div className="px-4 md:px-5 py-4 text-sm" style={{ color: TEXT_SECONDARY }}>
          No structured Coinet verdict is available for this request.
        </div>
      )}

      {/* Disclosures (DEGRADED / UNAVAILABLE governance) */}
      {verdict.disclosures && verdict.disclosures.length > 0 && (
        <div className="px-4 md:px-5 py-3" style={{ borderTop: HAIRLINE }}>
          <ul className="space-y-1">
            {verdict.disclosures.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 leading-snug"
                style={{ fontSize: 11, color: TEXT_MUTED }}
              >
                <AlertTriangle
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: TEXT_MUTED }}
                />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
