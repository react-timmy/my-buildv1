import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import { TMDB_IMAGE_BASE_URL } from '../lib/tmdb';
import { X, Play, Plus, Check, ThumbsUp, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';

interface MovieModalProps {
  movie: any;
  onClose: () => void;
}

export default function MovieModal({ movie, onClose }: MovieModalProps) {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [genres, setGenres] = useState<any[]>([]);
  const [cast, setCast] = useState<any[]>([]);
  const [director, setDirector] = useState<string>('');
  const [writer, setWriter] = useState<string>('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [rating, setRating] = useState<string>('');
  const [productionCompanies, setProductionCompanies] = useState<any[]>([]);

  const { activeProfile } = useAuth();
  const { addToast, toggleInMyList, myList, toggleLiked, likedList } = useLibrary();
  const navigate = useNavigate();

  const isInList = myList.some((m: any) => m.id === movie.id || m.meta?.tmdbId === movie.id || m.id === `tmdb_${movie.id}`);
  const isLiked = likedList.some((m: any) => m.id === movie.id || m.meta?.tmdbId === movie.id || m.id === `tmdb_${movie.id}`);

  useEffect(() => {
    async function fetchMovieData() {
      try {
        const type = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
        const response = await axios.get(`/tmdb/${type}/${movie.id}?append_to_response=videos,credits,recommendations,release_dates,content_ratings`);
        
        const data = response.data;
        if (data.genres) setGenres(data.genres);
        if (data.recommendations?.results) setRecommendations(data.recommendations.results.slice(0, 12));
        if (data.production_companies) setProductionCompanies(data.production_companies.slice(0, 2));

        // Get cast and crew
        if (data.credits) {
          setCast(data.credits.cast.slice(0, 5));
          const dir = data.credits.crew.find((c: any) => c.job === 'Director');
          if (dir) setDirector(dir.name);
          const writ = data.credits.crew.find((c: any) => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Author');
          if (writ) setWriter(writ.name);
        }

        // Get maturity rating
        if (type === 'movie' && data.release_dates) {
          const usRelease = data.release_dates.results.find((r: any) => r.iso_3166_1 === 'US');
          if (usRelease && usRelease.release_dates[0]) setRating(usRelease.release_dates[0].certification);
        } else if (type === 'tv' && data.content_ratings) {
          const usRating = data.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US');
          if (usRating) setRating(usRating.rating);
        }

        if (data.videos && data.videos.results) {
          const trailer = data.videos.results.find(
            (vid: any) => vid.type === 'Trailer' && vid.site === 'YouTube'
          );
          if (trailer) {
            setTrailerUrl(trailer.key);
          }
        }
      } catch (error) {
        console.error("Failed to fetch movie details", error);
      }
    }
    
    if (movie) {
      fetchMovieData();
    }
  }, [movie]);

  const handleListToggle = async () => {
    try {
      toggleInMyList(movie);
    } catch (error) {
      console.error(error);
      addToast('Failed to update list', 'error');
    }
  };

  const handleLikeToggle = async () => {
    try {
      toggleLiked(movie);
    } catch (error) {
      console.error(error);
      addToast('Failed to update like status', 'error');
    }
  };

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center px-4 md:px-0 pt-20 pb-10 overflow-y-auto bg-black/70">
      <div 
        className="relative w-full max-w-4xl bg-[#181818] rounded-md shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-[#181818] rounded-full flex items-center justify-center text-white hover:bg-white/20 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full h-[50vh] md:h-[60vh]">
          {trailerUrl ? (
            <div className="w-full h-full relative">
              <iframe
                src={`https://www.youtube.com/embed/${trailerUrl}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerUrl}`}
                title="Trailer"
                className="w-full h-full object-cover pointer-events-none"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
              <button 
                onClick={() => setMuted(!muted)}
                className="absolute bottom-1/4 right-10 z-10 w-10 h-10 border border-gray-400 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition bg-black/50"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            movie.backdrop_path || movie.poster_path ? (
              <img 
                src={`${TMDB_IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}`} 
                alt={movie.title || movie.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#181818]" />
            )
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
          
          <div className="absolute bottom-[10%] left-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {movie.title || movie.name || movie.original_name}
            </h2>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const type = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
                  navigate(`/watch/${type}/${movie.id}`);
                }}
                className="flex items-center gap-2 bg-white text-black px-8 py-2 rounded font-bold hover:bg-white/80 transition"
              >
                <Play className="w-6 h-6 fill-current" />
                Play
              </button>
              <button 
                onClick={handleListToggle}
                className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center text-white hover:border-white transition bg-[#2a2a2a]/60"
              >
                {isInList ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              </button>
              <button 
                onClick={handleLikeToggle}
                className={`w-10 h-10 border-2 rounded-full flex items-center justify-center transition bg-[#2a2a2a]/60 ${isLiked ? 'border-white text-white' : 'border-gray-400 text-white hover:border-white'}`}
              >
                <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="text-[#46d369] font-semibold">
                {Math.round((movie.vote_average || 0) * 10)}% Match
              </span>
              <span className="text-gray-300">
                {movie.release_date ? movie.release_date.substring(0, 4) : movie.first_air_date?.substring(0, 4)}
              </span>
              {rating && (
                <span className="border border-gray-600 px-1 text-xs text-gray-300 uppercase tracking-widest">{rating}</span>
              )}
              <span className="border border-gray-600 px-1 text-xs text-gray-300">HD</span>
            </div>
            <p className="text-white text-lg leading-relaxed mb-6">
              {movie.overview}
            </p>
          </div>
          <div className="text-sm text-gray-400 flex flex-col gap-3">
            <div>
              <span className="text-gray-500">Cast: </span>
              <span className="text-gray-200">
                {cast.map(c => c.name).join(', ')}{cast.length === 5 ? '...' : ''}
              </span>
            </div>
            {director && (
              <div>
                <span className="text-gray-500">Director: </span>
                <span className="text-gray-200">{director}</span>
              </div>
            )}
            {writer && (
              <div>
                <span className="text-gray-500">Writer: </span>
                <span className="text-gray-200">{writer}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Genres: </span>
              <span className="text-gray-200">
                {genres.map(g => g.name).join(', ')}
              </span>
            </div>
            {productionCompanies.length > 0 && (
              <div>
                <span className="text-gray-500">Production: </span>
                <span className="text-gray-200">{productionCompanies.map(c => c.name).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* More Like This Section */}
        {recommendations.length > 0 && (
          <div className="px-10 pb-10">
            <h3 className="text-white text-2xl font-bold mb-6">More Like This</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <div 
                  key={rec.id} 
                  className="bg-[#2f2f2f] rounded-md overflow-hidden cursor-pointer group hover:bg-[#3f3f3f] transition-colors"
                  onClick={() => {
                    // Update current movie logic would go here, 
                    // but for now we just scroll to top of modal
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // In a real app we'd dispatch an update or navigate
                  }}
                >
                  <div className="aspect-video relative">
                    <img 
                      src={`${TMDB_IMAGE_BASE_URL}${rec.backdrop_path || rec.poster_path}`} 
                      alt={rec.title || rec.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 text-white font-bold text-xs bg-black/40 px-2 py-1 rounded">
                      {rec.release_date?.substring(0, 4) || rec.first_air_date?.substring(0, 4)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[#46d369] text-xs font-bold">{Math.round(rec.vote_average * 10)}% Match</span>
                       <Plus className="w-5 h-5 text-gray-400 hover:text-white" />
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-3">
                      {rec.overview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
