import { NextApiRequest, NextApiResponse } from 'next';
import { getLintRules, setLintRules } from '../../utils/commitLinting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const rules = await getLintRules();
    res.status(200).json(rules);
  } else if (req.method === 'PUT') {
    const rules = await setLintRules(req.body);
    res.status(200).json(rules);
  } else {
    res.status(405).end();
  }
} 