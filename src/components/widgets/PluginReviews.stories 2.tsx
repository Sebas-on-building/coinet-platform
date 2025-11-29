import React from 'react';
import { PluginReviews } from './PluginReviews';

export default {
  title: 'Widgets/PluginReviews',
  component: PluginReviews,
  argTypes: {
    pluginKey: { control: 'text' },
  },
};

const Template = (args: any) => <PluginReviews {...args} />;

export const Default = Template.bind({});
Default.args = {
  pluginKey: 'chart-ai',
}; 