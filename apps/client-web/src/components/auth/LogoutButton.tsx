import { useState } from 'react';
import { logout } from '../../utils/auth';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleLogout() {
    setLoading(true);
    setError(null);
    try {
      await logout();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleLogout}
        disabled={loading || success}
        style={{
          background: 'linear-gradient(90deg, #ff4e50 0%, #f9d423 100%)',
          color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: 16
        }}
      >
        {loading ? 'Logging out…' : success ? 'Logged out' : 'Logout'}
      </button>
      {error && <div style={{ color: '#e00', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ color: '#0a0', fontWeight: 500 }}>Logout successful!</div>}
    </div>
  );
} 