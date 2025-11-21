import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchInsights } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { branch } = req.query;
  if (req.method === 'GET') {
    const insights = await getBranchInsights(branch as string);
    res.status(200).json(insights);
  } else {
    res.status(405).end();
  }
} 