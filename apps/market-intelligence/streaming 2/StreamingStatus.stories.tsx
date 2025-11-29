import React from 'react';
import { StreamingStatus } from './StreamingStatus';

export default {
  title: 'Market-intelligence/Streaming/StreamingStatus',
  component: StreamingStatus,
};

export const Active = () => <StreamingStatus status="active" />;
export const Inactive = () => <StreamingStatus status="inactive" />;
