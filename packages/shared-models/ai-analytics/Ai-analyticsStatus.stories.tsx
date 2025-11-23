import { AiAnalyticsStatus } from './AiAnalyticsStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Shared-models/AiAnalytics/AiAnalyticsStatus',
  component: AiAnalyticsStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof AiAnalyticsStatus>;

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
