import React from 'react';
import NewsFeedWidget from './NewsFeedWidget';

export default {
  title: 'Dashboard Widgets/NewsFeedWidget',
  component: NewsFeedWidget,
  argTypes: {
    config: {
      control: 'object',
      description: 'Widget configuration (source, timeframe)',
    },
    analyticsEvent: { control: 'text' },
  },
};

const Template = (args) => <NewsFeedWidget {...args} />;

export const Default = Template.bind({});
Default.args = { config: { source: 'CryptoPanic', timeframe: '7d' } };

export const Twitter24h = Template.bind({});
Twitter24h.args = { config: { source: 'Twitter', timeframe: '24h' } }; 