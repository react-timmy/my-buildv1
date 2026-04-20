import React, { useState, useEffect, useRef } from 'react';
import axios from '../lib/axios';
import { TMDB_IMAGE_BASE_URL } from '../lib/tmdb';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RowSkeleton } from './Skeleton';

interface RowProps {
  title: string;
  fetchUrl: string;
  isLargeRow?: boolean;
  onMovieClick: (movie: any) => void;
  showTitles?: boolean;
}

export default function Row({ title, fetchUrl, isLargeRow = false, showTitles = false, onMovieClick }: RowProps) {
  const [movies, setMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoved, setIsMoved] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const request = await axios.get(`/tmdb${fetchUrl}`);
        setMovies(request.data.results);
      } catch (error) {
        console.error(`Error fetching ${title}`, error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [fetchUrl, title]);

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

  if (isLoading) return <RowSkeleton isLargeRow={isLargeRow} />;
  if (!movies || movies.length === 0) return null;

  return (
    <div className="pl-4 md:pl-12 my-8 relative group">
      <h2 className="text-white text-xl md:text-2xl font-semibold mb-4">{title}</h2>
      
      <div className="relative flex items-center">
        <ChevronLeft 
          className={`absolute left-0 z-40 w-10 h-10 md:w-14 md:h-14 bg-black/50 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-125 ${!isMoved && 'hidden'}`}
          onClick={() => handleClick('left')}
        />
        
        <div 
          ref={rowRef}
          className={`flex items-center ${showTitles ? 'gap-4 py-4 -my-4' : 'gap-2'} overflow-x-scroll scrollbar-hide scroll-smooth`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            ((isLargeRow && movie.poster_path) || (!isLargeRow && movie.backdrop_path)) && (
              <div 
                key={movie.id}
                onClick={() => onMovieClick(movie)}
                className={`flex-none group/card transition-all duration-300 ${
                  isLargeRow ? 'w-[150px] md:w-[200px]' : 'w-[250px] md:w-[300px]'
                }`}
              >
                <div className={`relative cursor-pointer transition-transform duration-300 group-hover/card:scale-105 hover:z-10 rounded-md overflow-hidden shadow-lg ${
                  isLargeRow ? 'aspect-[2/3]' : 'aspect-video'
                }`}>
                  <img
                    src={`${TMDB_IMAGE_BASE_URL}${isLargeRow ? movie.poster_path : movie.backdrop_path}`}
                    alt={movie.name || movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                
                {showTitles && (
                  <div className="mt-2 text-left">
                    <h3 className="text-white font-medium text-sm md:text-base truncate group-hover/card:text-indigo-400 transition-colors">
                      {movie.title || movie.name || movie.original_title || movie.original_name}
                    </h3>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
        
        <ChevronRight 
          className="absolute right-0 z-40 w-10 h-10 md:w-14 md:h-14 bg-black/50 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-125"
          onClick={() => handleClick('right')}
        />
      </div>
    </div>
  );
}
