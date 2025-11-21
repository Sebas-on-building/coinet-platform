import React from 'react';
import { Skeleton } from './Skeleton';

export default {
  title: 'Design System/Skeleton',
  component: Skeleton,
};

export const Default = () => <Skeleton />;

export const Circle = () => <Skeleton variant="circle" width={48} height={48} />;

export const Text = () => <Skeleton variant="text" width={120} height={20} />;

export const CustomSize = () => <Skeleton width={200} height={32} />; 