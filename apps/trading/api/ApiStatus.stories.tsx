import React from 'react';
import { ApiStatus } from './ApiStatus';

export default {
  title: 'Trading/Api/ApiStatus',
  component: ApiStatus,
};

export const Active = () => <ApiStatus status="active" />;
export const Inactive = () => <ApiStatus status="inactive" />;
