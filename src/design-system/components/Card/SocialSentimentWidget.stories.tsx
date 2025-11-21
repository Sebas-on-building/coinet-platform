import React from 'react';
import SocialSentimentWidget from './SocialSentimentWidget';

export default {
  title: 'Dashboard Widgets/SocialSentimentWidget',
  component: SocialSentimentWidget,
  argTypes: {
    config: {
      control: 'object',
      description: 'Widget configuration (platform, metric, timeframe)',
    },
    analyticsEvent: { control: 'text' },
  },
};

const Template = (args) => <SocialSentimentWidget {...args} />;

export const Default = Template.bind({});
Default.args = { config: { platform: 'Twitter', metric: 'sentiment', timeframe: '7d' } };

export const Reddit30d = Template.bind({});
Reddit30d.args = { config: { platform: 'Reddit', metric: 'mentions', timeframe: '30d' } }; 