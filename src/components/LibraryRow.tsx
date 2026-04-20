import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader, Play as PlayIcon, Star } from 'lucide-react';
import { LibraryItem, LibraryGroup } from '../services/libraryService';
import { motion } from 'motion/react';

interface LibraryRowProps {
  key?: string | number;
  title: string;
  items?: LibraryItem[];
  groups?: LibraryGroup[];
  isLargeRow?: boolean;
  onItemClick?: (item: LibraryItem) => void;
  onGroupClick?: (group: LibraryGroup) => void;
  headerAction?: React.ReactNode;
  hideRating?: boolean;
}

export default function LibraryRow({ 
  title, 
  items, 
  groups, 
  isLargeRow = false, 
  onItemClick,
  onGroupClick,
  headerAction,
  hideRating = false
}: LibraryRowProps) {
  const [isMoved, setIsMoved] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const displayList = groups || items || [];
  if (displayList.length === 0) return null;

  return (
    <div className="pl-6 md:pl-12 my-12 relative group/row overflow-hidden">
      {title && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between pr-12 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-brand-orange rounded-full" />
              <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                {title}
              </h2>
            </div>
            {headerAction && (
              <div className="flex items-center">
                {headerAction}
              </div>
            )}
          </div>
          {groups && <span className="text-white/20 font-mono text-[10px] tracking-[0.4em] uppercase">{groups.length} Records</span>}
        </motion.div>
      )}
      
      <div className="relative flex items-center">
        <button 
          className={`absolute left-0 z-40 p-4 glass-card text-white rounded-full transition-all duration-300 -translate-x-1/2 opacity-0 group-hover/row:opacity-100 hover:scale-110 active:scale-95 ${!isMoved && 'hidden'}`}
          onClick={() => handleClick('left')}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div 
          ref={rowRef}
          className="flex items-center gap-6 overflow-x-scroll scrollbar-hide scroll-smooth py-6 -my-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayList.map((data, idx) => {
            const isGroup = 'items' in data;
            const item = isGroup ? (data as LibraryGroup).items[0] : (data as LibraryItem);
            const count = isGroup ? (data as LibraryGroup).items.length : 0;
            const cardTitle = isGroup ? (data as LibraryGroup).title : item.meta.cleanTitle;

            return (
              <motion.div 
                key={isGroup ? (data as LibraryGroup).key : item.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => isGroup ? onGroupClick?.(data as LibraryGroup) : onItemClick?.(item)}
                className={`flex-none group/card transition-all duration-500 hover:z-50 ${
                  isLargeRow ? 'w-[160px] md:w-[220px]' : 'w-[260px] md:w-[360px]'
                }`}
              >
                    <div className={`relative cursor-pointer transition-all duration-500 group-hover/card:scale-[1.03] group-hover/card:-translate-y-2 bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-white/5 group-hover/card:border-brand-orange/40 ${
                  isLargeRow ? 'aspect-[2/3]' : 'aspect-video'
                }`}>
                  {/* Badges UI - Top Bar */}
                  <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                    {Date.now() - (item.addedAt || 0) < 7 * 24 * 60 * 60 * 1000 && (
                      <div className="px-2 py-0.5 bg-brand-orange text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-orange/20">
                        New
                      </div>
                    )}
                    {!hideRating && item.meta.rating && (
                      <div className="ml-auto flex items-center gap-2">
                        <div className="px-1.5 py-0.5 glass-card border-white/10 rounded flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-brand-orange fill-brand-orange" />
                          <span className="text-[9px] font-bold text-white">{Math.round(item.meta.rating * 10) / 10}</span>
                        </div>
                        <span className="text-[9px] font-black text-brand-blue tracking-tighter shadow-sm">{Math.round(item.meta.rating * 10)}% Match</span>
                      </div>
                    )}
                  </div>

                  {item.status === 'processing' && (
                    <div className="absolute inset-0 z-10 overflow-hidden bg-black/80 backdrop-blur-md">
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                         <div className="w-8 h-8 border-4 border-white/10 border-t-brand-orange rounded-full animate-spin" />
                         <span className="text-[9px] uppercase tracking-[0.3em] font-black text-brand-orange">Secure syncing</span>
                       </div>
                    </div>
                  )}
                  
                  {item.meta.poster || item.meta.backdrop ? (
                    <img
                      src={isLargeRow ? (item.meta.poster || item.meta.backdrop) : (item.meta.backdrop || item.meta.poster)}
                      alt={cardTitle}
                      className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity duration-700"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-white/5 to-white/[0.01]">
                      <span className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-relaxed">{cardTitle}</span>
                    </div>
                  )}

                  {/* Hover Overlay for Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20">
                     <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center shadow-black/80 shadow-2xl transform scale-75 group-hover/card:scale-100 transition-all duration-500 bg-brand-orange/20 border-brand-orange">
                        <PlayIcon className="w-5 h-5 text-white fill-white ml-0.5" />
                     </div>
                  </div>

                  {/* Progress bar overlay if watched */}
                  {!isGroup && item.progressPercentage > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progressPercentage}%` }}
                        className="h-full bg-brand-orange shadow-[0_0_10px_#ff6b00]" 
                      />
                    </div>
                  )}
                </div>

                {/* Card Title Below Card */}
                <div className="mt-3 px-1">
                  {item.meta.logo ? (
                    <img 
                      src={item.meta.logo} 
                      alt={cardTitle} 
                      className="h-6 md:h-8 object-contain mb-1 opacity-90 transition-opacity group-hover/card:opacity-100" 
                    />
                  ) : (
                    <h3 className="text-white font-black text-[10px] md:text-xs truncate tracking-tight mb-1">
                      {cardTitle}
                    </h3>
                  )}
                  <div className="flex items-center gap-1.5 opacity-40">
                    {isGroup ? (
                      <span className="text-brand-orange text-[8px] font-black uppercase tracking-[0.15em]">
                        {(() => {
                           if (item.meta.type === 'series') {
                             const seasons = new Set((data as LibraryGroup).items.map(i => i.meta.season).filter(s => s !== undefined)).size || 1;
                             const episodes = (data as LibraryGroup).items.length;
                             const seasonText = seasons === 1 ? '1 Season' : `${seasons} Seasons`;
                             const episodeText = episodes === 1 ? '1 Episode' : `${episodes} Episodes`;
                             return `${seasonText} • ${episodeText}`;
                           }
                           return 'Movie';
                        })()}
                      </span>
                    ) : (
                      <span className="text-brand-blue text-[8px] font-black uppercase tracking-[0.15em]">
                        {item.meta.year}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <button 
          className="absolute right-0 z-40 p-4 glass-card text-white rounded-full transition-all duration-300 translate-x-1/2 opacity-0 group-hover/row:opacity-100 hover:scale-110 active:scale-95"
          onClick={() => handleClick('right')}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
