import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { LibraryItem } from '../services/libraryService';

interface LibraryHeroProps {
  item: LibraryItem;
  onInfo: (item: LibraryItem) => void;
}

export default function LibraryHero({ item, onInfo }: LibraryHeroProps) {
  const navigate = useNavigate();

  function truncate(str: string, n: number) {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  }

  if (!item) return null;

  return (
    <header 
      className="relative h-[70vh] md:h-[85vh] bg-cover bg-center text-white"
      style={{
        backgroundImage: `url("${item.meta.backdrop || item.meta.poster || ''}")`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
      
      <div className="absolute bottom-[20%] left-4 md:left-12 max-w-2xl">
        <h1 className="text-3xl md:text-6xl font-bold mb-4 drop-shadow-lg">
          {item.meta.cleanTitle}
        </h1>
        
        {item.meta.type === 'series' && item.meta.season != null && (
          <p className="text-brand-blue font-bold text-lg mb-4">
            Season {item.meta.season} Episode {item.meta.episode || 1}
          </p>
        )}

        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => navigate(`/watch/local/${item.id}`)}
            className="flex items-center gap-2 bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-white/80 transition"
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            Play
          </button>
          <button 
            onClick={() => onInfo(item)}
            className="flex items-center gap-2 bg-gray-500/70 text-white px-6 md:px-8 py-2 md:py-3 rounded font-bold hover:bg-gray-500/50 transition"
          >
            <Info className="w-5 h-5 md:w-6 md:h-6" />
            More Info
          </button>
        </div>
        
        <h1 className="text-sm md:text-lg font-medium drop-shadow-md max-w-xl line-clamp-3">
          {truncate(item.meta.overview || 'No description available.', 150)}
        </h1>
      </div>
    </header>
  );
}
