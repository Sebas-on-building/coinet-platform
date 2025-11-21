import React, { useState } from 'react';
import { BranchProtectionNotificationSettings } from '../molecules/BranchProtectionNotificationSettings';

export const BranchProtectionNotificationPanel = () => {
  const [enabled, setEnabled] = useState(false);
  // TODO: Integrate with backend, add sub-sub-features (channels, audit logs)
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Branch Protection Notifications</h3>
      <BranchProtectionNotificationSettings enabled={enabled} onToggle={() => setEnabled(e => !e)} />
      {/* Sub-sub-features: NotificationChannels, AuditLogs, etc. */}
    </div>
  );
}; 