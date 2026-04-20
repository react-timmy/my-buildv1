import express from 'express';
import axios from 'axios';

const router = express.Router();
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Simple in-memory cache to prevent 429 rate limits
const tmdbCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Proxy route for TMDB to hide API key
router.get('/*', async (req, res) => {
  try {
    const tmdbApiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    if (!tmdbApiKey) {
      console.error('TMDB API Key missing in environment.');
      return res.status(500).json({ error: 'TMDB API key is not configured. Please add TMDB_API_KEY to your environment variables.' });
    }

    const path = req.path;
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    queryParams.append('api_key', tmdbApiKey);

    const url = `${TMDB_BASE_URL}${path}?${queryParams.toString()}`;
    
    // Check cache
    const cachedItem = tmdbCache.get(url);
    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL_MS)) {
      return res.json(cachedItem.data);
    }
    
    // Fetch from TMDB with simple retry mechanism for 429
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await axios.get(url);
        break; // Success
      } catch (err: any) {
        if (err.response?.status === 429 && retries > 1) {
          retries--;
          await sleep(1000 + Math.random() * 1000); // 1-2s backoff
          continue;
        }
        throw err;
      }
    }
    
    if (!response) throw new Error("Failed to fetch");

    // Save to cache
    tmdbCache.set(url, { data: response.data, timestamp: Date.now() });

    res.json(response.data);
  } catch (error: any) {
    console.error('TMDB Proxy Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch from TMDB' });
  }
});

export default router;
