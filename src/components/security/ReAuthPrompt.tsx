import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const ReAuthPrompt = ({ onReAuth }: { onReAuth: () => void }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Card style={{ padding: 'var(--spacing-xl)', minWidth: 320, textAlign: 'center' }}>
      <h2>Session Expired</h2>
      <p>For your security, please re-authenticate to continue.</p>
      <Button variant="primary" size="lg" onClick={onReAuth}>Re-Authenticate</Button>
    </Card>
  </div>
);

export default ReAuthPrompt; 