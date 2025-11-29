import React, { useState } from 'react';
import { BranchProtectionSettings } from '../molecules/BranchProtectionSettings';

export const BranchProtectionPanel = () => {
  const [level, setLevel] = useState<'none' | 'basic' | 'strict' | 'custom'>('none');
  // TODO: Integrate with backend, add sub-features (rule templates, notifications, audit logs)
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Branch Protection</h2>
      <BranchProtectionSettings level={level} onChange={setLevel} />
      {/* Sub-features: RuleTemplates, Notifications, AuditLogs, etc. */}
    </div>
  );
}; 