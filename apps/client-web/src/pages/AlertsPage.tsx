import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AlertsOverview from '../components/alerts/AlertsOverview';
import AlertsList from '../components/alerts/AlertsList';
import AlertsSettings from '../components/alerts/AlertsSettings';
import AlertsHistory from '../components/alerts/AlertsHistory';
import AlertsAnalytics from '../components/alerts/AlertsAnalytics';

export const AlertsPage = () => (
  <Routes>
    <Route path="/" element={<AlertsOverview />} />
    <Route path="list/*" element={<AlertsList />} />
    <Route path="settings/*" element={<AlertsSettings />} />
    <Route path="history/*" element={<AlertsHistory />} />
    <Route path="analytics/*" element={<AlertsAnalytics />} />
    {/* Add more sub-feature routes as needed */}
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
); 