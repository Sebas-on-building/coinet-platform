import React from 'react';
import { Skeleton } from '../ui/Skeleton/Skeleton';

const PortfolioHistory = ({ assets }: { assets: any[] }) => {
  // ... logic for displaying history ...
  return <div>History (Timeline, Transactions, Export)</div>;
};

PortfolioHistory.Skeleton = () => <Skeleton variant="table" height={80} />;

export default PortfolioHistory; 