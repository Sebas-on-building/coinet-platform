import { useMarketRegime } from "@/hooks/useMarketRegime";
import { cn } from "@/lib/utils";
import type { MarketRegimeData } from "@/types/api";

/** Format a large USD figure compactly: $2.28T, $845.2B. */
function formatUsd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Fear & Greed value → semantic color band. */
function fearGreedTone(value: number): string {
  if (value <= 24) return "text-negative";
  if (value <= 44) return "text-caution";
  if (value <= 54) return "text-muted-foreground";
  return "text-positive";
}

interface PulseItemProps {
  label: string;
  value: string;
  sub?: string;
  subTone?: string;
  valueTone?: string;
  unavailable?: boolean;
}

function PulseItem({ label, value, sub, subTone, valueTone, unavailable }: PulseItemProps) {
  return (
    <div className="flex min-w-[120px] flex-col gap-1 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-base font-semibold tabular-nums",
            unavailable ? "text-muted-foreground/50" : valueTone ?? "text-foreground",
          )}
        >
          {value}
        </span>
        {sub && (
          <span className={cn("font-mono text-xs tabular-nums", subTone ?? "text-muted-foreground")}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function changeTone(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "text-muted-foreground";
  return n >= 0 ? "text-positive" : "text-negative";
}

function PulseContent({ regime }: { regime: MarketRegimeData }) {
  const fg = regime.fearGreed;
  return (
    <>
      <PulseItem
        label="Fear & Greed"
        value={fg ? String(fg.value) : "—"}
        sub={fg?.classification}
        subTone={fg ? fearGreedTone(fg.value) : undefined}
        valueTone={fg ? fearGreedTone(fg.value) : undefined}
        unavailable={!fg}
      />
      <Divider />
      <PulseItem
        label="BTC Dominance"
        value={regime.btcDominance !== null ? `${regime.btcDominance.toFixed(1)}%` : "—"}
        sub={
          regime.btcDominanceChange7d !== null
            ? `${formatPct(regime.btcDominanceChange7d)} 7d`
            : undefined
        }
        subTone={changeTone(regime.btcDominanceChange7d)}
        unavailable={regime.btcDominance === null}
      />
      <Divider />
      <PulseItem
        label="Total Market Cap"
        value={formatUsd(regime.totalMarketCapUsd)}
        sub={
          regime.totalMarketCapChange24h !== null
            ? `${formatPct(regime.totalMarketCapChange24h)} 24h`
            : undefined
        }
        subTone={changeTone(regime.totalMarketCapChange24h)}
        unavailable={regime.totalMarketCapUsd === null}
      />
      <Divider />
      <PulseItem
        label="ETH Dominance"
        value={regime.ethDominance !== null ? `${regime.ethDominance.toFixed(1)}%` : "—"}
        unavailable={regime.ethDominance === null}
      />
    </>
  );
}

function Divider() {
  return <div className="hidden h-8 w-px self-center bg-border sm:block" aria-hidden="true" />;
}

function PulseSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * Market Pulse — a live regime strip backed by the real GET /api/market-regime
 * endpoint. Honest by construction: when a source is down its value shows "—".
 */
export function MarketPulse() {
  const { regime, error, isLoading } = useMarketRegime();

  return (
    <section
      aria-label="Market pulse"
      className="overflow-x-auto rounded-lg border border-border bg-card"
    >
      <div className="flex flex-nowrap items-stretch divide-border">
        {isLoading && !regime ? (
          <PulseSkeleton />
        ) : error || !regime ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            Market pulse temporarily unavailable.
          </div>
        ) : (
          <PulseContent regime={regime} />
        )}
      </div>
    </section>
  );
}
