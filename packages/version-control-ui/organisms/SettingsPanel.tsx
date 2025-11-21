import React from 'react';
import { UserPreferencesPanel } from '../molecules/UserPreferencesPanel';

export function SettingsPanel() {
  return (
    <div className="flex flex-col gap-6">
      <UserPreferencesPanel />
      {/* More sub-feature panels coming soon */}
    </div>
  );
} 