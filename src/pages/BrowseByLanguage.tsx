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
      
      <div className="pt-32 px-4 md:px-12">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <h2 className="text-white text-3xl font-bold">Browse by Languages</h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-4 bg-black border border-gray-600 px-4 py-1 text-white text-sm hover:bg-white/10 transition"
            >
              Select Language: <span className="font-bold">{selectedLanguage.name}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-black border border-gray-800 rounded shadow-2xl z-50 py-2">
                {LANGUAGES.map((lang) => (
                  <div 
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowDropdown(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
                  >
                    {lang.name}
                  </div>
                ))}
              </div>
            )}
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
