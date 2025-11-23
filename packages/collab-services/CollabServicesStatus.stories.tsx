import React from 'react';
import { CollabServicesStatus } from './CollabServicesStatus';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Collab-services/CollabServices/CollabServicesStatus',
  component: CollabServicesStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof CollabServicesStatus>;

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
