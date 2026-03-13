/**
 * Hook: usePluginReviewSubmit
 *
 * Returns an auth-aware submitReview callback for use with PluginReviewForm.
 * Auth is supplied by apiClient (populated via useAuthenticatedApi at app
 * startup) — no auth logic lives inside the shared-ui component.
 *
 * Usage:
 *   const submitReview = usePluginReviewSubmit();
 *   <PluginReviewForm pluginId={id} submitReview={submitReview} />
 *
 * Throws with a human-readable message on HTTP error so PluginReviewForm
 * can surface it in its error state without knowing anything about auth.
 */

import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/services/api-client';

export interface PluginReviewSubmitPayload {
  rating: number;
  text: string;
}

export function usePluginReviewSubmit() {
  const { user } = useAuth();

  return useCallback(
    async (pluginId: string, payload: PluginReviewSubmitPayload): Promise<void> => {
      if (!user) {
        throw new Error('You must be signed in to submit a review.');
      }

      const author =
        (user as any).firstName
          ? `${(user as any).firstName}${(user as any).lastName ? ` ${(user as any).lastName}` : ''}`
          : (user as any).primaryEmailAddress?.emailAddress ??
            (user as any).email ??
            'User';

      const res = await apiClient.fetchWithAuth(`/api/plugins/reviews/${pluginId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, author }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string; error?: string }).message ??
            (body as { error?: string }).error ??
            `HTTP ${res.status}`
        );
      }
    },
    [user]
  );
}
