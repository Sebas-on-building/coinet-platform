import React from 'react';
import AIInsightsWidget from './AIInsightsWidget';

export default {
  title: 'Dashboard Widgets/AIInsightsWidget',
  component: AIInsightsWidget,
  argTypes: {
    config: {
      control: 'object',
      description: 'Widget configuration (asset, focusArea, insightType, timeframe)',
    },
    analyticsEvent: { control: 'text' },
  },
};

const Template = (args) => <AIInsightsWidget {...args} />;

export const Default = Template.bind({});
Default.args = { config: { asset: 'BTC', focusArea: 'risk', insightType: 'trend', timeframe: '7d' } };

export const ETH30d = Template.bind({});
ETH30d.args = { config: { asset: 'ETH', focusArea: 'alpha', insightType: 'prediction', timeframe: '30d' } }; 