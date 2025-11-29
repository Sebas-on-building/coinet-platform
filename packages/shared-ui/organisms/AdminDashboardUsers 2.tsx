import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface AdminDashboardUsersProps {
  theme?: 'light' | 'dark';
}

export const AdminDashboardUsers: React.FC<AdminDashboardUsersProps> = ({ theme = 'light' }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(e => setError(e.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  const updateRole = async (id: string, role: string) => {
    await fetch(`/api/admin/users/${id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setUsers(users => users.map(u => u.id === id ? { ...u, role } : u));
  };

  const toggleStatus = async (id: string) => {
    await fetch(`/api/admin/users/${id}/status`, { method: 'POST' });
    setUsers(users => users.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading users…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (filtered.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No users found.</div>;

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users…"
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
        aria-label="Search users"
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', color: tokens.colors.text[theme] }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ borderRadius: tokens.radius.xs }}>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <button onClick={() => toggleStatus(u.id)} style={{ background: u.active ? tokens.colors.success[theme] : tokens.colors.error[theme], color: tokens.colors.text[theme], border: 'none', borderRadius: tokens.radius.xs, padding: tokens.spacing.xs, cursor: 'pointer' }}>
                  {u.active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td>
                {/* Future: more actions */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 