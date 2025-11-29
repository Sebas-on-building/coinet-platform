import React from 'react';
import { Input } from './Input';

export default {
  title: 'Design System/Input',
  component: Input,
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    error: { control: 'boolean' },
    iconLeft: { control: 'text' },
    iconRight: { control: 'text' },
    fullWidth: { control: 'boolean' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
  },
};

const Template = (args) => <Input {...args} />;

export const Default = Template.bind({});
Default.args = { placeholder: 'Enter text...' };

export const WithLeftIcon = Template.bind({});
WithLeftIcon.args = { placeholder: 'With left icon', iconLeft: <span>🔍</span> };

export const WithRightIcon = Template.bind({});
WithRightIcon.args = { placeholder: 'With right icon', iconRight: <span>✅</span> };

export const Disabled = Template.bind({});
Disabled.args = { placeholder: 'Disabled', disabled: true };

export const Error = Template.bind({});
Error.args = { placeholder: 'Error state', error: true };

export const AllSizes = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Input size="xs" placeholder="XS" />
    <Input size="sm" placeholder="SM" />
    <Input size="md" placeholder="MD" />
    <Input size="lg" placeholder="LG" />
  </div>
); 