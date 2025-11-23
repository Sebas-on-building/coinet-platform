import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Temporary stub for VideoOverview
const VideoOverview = () => <div>Video Overview (stub)</div>;
// Temporary stubs for sub-features
const VideoPlayer = () => <div>Video Player (stub)</div>;
const VideoAnalytics = () => <div>Video Analytics (stub)</div>;
const VideoCollab = () => <div>Video Collab (stub)</div>;
const VideoAI = () => <div>Video AI (stub)</div>;
const VideoNotifications = () => <div>Video Notifications (stub)</div>;
const VideoPluginPanel = () => <div>Video Plugin Panel (stub)</div>;
const VideoSidebar = () => <div>Video Sidebar (stub)</div>;

export const VideoPage = () => (
  <Routes>
    <Route path="/" element={<VideoOverview />} />
    <Route path="player/*" element={<VideoPlayer />} />
    <Route path="analytics/*" element={<VideoAnalytics />} />
    <Route path="collab/*" element={<VideoCollab />} />
    <Route path="ai/*" element={<VideoAI />} />
    <Route path="notifications/*" element={<VideoNotifications />} />
    <Route path="plugin-panel/*" element={<VideoPluginPanel />} />
    <Route path="sidebar/*" element={<VideoSidebar />} />
    {/* Add more sub-feature routes as needed */}
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
); 