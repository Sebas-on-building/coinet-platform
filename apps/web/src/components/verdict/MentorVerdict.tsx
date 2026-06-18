import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pct } from "@/lib/utils";
import type { ChatVerdict } from "@/types/api";

/**
 * Renders the governed mentor verdict (ChatVerdict) from POST /api/chat/message.
 *
 * The fields are ALREADY humanized + mentor-framed server-side
 * (renderMentorCardFields): "Distribution Under Hype", per-thesis failure leads,
 * sector-relensed horizons, confidence-band framing. So this component renders
 * them as-is — it never re-humanizes and never invents. UNAVAILABLE carries no
 * fields (governance invariant) and shows an explicit unavailable state.
 */

const STATUS_VARIANT = {
  AVAILABLE: "positive",
  DEGRADED: "caution",
  UNAVAILABLE: "negative",
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-wrap gap-x-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export function MentorVerdict({ verdict, prose }: { verdict?: ChatVerdict; prose?: string }) {
  if (!verdict) {
    return prose ? (
      <Card>
        <CardContent className="pt-5 text-sm whitespace-pre-wrap">{prose}</CardContent>
      </Card>
    ) : null;
  }

  const f = verdict.fields;
  const statusVariant = STATUS_VARIANT[verdict.status] ?? "outline";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            {verdict.symbol ? (
              <h3 className="font-mono text-lg font-semibold">{verdict.symbol}</h3>
            ) : null}
            <span className="text-sm text-muted-foreground">Coinet Verdict</span>
          </div>
          <Badge variant={statusVariant}>{verdict.status}</Badge>
        </CardHeader>

        {/* Governance invariant: UNAVAILABLE carries no fields. */}
        {!f ? (
          <CardContent className="text-sm text-muted-foreground">
            Structured Coinet judgment is unavailable for this request — not a governed read.
          </CardContent>
        ) : (
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {f.state ? <span className="text-base font-medium">{f.state}</span> : null}
              {f.confidence_band ? (
                <Badge variant="outline">confidence {f.confidence_band}</Badge>
              ) : null}
            </div>

            {f.thesis ? (
              <Section title="Thesis">
                <span className="font-medium">{f.thesis}</span>
                {f.thesis_detail ? (
                  <span className="text-muted-foreground">
                    {" · "}
                    support {pct(f.thesis_detail.support_score)} · contradiction{" "}
                    {pct(f.thesis_detail.contradiction_score)} · confidence{" "}
                    {pct(f.thesis_detail.confidence)}
                    {f.thesis_detail.ambiguous ? " · ambiguous" : ""}
                  </span>
                ) : null}
                {f.thesis_detail?.secondary ? (
                  <div className="text-muted-foreground">Secondary: {f.thesis_detail.secondary}</div>
                ) : null}
              </Section>
            ) : null}

            {f.cause ? (
              <Section title="Cause">
                {f.cause}
                {f.cause_detail?.dominant_cluster ? (
                  <span className="text-muted-foreground">
                    {" · "}dominant: {f.cause_detail.dominant_cluster}
                    {f.cause_detail.secondary_cluster ? ` · secondary: ${f.cause_detail.secondary_cluster}` : ""}
                  </span>
                ) : null}
                {f.cause_detail?.drivers?.length ? (
                  <ul className="mt-1 space-y-0.5">
                    {f.cause_detail.drivers.map((d, i) => (
                      <li key={i} className="text-muted-foreground">
                        <span className={d.direction === "negative" ? "text-negative" : "text-positive"}>
                          [{d.direction}]
                        </span>{" "}
                        {d.family}
                        {d.strength !== undefined ? ` (${pct(d.strength)})` : ""}
                        {d.summary ? ` — ${d.summary}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Section>
            ) : null}

            {f.contradiction_items?.length ? (
              <Section title="Contradictions">
                <ul className="space-y-0.5">
                  {f.contradiction_items.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium">{c.class}</span>
                      <span className="text-muted-foreground">
                        {" "}· {c.severity}
                        {c.resolvable !== undefined ? (c.resolvable ? " · resolvable" : " · unresolvable") : ""}
                      </span>
                      {c.summary ? <div className="text-muted-foreground">{c.summary}</div> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : f.contradiction_summary ? (
              <Section title="Contradictions">{f.contradiction_summary}</Section>
            ) : null}

            {f.timing_phase ? (
              <Section title="Timing">
                <span className="font-medium">{f.timing_phase}</span>
                {f.timing_detail ? (
                  <span className="text-muted-foreground">
                    {f.timing_detail.score !== undefined ? ` · score ${f.timing_detail.score}` : ""}
                    {f.timing_detail.position !== undefined && f.timing_detail.total !== undefined
                      ? ` · step ${f.timing_detail.position}/${f.timing_detail.total}`
                      : ""}
                  </span>
                ) : null}
                {f.timing_detail?.maturity_note ? (
                  <div className="text-muted-foreground">{f.timing_detail.maturity_note}</div>
                ) : null}
              </Section>
            ) : null}

            {f.signal_24h ? <Section title="24h signal">{f.signal_24h}</Section> : null}
            {f.failure_condition ? <Section title="Failure condition">{f.failure_condition}</Section> : null}

            {f.scenario_detail ? (
              <Section title="Scenario">
                <Row label="Bullish" value={f.scenario_detail.bullish_confirmation} />
                <Row label="Bearish" value={f.scenario_detail.bearish_failure} />
                <Row label="Next trigger" value={f.scenario_detail.next_trigger} />
                {f.scenario_detail.horizons?.length ? (
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {f.scenario_detail.horizons.map((h, i) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">{h.horizon}</span> · confirm: {h.confirmation} · fail: {h.failure}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Section>
            ) : null}

            {f.confidence_detail ? (
              <Section title="Confidence">
                {f.confidence_detail.breakdown ? (
                  <span className="text-muted-foreground">
                    market {pct(f.confidence_detail.breakdown.market)} · fundamentals{" "}
                    {pct(f.confidence_detail.breakdown.fundamentals)} · onchain{" "}
                    {pct(f.confidence_detail.breakdown.onchain)} · narrative{" "}
                    {pct(f.confidence_detail.breakdown.narrative)}
                  </span>
                ) : null}
                {f.confidence_detail.primary_uncertainty ? (
                  <div className="text-muted-foreground">{f.confidence_detail.primary_uncertainty}</div>
                ) : null}
              </Section>
            ) : null}

            {verdict.disclosures?.length ? (
              <Section title="Disclosures">
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {verdict.disclosures.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </CardContent>
        )}
      </Card>

      {prose ? (
        <Card>
          <CardHeader className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Coinet
          </CardHeader>
          <CardContent className="pt-0 text-sm whitespace-pre-wrap">{prose}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
