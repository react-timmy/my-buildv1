import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { Play, Bookmark, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LibraryModal from '../components/LibraryModal';
import LibraryRow from '../components/LibraryRow';
import Row from '../components/Row';

export default function MyList() {
  const { activeProfile } = useAuth();
  const { myList: localMyList, likedList, groups } = useLibrary();
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Group My List items (Series consolidation)
  const myListGroups = groups.filter(g => 
    g.items.some(i => localMyList.some(l => l.id === i.id))
  ).map(g => ({
    ...g,
    items: g.items.filter(i => localMyList.some(l => l.id === i.id))
  }));

  // Group Liked items (Series consolidation)
  const likedGroups = groups.filter(g => 
    g.items.some(i => likedList.some(l => l.id === i.id))
  ).map(g => ({
    ...g,
    items: g.items.filter(i => likedList.some(l => l.id === i.id))
  }));

  const hasContent = localMyList.length > 0 || likedList.length > 0;

  const handleImdbRedirect = (movie: any) => {
    const title = movie.name || movie.title || movie.original_name || movie.original_title;
    window.open(`https://www.imdb.com/find?q=${encodeURIComponent(title)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-transparent px-6 pt-12">
      {selectedItem && (
        <LibraryModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-16">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex-shrink-0">
            <Bookmark className="w-8 h-8 text-black" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Favorites</h1>
            <div className="flex items-center gap-3 mt-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
              <Link to="/browse" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Lists & Liked</span>
            </div>
          </div>
        </div>
      </div>

      {hasContent ? (
        <div className="space-y-16 pb-8">
          {localMyList.length > 0 && (
            <div className="space-y-2">
               <h2 className="text-xl font-bold text-white/90 px-6 md:px-12 flex items-center gap-2">
                 My Lists
                 <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">({localMyList.length})</span>
               </h2>
               <div className="-ml-4 md:-ml-12">
                 <LibraryRow 
                   title="" 
                   groups={myListGroups} 
                   onGroupClick={(group) => setSelectedItem(group.items[0])}
                 />
               </div>
            </div>
          )}

          {likedList.length > 0 && (
            <div className="space-y-2">
               <h2 className="text-xl font-bold text-white/90 px-6 md:px-12 flex items-center gap-2">
                 TV Shows & Movies You've Liked
                 <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">({likedList.length})</span>
               </h2>
               <div className="-ml-4 md:-ml-12">
                 <LibraryRow 
                   title="" 
                   groups={likedGroups} 
                   onGroupClick={(group) => setSelectedItem(group.items[0])}
                 />
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-10 border-b border-white/5 mb-8">
          <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mb-6">
            <Play className="w-8 h-8 text-brand-orange" />
          </div>
          <h3 className="text-lg text-white/60 mb-2">Your list is empty</h3>
          <p className="text-xs text-white/30 leading-relaxed">
            Tap the + button on any title to save it here for later viewing.
          </p>
        </div>
      )}

      {/* More You Might Like Section */}
      <div className="pt-4 pb-32 space-y-8">
        <h2 className="text-2xl font-bold text-white px-6 md:px-12">More You Might Like</h2>
        
        <div className="-ml-4 md:-ml-12">
          <Row 
            title="Newly Released Anime" 
            fetchUrl="/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc" 
            onMovieClick={handleImdbRedirect} 
            isLargeRow
          />
        </div>

        <div className="-ml-4 md:-ml-12">
          <Row 
            title="Newly Released" 
            fetchUrl="/movie/now_playing" 
            onMovieClick={handleImdbRedirect} 
            showTitles
          />
        </div>
      </div>
    </div>
  );
}
