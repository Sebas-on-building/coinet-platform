import { useCallback, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/api-config";
import type { JudgmentResponse } from "@/types/api";

type ProofState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: JudgmentResponse; fetchedAt: string; latencyMs: number }
  | { status: "error"; message: string; httpStatus?: number };

/**
 * Milestone 1 hook: prove the new frontend reaches the REAL Railway backend and
 * gets a REAL engine verdict back. No auth, no mock data — hits the public
 * GET /api/judgment endpoint directly.
 */
export function useJudgment() {
  const [state, setState] = useState<ProofState>({ status: "idle" });

  const run = useCallback(async (symbol: string) => {
    setState({ status: "loading" });
    const started = performance.now();
    try {
      const data = await apiClient.getJudgment(symbol);
      setState({
        status: "success",
        data,
        fetchedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
      });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
        httpStatus: err instanceof ApiError ? err.status : undefined,
      });
    }
  }, []);

  return { state, run, endpoint: `${API_BASE_URL || "(proxy)"}/api/judgment` };
}
