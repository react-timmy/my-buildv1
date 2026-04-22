import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import tmdbRoutes from './src/routes/tmdb.ts';
import authRoutes from './src/routes/auth.ts';
import aiRoutes from './src/routes/ai.ts';
import { fetchDailyTrending } from './src/lib/trendingService.ts';

dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
}

mongoose.connect(mongoUri || 'mongodb://localhost:27017/filmsort')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tmdb', tmdbRoutes);
  app.use('/api/ai', aiRoutes);
  
  // Trending route
  app.get('/api/trending', async (req, res) => {
    const trending = await fetchDailyTrending();
    res.json(trending);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
