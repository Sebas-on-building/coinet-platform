import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { useTheme } from '@/contexts/ThemeContext';

export default function SecurityDashboard() {
  const { tokens } = useTheme();
  const [audit, setAudit] = useState([]);
  const [deps, setDeps] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/security/audit').then(r => r.json()).then(setAudit);
    fetch('/api/security/dependencies').then(r => r.json()).then(setDeps);
    fetch('/api/security/logs').then(r => r.json()).then(setLogs);
    // Real-time updates via WebSocket (stub)
    // const ws = new WebSocket('wss://api.coinet.com/security');
    // ws.onmessage = (e) => { /* handle event */ };
    // return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 32, display: 'grid', gap: 32 }}>
      <Card>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Security Audit</h2>
        <ul>{audit.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </Card>
      <Card>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Dependency Health</h2>
        <ul>{deps.map((dep, i) => <li key={i}>{dep.name}: {dep.status}</li>)}</ul>
      </Card>
      <Card>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Security Logs</h2>
        <ul>{logs.map((log, i) => <li key={i}>{log.event} - {log.timestamp}</li>)}</ul>
      </Card>
    </div>
  );
} 