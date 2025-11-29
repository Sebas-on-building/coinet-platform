import React from 'react';
import DashboardLayout from './layout/DashboardLayout';
// =========================
// Dashboard Root Entry Point
// =========================
const DashboardRoot: React.FC = () => {
  return (
    <DashboardLayout>
      {/* Widgets will be rendered here by WidgetArea */}
    </DashboardLayout>
  );
};

export default DashboardRoot; 