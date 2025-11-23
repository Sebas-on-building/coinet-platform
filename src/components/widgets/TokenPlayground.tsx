import React, { useState } from 'react';
import { useDesignSystem } from '@/components/design-system/DesignSystemProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher';
import { TokenAudit } from './TokenAudit';
import { TokenExport } from './TokenExport';

// TODO: Extract each sub-feature into its own atomic component for maintainability and testability
export const TokenPlayground: React.FC = () => {
  const { tokens, theme, setTheme } = useDesignSystem();
  const [editToken, setEditToken] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<string[]>([]);
  // Simulate Figma sync
  const [figmaSynced, setFigmaSynced] = useState(false);

  const handleEdit = (token: string, value: string) => {
    setEditToken(token);
    setEditValue(value);
    setShowModal(true);
  };
  const handleSave = () => {
    setHistory(h => [...h, { ...tokens }]);
    // TODO: Actually update tokens in context or via API
    setAuditLog(log => [...log, `Edited ${editToken} to ${editValue} (${new Date().toLocaleTimeString()})`]);
    setShowModal(false);
  };
  const handleRollback = () => {
    if (history.length) {
      // TODO: Actually restore tokens in context or via API
      setAuditLog(log => [...log, `Rolled back to previous version (${new Date().toLocaleTimeString()})`]);
    }
  };
  const handleFigmaSync = () => {
    setFigmaSynced(true);
    setTimeout(() => setFigmaSynced(false), 2000);
    setAuditLog(log => [...log, `Figma sync at ${new Date().toLocaleTimeString()}`]);
  };
  // TODO: Add audit (contrast, naming, usage)
  // TODO: Add export to CSS/JSON
  // TODO: Add versioning/history UI
  // TODO: Add extensibility for future features
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 16 }}>🎨 Token Playground</h2>
      <ThemeSwitcher />
      <Button onClick={handleFigmaSync} style={{ margin: '16px 0' }}>
        {figmaSynced ? '✅ Figma Synced!' : 'Sync with Figma'}
      </Button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '24px 0' }}>
        {Object.entries(tokens).map(([group, values]) => (
          <div key={group} style={{ minWidth: 180, background: '#f3f4f6', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontWeight: 600, fontSize: 18 }}>{group}</h4>
            {typeof values === 'object' && values !== null && Object.entries(values).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{key}:</span>
                <span style={{ fontWeight: 500 }}>{String(value)}</span>
                <Button size="sm" onClick={() => handleEdit(`${group}.${key}`, String(value))}>Edit</Button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <TokenAudit tokens={tokens} />
      <TokenExport tokens={tokens} />
      <Button onClick={handleRollback} style={{ marginRight: 12 }}>Rollback</Button>
      <Button onClick={() => setAuditLog([])} variant="secondary">Clear Audit Log</Button>
      <h3 style={{ marginTop: 32, fontWeight: 600 }}>Audit Log</h3>
      <ul style={{ background: '#f9fafb', borderRadius: 8, padding: 16, minHeight: 80 }}>
        {auditLog.map((log, i) => <li key={i} style={{ fontSize: 13 }}>{log}</li>)}
      </ul>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Edit Token: ${editToken}`}>
        <label htmlFor="edit-token-value" style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Value</label>
        <Input id="edit-token-value" value={editValue} onChange={e => setEditValue(e.target.value)} />
        <Button onClick={handleSave} style={{ marginTop: 16 }}>Save</Button>
      </Modal>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 