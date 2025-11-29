import React from 'react';
import { PortfolioWidget } from './PortfolioWidget';

export default {
  title: 'Dashboard Widgets/PortfolioWidget',
  component: PortfolioWidget,
  argTypes: {
    analyticsEvent: { control: 'text' },
  },
};

const Template = (args) => <PortfolioWidget {...args} />;

export const Default = Template.bind({});
Default.args = { analyticsEvent: 'portfolio_widget_default' }; 