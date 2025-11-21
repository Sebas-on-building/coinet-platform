import { ClientMobileStatus } from './ClientMobileStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Client-mobile/ClientMobile/ClientMobileStatus',
  component: ClientMobileStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof ClientMobileStatus>;

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
