import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../packages/shared-models/portfolio/store';
import { useNavigate } from 'react-router-dom';

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = Boolean(localStorage.getItem('auth_token'));
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  if (!isAuthenticated) return null;
  return <>{children}</>;
};

export default AuthGate; 