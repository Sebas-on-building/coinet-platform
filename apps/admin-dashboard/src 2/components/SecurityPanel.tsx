import React, { useEffect, useState } from 'react';
import axios from 'axios';

export const SecurityPanel = () => {
  const [roles, setRoles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sso, setSSO] = useState([]);
  const [twoFA, setTwoFA] = useState(true);

  useEffect(() => {
    // Replace with real API calls
    setRoles([
      { name: 'admin', permissions: ['*'] },
      { name: 'operator', permissions: ['view', 'restart', 'view_logs'] },
      { name: 'viewer', permissions: ['view'] }
    ]);
    setLogs([
      { id: 1, action: 'restart_node', user: 'alice', timestamp: Date.now() },
      { id: 2, action: 'add_plugin', user: 'bob', timestamp: Date.now() }
    ]);
    setSSO(['Google', 'GitHub', 'Apple']);
    setTwoFA(true);
  }, []);

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Security</h2>
      <div>
        <strong>RBAC Roles:</strong>
        <ul>
          {roles.map((r, i) => (
            <li key={i}>{r.name}: {r.permissions.join(', ')}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 16 }}>
        <strong>Audit Logs:</strong>
        <ul>
          {logs.map((l, i) => (
            <li key={i}>{l.action} by {l.user} at {new Date(l.timestamp).toLocaleString()}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 16 }}>
        <strong>SSO Providers:</strong> {sso.join(', ')}
      </div>
      <div style={{ marginTop: 16 }}>
        <strong>2FA Enabled:</strong> {twoFA ? 'Yes' : 'No'}
      </div>
    </div>
  );
}; 