import { useState } from 'react';
import { login, loginWithSSO, loginWithSAML, loginWithOIDC } from '../../utils/auth';

const ssoProviders = [
  { id: 'google', label: 'Continue with Google', color: '#fff', bg: '#4285F4', icon: '/logos/google.svg' },
  { id: 'apple', label: 'Continue with Apple', color: '#fff', bg: '#000', icon: '/logos/apple.svg' },
  { id: 'github', label: 'Continue with GitHub', color: '#fff', bg: '#24292e', icon: '/logos/github.svg' },
];
const samlProviders = [
  { entityId: 'urn:coinet:enterprise:acme', label: 'Sign in with Acme SAML', color: '#fff', bg: '#1a237e', icon: '/logos/saml.svg' },
];
const oidcProviders = [
  { issuer: 'https://login.microsoftonline.com/tenant/v2.0', clientId: 'COINET_OIDC_CLIENT_ID', label: 'Sign in with Microsoft', color: '#fff', bg: '#0078d4', icon: '/logos/microsoft.svg' },
];

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ssoLoading, setSSOLoading] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSSO(provider: string) {
    setSSOLoading(provider);
    setError(null);
    try {
      await loginWithSSO(provider);
    } catch (err: any) {
      setError(err.message || 'SSO failed');
      setSSOLoading(null);
    }
  }
  async function handleSAML(entityId: string) {
    setSSOLoading(entityId);
    setError(null);
    try {
      await loginWithSAML(entityId);
    } catch (err: any) {
      setError(err.message || 'SAML SSO failed');
      setSSOLoading(null);
    }
  }
  async function handleOIDC(issuer: string, clientId: string) {
    setSSOLoading(issuer);
    setError(null);
    try {
      await loginWithOIDC(issuer, clientId);
    } catch (err: any) {
      setError(err.message || 'OIDC SSO failed');
      setSSOLoading(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      maxWidth: 400,
      margin: '2rem auto',
      padding: '2rem',
      borderRadius: 16,
      boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
      background: 'var(--color-bg, #fff)',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', gap: 24
    }}>
      <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Sign in to Coinet</h2>
      <label htmlFor="email" style={{ fontWeight: 500 }}>Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
        autoComplete="email"
      />
      <label htmlFor="password" style={{ fontWeight: 500 }}>Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }}
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'linear-gradient(90deg, #0e76fd 0%, #6e4fff 100%)',
          color: '#fff', fontWeight: 700, fontSize: 18, border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s'
        }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {ssoProviders.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSSO(p.id)}
            disabled={!!ssoLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: p.bg, color: p.color, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer',
              opacity: ssoLoading && ssoLoading !== p.id ? 0.5 : 1, transition: 'opacity 0.2s'
            }}
          >
            {p.icon && <img src={p.icon} alt="" style={{ width: 22, height: 22, borderRadius: 4, background: '#fff' }} />}
            {ssoLoading === p.id ? `Redirecting…` : p.label}
          </button>
        ))}
        {samlProviders.map(p => (
          <button
            key={p.entityId}
            type="button"
            onClick={() => handleSAML(p.entityId)}
            disabled={!!ssoLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: p.bg, color: p.color, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer',
              opacity: ssoLoading && ssoLoading !== p.entityId ? 0.5 : 1, transition: 'opacity 0.2s'
            }}
          >
            {p.icon && <img src={p.icon} alt="" style={{ width: 22, height: 22, borderRadius: 4, background: '#fff' }} />}
            {ssoLoading === p.entityId ? `Redirecting…` : p.label}
          </button>
        ))}
        {oidcProviders.map(p => (
          <button
            key={p.issuer}
            type="button"
            onClick={() => handleOIDC(p.issuer, p.clientId)}
            disabled={!!ssoLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: p.bg, color: p.color, fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer',
              opacity: ssoLoading && ssoLoading !== p.issuer ? 0.5 : 1, transition: 'opacity 0.2s'
            }}
          >
            {p.icon && <img src={p.icon} alt="" style={{ width: 22, height: 22, borderRadius: 4, background: '#fff' }} />}
            {ssoLoading === p.issuer ? `Redirecting…` : p.label}
          </button>
        ))}
      </div>
      {error && <div style={{ color: '#e00', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
      {success && <div style={{ color: '#0a0', textAlign: 'center', fontWeight: 500 }}>Login successful!</div>}
    </form>
  );
} 