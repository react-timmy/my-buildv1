import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Video from '../models/Video.ts';
import { authenticateToken } from './auth.ts';

const router = express.Router();

// ⚠️ WARNING: Local storage in container is ephemeral.
// This WILL NOT persist across server container restarts, re-deploys, or horizontal scaling.
// For production stability, use Cloud Storage, AWS S3, or shared volume attachment.
const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Name format: timestamp-userId-originalName
    const uniqueName = `${Date.now()}-${(req as any).user?.id || 'guest'}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/x-matroska', 'video/x-msvideo'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format'));
    }
  }
});

// ✅ UPLOAD ENDPOINT
router.post('/upload', authenticateToken, upload.single('video'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save metadata to database
    const video = await Video.create({
      userId: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      uploadedAt: new Date(),
      playbackPosition: 0
    });

    res.json({
      id: video._id,
      url: `/api/videos/stream/${video._id}`,
      title: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ STREAM ENDPOINT (After page reload, this still works!)
router.get('/stream/:videoId', authenticateToken, async (req: any, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    
    if (!video || video.userId !== (req as any).user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if file still exists on disk
    if (!fs.existsSync(video.path!)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // ✅ STREAM VIDEO (supports range requests for seeking)
    const stat = fs.statSync(video.path!);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Browser requesting specific byte range (seeking)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': video.mimetype
      });

      fs.createReadStream(video.path!, { start, end }).pipe(res);
    } else {
      // First request, stream entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimetype,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600' // ← Browser caches for 1 hour
      });

      fs.createReadStream(video.path!).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: 'Stream failed' });
  }
});

// ✅ GET VIDEOS LIST (After reload, user can list their videos)
router.get('/list', authenticateToken, async (req: any, res) => {
  try {
    const videos = await Video.find({ userId: req.user.id }).select('-path');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// ✅ SAVE PLAYBACK POSITION
router.put('/:videoId/progress', authenticateToken, async (req: any, res) => {
  try {
    const { currentTime, duration } = req.body;
    
    const video = await Video.findByIdAndUpdate(
      req.params.videoId,
      {
        playbackPosition: currentTime,
        duration,
        lastWatchedAt: new Date()
      },
      { new: true }
    );

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

export default router;
