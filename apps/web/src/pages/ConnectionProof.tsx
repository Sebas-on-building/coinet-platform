import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plug, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useJudgment } from "@/hooks/useJudgment";
import { RawVerdict } from "@/components/verdict/RawVerdict";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = ["BTC", "ETH", "SOL", "DOGE"];

export function ConnectionProof() {
  const { state, run, endpoint } = useJudgment();
  const [searchParams] = useSearchParams();
  const initialSymbol = (searchParams.get("symbol") || "BTC").toUpperCase();
  const [symbol, setSymbol] = useState(initialSymbol);
  const autoRan = useRef(false);

  // Auto-run the verdict when arriving with a ?symbol= param (e.g. from a
  // homepage verdict card), so the deep link lands on a real result.
  useEffect(() => {
    if (autoRan.current) return;
    const q = searchParams.get("symbol");
    if (q) {
      autoRan.current = true;
      run(q);
    }
  }, [searchParams, run]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (symbol.trim()) run(symbol);
  }

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Badge variant="primary" className="mb-3">
            <Plug className="h-3 w-3" />
            Milestone 1 — Connection Proof
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Real verdict from the live engine
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            This page calls the public{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
              GET /api/judgment
            </code>{" "}
            endpoint on the production backend with no authentication. The result
            below is computed by the real judgment engine — there is no mock data
            anywhere in this flow.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            target: {endpoint}
          </p>
        </div>

        <form onSubmit={submit} className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter a symbol (e.g. BTC)"
            aria-label="Token symbol"
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 font-mono text-sm uppercase outline-none ring-ring placeholder:normal-case focus:ring-2"
          />
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {state.status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching…
              </>
            ) : (
              "Get live verdict"
            )}
          </button>
        </form>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbol(s);
                run(s);
              }}
              className="rounded-md border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        {state.status === "idle" && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Enter a symbol and fetch a live verdict to confirm the connection.
            </CardContent>
          </Card>
        )}

        {state.status === "error" && (
          <Card className="border-negative/40">
            <CardContent className="flex items-start gap-3 py-6">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-negative" />
              <div>
                <p className="font-medium text-negative">
                  Request failed
                  {state.httpStatus ? ` (HTTP ${state.httpStatus})` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  This is a real network error from the backend — not a mocked
                  state. Check the symbol or the backend availability.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.status === "success" && (
          <div className="space-y-4">
            <Card className="border-positive/40">
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-positive">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected — real verdict received
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  client latency {state.latencyMs}ms
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  engine compute {state.data.computeTime}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  at {new Date(state.fetchedAt).toLocaleTimeString()}
                </span>
              </CardContent>
            </Card>

            <RawVerdict response={state.data} />
          </div>
        )}
      </div>
    </main>
  );
}
