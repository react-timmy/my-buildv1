import axios from '../lib/axios';
import { identifyMediaBatch } from './geminiService';

export interface LibraryItem {
  id: string; // Base64 or hash of relative path
  filename: string;
  relativePath: string;
  file?: File; // For manual uploads/selection
  handle?: FileSystemFileHandle; // For directory picker
  driveFileId?: string; // Legacy: Google Drive File ID
  videoUrl?: string; // Firebase Storage URL
  status: 'pending' | 'processing' | 'ready' | 'error' | 'missing';
  meta: MediaMetadata;
  size: number;
  addedAt: number;
  lastWatchedAt?: number;
  watched: boolean;
  progressPercentage: number;
}

export interface MediaMetadata {
  type: 'movie' | 'series' | 'unknown';
  cleanTitle: string;
  year?: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  genres?: string[];
  tmdbId?: number;
  logo?: string;
  folderName?: string; // For grouping series
  isLiked?: boolean;
  inMyList?: boolean;
}

export interface LibraryGroup {
  type: 'movie' | 'series';
  title: string;
  items: LibraryItem[];
  key: string; // Title or FolderName
}

const TMDB_SEARCH_MOVIE = '/tmdb/search/movie';
const TMDB_SEARCH_TV = '/tmdb/search/tv';
const TMDB_CONFIG_URL = 'https://image.tmdb.org/t/p/w500';

export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics"
};

export async function fetchTMDBMetadata(cleanTitle: string, type: 'movie' | 'series', year?: number) {
  try {
    const url = type === 'series' ? TMDB_SEARCH_TV : TMDB_SEARCH_MOVIE;
    const response = await axios.get(url, {
      params: { 
        query: cleanTitle,
        year: year || undefined,
        first_air_date_year: type === 'series' ? year : undefined
      }
    });

    const result = response.data.results[0];
    if (!result) return null;

    // Fetch full details for the logo and more accurate genres/ratings
    const detailUrl = type === 'series' ? `/tmdb/tv/${result.id}` : `/tmdb/movie/${result.id}`;
    const detailRes = await axios.get(detailUrl, {
      params: { append_to_response: 'images' }
    });
    
    const details = detailRes.data;
    const genres = (details.genres || []).map((g: any) => g.name);
    
    const logoImg = details.images?.logos?.find((l: any) => l.iso_639_1 === 'en' || !l.iso_639_1) || details.images?.logos?.[0];
    const logoUrl = logoImg ? `https://image.tmdb.org/t/p/w500${logoImg.file_path}` : undefined;

    return {
      poster: details.poster_path ? `${TMDB_CONFIG_URL}${details.poster_path}` : undefined,
      backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : undefined,
      overview: details.overview,
      rating: details.vote_average,
      tmdbId: details.id,
      logo: logoUrl,
      genres,
      episodeTitle: details.name || details.title // Fallback
    };
  } catch (error) {
    console.error("TMDB Metadata Error:", error);
    return null;
  }
}

export function groupLibrary(items: LibraryItem[]): LibraryGroup[] {
  const groups: Record<string, LibraryGroup> = {};

  items.forEach(item => {
    const key = item.meta.folderName || item.meta.cleanTitle;
    if (!groups[key]) {
      groups[key] = {
        title: item.meta.cleanTitle,
        type: item.meta.type as any,
        key: key,
        items: []
      };
    }
    groups[key].items.push(item);
  });

  // Sort episodes within groups
  Object.values(groups).forEach(group => {
    group.items.sort((a, b) => {
      if (a.meta.season !== b.meta.season) return (a.meta.season || 0) - (b.meta.season || 0);
      return (a.meta.episode || 0) - (b.meta.episode || 0);
    });
  });

  return Object.values(groups).sort((a, b) => {
    const aLatest = Math.max(...a.items.map(i => i.addedAt));
    const bLatest = Math.max(...b.items.map(i => i.addedAt));
    return bLatest - aLatest;
  });
}
