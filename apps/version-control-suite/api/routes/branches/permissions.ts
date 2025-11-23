import { NextApiRequest, NextApiResponse } from 'next';
import { getBranchPermissions, setBranchPermissions } from '../../utils/git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { branch } = req.query;
  if (req.method === 'GET') {
    const permissions = await getBranchPermissions(branch as string);
    res.status(200).json(permissions);
  } else if (req.method === 'PUT') {
    const permissions = await setBranchPermissions(branch as string, req.body);
    res.status(200).json(permissions);
  } else {
    res.status(405).end();
  }
} 