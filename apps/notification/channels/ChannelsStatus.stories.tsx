import React from 'react';
import { ChannelsStatus } from './ChannelsStatus';

export default {
  title: 'Notification/Channels/ChannelsStatus',
  component: ChannelsStatus,
};

export const Active = () => <ChannelsStatus status="active" />;
export const Inactive = () => <ChannelsStatus status="inactive" />;
