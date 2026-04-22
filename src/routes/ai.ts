import express from 'express';
import { identifyMediaBatch } from '../services/geminiService';

const router = express.Router();

router.post('/identify', async (req, res) => {
  try {
    const { filenames } = req.body;
    if (!filenames || !Array.isArray(filenames)) {
      return res.status(400).json({ error: 'filenames array is required' });
    }

    const results = await identifyMediaBatch(filenames);
    res.json(results);
  } catch (error: any) {
    console.error('AI Route Error:', error.message);
    res.status(500).json({ error: 'Failed to identify media using AI' });
  }
});

export default router;
