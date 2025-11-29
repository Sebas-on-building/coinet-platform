import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchTemplates, addBranchTemplate } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const templates = await getBranchTemplates();
    res.status(200).json(templates);
  } else if (req.method === 'POST') {
    const template = await addBranchTemplate(req.body);
    res.status(201).json(template);
  } else {
    res.status(405).end();
  }
} 