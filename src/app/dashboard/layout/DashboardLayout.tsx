import React from 'react';
import { DashboardThemeProvider } from '../DashboardThemeProvider';
import Sidebar from './Sidebar';
import Header from './Header';
import WidgetArea from './WidgetArea';
import { CollaborationProvider } from '@/contexts/CollaborationProvider';

// =========================
// Main Dashboard Layout
// =========================
const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // Divine: In real app, get roomId and user from auth/session
  const roomId = 'coinnet-dashboard-main';
  const user = {
    id: 'user-1',
    name: 'Steve Jobs',
    avatarUrl: undefined,
    color: '#10b981',
  };
  return (
    <CollaborationProvider roomId={roomId} user={user}>
      <DashboardThemeProvider>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dashboard-bg)' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Header />
            <WidgetArea />
          </div>
        </div>
      </DashboardThemeProvider>
    </CollaborationProvider>
  );
};

export default DashboardLayout; 