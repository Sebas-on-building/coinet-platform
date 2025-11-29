import React from 'react';
import { ComponentsStatus } from './ComponentsStatus';

export default {
  title: 'Client-web/Components/ComponentsStatus',
  component: ComponentsStatus,
};

export const Active = () => <ComponentsStatus status="active" />;
export const Inactive = () => <ComponentsStatus status="inactive" />;
