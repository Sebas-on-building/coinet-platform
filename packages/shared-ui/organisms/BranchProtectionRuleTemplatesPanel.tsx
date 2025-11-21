import React, { useState } from 'react';
import { BranchProtectionRuleTemplateSelector } from '../molecules/BranchProtectionRuleTemplateSelector';

export const BranchProtectionRuleTemplatesPanel = () => {
  const [selected, setSelected] = useState<string[]>([]);
  // TODO: Integrate with backend, add sub-sub-features (custom config, audit logs)
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Branch Protection Rule Templates</h3>
      <BranchProtectionRuleTemplateSelector
        selected={selected}
        onSelect={type => setSelected(sel => sel.includes(type) ? sel.filter(t => t !== type) : [...sel, type])}
      />
      {/* Sub-sub-features: CustomRuleConfig, AuditLogs, etc. */}
    </div>
  );
}; 