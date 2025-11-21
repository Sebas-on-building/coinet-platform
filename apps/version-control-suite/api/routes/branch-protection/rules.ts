import { NextApiRequest, NextApiResponse } from 'next';
import { getProtectionRules, setProtectionRules } from '../../utils/branchProtection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rules = await getProtectionRules();
    res.status(200).json(rules);
  } else if (req.method === 'PUT') {
    const rules = await setProtectionRules(req.body);
    res.status(200).json(rules);
  } else {
    res.status(405).end();
  }
} 