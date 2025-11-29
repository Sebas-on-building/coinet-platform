import React from 'react';
import { DashboardLayout, DashboardWidget } from './DashboardLayout';
import { Header } from '../organisms/Header';

export default {
  title: 'Templates/DashboardLayout',
  component: DashboardLayout,
  parameters: {
    docs: {
      description: {
        component: 'A world-class, multi-user, AI-powered dashboard layout with grid, drag, resize, grouping, undo/redo, widget templates, and more. Inspired by Apple, Canva, TradingView, Solana.'
      },
    },
  },
  argTypes: {},
};

const headerProps = {
  logo: <span style={{ fontWeight: 700, fontSize: 24 }}>Coinet</span>,
  navLinks: [
    { label: 'Dashboard', href: '#' },
    { label: 'Portfolio', href: '#' },
    { label: 'Settings', href: '#' },
  ],
  userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  notifications: 2,
  theme: 'light' as const,
};

const initialWidgets: DashboardWidget[] = [
  { id: 'w1', content: <div>Analytics</div>, x: 0, y: 0, w: 2, h: 2 },
  { id: 'w2', content: <div>News Feed</div>, x: 2, y: 0, w: 2, h: 2 },
  { id: 'w3', content: <div>Chart</div>, x: 0, y: 2, w: 4, h: 2 },
];

export const Default = () => (
  <DashboardLayout headerProps={headerProps} sidebar={<div>Sidebar</div>} initialWidgets={initialWidgets} />
);

export const WithCollaboration = () => (
  <DashboardLayout headerProps={headerProps} sidebar={<div>Sidebar</div>} initialWidgets={initialWidgets} />
);

export const WithWidgetTemplates = () => (
  <DashboardLayout headerProps={headerProps} sidebar={<div>Sidebar</div>} initialWidgets={initialWidgets} />
);

export const WithAISuggestion = () => (
  <DashboardLayout headerProps={headerProps} sidebar={<div>Sidebar</div>} initialWidgets={initialWidgets} />
);

export const AllFeatures = () => (
  <DashboardLayout headerProps={headerProps} sidebar={<div>Sidebar</div>} initialWidgets={initialWidgets} />
); 