import { NextApiRequest, NextApiResponse } from 'next';
import { getPullRequests, createPullRequest } from '../../utils/pullRequests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const prs = await getPullRequests();
    res.status(200).json(prs);
  } else if (req.method === 'POST') {
    const pr = await createPullRequest(req.body);
    res.status(201).json(pr);
  } else {
    res.status(405).end();
  }
} 