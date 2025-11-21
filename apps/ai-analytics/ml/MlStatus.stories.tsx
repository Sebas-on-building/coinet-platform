import React from 'react';
import { MlStatus } from './MlStatus';

export default {
  title: 'AI Analytics/ML/MlStatus',
  component: MlStatus,
};

export const Trained = () => <MlStatus status="trained" metrics={{ accuracy: 0.98, loss: 0.02 }} />;
export const Idle = () => <MlStatus status="idle" />;
