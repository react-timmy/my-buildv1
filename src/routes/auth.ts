import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.ts';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to verify token
export const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      passwordHash: hashedPassword,
      profiles: [
        { name: 'User', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png' }
      ]
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ message: 'User created successfully', userId: newUser._id, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userHash = user.passwordHash || (user as any).password;
    if (!userHash) {
      return res.status(401).json({ message: 'Invalid credentials or corrupted account' });
    }

    const isPasswordValid = await bcrypt.compare(password, userHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ 
      message: 'Logged in successfully', 
      token,
      user: { id: user._id, email: user.email, profiles: user.profiles } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/account', authenticateToken, async (req: any, res: any) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify current password
    const userHash = user.passwordHash || (user as any).password;
    if (!userHash) {
      return res.status(401).json({ message: 'Corrupted account: cannot verify password' });
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, userHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update email if provided
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    // Update password if provided
    if (newPassword) {
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ message: 'Account updated successfully', user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/profiles', authenticateToken, async (req: any, res: any) => {
  try {
    const { name, avatarUrl, isKids } = req.body;
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.profiles.length >= 3) {
      return res.status(400).json({ message: 'Maximum 3 profiles allowed' });
    }

    user.profiles.push({ name, avatarUrl, isKids });
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Add profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/profiles/:profileId', authenticateToken, async (req: any, res: any) => {
  try {
    const { name, avatarUrl, isKids } = req.body;
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = user.profiles.id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    if (name) profile.name = name;
    if (avatarUrl) profile.avatarUrl = avatarUrl;
    if (typeof isKids === 'boolean') profile.isKids = isKids;

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/profiles/:profileId', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profiles.pull(req.params.profileId);
    await user.save();
    
    res.json(user);
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/profiles/:profileId/list', authenticateToken, async (req: any, res: any) => {
  try {
    const { movie } = req.body;
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = user.profiles.id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Check if movie already exists in the list
    const exists = profile.myList.some((m: any) => m.id === movie.id);
    if (!exists) {
      profile.myList.push({
        id: movie.id,
        title: movie.title,
        name: movie.name,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie')
      });
      await user.save();
    }
    
    res.json(user);
  } catch (error) {
    console.error('Add to list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/profiles/:profileId/list/:movieId', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = user.profiles.id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const movieIndex = profile.myList.findIndex((m: any) => m.id.toString() === req.params.movieId);
    if (movieIndex > -1) {
      profile.myList.splice(movieIndex, 1);
      await user.save();
    }
    
    res.json(user);
  } catch (error) {
    console.error('Remove from list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/profiles/:profileId/like', authenticateToken, async (req: any, res: any) => {
  try {
    const { movie } = req.body;
    
    // First check if user and profile exist
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = user.profiles.id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Check if already liked
    const exists = (profile as any).likedMovies?.some((m: any) => m.id === movie.id);
    
    if (!exists) {
      // Use updateOne with $push to guarantee the database updates the array
      await User.updateOne(
        { _id: req.user.userId, 'profiles._id': req.params.profileId },
        { 
          $push: { 
            'profiles.$.likedMovies': {
              id: movie.id,
              title: movie.title,
              name: movie.name,
              poster_path: movie.poster_path,
              backdrop_path: movie.backdrop_path,
              media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie')
            } 
          } 
        }
      );
    }
    
    // Fetch the fresh user document to return
    const updatedUser = await User.findById(req.user.userId).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Like movie error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/profiles/:profileId/like/:movieId', authenticateToken, async (req: any, res: any) => {
  try {
    // Use updateOne with $pull to guarantee the database removes the item
    await User.updateOne(
      { _id: req.user.userId, 'profiles._id': req.params.profileId },
      { 
        $pull: { 
          'profiles.$.likedMovies': { id: Number(req.params.movieId) } 
        } 
      }
    );
    
    // Fetch the fresh user document to return
    const updatedUser = await User.findById(req.user.userId).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Unlike movie error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/profiles/:profileId/watching', authenticateToken, async (req: any, res: any) => {
  try {
    const { movie, progress, duration } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profile = user.profiles.id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Check if item already in watching
    const watchingItem = (profile as any).watching.find((w: any) => w.id === movie.id);

    if (watchingItem) {
      watchingItem.progress = progress;
      watchingItem.duration = duration;
      watchingItem.lastWatched = new Date();
    } else {
      (profile as any).watching.push({
        id: movie.id,
        title: movie.title,
        name: movie.name,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        media_type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
        progress,
        duration,
        lastWatched: new Date()
      });
    }

    // Keep only the last 20 items to avoid document size issues
    if (profile.watching.length > 20) {
      profile.watching.sort((a: any, b: any) => b.lastWatched.getTime() - a.lastWatched.getTime());
      profile.watching.splice(20);
    }

    await user.save();
    const updatedUser = await User.findById(req.user.userId).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Watching update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.delete('/account', authenticateToken, async (req: any, res: any) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.clearCookie('token');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Cloud Sync ---
router.post('/profiles/:profileId/sync', authenticateToken, async (req: any, res: any) => {
  try {
    const { library } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Explicitly cast user.profiles as a DocumentArray if not inferred
    const profile = (user.profiles as any).id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    
    profile.library = library;
    await user.save();
    
    res.json({ message: 'Synced successfully' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/profiles/:profileId/sync', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const profile = (user.profiles as any).id(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    
    res.json({ library: profile.library || [] });
  } catch (error) {
    console.error('Fetch sync error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
