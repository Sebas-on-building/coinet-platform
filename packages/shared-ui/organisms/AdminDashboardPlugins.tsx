import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface AdminDashboardPluginsProps {
  theme?: 'light' | 'dark';
}

export const AdminDashboardPlugins: React.FC<AdminDashboardPluginsProps> = ({ theme = 'light' }) => {
  const [plugins, setPlugins] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/plugins')
      .then(r => r.json())
      .then(setPlugins)
      .catch(e => setError(e.message || 'Failed to load plugins'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const approve = async (id: string) => {
    await fetch(`/api/admin/plugins/${id}/approve`, { method: 'POST' });
    setPlugins(plugins => plugins.map(p => p.id === id ? { ...p, approved: true } : p));
  };

  const reject = async (id: string) => {
    await fetch(`/api/admin/plugins/${id}/reject`, { method: 'POST' });
    setPlugins(plugins => plugins.map(p => p.id === id ? { ...p, approved: false } : p));
  };

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading plugins…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (filtered.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No plugins found.</div>;

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search plugins…"
        style={{
          width: '100%',
          marginBottom: tokens.spacing.sm,
          padding: tokens.spacing.sm,
          borderRadius: tokens.radius.sm,
          border: `1px solid ${tokens.colors.border[theme]}`,
          fontSize: tokens.typography.fontSize.base,
          background: tokens.colors.surface[theme],
          color: tokens.colors.text[theme],
          outline: 'none',
        }}
        aria-label="Search plugins"
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', color: tokens.colors.text[theme] }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Author</th>
            <th>Version</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.author}</td>
              <td>{p.version}</td>
              <td>{p.approved ? 'Approved' : 'Pending'}</td>
              <td>
                <button onClick={() => approve(p.id)} style={{ background: tokens.colors.success[theme], color: tokens.colors.text[theme], border: 'none', borderRadius: tokens.radius.xs, padding: tokens.spacing.xs, cursor: 'pointer', marginRight: 4 }}>Approve</button>
                <button onClick={() => reject(p.id)} style={{ background: tokens.colors.error[theme], color: tokens.colors.text[theme], border: 'none', borderRadius: tokens.radius.xs, padding: tokens.spacing.xs, cursor: 'pointer' }}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 