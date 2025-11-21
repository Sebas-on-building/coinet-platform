import React from 'react';
import { LlmStatus } from './LlmStatus';

export default {
  title: 'Ai-analytics/Llm/LlmStatus',
  component: LlmStatus,
};

export const Active = () => <LlmStatus status="active" />;
export const Inactive = () => <LlmStatus status="inactive" />;
