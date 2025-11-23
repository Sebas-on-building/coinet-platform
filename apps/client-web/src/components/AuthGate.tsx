import React, { ReactNode } from 'react';
// Placeholder for authentication logic
const isAuthenticated = () => {
  // TODO: Replace with real auth check (e.g. from Redux, context, or API)
  return Boolean(localStorage.getItem('auth_token'));
};

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return null;
  }
  return <>{children}</>;
}; 