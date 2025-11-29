import { useEffect } from 'react';

export function usePluginSDK(registerWidget, registerAnalytics, registerDataSource) {
  useEffect(() => {
    window.CoinetDashboard = window.CoinetDashboard || {};
    window.CoinetDashboard.registerWidget = registerWidget;
    window.CoinetDashboard.registerAnalytics = registerAnalytics;
    window.CoinetDashboard.registerDataSource = registerDataSource;
  }, [registerWidget, registerAnalytics, registerDataSource]);
} 