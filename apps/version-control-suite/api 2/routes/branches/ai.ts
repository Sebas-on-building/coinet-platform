import { NextApiRequest, NextApiResponse } from 'next';
import { getAISuggestion } from '../../utils/ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { branch, question } = req.body;
    const suggestion = await getAISuggestion(branch, question);
    res.status(200).json({ suggestion });
  } else {
    res.status(405).end();
  }
} 