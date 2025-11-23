import express from 'express';
const router = express.Router();

router.get('/ai-insights', async (req, res) => {
  const { videoId } = req.query;
  // Example: Return mock AI insights
  res.json([
    { type: 'Scene Change', value: '00:01:23' },
    { type: 'Object Detected', value: 'Car at 00:02:10' },
    { type: 'Sentiment', value: 'Positive at 00:03:45' }
  ]);
});

export default router; 