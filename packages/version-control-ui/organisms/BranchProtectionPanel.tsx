import React from 'react';
import { ProtectionRulesPanel } from '../molecules/ProtectionRulesPanel';

export function BranchProtectionPanel() {
  return (
    <div className="flex flex-col gap-6">
      <ProtectionRulesPanel />
      {/* More sub-feature panels coming soon */}
    </div>
  );
} 