import { PluginSdkStatus } from './PluginSdkStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Plugin-sdk/PluginSdk/PluginSdkStatus',
  component: PluginSdkStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof PluginSdkStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const Inactive: Story = {
  args: {
    status: "inactive",
  },
};
