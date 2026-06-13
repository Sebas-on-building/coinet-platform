import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanize, pct } from "@/lib/utils";
import type { JudgmentResponse } from "@/types/api";

/**
 * Renders the RAW judgment object returned by the public GET /api/judgment
 * engine endpoint. This is intentionally a faithful, low-abstraction view of
 * real engine output — proof that the data is real, not a polished mock.
 */
export function RawVerdict({ response }: { response: JudgmentResponse }) {
  const j = response.judgment;
  const conf = j.confidence;

  return (
    <div className="space-y-4">
      {/* Identity + headline state */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-lg font-semibold">{j.symbol}</h3>
              {j.chain ? (
                <Badge variant="outline">{j.chain}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Judged {new Date(j.judged_at).toLocaleString()} · engine v{j.version}
            </p>
          </div>
          <Badge variant={response.evaluation.healthy ? "positive" : "caution"}>
            {response.evaluation.healthy ? "Evaluation healthy" : "Evaluation flagged"}
            {" · "}
            {Math.round(response.evaluation.score)}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Market state">
            <span className="text-base font-medium">
              {humanize(j.state.primary)}
            </span>
            {j.state.secondary ? (
              <span className="text-muted-foreground">
                {" "}
                / {humanize(j.state.secondary)}
              </span>
            ) : null}
            <div className="mt-1 text-xs text-muted-foreground">
              state confidence {pct(j.state.confidence)}
            </div>
          </Field>
          <Field label="Confidence band">
            <span className="text-base font-medium">{humanize(conf.overall)}</span>
            <div className="mt-1 text-xs text-muted-foreground">
              score {pct(conf.score)}
              {conf.primary_uncertainty
                ? ` · uncertainty: ${conf.primary_uncertainty}`
                : ""}
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* The seven fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle>Cause</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dominant cluster:{" "}
              <span className="text-foreground">
                {humanize(j.cause.dominant_cluster)}
              </span>
            </p>
            <DriverList title="Positive" drivers={j.cause.positive_drivers} tone="positive" />
            <DriverList title="Negative" drivers={j.cause.negative_drivers} tone="negative" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Thesis</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{humanize(j.thesis.primary.hypothesis)}</span>
            </p>
            <p className="text-muted-foreground">
              support {pct(j.thesis.primary.support_score)} · contradiction{" "}
              {pct(j.thesis.primary.contradiction_score)} · confidence{" "}
              {pct(j.thesis.primary.confidence)}
            </p>
            {j.thesis.ambiguity_flag ? (
              <Badge variant="caution">Ambiguous — clarity {pct(j.thesis.clarity)}</Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Contradictions</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              load {pct(j.contradictions.load)}
              {j.contradictions.structural_warning ? " · structural warning" : ""}
            </p>
            {j.contradictions.items.length === 0 ? (
              <p className="text-muted-foreground">No material contradictions.</p>
            ) : (
              <ul className="space-y-2">
                {j.contradictions.items.map((c, i) => (
                  <li key={i} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{humanize(c.class)}</span>
                      <Badge variant={c.resolvable ? "caution" : "negative"}>
                        {c.severity}
                      </Badge>
                    </div>
                    {c.summary ? (
                      <p className="mt-1 text-muted-foreground">{c.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Timing</SectionTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{humanize(j.timing.phase)}</span>
            </p>
            <p className="text-muted-foreground">
              score {j.timing.score}/100 · step {j.timing.sequence_position} of{" "}
              {j.timing.sequence_total}
            </p>
            {j.timing.maturity_warning && j.timing.maturity_note ? (
              <Badge variant="caution">{j.timing.maturity_note}</Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Scenario */}
      <Card>
        <CardHeader>
          <SectionTitle>Scenario</SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Base case">{j.scenario.base_case}</Field>
          <Field label="Next trigger">{j.scenario.next_trigger}</Field>
          <Field label="Bullish confirmation">
            <span className="text-positive">{j.scenario.bullish_confirmation}</span>
          </Field>
          <Field label="Bearish failure">
            <span className="text-negative">{j.scenario.bearish_failure}</span>
          </Field>
        </CardContent>
      </Card>

      {/* Confidence breakdown */}
      <Card>
        <CardHeader>
          <SectionTitle>Confidence breakdown</SectionTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Market", conf.breakdown.market],
              ["Fundamentals", conf.breakdown.fundamentals],
              ["On-chain", conf.breakdown.onchain],
              ["Narrative", conf.breakdown.narrative],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 font-mono text-lg tabular-nums">{pct(value)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  );
}

function DriverList({
  title,
  drivers,
  tone,
}: {
  title: string;
  drivers: { family: string; strength: number; summary: string }[];
  tone: "positive" | "negative";
}) {
  if (drivers.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {drivers.map((d, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={
                tone === "positive" ? "text-positive" : "text-negative"
              }
            >
              {tone === "positive" ? "+" : "−"}
            </span>
            <span>
              <span className="font-medium">{humanize(d.family)}</span>{" "}
              <span className="text-muted-foreground">
                ({pct(d.strength)}) — {d.summary}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
