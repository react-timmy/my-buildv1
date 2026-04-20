import axios from 'axios';

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY; // Ensure this is available in server env
const BASE_URL = 'https://api.themoviedb.org/3';

// In-memory cache for trending data
let cachedTrending: any[] = [];
let lastFetched: number = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
  while (retries > 0) {
    try {
      return await axios.get(url);
    } catch (err: any) {
      if (err.response?.status === 429 && retries > 1) {
        retries--;
        await sleep(1000 + Math.random() * 1000); // 1-2s backoff
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to fetch");
};

export async function fetchDailyTrending() {
  const now = Date.now();
  if (cachedTrending.length > 0 && (now - lastFetched) < CACHE_DURATION) {
    return cachedTrending;
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`),
      fetchWithRetry(`${BASE_URL}/trending/tv/day?api_key=${TMDB_API_KEY}`)
    ]);

    const combined = [...movieRes.data.results, ...tvRes.data.results]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10)
      .map((item, index) => ({
        tmdbId: item.id,
        rank: index + 1,
        type: item.media_type
      }));

    cachedTrending = combined;
    lastFetched = now;
    return combined;
  } catch (error) {
    console.error("Error fetching trending data:", error);
    return [];
  }
}
