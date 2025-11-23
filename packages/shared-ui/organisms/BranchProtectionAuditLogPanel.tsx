import React, { useState } from 'react';
import { BranchProtectionAuditLogList } from '../molecules/BranchProtectionAuditLogList';

const mockEvents = [
  { id: '1', type: 'created', timestamp: new Date().toISOString(), details: 'Rule created' },
  { id: '2', type: 'rule-applied', timestamp: new Date().toISOString(), details: 'Rule applied to branch' },
  { id: '3', type: 'notification-sent', timestamp: new Date().toISOString(), details: 'Notification sent to Slack' },
];

export const BranchProtectionAuditLogPanel = () => {
  const [events] = useState(mockEvents);
  // TODO: Integrate with backend, add sub-sub-features (filter, search, export)
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Branch Protection Audit Logs</h3>
      <BranchProtectionAuditLogList events={events} />
      {/* Sub-sub-features: Filter, Search, Export, etc. */}
    </div>
  );
}; 