import mongoose, { Schema } from 'mongoose';

const LibraryItemSchema = new Schema({
  id: String,
  filename: String,
  relativePath: String,
  videoUrl: String,
  status: String,
  addedAt: Number,
  watched: { type: Boolean, default: false },
  progressPercentage: { type: Number, default: 0 },
  meta: {
    cleanTitle: String,
    year: Number,
    season: Number,
    episode: Number,
    episodeTitle: String,
    poster: String,
    backdrop: String,
    overview: String,
    rating: Number,
    genres: [String],
    tmdbId: Number,
    folderName: String,
    isLiked: { type: Boolean, default: false },
    inMyList: { type: Boolean, default: false }
  }
}, { _id: false });

const ProfileSchema = new Schema({
  name: String,
  avatarUrl: String,
  isKids: Boolean,
  library: [LibraryItemSchema]
});

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  profiles: [ProfileSchema]
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
