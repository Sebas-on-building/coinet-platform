import { useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useChatVerdict } from "@/hooks/useChatVerdict";
import { MentorVerdict } from "@/components/verdict/MentorVerdict";

/**
 * Authenticated verdict view (Milestone 2 Phase B).
 *
 * Signed-out: sign-in prompt (the chat endpoint requires a verified Clerk token).
 * Signed-in: enter a symbol → POST /api/chat/message → render the real, governed,
 * mentor-voiced ChatVerdict (the differentiated per-token read).
 */
export function VerdictView() {
  return (
    <main className="container py-10">
      <h1 className="text-xl font-semibold tracking-tight">Mentor Verdict</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The governed, mentor-voiced per-token read — straight from the judgment engine.
      </p>

      <SignedOut>
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Sign in to get a governed Coinet verdict — the verdict endpoint requires an
            authenticated session.
          </p>
          <div className="mt-4">
            <SignInButton mode="modal">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Sign in to continue
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <VerdictRunner />
      </SignedIn>
    </main>
  );
}

function VerdictRunner() {
  const { state, run } = useChatVerdict();
  const [symbol, setSymbol] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(symbol);
  };

  const loading = state.status === "loading";

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter a symbol (e.g. BTC, UNI, PEPE)"
          className="flex-1 rounded-md border border-input bg-card px-3 py-2 font-mono text-sm uppercase outline-none ring-ring placeholder:normal-case focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !symbol.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Judging…" : "Get verdict"}
        </button>
      </form>

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">
          Running the engine on {state.symbol.toUpperCase()} — this takes a few seconds (full
          judgment + mentor read).
        </p>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-lg border border-negative/30 bg-negative/10 p-4 text-sm">
          <p className="font-medium text-negative">
            {state.httpStatus === 401
              ? "Not authenticated — your session may have expired. Sign in again."
              : "Couldn't get a verdict."}
          </p>
          <p className="mt-1 text-muted-foreground">{state.message}</p>
        </div>
      ) : null}

      {state.status === "success" ? (
        <>
          <MentorVerdict verdict={state.verdict} prose={state.prose} />
          <p className="text-right text-xs text-muted-foreground">{state.latencyMs} ms</p>
        </>
      ) : null}
    </div>
  );
}
