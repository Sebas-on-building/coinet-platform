import { useEffect, useState } from 'react';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import LoginForm from './LoginForm';
import LogoutButton from './LogoutButton';

export default function UserSession() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      if (await isAuthenticated()) {
        const u = await getCurrentUser();
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', margin: '2rem', color: '#888' }}>Loading…</div>;
  if (!user) return <LoginForm />;
  return (
    <div style={{
      maxWidth: 400,
      margin: '2rem auto',
      padding: '2rem',
      borderRadius: 16,
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      background: 'var(--color-bg, #fff)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center'
    }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Welcome, {user.name || user.email}</div>
      <div style={{ color: '#666', fontSize: 16, marginBottom: 16 }}>You are logged in.</div>
      <LogoutButton />
    </div>
  );
} 