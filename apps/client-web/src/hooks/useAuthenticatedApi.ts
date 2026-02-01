/**
 * Hook to sync Clerk auth with API client
 */

import { useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { apiClient } from '@/services/api-client';

export function useAuthenticatedApi() {
  const { user } = useAuth();
  const { getToken, isSignedIn } = useClerkAuth();

  useEffect(() => {
    async function syncAuth() {
      if (isSignedIn && user) {
        try {
          // Get Clerk session token
          const token = await getToken();
          apiClient.setAuth(user.id, token);
        } catch (error) {
          console.error('Failed to get auth token:', error);
          // Still set user ID even if token fails
          apiClient.setAuth(user.id, null);
        }
      } else if (user) {
        // Demo mode - user exists but not signed in with Clerk
        apiClient.setAuth(user.id, null);
      } else {
        // Not authenticated
        apiClient.setAuth(null, null);
      }
    }

    syncAuth();
  }, [user, isSignedIn, getToken]);

  return apiClient;
}
