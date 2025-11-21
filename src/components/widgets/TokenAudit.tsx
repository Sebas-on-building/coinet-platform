import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { TokenContrastCheck } from './TokenContrastCheck';
import { TokenNamingCheck } from './TokenNamingCheck';
import { TokenUsageCheck } from './TokenUsageCheck';
import { TokenVersioningService, AuditLogEntry, TokenVersion } from '@/services/tokenVersioning';
import { Button } from '@/components/ui/Button';

// TODO: Extract sub-features (contrast check, naming check, usage check) into atomic components
export const TokenAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [diff, setDiff] = useState<any>(null);

  useEffect(() => {
    // Load audit log
    setLogs(TokenVersioningService.getHistory().map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      user: v.user,
      action: v.action,
      details: v.diff,
    })));
  }, []);

  const handleSelect = (id: string) => {
    const entry = TokenVersioningService.getHistory().find(v => v.id === id);
    setSelected(entry ? { id: entry.id, timestamp: entry.timestamp, user: entry.user, action: entry.action, details: entry.diff } : null);
    setDiff(entry?.diff || null);
  };

  const handleFilter = (user: string, action: string) => {
    setLogs(TokenVersioningService.getHistory().filter(v =>
      (!user || v.user.includes(user)) && (!action || v.action.includes(action))
    ).map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      user: v.user,
      action: v.action,
      details: v.diff,
    })));
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32, background: 'var(--color-surface)', borderRadius: 24, boxShadow: 'var(--shadow-xl)' }}>
      <h2 style={{ fontWeight: 800, fontSize: 28, marginBottom: 16, letterSpacing: -1 }}>🕵️‍♂️ Token Audit Log</h2>
      <FilterControls onFilter={handleFilter} />
      <AuditLogTable logs={logs} onSelect={handleSelect} />
      {selected && (
        <div style={{ marginTop: 32 }}>
          <h4 style={{ fontWeight: 700, fontSize: 20 }}>Diff for Version {selected.id}</h4>
          <DiffViewer diff={diff} />
        </div>
      )}
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
};

// --- Audit Log Table ---
const AuditLogTable: React.FC<{ logs: AuditLogEntry[]; onSelect: (id: string) => void }> = ({ logs, onSelect }) => (
  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'var(--color-surface)', borderRadius: 16, boxShadow: 'var(--shadow-md)' }}>
    <thead style={{ background: 'var(--color-surface-alt)' }}>
      <tr>
        <th style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>User</th>
        <th style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>Action</th>
        <th style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>Timestamp</th>
        <th style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>Details</th>
        <th style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>Rollback</th>
      </tr>
    </thead>
    <tbody>
      {logs.map(log => (
        <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td style={{ padding: 10 }}>{log.user}</td>
          <td style={{ padding: 10 }}>{log.action}</td>
          <td style={{ padding: 10 }}>{new Date(log.timestamp).toLocaleString()}</td>
          <td style={{ padding: 10 }}><Button size="sm" onClick={() => onSelect(log.id)}>View</Button></td>
          <td style={{ padding: 10 }}><Button size="sm" variant="danger" onClick={() => TokenVersioningService.rollback(log.id)}>Rollback</Button></td>
        </tr>
      ))}
    </tbody>
  </table>
);

// --- Diff Viewer ---
const DiffViewer: React.FC<{ diff: any }> = ({ diff }) => (
  <pre style={{ background: '#f3f4f6', borderRadius: 8, padding: 16, fontSize: 13, color: '#334155', overflowX: 'auto' }}>{JSON.stringify(diff, null, 2)}</pre>
);

// --- Filter Controls ---
const FilterControls: React.FC<{ onFilter: (user: string, action: string) => void }> = ({ onFilter }) => {
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <input placeholder="User" value={user} onChange={e => setUser(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
      <input placeholder="Action" value={action} onChange={e => setAction(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
      <Button onClick={() => onFilter(user, action)} size="sm">Filter</Button>
    </div>
  );
}; 