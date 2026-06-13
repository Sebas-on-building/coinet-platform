import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, GitBranch, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketPulse } from "@/components/home/MarketPulse";
import { LiveVerdicts } from "@/components/home/LiveVerdicts";

export function Overview() {
  return (
    <main className="container flex flex-col gap-16 py-12">
      <section className="mx-auto max-w-3xl text-center">
        <Badge variant="primary" className="mb-4">
          Governed market intelligence
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Verdicts you can audit, not hype you have to trust.
        </h1>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          Coinet turns evidence into a structured verdict — market state, causal
          drivers, contradictions, timing, and honest confidence. When the
          evidence isn&apos;t there, it says so.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/connection"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            See a live verdict
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Market Pulse — live regime strip from GET /api/market-regime */}
      <section aria-label="Market pulse" className="mx-auto w-full max-w-5xl">
        <MarketPulse />
      </section>

      {/* Live Verdicts — real engine judgments from GET /api/judgment */}
      <div className="mx-auto w-full max-w-5xl">
        <LiveVerdicts />
      </div>

      <section className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Governed",
            body: "Every verdict respects trust-state rules. Unavailable means no fabricated answer.",
          },
          {
            icon: GitBranch,
            title: "Causal",
            body: "Drivers, theses, and contradictions are surfaced — not just a single score.",
          },
          {
            icon: Activity,
            title: "Live",
            body: "Backed by the real engine and real market regime data, computed on demand.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardContent className="space-y-2 py-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
