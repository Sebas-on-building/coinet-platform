import React from 'react';
import { BranchingPanel } from './BranchingPanel';
import { PullRequestsPanel } from '../molecules/PullRequestsPanel';
import { CodeReviewPanel } from '../molecules/CodeReviewPanel';
import { CommitLintingPanel } from '../molecules/CommitLintingPanel';
import { BranchProtectionPanel } from '../molecules/BranchProtectionPanel';
import { SettingsPanel } from '../molecules/SettingsPanel';

export function VersionControlDashboard() {
  return (
    <div style={{ padding: '48px 32px', maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Version Control Suite</h1>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* User avatar, notifications, settings */}
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 }}>U</div>
        </div>
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Branching</h2>
          <BranchingPanel />
        </section>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Pull Requests</h2>
          <PullRequestsPanel />
        </section>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Code Review</h2>
          <CodeReviewPanel />
        </section>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Commit Linting</h2>
          <CommitLintingPanel />
        </section>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Branch Protection</h2>
          <BranchProtectionPanel />
        </section>
        <section style={{ background: 'rgba(30,34,90,0.85)', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Settings</h2>
          <SettingsPanel />
        </section>
      </main>
    </div>
  );
} 