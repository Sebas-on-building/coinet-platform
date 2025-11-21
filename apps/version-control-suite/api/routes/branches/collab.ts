import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchComments, addBranchComment } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { branch } = req.query;
  if (req.method === 'GET') {
    const comments = await getBranchComments(branch as string);
    res.status(200).json(comments);
  } else if (req.method === 'POST') {
    const comment = await addBranchComment(branch as string, req.body);
    res.status(201).json(comment);
  } else {
    res.status(405).end();
  }
} 