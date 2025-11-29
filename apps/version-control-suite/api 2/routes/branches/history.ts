import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchHistory } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { branch } = req.query;
  if (req.method === 'GET') {
    const history = await getBranchHistory(branch as string);
    res.status(200).json(history);
  } else {
    res.status(405).end();
  }
} 