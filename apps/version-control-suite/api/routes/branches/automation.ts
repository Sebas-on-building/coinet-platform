import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchAutomation, setBranchAutomation } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { branch } = req.query;
  if (req.method === 'GET') {
    const automation = await getBranchAutomation(branch as string);
    res.status(200).json(automation);
  } else if (req.method === 'PUT') {
    const automation = await setBranchAutomation(branch as string, req.body);
    res.status(200).json(automation);
  } else {
    res.status(405).end();
  }
} 