import { NextApiRequest, NextApiResponse } from 'next';
import { getReviewDashboard } from '../../utils/codeReview';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const dashboard = await getReviewDashboard();
    res.status(200).json(dashboard);
  } else {
    res.status(405).end();
  }
} 