import React from 'react';
import { AIExplainability } from './AIExplainability';

export default {
  title: 'Widgets/AIExplainability',
  component: AIExplainability,
  argTypes: {
    answer: { control: 'text' },
  },
};

const Template = (args: any) => <AIExplainability {...args} />;

export const Default = Template.bind({});
Default.args = {
  answer: 'This is an AI-generated answer.',
}; 