import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StrategyOverview from '../components/strategy/StrategyOverview';
import StrategyList from '../components/strategy/StrategyList';
import StrategyEditor from '../components/strategy/StrategyEditor';
import StrategyBacktest from '../components/strategy/StrategyBacktest';
import StrategyMarketplace from '../components/strategy/StrategyMarketplace';
import StrategyHistory from '../components/strategy/StrategyHistory';

export const StrategyLabPage = () => (
  <Routes>
    <Route path="/" element={<StrategyOverview />} />
    <Route path="list/*" element={<StrategyList />} />
    <Route path="editor/*" element={<StrategyEditor />} />
    <Route path="backtest/*" element={<StrategyBacktest />} />
    <Route path="marketplace/*" element={<StrategyMarketplace />} />
    <Route path="history/*" element={<StrategyHistory />} />
    {/* Add more sub-feature routes as needed */}
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
); 