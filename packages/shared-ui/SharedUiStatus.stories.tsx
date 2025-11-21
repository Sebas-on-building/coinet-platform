import { SharedUiStatus } from './SharedUiStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Shared-ui/SharedUi/SharedUiStatus',
  component: SharedUiStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof SharedUiStatus>;

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
