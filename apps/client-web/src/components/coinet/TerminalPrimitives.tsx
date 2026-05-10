import * as React from "react";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function CoinetMark({
  className,
  showWordmark = false,
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative shrink-0", markSize)} aria-hidden="true">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
        <div className="absolute inset-0 rounded-full border border-primary/40 bg-[#070B1F]" />
        <div className="absolute left-[18%] top-[18%] h-[64%] w-[64%] rounded-full border-[3px] border-r-transparent border-primary" />
        <div className="absolute left-[30%] top-[30%] h-[40%] w-[40%] rounded-full border-2 border-r-transparent border-violet-300/80" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#37F5A5] shadow-[0_0_18px_rgba(55,245,165,0.9)]" />
      </div>
      {showWordmark && (
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-[-0.02em] text-foreground">Coinet</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
            Judgment AI
          </div>
        </div>
      )}
    </div>
  );
}

export function TerminalPanel({ className, children, ...props }: DivProps) {
  return (
    <div className={cn("coinet-panel relative overflow-hidden", className)} {...props}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      {children}
    </div>
  );
}

export function SystemLabel({ className, children, ...props }: DivProps) {
  return (
    <div className={cn("coinet-system-label", className)} {...props}>
      {children}
    </div>
  );
}

export function ConfidenceMeter({
  value,
  label = "Confidence",
  description,
  className,
}: {
  value: number;
  label?: string;
  description?: string;
  className?: string;
}) {
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <TerminalPanel className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <SystemLabel>{label}</SystemLabel>
          {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        <div className="font-mono text-3xl font-semibold tracking-[-0.08em] text-foreground">{bounded}%</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[#37F5A5] shadow-[0_0_18px_rgba(76,69,255,0.45)]"
          style={{ width: `${bounded}%` }}
        />
      </div>
    </TerminalPanel>
  );
}

export function SignalStackCard({
  signals,
  className,
}: {
  signals: Array<{ label: string; value: string; tone?: "neutral" | "positive" | "risk" }>;
  className?: string;
}) {
  return (
    <TerminalPanel className={cn("p-5", className)}>
      <SystemLabel>Signal Stack</SystemLabel>
      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <div key={signal.label} className="grid grid-cols-[130px_1fr] items-center gap-3 text-sm">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{signal.label}</div>
            <div
              className={cn(
                "rounded-lg border border-border/60 bg-surface/55 px-3 py-2 text-foreground-secondary",
                signal.tone === "positive" && "border-[#37F5A5]/30 text-[#37F5A5]",
                signal.tone === "risk" && "border-[#FF4D6D]/30 text-[#FF8FA3]",
              )}
            >
              {signal.value}
            </div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}

export function ContradictionCard({
  title = "Contradiction Detected",
  children,
  className,
}: DivProps & { title?: string }) {
  return (
    <TerminalPanel className={cn("coinet-danger-soft p-5", className)}>
      <SystemLabel className="text-[#FF8FA3]">{title}</SystemLabel>
      <div className="mt-3 text-sm leading-6 text-foreground-secondary">{children}</div>
    </TerminalPanel>
  );
}

export function JudgmentCard({
  className,
  rows,
}: {
  className?: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <TerminalPanel className={cn("p-5", className)}>
      <SystemLabel>Judgment Card</SystemLabel>
      <div className="mt-4 divide-y divide-border/60">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[120px_1fr]">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{row.label}</div>
            <div className="text-sm leading-6 text-foreground-secondary">{row.value}</div>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}

export function SourceHealthCard({ className }: { className?: string }) {
  const sources = [
    ["CoinGlass", "Live", "positive"],
    ["DeFiLlama", "Live", "positive"],
    ["Birdeye", "Live", "positive"],
    ["X Sentiment", "Degraded", "risk"],
    ["CryptoPanic", "Live", "positive"],
  ] as const;

  return (
    <TerminalPanel className={cn("p-5", className)}>
      <SystemLabel>Source Health</SystemLabel>
      <div className="mt-4 space-y-3">
        {sources.map(([name, state, tone]) => (
          <div key={name} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{name}</span>
            <span
              className={cn(
                "font-mono text-[11px] uppercase tracking-[0.18em]",
                tone === "positive" ? "text-[#37F5A5]" : "text-[#FF8FA3]",
              )}
            >
              {state}
            </span>
          </div>
        ))}
      </div>
    </TerminalPanel>
  );
}
