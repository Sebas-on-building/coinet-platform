import React from 'react';
import { BranchProtectionNotificationBadge } from '../atoms/BranchProtectionNotificationBadge';

export const BranchProtectionNotificationSettings = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <div className="flex items-center gap-4">
    <BranchProtectionNotificationBadge enabled={enabled} />
    <button onClick={onToggle} className="border rounded px-2 py-1">
      {enabled ? 'Disable' : 'Enable'} Notifications
    </button>
  </div>
); 