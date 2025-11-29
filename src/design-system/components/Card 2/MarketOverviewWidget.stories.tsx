import React from 'react';
import MarketOverviewWidget from './MarketOverviewWidget';

export default {
  title: 'Dashboard Widgets/MarketOverviewWidget',
  component: MarketOverviewWidget,
  argTypes: {
    config: {
      control: 'object',
      description: 'Widget configuration (asset, timeframe, showAI, showSentiment)',
    },
    analyticsEvent: { control: 'text' },
    onDetails: { action: 'detailsClicked' },
  },
};

const Template = (args) => <MarketOverviewWidget {...args} />;

export const Default = Template.bind({});
Default.args = { config: { asset: 'BTC', timeframe: '1d', showAI: true, showSentiment: true } };

export const ETH1h = Template.bind({});
ETH1h.args = { config: { asset: 'ETH', timeframe: '1h', showAI: false, showSentiment: true } };

export const NoAI = Template.bind({});
NoAI.args = { config: { asset: 'BTC', timeframe: '1d', showAI: false, showSentiment: false } }; 