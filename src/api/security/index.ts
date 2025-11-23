import { exec } from 'child_process';
import { logSecurityEvent } from '../../middleware/logging';

export async function getAudit(req, res) {
  exec('npm audit --json', (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Audit failed' });
    const result = JSON.parse(stdout);
    res.json(result.metadata.vulnerabilities);
  });
}

export async function getDependencies(req, res) {
  exec('ncu --jsonUpgradable', (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Dependency check failed' });
    const result = JSON.parse(stdout);
    res.json(Object.entries(result).map(([name, version]) => ({ name, status: `Upgrade available: ${version}` })));
  });
}

export async function getLogs(req, res) {
  res.json([
    { event: 'auth_failure', timestamp: new Date().toISOString() },
    { event: 'rate_limit', timestamp: new Date().toISOString() },
  ]);
} 