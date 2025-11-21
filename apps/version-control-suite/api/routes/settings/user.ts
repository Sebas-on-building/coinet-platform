import { NextApiRequest, NextApiResponse } from 'next';
import { getUserSettings, setUserSettings } from '../../utils/settings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const settings = await getUserSettings();
    res.status(200).json(settings);
  } else if (req.method === 'PUT') {
    const settings = await setUserSettings(req.body);
    res.status(200).json(settings);
  } else {
    res.status(405).end();
  }
} 