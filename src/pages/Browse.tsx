import React, { useState, useEffect, useMemo, useRef } from 'react';
import LibraryRow from '../components/LibraryRow';
import LibraryModal from '../components/LibraryModal';
import { useLibrary } from '../context/LibraryContext';
import { useAuth } from '../context/AuthContext';
import { LibraryItem } from '../services/libraryService';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Loader, Plus, ChevronDown, Play as PlayIcon, Search, Info, Star, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import FilmSortLogo from '../components/FilmSortLogo';

export default function Browse({ type = 'all' }: { type?: 'all' | 'movie' | 'tv' | 'latest' }) {
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'series' | 'movie'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [maturityRating, setMaturityRating] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [textlessPosterUrl, setTextlessPosterUrl] = useState<string | null>(null);
  const [trendingData, setTrendingData] = useState<any[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const location = useLocation() as any;
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await axios.get('/trending');
        setTrendingData(res.data);
      } catch (e) {
        console.error("Failed to fetch trending data", e);
      }
    };
    fetchTrending();
  }, []);

  const { activeProfile } = useAuth();
  const { 
    hasLibrary, 
    library,
    groups, 
    isScanning,
    isInitialSyncing,
    scanProgress,
    error,
    continueWatching,
    recentlyWatched,
    myList,
    toggleInMyList,
    needsRelink,
    relinkLibrary,
    playItem
  } = useLibrary();

  // Pick candidates for the hero section: Only unique Movies and Series (Seasons), not individual episodes.
  const heroItems = useMemo(() => {
    if (groups.length === 0) return [];
    
    // Take a representative item from each unique group (Series or Movie)
    return groups
      .map(g => g.items[0])
      .filter(i => i.meta && (i.meta.poster || i.meta.backdrop))
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 10);
  }, [groups]);

  const featuredItem = useMemo(() => {
    if (heroItems.length === 0) return null;
    const item = heroItems[heroIndex % heroItems.length];
    
    // Attach dynamic ranking from trending data
    const data = Array.isArray(trendingData) ? trendingData : [];
    const trend = data.find(t => t.tmdbId === item.meta.tmdbId);
    
    if (trend) {
      return { ...item, meta: { ...item.meta, ranking: trend.rank } };
    }
    
    // Fallback: If not in global TOP 10, calculate a stable library-specific rank (1-10)
    const stableRank = (item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10) + 1;
    return { ...item, meta: { ...item.meta, ranking: stableRank } };
  }, [heroItems, heroIndex, trendingData]);

  // Auto-cycle the hero section Every 10 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [heroItems.length]);

  useEffect(() => {
    if (featuredItem?.meta.tmdbId && featuredItem?.meta.type) {
      const fetchExtraData = async () => {
        // Clear previous state to avoid flickering or stale info
        setLogoUrl(null);
        setTextlessPosterUrl(null);
        setMaturityRating(null);
        setUserScore(null);
        
        try {
          const isMovie = featuredItem.meta.type === 'movie';
          const endpoint = isMovie ? 'movie' : 'tv';
          const res = await axios.get(`/tmdb/${endpoint}/${featuredItem.meta.tmdbId}?append_to_response=release_dates,content_ratings,images`);
          
          setUserScore(res.data.vote_average);
          const logo = res.data.images?.logos?.find((l: any) => l.iso_639_1 === 'en') || res.data.images?.logos?.[0];
          setLogoUrl(logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null);

          // Find a textless poster (no language specified) for mobile hero display
          const tPoster = res.data.images?.posters?.find((p: any) => !p.iso_639_1 || p.iso_639_1 === 'xx');
          setTextlessPosterUrl(tPoster ? `https://image.tmdb.org/t/p/w780${tPoster.file_path}` : null);

          if (isMovie) {
            const usRelease = res.data.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
            const rating = usRelease?.release_dates?.find((r: any) => r.certification)?.certification;
            setMaturityRating(rating || 'NR');
          } else {
            const usRating = res.data.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
            setMaturityRating(usRating?.rating || 'NR');
          }
        } catch (e) {
          console.error("Failed to fetch extra data", e);
          setMaturityRating('NR');
        }
      };
      fetchExtraData();
    }
  }, [featuredItem?.meta.tmdbId, featuredItem?.meta.type]);

  useEffect(() => {
    if (location.state?.openItem && library.length > 0) {
       const item = library.find(i => i.id === location.state.openItem);
       if (item) setSelectedItem(item);
    }
  }, [location.state, library]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableGenres = useMemo(() => {
    const counts: Record<string, number> = {};
    // Only count unique items by group to not skew with many episodes
    groups.forEach(group => {
      const topItem = group.items[0];
      if (topItem && topItem.meta.genres) {
        topItem.meta.genres.forEach((g: string) => {
          counts[g] = (counts[g] || 0) + 1;
        });
      }
    });
    
    const valid = Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .map(([genre]) => genre)
      .sort();
      
    // Fallback if the user's library doesn't have enough genre data yet
    return valid.length > 0 ? valid : ['Action', 'Adventure', 'Animation', 'Comedy', 'Drama', 'Science Fiction', 'Thriller'];
  }, [groups]);

  const tvGroups = useMemo(() => {
    let filtered = groups.filter(g => g.type === 'series');
    if (activeTab === 'movie') return [];
    if (selectedCategory) {
      filtered = filtered.filter(g => g.items[0]?.meta.genres?.includes(selectedCategory));
    }
    return filtered;
  }, [groups, activeTab, selectedCategory]);

  const movieGroups = useMemo(() => {
    let filtered = groups.filter(g => g.type === 'movie');
    if (activeTab === 'series') return [];
    if (selectedCategory) {
      filtered = filtered.filter(g => g.items[0]?.meta.genres?.includes(selectedCategory));
    }
    return filtered;
  }, [groups, activeTab, selectedCategory]);

  if (isInitialSyncing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader className="w-10 h-10 text-brand-orange animate-spin" />
      </div>
    );
  }

  if (!hasLibrary && !isScanning) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center px-12">
        <div className="w-32 h-32 bg-brand-orange/10 rounded-full flex items-center justify-center mb-10 relative">
          <div className="absolute inset-0 bg-brand-orange/20 rounded-full blur-2xl animate-pulse" />
          <LayoutGrid className="w-12 h-12 text-brand-orange" />
        </div>
        <h1 className="text-4xl font-light text-white mb-4 tracking-tight">Your Cinema is empty</h1>
        <p className="text-brand-blue/70 mb-12 text-sm leading-relaxed max-w-xs mx-auto">
          Start building your collection by adding movies to your library.
        </p>
        <Link 
          to="/library"
          className="px-10 py-4 bg-brand-orange text-white rounded-full font-bold uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:shadow-[0_0_40px_rgba(255,107,0,0.5)] active:scale-95 transition-all"
        >
          Open Media Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-orange/30 scrollbar-hide pb-20 overflow-x-hidden">
      {selectedItem && (
        <LibraryModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {/* Cinematic Hero Stage */}
      <section className="relative w-full h-[90vh] md:h-screen flex items-center justify-center overflow-hidden">
        {/* Top Header Spot */}
        <div className="absolute top-8 inset-x-0 px-6 md:px-12 flex items-center justify-between z-50">
          <div className="scale-[1.5] md:scale-[2.0] origin-top-left drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] px-2 pointer-events-auto">
            <FilmSortLogo onClick={() => navigate('/browse')} />
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/search')}
              className="w-12 h-12 glass-card rounded-full flex items-center justify-center transition-all border-white/10 hover:border-brand-blue/30 group"
            >
              <Search className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
            </button>
          </div>
        </div>

        {/* Background Artwork */}
        <AnimatePresence mode="wait">
          {featuredItem ? (
             <motion.div
              key={featuredItem.id}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 z-0"
            >
               {/* Mobile/Portrait Image: Textless Poster or Standard Poster */}
               <img
                src={textlessPosterUrl || featuredItem.meta.poster || featuredItem.meta.backdrop || `https://picsum.photos/seed/${featuredItem.id}/400/600`}
                className="w-full h-full object-cover object-top md:hidden block"
                alt={featuredItem.meta.cleanTitle}
                referrerPolicy="no-referrer"
              />
              {/* Desktop/Landscape Image: Backdrop */}
               <img
                src={featuredItem.meta.backdrop || featuredItem.meta.poster || `https://picsum.photos/seed/${featuredItem.id}/400/600`}
                className="w-full h-full object-cover object-[center_15%] hidden md:block"
                alt={featuredItem.meta.cleanTitle}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
              <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/60 to-transparent" />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
          )}
        </AnimatePresence>

        {/* Hero Content */}
        {featuredItem && (
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-start translate-y-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                 {featuredItem.meta.ranking && featuredItem.meta.ranking <= 10 && (
                   <div className="flex items-center gap-2">
                     <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-black font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                        {featuredItem.meta.ranking}
                     </div>
                     <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Top 10 Today</span>
                   </div>
                 )}
                 <div className="px-3 py-1 rounded-full glass-card border-brand-orange/30 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">Global Rating</span>
                    </div>
                    {userScore && (
                      <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                        <Star className="w-3.5 h-3.5 fill-brand-blue text-brand-blue" />
                        <span className="text-xs font-bold text-white tracking-tight">
                          {userScore.toFixed(1)}
                        </span>
                      </div>
                    )}
                 </div>
              </div>

              {logoUrl ? (
                <div className="relative group">
                  <img 
                    src={logoUrl} 
                    alt={featuredItem.meta.cleanTitle} 
                    className="max-h-32 md:max-h-56 object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] mb-10 -ml-1 transition-all duration-1000 ease-out hover:scale-[1.02]" 
                  />
                  <div className="absolute -inset-4 bg-brand-orange/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              ) : (
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 drop-shadow-2xl">
                  {featuredItem.meta.cleanTitle}
                </h1>
              )}

              <p className="text-sm md:text-lg text-white/70 max-w-lg mb-10 line-clamp-3 leading-relaxed font-medium drop-shadow-lg">
                {featuredItem.meta.overview || "An immersive masterpiece from your collection."}
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => playItem(featuredItem.id, navigate)}
                  className="px-10 py-4 bg-brand-orange text-white rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_40px_rgba(255,107,0,0.4)] hover:shadow-[0_0_60px_rgba(255,107,0,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <PlayIcon className="w-5 h-5 fill-white" />
                  Play Now
                </button>
                <button
                  onClick={() => setSelectedItem(featuredItem)}
                  className="w-14 h-14 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-all border-white/20 group"
                >
                  <Info className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* Main Hub Content */}
      <div className="relative z-20 -mt-24 space-y-12 pb-32">
        
        {/* Cinematic Content Rails */}
        <div className="space-y-16">
          {continueWatching.length > 0 && (
            <LibraryRow 
              title="Continue Watching" 
              items={continueWatching} 
              onItemClick={(item) => playItem(item.id, navigate)} 
              hideRating={true}
            />
          )}

          {myList.length > 0 && (
            <LibraryRow 
              title="Your Favorites" 
              items={myList} 
              onItemClick={setSelectedItem} 
              headerAction={
                <button 
                  onClick={() => {
                    window.scrollTo(0, 0);
                    navigate('/my-list');
                  }}
                  className="p-2 glass-card rounded-full hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group"
                >
                  <ChevronRight className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" />
                </button>
              }
            />
          )}

          {tvGroups.length > 0 && (
            <LibraryRow 
              title="Series & Shows" 
              groups={tvGroups} 
              onGroupClick={(group) => setSelectedItem(group.items[0])} 
            />
          )}

          {movieGroups.length > 0 && (
            <LibraryRow 
              title="Movies" 
              groups={movieGroups} 
              onGroupClick={(group) => setSelectedItem(group.items[0])} 
            />
          )}

          {recentlyWatched.length > 0 && (
            <LibraryRow title="Rewatch Gallery" items={recentlyWatched} onItemClick={setSelectedItem} />
          )}

          {/* Genre Focused recommendations could go here */}
        </div>
      </div>

      {/* Modern Status Overlays */}
      {isScanning && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-8 py-6 glass-card rounded-3xl flex flex-col gap-3 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 border-brand-orange/30 min-w-[300px]">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse shadow-[0_0_10px_#ff6b00]" />
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">Neural Uplink Active</span>
              <span className="text-[9px] font-mono text-brand-blue uppercase mt-0.5 truncate max-w-[200px]">{scanProgress.label || "Mapping Archive..."}</span>
              <div className="h-1 w-full bg-white/10 rounded-full mt-2.5 overflow-hidden border border-white/5 p-[1px]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brand-orange to-brand-blue rounded-full shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-mono text-white/40">{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
               <span className="text-[8px] font-mono text-white/20 mt-1">{scanProgress.current}/{scanProgress.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
