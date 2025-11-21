import React from 'react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/state/store';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthGate from '@/components/auth/AuthGate';
import Layout from '@/components/layout/Layout';
import Notifications from '@/components/notifications/Notifications';
import DashboardPage from '@/pages/DashboardPage';
import ChartPage from '@/pages/ChartPage';
import PortfolioPage from '@/pages/PortfolioPage';
import StrategyLabPage from '@/pages/StrategyLabPage';
import AlertsPage from '@/pages/AlertsPage';
import VideoPage from '@/components/video/VideoPage';

const App = () => (
  <ThemeProvider>
    <ReduxProvider store={store}>
      <Router>
        <AuthGate>
          <Layout>
            <Notifications />
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/charts/:symbol" element={<ChartPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/strategy" element={<StrategyLabPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/video/*" element={<VideoPage />} />
              {/* Infinite expansion: add more routes here */}
            </Routes>
          </Layout>
        </AuthGate>
      </Router>
    </ReduxProvider>
  </ThemeProvider>
);

export default App; 