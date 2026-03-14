/**
 * AuthUIContext — Auth-related UI state for the Coinet app.
 * Works alongside ClerkProvider to provide loading/ready state for auth flows.
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';

interface AuthUIState {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
}

const AuthUIContext = createContext<AuthUIState | undefined>(undefined);

export function AuthUIProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <AuthUIContext.Provider value={{ isLoaded, isSignedIn }}>
      {children}
    </AuthUIContext.Provider>
  );
}

export function useAuthUI(): AuthUIState {
  const ctx = useContext(AuthUIContext);
  if (ctx === undefined) {
    return { isLoaded: true, isSignedIn: undefined };
  }
  return ctx;
}
