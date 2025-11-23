import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useSelector((state: any) => state.settings.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
export default AuthGate; 