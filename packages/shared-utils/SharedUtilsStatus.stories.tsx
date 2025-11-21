import { SharedUtilsStatus } from './SharedUtilsStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Shared-utils/SharedUtils/SharedUtilsStatus',
  component: SharedUtilsStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof SharedUtilsStatus>;

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
