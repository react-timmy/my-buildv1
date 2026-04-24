import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Row from '../components/Row';
import MovieModal from '../components/MovieModal';
import { ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
];

export default function BrowseByLanguage() {
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-[#141414] pb-20">
      
      <div className="pt-4 px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between md:justify-end gap-4 mb-8">
          <div className="relative order-2 md:order-1">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-4 bg-white/5 border border-white/5 px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition rounded-xl"
            >
              Select Language: <span className="font-black text-brand-orange">{selectedLanguage.name}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#111] border border-white/5 rounded-2xl shadow-2xl z-50 py-3 backdrop-blur-xl">
                {LANGUAGES.map((lang) => (
                  <div 
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowDropdown(false);
                    }}
                    className="px-6 py-2 text-[10px] font-bold text-white/40 hover:bg-white/5 hover:text-white cursor-pointer uppercase tracking-widest transition-colors"
                  >
                    {lang.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-right order-1 md:order-2">
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter leading-none">Languages</h1>
              <div className="flex items-center justify-end gap-2 mt-1.5 text-white/30 text-[7px] font-black uppercase tracking-[0.3em]">
                <span className="text-white">Translation Vault</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] flex-shrink-0">
               <div className="text-black font-black text-sm">Aa</div>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <Row 
            title={`Popular in ${selectedLanguage.name}`} 
            fetchUrl={`/discover/movie?with_original_language=${selectedLanguage.code}&sort_by=popularity.desc`} 
            isLargeRow 
            onMovieClick={setSelectedMovie} 
          />
          <Row 
            title={`Top Rated ${selectedLanguage.name} Movies`} 
            fetchUrl={`/discover/movie?with_original_language=${selectedLanguage.code}&sort_by=vote_average.desc&vote_count.gte=100`} 
            onMovieClick={setSelectedMovie} 
          />
          <Row 
            title={`${selectedLanguage.name} TV Shows`} 
            fetchUrl={`/discover/tv?with_original_language=${selectedLanguage.code}&sort_by=popularity.desc`} 
            onMovieClick={setSelectedMovie} 
          />
        </div>
      </div>

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}
