import { Request, Response } from 'express';

export const enableNotification = (req: Request, res: Response) => {
  // TODO: Enable notification for branch protection event
  res.status(200).json({ enabled: true });
};

export const disableNotification = (req: Request, res: Response) => {
  // TODO: Disable notification for branch protection event
  res.status(200).json({ enabled: false });
};

export const listNotifications = (req: Request, res: Response) => {
  // TODO: List all notifications for branch protection
  res.json([]);
}; 