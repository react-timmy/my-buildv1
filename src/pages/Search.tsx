import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, Mic, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import LibraryModal from '../components/LibraryModal';
import { useLibrary } from '../context/LibraryContext';
import { LibraryItem } from '../services/libraryService';
import { motion, AnimatePresence } from 'motion/react';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  
  const { library, groups } = useLibrary();

  // Recommendations: Just show the first few valid items from the library if no query
  const recommendations = groups.filter(g => g.type === 'movie' || g.type === 'series').slice(0, 10);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    
    // Simple filter for demo purposes, picking one rep per series or movie group
    // Filter strictly to Movies and Series to avoid non-vault loose files
    const validGroups = groups.filter(g => g.type === 'movie' || g.type === 'series');
    const filtered = validGroups.filter(g => 
      g.title.toLowerCase().includes(q) ||
      g.items.some(item => item.filename.toLowerCase().includes(q))
    );

    setResults(filtered);
  }, [query, groups]);

  const displayList = query.trim() ? results : recommendations;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-orange/30 px-6 pt-12 pb-20">
      {selectedItem && (
        <LibraryModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex-shrink-0">
            <SearchIcon className="w-8 h-8 text-black" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Search</h1>
            <div className="flex items-center gap-3 mt-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
              <Link to="/browse" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Explore</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Search Container */}
      <div className="max-w-4xl">
        {/* Search Input Bar */}
        <div className="relative group mb-12">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <SearchIcon className="w-6 h-6 text-white/20 group-focus-within:text-brand-orange transition-colors" />
          </div>
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shows, movies, archives..."
            className="w-full h-20 bg-white/5 border border-white/5 rounded-[2rem] pl-16 pr-16 text-lg font-bold text-white uppercase tracking-wider focus:outline-none focus:border-brand-orange/40 transition-all placeholder:text-white/20"
          />
          <div className="absolute inset-y-0 right-6 flex items-center">
            <Mic className="w-6 h-6 text-white/20 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>

        {/* Section Title */}
        <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] mb-6">
          {query.trim() ? `Search Results` : "Recommended"}
        </h2>

        {/* Grid Results List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10 pb-32">
          <AnimatePresence mode="popLayout">
            {displayList.map((group, idx) => {
              const item = group.items[0];
              if (!item) return null;
              
              return (
              <motion.div
                key={group.id || item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => setSelectedItem(item)}
                className="group/item relative flex flex-col gap-4 cursor-pointer"
              >
                <div className="relative aspect-[10/14] bg-[#0a0a0a] rounded-[1.5rem] overflow-hidden border border-white/5 transition-all duration-700 shadow-2xl group-hover/item:border-brand-orange/40 group-hover/item:-translate-y-3 group-hover/item:shadow-brand-orange/20">
                  {/* Top 10 / Labels */}
                  <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                    {idx === 0 && query.trim() && (
                      <div className="px-2 py-0.5 bg-brand-orange text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-orange/20">
                        Top Result
                      </div>
                    )}
                    {group.type === 'series' && (
                      <div className="px-2 py-0.5 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-blue/20 ml-auto">
                        Series
                      </div>
                    )}
                  </div>

                  <img 
                    src={item.meta.poster || `https://picsum.photos/seed/${item.id}/400/600`} 
                    alt={item.meta.cleanTitle}
                    className="w-full h-full object-cover opacity-70 group-hover/item:opacity-100 group-hover/item:scale-110 transition-all duration-1000 ease-[0.16,1,0.3,1]"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                     <div className="w-14 h-14 glass-card rounded-full flex items-center justify-center shadow-black/80 shadow-2xl transform scale-75 group-hover/item:scale-100 transition-all duration-500 bg-brand-orange/20 border-brand-orange">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                     </div>
                  </div>
                </div>

                <div className="px-1">
                  {item.meta.logo ? (
                    <img src={item.meta.logo} className="h-6 md:h-8 object-contain mb-1 opacity-90 transition-opacity" alt={item.meta.cleanTitle} />
                  ) : (
                    <h3 className="text-xs font-black text-white/90 truncate tracking-tight mb-1">{item.meta.cleanTitle}</h3>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black uppercase tracking-widest text-brand-orange">
                      {group.type === 'series' ? 'Series' : 'Movie'}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{item.meta.year || 'Unknown'}</p>
                  </div>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>

          {query.trim() && displayList.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-white/40">
              <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Oh, we don't have that title yet.</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">Try another keyword</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
