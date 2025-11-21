import { Request, Response } from 'express';

export const listTemplates = (req: Request, res: Response) => {
  // TODO: List all available rule templates
  res.json([
    { type: 'review', label: 'Required Review' },
    { type: 'status-check', label: 'Status Checks' },
    { type: 'commit-lint', label: 'Commit Linting' },
    { type: 'custom', label: 'Custom Rule' },
  ]);
};

export const enableTemplate = (req: Request, res: Response) => {
  // TODO: Enable a rule template for a branch
  res.status(200).json({ enabled: true });
};

export const disableTemplate = (req: Request, res: Response) => {
  // TODO: Disable a rule template for a branch
  res.status(200).json({ enabled: false });
};

export const configureTemplate = (req: Request, res: Response) => {
  // TODO: Configure a rule template (e.g. custom settings)
  res.status(200).json({ configured: true });
}; 