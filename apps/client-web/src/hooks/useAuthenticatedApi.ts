/**
 * Hook to sync auth with API client
 * Works with both Clerk (when configured) and demo mode (when Clerk key is missing)
 * Sends Authorization: Bearer <token> when Clerk token is available
 */

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/services/api-client';

export function useAuthenticatedApi() {
  const { user, getToken } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function syncAuth() {
      if (!user) {
        apiClient.setAuth(null, null);
        return;
      }
      // Demo mode: X-User-Id only. Clerk: Bearer token + X-User-Id
      const token = await getToken();
      if (mounted) {
        apiClient.setAuth(user.id, token);
      }
    }

    syncAuth();
    return () => {
      mounted = false;
    };
  }, [user, getToken]);

  return apiClient;
}
