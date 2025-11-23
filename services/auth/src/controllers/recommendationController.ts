import { Request, Response } from 'express';

export async function getRecommendations(req: Request, res: Response) {
  // Use analytics, onboarding, and badge data to generate recommendations
  // Example: recommend setting up 2FA, exploring dashboard, etc.
  const recommendations = [
    { action: 'Set up 2FA', link: '/onboarding/security' },
    { action: 'Explore the dashboard', link: '/dashboard' }
  ];
  res.json({ recommendations });
} 