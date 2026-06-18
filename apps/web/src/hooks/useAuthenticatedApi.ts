/**
 * Syncs Clerk auth into the API client (mirrors the proven client-web pattern).
 *
 * When signed in, pushes the Clerk user id + a session token into `apiClient`
 * so authenticated calls (POST /api/chat/message) carry `Authorization: Bearer
 * <token>` + `X-User-Id`. Clears on sign-out.
 *
 * Note on token freshness: Clerk session tokens are short-lived. This hook
 * re-syncs whenever auth state changes; the chat hook (Milestone 2 Phase B)
 * additionally fetches a fresh token immediately before each request, so a
 * stale synced token never reaches the backend.
 */
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";

export function useAuthenticatedApi() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!isSignedIn || !user) {
        apiClient.clearAuth();
        return;
      }
      const token = await getToken();
      if (mounted) apiClient.setAuth(user.id, token);
    })();

    return () => {
      mounted = false;
    };
  }, [isSignedIn, user, getToken]);
}
