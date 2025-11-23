import React from 'react';
import { EventsStatus } from './EventsStatus';

export default {
  title: 'Market-intelligence/Events/EventsStatus',
  component: EventsStatus,
};

export const Active = () => <EventsStatus status="active" />;
export const Inactive = () => <EventsStatus status="inactive" />;
