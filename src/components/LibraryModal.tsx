import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Plus, Check, ThumbsUp, Calendar, Clock, Star, Info, Tv } from 'lucide-react';
import { LibraryItem } from '../services/libraryService';
import { useLibrary } from '../context/LibraryContext';
import { motion, AnimatePresence } from 'motion/react';
import axios from '../lib/axios';

interface LibraryModalProps {
  item: LibraryItem;
  onClose: () => void;
}

export default function LibraryModal({ item: initialItem, onClose }: LibraryModalProps) {
  const navigate = useNavigate();
  const { library, groups, toggleInMyList, toggleLiked, playItem } = useLibrary();
  const [extendedData, setExtendedData] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Always find the freshest version of the item from the library context
  const item = library.find(i => i.id === initialItem.id) || initialItem;

  useEffect(() => {
    if (item.meta.tmdbId) {
      const fetchDetails = async () => {
        try {
          const endpoint = item.meta.type === 'movie' ? 'movie' : 'tv';
          const params = item.meta.type === 'movie' 
            ? 'append_to_response=release_dates,keywords,credits,images,recommendations,videos'
            : 'append_to_response=content_ratings,keywords,credits,images,recommendations,videos';
            
          const res = await axios.get(`/tmdb/${endpoint}/${item.meta.tmdbId}?${params}`);
          setExtendedData(res.data);

          // Get Trailer
          const trailer = res.data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
          if (trailer) setExtendedData((prev: any) => ({ ...prev, trailerKey: trailer.key }));

          // Get Logo
          const logo = res.data.images?.logos?.find((l: any) => l.iso_639_1 === 'en') || res.data.images?.logos?.[0];
          setLogoUrl(logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null);
        } catch (e) {
          console.error("Failed to fetch extended TMDB data", e);
        }
      };
      fetchDetails();
    }
  }, [item.meta.tmdbId, item.meta.type]);

  const group = item.meta.type === 'series' 
    ? groups.find(g => g.key === (item.meta.folderName || item.meta.cleanTitle))
    : null;

  let maturityRating = null;
  let genresDisplay = null;
  let keywordsList: string[] = [];

  if (extendedData) {
    if (item.meta.type === 'movie' && extendedData.release_dates) {
      const usRelease = extendedData.release_dates.results?.find((r: any) => r.iso_3166_1 === 'US');
      if (usRelease && usRelease.release_dates?.length > 0) {
        maturityRating = usRelease.release_dates.find((r: any) => r.certification)?.certification;
      }
    } else if (item.meta.type === 'series' && extendedData.content_ratings) {
      const usRating = extendedData.content_ratings.results?.find((r: any) => r.iso_3166_1 === 'US');
      maturityRating = usRating?.rating;
    }

    if (extendedData.genres) {
      genresDisplay = extendedData.genres.map((g: any) => g.name).join(', ');
    }

    if (item.meta.type === 'movie' && extendedData.keywords?.keywords) {
      keywordsList = extendedData.keywords.keywords.map((k: any) => k.name).slice(0, 4);
    } else if (item.meta.type === 'series' && extendedData.keywords?.results) {
      keywordsList = extendedData.keywords.results.map((k: any) => k.name).slice(0, 4);
    }
  }

  keywordsList = keywordsList.map((k: string) => k.charAt(0).toUpperCase() + k.slice(1));

  if (!item) return null;

  const description = item.meta.overview || `This high-fidelity archive is from your local vault identified as ${item.meta.cleanTitle}.`;
  const isLongDescription = description.length > 280;

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-center items-end md:items-center px-0 md:px-6 py-0 md:py-10 bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl bg-[#050505] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden h-[90vh] md:h-auto max-h-[95vh] border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-12 h-12 glass-card rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all border-white/20 active:scale-90"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
          {/* Immersive Hero Header */}
          <div className="relative w-full h-[45vh] md:h-[60vh] shrink-0">
            <img 
              src={item.meta.backdrop || item.meta.poster || undefined} 
              alt={item.meta.cleanTitle}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Master Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#050505] to-transparent hidden md:block" />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col items-start gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-4">
                   {extendedData?.networks?.[0] && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/10">
                        <img 
                          src={`https://image.tmdb.org/t/p/w92${extendedData.networks[0].logo_path}`} 
                          className="h-3 object-contain invert brightness-200" 
                          alt="" 
                        />
                     </div>
                   )}
                   {item.meta.rating && (
                     <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                       <Star className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" />
                       <span className="text-sm font-bold text-white">{Math.round(item.meta.rating * 10) / 10}</span>
                     </div>
                   )}
                </div>
                
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={item.meta.cleanTitle}
                    className="max-h-24 md:max-h-40 object-contain drop-shadow-2xl" 
                  />
                ) : (
                  <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
                    {item.meta.cleanTitle}
                  </h2>
                )}
              </div>

              <div className="flex flex-col gap-4 w-full md:w-auto">
                {/* 1. Stream Now (Primary Play Button) */}
                <button 
                  onClick={() => playItem(item.id, navigate)}
                  className="flex flex-1 items-center justify-center gap-3 bg-brand-orange text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_40px_rgba(255,107,0,0.4)] hover:shadow-[0_0_60px_rgba(255,107,0,0.6)] hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Stream Now
                </button>

                {/* The "Line" for Secondary Actions */}
                <div className="flex flex-row items-center gap-4">
                  {/* Group: My List & Like (Circular Glass Cards) */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleInMyList(item.id)}
                      className={`w-14 h-14 glass-card rounded-full flex items-center justify-center transition-all border-white/20 active:scale-90 group shrink-0 ${
                        item.meta.inMyList ? 'bg-white/10 border-white text-brand-blue' : 'text-white hover:bg-white/5'
                      }`}
                    >
                      {item.meta.inMyList ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                    </button>

                    <button 
                      onClick={() => toggleLiked(item.id)}
                      className={`w-14 h-14 glass-card rounded-full flex items-center justify-center transition-all border-white/20 active:scale-90 group shrink-0 ${
                        item.meta.isLiked ? 'bg-brand-orange/20 border-brand-orange text-brand-orange' : 'text-white hover:bg-white/5'
                      }`}
                    >
                      <ThumbsUp className={`w-6 h-6 group-hover:scale-110 transition-transform ${item.meta.isLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* 4. Watch Trailer (Conditional rendering based on TMDB API) */}
                  {extendedData?.trailerKey && (
                    <button 
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${extendedData.trailerKey}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-3 bg-white/5 text-white px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                      Watch Trailer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="px-8 md:px-16 pt-0 pb-20 grid lg:grid-cols-12 gap-12 bg-[#050505] relative z-20 -mt-[2px]">
            {/* Primary content area */}
            <div className="lg:col-span-8 space-y-12">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-6 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-blue" />
                    <span>{item.meta.year}</span>
                  </div>
                  {item.meta.type === 'movie' ? (
                    <div className="flex items-center gap-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span>{extendedData?.runtime ? `${Math.floor(extendedData.runtime / 60)}h ${extendedData.runtime % 60}m` : 'Feature Film'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/70">
                      <Tv className="w-4 h-4" />
                      <span>{extendedData?.number_of_seasons ? `${extendedData.number_of_seasons} Seasons` : 'TV Series'}</span>
                    </div>
                  )}
                  {maturityRating && (
                    <span className="px-2 py-0.5 border border-white/20 rounded bg-white/5 text-white">
                      {maturityRating}
                    </span>
                  )}
                  <div className="px-3 py-1 rounded bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    4K Ultra HD
                  </div>
                </div>
                
                <p className="text-lg md:text-xl text-white/70 leading-relaxed font-medium">
                  {description}
                </p>
              </div>

              {/* Episodes / Series Content */}
              {group && group.items.length > 1 && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black tracking-tighter">Episodes</h3>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/30">{group.items.length} Files Found</div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {group.items.map((ep, idx) => (
                      <div 
                        key={ep.id}
                        onClick={() => playItem(ep.id, navigate)}
                        className={`group/ep flex items-center gap-6 p-4 rounded-3xl cursor-pointer transition-all border border-transparent ${ep.id === item.id ? 'bg-white/5 border-white/10' : 'hover:bg-white/[0.03]'}`}
                      >
                        <div className="text-sm font-black text-white/20 w-8 tabular-nums group-hover/ep:text-brand-orange transition-colors">{(idx + 1).toString().padStart(2, '0')}</div>
                        <div className="relative aspect-video w-40 rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-xl">
                          <img src={ep.meta.backdrop || ep.meta.poster || undefined} className="w-full h-full object-cover opacity-60 group-hover/ep:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity">
                             <div className="w-10 h-10 glass-card rounded-full flex items-center justify-center shadow-2xl">
                                <Play className="w-5 h-5 text-brand-orange fill-brand-orange ml-0.5" />
                             </div>
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-white font-bold group-hover/ep:text-brand-orange transition-colors">S{ep.meta.season} E{ep.meta.episode}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Ready to Stream</span>
                          </div>
                          <p className="text-xs text-white/40 line-clamp-1 italic">{ep.meta.overview || ep.filename}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Metadata area */}
            <div className="lg:col-span-4 space-y-10">
              <div className="glass-card p-8 rounded-[2rem] border-white/5 space-y-8">
                {extendedData?.credits?.cast && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Primary Cast</p>
                    <p className="text-sm text-white/80 leading-relaxed font-medium">
                      {extendedData.credits.cast.slice(0, 4).map((c: any) => c.name).join(', ')}
                      {extendedData.credits.cast.length > 4 && <span className="text-white/30">, and others.</span>}
                    </p>
                  </div>
                )}
                
                {genresDisplay && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Categorization</p>
                    <p className="text-sm text-white/80 font-medium">{genresDisplay}</p>
                  </div>
                )}

                {keywordsList.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Archive Tags</p>
                    <div className="flex flex-wrap gap-2">
                       {keywordsList.map(tag => (
                         <span key={tag} className="px-3 py-1 bg-white/5 rounded-md text-[9px] font-black text-white/40 uppercase tracking-widest border border-white/5 shadow-md">
                           {tag}
                         </span>
                       ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Specialist Tools inside Modal */}
              <div className="p-8 glass-card rounded-[2rem] border-brand-orange/10 bg-brand-orange/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                  <Info className="w-5 h-5 text-brand-orange" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange">Archive Specs</p>
                </div>
                <div className="space-y-3 font-mono text-[9px] text-white/30 uppercase tracking-widest">
                  <div className="flex justify-between">
                    <span>Source</span>
                    <span className="text-white/60">Local Vault</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Container</span>
                    <span className="text-white/60">{item.filename?.split('.').pop() || 'MKV'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bitrate</span>
                    <span className="text-brand-blue">Dynamic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* More Like This (Recommendations) */}
          {extendedData?.recommendations?.results?.length > 0 && (
            <div className="px-8 md:px-16 pb-20 border-t border-white/5 pt-12">
              <h3 className="text-2xl font-black tracking-tighter mb-8">More Like This</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                 {extendedData.recommendations.results.slice(0, 6).map((rec: any) => (
                   <div 
                      key={rec.id}
                      className="group/rec bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5 hover:border-brand-orange/40 transition-all cursor-default"
                   >
                     <div className="relative aspect-[2/3]">
                        <img 
                          src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`} 
                          className="w-full h-full object-cover opacity-60 group-hover/rec:opacity-100 transition-opacity" 
                          alt="" 
                        />
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 glass-card border-white/10 rounded text-[9px] font-bold text-white">
                          {Math.round(rec.vote_average * 10)}%
                        </div>
                     </div>
                     <div className="p-3">
                       <p className="text-[10px] font-bold text-white/80 truncate">{rec.title || rec.name}</p>
                       <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1">{(rec.release_date || rec.first_air_date)?.substring(0, 4)}</p>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
