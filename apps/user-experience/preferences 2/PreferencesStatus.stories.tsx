import React from 'react';
import { PreferencesStatus } from './PreferencesStatus';

export default {
  title: 'User-experience/Preferences/PreferencesStatus',
  component: PreferencesStatus,
};

export const Active = () => <PreferencesStatus status="active" />;
export const Inactive = () => <PreferencesStatus status="inactive" />;
