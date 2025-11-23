import React from 'react';
import { LintRulesPanel } from '../molecules/LintRulesPanel';

export function CommitLintingPanel() {
  return (
    <div className="flex flex-col gap-6">
      <LintRulesPanel />
      {/* More sub-feature panels coming soon */}
    </div>
  );
} 