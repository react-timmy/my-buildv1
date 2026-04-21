import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../lib/axios';
import FilmSortLogo from '../components/FilmSortLogo';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await axios.post('/auth/login', { email, password });
      if (res.data.token) {
        localStorage.setItem('authToken', res.data.token);
      }
      await refreshUser();
      navigate('/browse');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-orange/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-blue/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="absolute top-8 left-8 z-20 scale-[1.5] md:scale-[2.0] origin-top-left">
        <FilmSortLogo />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back</h1>
            <p className="text-sm text-white/40 font-medium">Enter your credentials to continue</p>
          </div>
          
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-brand-blue transition-colors" />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-blue/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder-white/30"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-brand-blue transition-colors" />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-blue/50 focus:bg-white/10 outline-none transition-all text-sm text-white placeholder-white/30"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs font-bold text-white/40 pt-2 pb-4">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white/70 transition-colors">
                <input type="checkbox" className="rounded bg-white/10 border-transparent text-brand-blue focus:ring-0 focus:ring-offset-0" />
                Remember me
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition duration-300 disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm font-medium text-white/40">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:text-brand-blue transition-colors font-bold">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
