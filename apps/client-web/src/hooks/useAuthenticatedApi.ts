/**
 * Hook to sync auth with API client
 * Works with both Clerk (when configured) and demo mode (when Clerk key is missing)
 */

import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/services/api-client';

export function useAuthenticatedApi() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Demo mode or Clerk - set user ID for API requests (X-User-Id header)
      apiClient.setAuth(user.id, null);
    } else {
      apiClient.setAuth(null, null);
    }
  }, [user]);

  return apiClient;
}
