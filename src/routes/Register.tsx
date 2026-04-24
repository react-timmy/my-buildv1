import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../lib/axios';
import FilmSortLogo from '../components/FilmSortLogo';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Camera } from 'lucide-react';

const AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://i.pinimg.com/736x/b2/a0/29/b2a029a6c2757e9d3a09265e3d07d49d.jpg', // Red angry face
  'https://i.pinimg.com/736x/1b/71/b8/1b71b85dd741ad27bffa5c834a7ed797.jpg', // Red smiley
  'https://i.pinimg.com/736x/c0/74/9b/c0749b7cc401421662ae901ec8f9f660.jpg', // Spongebob
  'https://i.pinimg.com/736x/5b/50/e7/5b50e75d07c726d36f397f6359098f58.jpg', // Chicken
  'https://i.pinimg.com/736x/34/62/d2/3462d27440aa255b1c314ff16f4032b4.jpg'  // Cartoon bowtie
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/browse');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/auth/register', { 
        email, 
        password, 
        profileName: profileName || 'User',
        avatarUrl 
      });
      // After successful registration, login the user
      const loginRes = await axios.post('/auth/login', { email, password });
      if (loginRes.data.token) {
        localStorage.setItem('authToken', loginRes.data.token);
      }
      await refreshUser();
      navigate('/browse');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-brand-orange/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-xl relative z-10 transition-all duration-500">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <FilmSortLogo />
          </div>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2">Create Account</h1>
            <p className="text-sm text-white/40 font-bold uppercase tracking-widest">Join the experience</p>
          </div>
          
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 text-xs font-black">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Credentials</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="email"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder-white/20 font-medium"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder-white/20 font-medium"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Profile Identity</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder-white/20 font-medium"
                      placeholder="Profile Name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Choose Avatar</label>
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-indigo-500/50 transition-all shadow-xl">
                      <img src={avatarUrl} alt="Selected Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {AVATARS.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(avatar)}
                        className={`w-10 h-10 rounded-xl overflow-hidden active:scale-90 transition-all ${avatarUrl === avatar ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/50' : 'opacity-40 hover:opacity-100'}`}
                      >
                        <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[1.5rem] transition duration-300 disabled:opacity-50 shadow-2xl shadow-indigo-500/30 active:scale-[0.98] text-sm uppercase tracking-widest"
            >
              {loading ? 'Finalizing Setup...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-10 text-center text-xs font-black uppercase tracking-widest text-white/30">
            Current member?{' '}
            <Link to="/login" className="text-white hover:text-indigo-400 transition-colors">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
