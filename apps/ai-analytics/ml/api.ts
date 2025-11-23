import { Router } from 'express';
import { MlService } from './service';
const router = Router();
const mlService = new MlService();

router.post('/train', async (req, res) => {
  try {
    const event = await mlService.trainModel(req.body);
    res.status(200).json({ status: 'trained', event });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
