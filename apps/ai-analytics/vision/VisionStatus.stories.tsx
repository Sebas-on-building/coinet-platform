import React from 'react';
import { VisionStatus } from './VisionStatus';

export default {
  title: 'Ai-analytics/Vision/VisionStatus',
  component: VisionStatus,
};

export const Active = () => <VisionStatus status="active" />;
export const Inactive = () => <VisionStatus status="inactive" />;
