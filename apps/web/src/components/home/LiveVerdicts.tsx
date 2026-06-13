import { Link } from "react-router-dom";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { JudgmentOutput } from "@/types/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const HERO_SYMBOLS = ["BTC", "ETH", "SOL"] as const;

/** Confidence band (0–1 score) → semantic tone. */
function confidenceTone(score: number): string {
  if (score >= 0.66) return "text-positive";
  if (score >= 0.4) return "text-caution";
  return "text-muted-foreground";
}

/** Map a free-form state string toward a tone using sign words; neutral otherwise. */
function stateTone(state: string): string {
  const s = state.toLowerCase();
  if (/(strong|bull|accumulat|breakout|expansion|recovery)/.test(s)) return "text-positive";
  if (/(weak|bear|distribut|breakdown|decline|dormant|capitulat)/.test(s)) return "text-negative";
  return "text-foreground";
}

function CardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
    </Card>
  );
}

function VerdictMini({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<JudgmentOutput>(
    ["judgment", symbol],
    async () => {
      const res = await apiClient.getJudgment(symbol);
      return res.judgment;
    },
    { revalidateOnFocus: false, dedupingInterval: 2 * 60 * 1000 },
  );

  if (isLoading && !data) return <CardSkeleton />;

  if (error || !data) {
    return (
      <Card className="flex flex-col justify-between gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-foreground">{symbol}</span>
          <span className="rounded border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Unavailable
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Verdict temporarily unavailable. The engine returned no result for this symbol.
        </p>
      </Card>
    );
  }

  const confidencePct = Math.round((data.confidence.score ?? 0) * 100);

  return (
    <Link
      to={`/connection?symbol=${encodeURIComponent(symbol)}`}
      className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex h-full flex-col gap-4 p-5 transition-colors group-hover:border-primary/50">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-foreground">{data.symbol}</span>
          <span
            className={cn(
              "font-mono text-xs font-medium tabular-nums",
              confidenceTone(data.confidence.score ?? 0),
            )}
          >
            {data.confidence.overall} · {confidencePct}%
          </span>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            State
          </p>
          <p className={cn("text-pretty text-base font-semibold leading-snug", stateTone(data.state.primary))}>
            {data.state.primary}
          </p>
        </div>

        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Thesis
          </p>
          <p className="line-clamp-3 text-pretty text-sm leading-relaxed text-foreground/80">
            {data.thesis.primary.hypothesis}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">{data.timing.phase}</span>
          <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View full verdict →
          </span>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Live Verdicts hero — real engine verdicts for a small set of majors, each
 * fetched from the PUBLIC GET /api/judgment. No mock data; cards degrade
 * honestly if a symbol's verdict is unavailable.
 */
export function LiveVerdicts() {
  return (
    <section aria-label="Live verdicts" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-pretty text-lg font-semibold text-foreground">Live verdicts</h2>
          <p className="text-sm text-muted-foreground">
            Real-time engine judgments — structured, sourced, and honest about uncertainty.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HERO_SYMBOLS.map((s) => (
          <VerdictMini key={s} symbol={s} />
        ))}
      </div>
    </section>
  );
}
