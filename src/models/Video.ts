import mongoose, { Schema } from 'mongoose';

const VideoSchema = new Schema({
  userId: { type: String, required: true, index: true },
  filename: String,
  originalName: String,
  size: Number,
  mimetype: String,
  path: String,
  uploadedAt: { type: Date, default: Date.now },
  playbackPosition: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  lastWatchedAt: Date
});

export default mongoose.models.Video || mongoose.model('Video', VideoSchema);
