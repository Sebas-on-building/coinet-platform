/**
 * Fetches the REAL mentor verdict for a symbol via the authenticated chat
 * pipeline: POST /api/chat/message → data.message.verdict (a ChatVerdict whose
 * fields are already humanized + mentor-framed server-side by renderMentorCardFields).
 *
 * Token freshness: Clerk session tokens are short-lived, so we mint a fresh one
 * immediately before each request and push it into the API client — a stale
 * synced token never reaches the backend.
 */
import { useCallback, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { ChatVerdict } from "@/types/api";

export type ChatVerdictState =
  | { status: "idle" }
  | { status: "loading"; symbol: string }
  | {
      status: "success";
      symbol: string;
      verdict?: ChatVerdict;
      prose: string;
      latencyMs: number;
    }
  | { status: "error"; symbol: string; message: string; httpStatus?: number };

export function useChatVerdict() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [state, setState] = useState<ChatVerdictState>({ status: "idle" });

  const run = useCallback(
    async (symbolRaw: string) => {
      const symbol = symbolRaw.trim();
      if (!symbol) return;

      setState({ status: "loading", symbol });
      const started = performance.now();
      try {
        // Fresh token right before the call — Clerk tokens expire quickly.
        const token = await getToken();
        apiClient.setAuth(user?.id ?? null, token);

        const res = await apiClient.sendChatMessage({
          message: symbol,
          context: { analysisDepth: "standard" },
        });
        const msg = res.data.message;
        setState({
          status: "success",
          symbol,
          verdict: msg.verdict,
          prose: msg.content,
          latencyMs: Math.round(performance.now() - started),
        });
      } catch (err) {
        setState({
          status: "error",
          symbol,
          message: err instanceof Error ? err.message : "Unknown error",
          httpStatus: err instanceof ApiError ? err.status : undefined,
        });
      }
    },
    [getToken, user?.id],
  );

  return { state, run };
}
