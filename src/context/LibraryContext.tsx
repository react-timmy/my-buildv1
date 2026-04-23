import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryItem, LibraryGroup, groupLibrary, fetchTMDBMetadata } from '../services/libraryService';
import { identifyMediaBatch } from '../services/geminiService';
import { useAuth } from './AuthContext';
import axios from '../lib/axios';
import { NativeBridge, NativeMediaFile } from '../services/nativeBridge';

interface ScanProgress {
  phase: 'idle' | 'scanning' | 'identifying' | 'metadata' | 'complete';
  current: number;
  total: number;
  label?: string;
}

interface LibraryContextType {
  library: LibraryItem[];
  groups: LibraryGroup[];
  isPro: boolean;
  setIsPro: (val: boolean) => void;
  movieCount: number;
  showCount: number;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  isInitialSyncing: boolean;
  scanProgress: ScanProgress;
  processingCount: number;
  error: string | null;
  hasLibrary: boolean;
  playItem: (id: string, navigate: any) => Promise<void>;
  scanFiles: (files: FileList | File[]) => Promise<void>;
  pickFiles: () => Promise<void>;
  updateProgress: (id: string, percentage: number) => void;
  toggleInMyList: (id: string) => void;
  toggleLiked: (id: string) => void;
  continueWatching: LibraryItem[];
  recentlyWatched: LibraryItem[];
  myList: LibraryItem[];
  likedList: LibraryItem[];
  clearLibrary: () => void;
  wipeSavedLibrary: () => void;
  removeItems: (ids: string[]) => void;
  toasts: any[];
  removeToast: (id: string) => void;
  addToast: (message: string, type?: any) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfile } = useAuth();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPro, setIsPro] = useState(() => {
    return localStorage.getItem('filmsort_pro_status') === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('filmsort_pro_status', isPro.toString());
  }, [isPro]);

  const [isInitialSyncing, setIsInitialSyncing] = useState(true);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ phase: 'idle', current: 0, total: 0 });
  const [toasts, setToasts] = useState<any[]>([]);
  const isNative = NativeBridge.isNative();
  const isSyncingRef = React.useRef(false); // Guard to prevent saves during fetch
  const initializedProfileId = React.useRef<string | null | undefined>(undefined);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const syncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastDebounceRef = React.useRef<{ message: string; timestamp: number } | null>(null);

  const groups = useMemo(() => groupLibrary(library), [library]);
  const movieCount = useMemo(() => groups.filter(g => g.type === 'movie').length, [groups]);
  const showCount = useMemo(() => groups.filter(g => g.type === 'series').length, [groups]);

  const handleKey = activeProfile ? `filmsort_dir_handle_${activeProfile.id}` : `filmsort_dir_handle_default`;

  const addToast = (message: string, type: any = 'info') => {                
    console.log(message, type);
  };
    
  const removeToast = (id: string) => {};

  const { loading: authLoading } = useAuth();

  // Simplified sync
  const syncWithVaultContents = useCallback(async () => {
    if (authLoading) return;
    
    const profileId = activeProfile?.id || (activeProfile as any)?._id;
    if (!profileId || profileId === 'guest') {
      setIsInitialSyncing(false);
      return;
    }
    
    setIsInitialSyncing(true);
    isSyncingRef.current = true;
    
    try {
      const res = await axios.get(`/auth/profiles/${profileId}/sync`);
      if (res.data.library) {
        setLibrary(res.data.library);
      }
      initializedProfileId.current = profileId;
    } catch (e) {
      console.error("[LibrarySync] Fatal sync error", e);
    } finally {
      setIsInitialSyncing(false);
      // Short delay to let the 'library' state settle before allowing saves
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 500);
    }
  }, [activeProfile?.id, authLoading]);

  // Handle Profile Switch: Clear state immediately
  useEffect(() => {
    if (activeProfile?.id !== initializedProfileId.current) {
        setLibrary([]);
        initializedProfileId.current = undefined;
    }
  }, [activeProfile?.id]);
  
  useEffect(() => {
    syncWithVaultContents();
  }, [syncWithVaultContents]);

  // Persistent Save Effect - ATOMIC & PROTECTED
  useEffect(() => {
    // CRITICAL: Prevent saving if we are in the middle of a profile fetch
    if (!initializedProfileId.current || isInitialSyncing || isSyncingRef.current) return;
    
    const profileId = activeProfile?.id || (activeProfile as any)?._id;

    // Cloud Proxy Sync (Debounced)
    if (profileId && initializedProfileId.current === profileId) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        axios.post(`/auth/profiles/${profileId}/sync`, { library })
          .catch(err => {
            console.error("[LibrarySync] Cloud sync failed", {
              message: err.message,
              status: err.response?.status,
              data: err.response?.data,
              config: err.config
            });
          });
      }, 5000);
    }
    
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    }
  }, [library, activeProfile?.id, isInitialSyncing]);


  const playItem = useCallback(async (id: string, navigate: any) => {
    const item = library.find(i => i.id === id);
    if (!item) return;

    navigate(`/watch/local/${id}`);
  }, [library]);

  const processItems = async (items: Array<{filename: string, file: File, relativePath: string, handle?: FileSystemFileHandle}>) => {
    setIsScanning(true);
    abortControllerRef.current = typeof AbortController !== 'undefined' ? new AbortController() : null;
    setScanProgress({ phase: 'scanning', current: 0, total: items.length, label: 'Initializing scan...' });
    
    // Filtering logic to block non-media filenames (UUIDs, Screen Recordings, etc.)
    const filteredItems = items.filter(item => {
      const name = item.filename.toLowerCase();
      const baseName = item.filename.split('.')[0];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(baseName)) return false;
      if (name.includes('screen recording') || name.includes('screenshot') || name.includes('capture')) return false;
      if (name.match(/^[0-9]{10,}$/)) return false; 
      
      return true;
    });

    // BUSINESS RULE: Free Tier Limits
    const MAX_FREE_MOVIES = 10;
    const MAX_FREE_SHOWS = 10;

    if (!isPro) {
      if (movieCount >= MAX_FREE_MOVIES || showCount >= MAX_FREE_SHOWS) {
        addToast('Free plan limit reached (10 Movies / 10 TV Shows). Upgrade to Pro to add more.', 'error');
        setIsScanning(false);
        return;
      }
    }

    if (filteredItems.length === 0 && items.length > 0) {
      addToast('No valid movies or TV shows identified', 'error');
      setIsScanning(false);
      return;
    }

    const initialItems: LibraryItem[] = [];

    for (const item of filteredItems) {
      const id = "phantom_" + Math.random().toString(36).substring(2, 11);
      
      // Metadata processing only

      initialItems.push({
        id,
        filename: item.filename,
        relativePath: item.relativePath,
        file: item.file,
        handle: item.handle,
        status: 'processing',
        meta: { type: 'unknown', cleanTitle: item.filename },
        size: item.file.size,
        addedAt: Date.now(),
        watched: false,
        progressPercentage: 0
      });
    }

    setLibrary(prev => [...prev, ...initialItems]);
    
    try {
      // 1. Identify with Gemini
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
      setScanProgress({ phase: 'identifying', current: 0, total: initialItems.length, label: 'Identifying titles...' });
      const filenames = initialItems.map(i => i.filename);
      const aiResults = await identifyMediaBatch(filenames);

      // Deduplication Logic
      const generateKey = (item: any) => {
        const title = (item.meta.cleanTitle || '').toLowerCase().trim();
        if (item.meta.type === 'movie') return `movie:${title}:${item.meta.year || ''}`;
        if (item.meta.type === 'series') return `series:${title}:s${item.meta.season || 0}e${item.meta.episode || 0}`;
        return `unknown:${item.filename}`;
      };

      // 2. Fetch TMDB Metadata & Update incrementally
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
      setScanProgress({ phase: 'metadata', current: 0, total: initialItems.length, label: 'Syncing cloud metadata...' });
      
      let processedNum = 0;
      for (const item of initialItems) {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) break;

        const aiRes = aiResults.find(r => r.original_name === item.filename);
        const meta = {
            ...item.meta,
            type: (aiRes?.type as any) || 'movie',
            cleanTitle: aiRes?.clean_title || item.meta.cleanTitle,
            year: aiRes?.year || item.meta.year,
            season: aiRes?.season,
            episode: aiRes?.episode,
            folderName: aiRes?.folderName || aiRes?.clean_title || item.meta.cleanTitle
        };

        // Check if we already have this in library
        const key = generateKey({ meta, filename: item.filename });
        const existingItem = library.find(i => generateKey(i) === key);

        if (existingItem) {
          // Merge: Connect the handle to the existing ID (skipped due to server sync)
          setLibrary(prev => prev.filter(p => p.id !== item.id).map(p => {
             if (p.id === existingItem.id) {
               return { ...p, status: 'ready' as const, filename: item.filename, size: item.size };
             }
             return p;
          }));
          processedNum++;
          continue;
        }

        const tmdbMeta = await fetchTMDBMetadata(meta.cleanTitle, meta.type, meta.year);

        processedNum++;
        setScanProgress(p => ({ ...p, current: processedNum, label: `Linked: ${meta.cleanTitle}` }));

        setLibrary(prev => prev.map(p => {
          if (p.id === item.id) {
            return {
              ...p,
              status: 'ready' as const,
              meta: { 
                ...meta, 
                ...(tmdbMeta || {}),
              }
            };
          }
          return p;
        }));
      }

      setScanProgress({ phase: 'complete', current: items.length, total: items.length, label: 'Scan Successful' });
    } catch (e) {
      console.error("Error during processing", e);
      addToast('Error during scan', 'error');
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress({ phase: 'idle', current: 0, total: 0 });
        abortControllerRef.current = null;
      }, 2000);
    }
  };

  const scanFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    
    const videoFiles = fileArray.filter(f => f.name.match(/\.(mp4|mkv|avi|mov|webm)$/i));
    
    if (videoFiles.length === 0) {
      addToast('No supported video files found', 'error');
      return;
    }

    const normalized = videoFiles.map(f => ({
      filename: f.name,
      file: f,
      relativePath: f.webkitRelativePath || f.name
    }));
    await processItems(normalized);
  };

  const triggerStandardPicker = (multiple: boolean = true) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = 'video/mp4,video/x-matroska,video/x-msvideo,video/quicktime,video/webm,.mp4,.mkv,.avi,.mov,.webm';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        await scanFiles(files);
      }
    };
    input.click();
  };

  const pickFiles = async () => {
    try {
      if (isNative) {
        setScanProgress({ phase: 'scanning', current: 0, total: 0, label: 'Scanning local storage...' });
        setIsScanning(true);
        const nativeFiles = await NativeBridge.requestMediaAccess();
        if (nativeFiles.length > 0) {
          const normalized = nativeFiles.map(nf => ({
            filename: nf.name,
            file: (nf.blob || new File([], nf.name)) as File, 
            relativePath: nf.path,
            handle: undefined
          }));
          await processItems(normalized);
        } else {
          setIsScanning(false);
          addToast('No media found on device library.', 'info');
        }
        return;
      }

      // If we're in an iframe, showOpenFilePicker might be restricted by browser policy
      // regardless of whether it "exists" in window.
      if (!('showOpenFilePicker' in window)) {
        addToast('Files require a desktop browser. On mobile, files must be re-selected each time.', 'info');
        triggerStandardPicker(true);
        return;
      }
      
      let handles;
      try {
        handles = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [{
            description: 'Video Files',
            accept: { 'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.webm'] }
          }]
        });
      } catch (pickerErr: any) {
        // Specifically catch SecurityError (iframe restriction) or AbortError
        if (pickerErr.name === 'SecurityError' || pickerErr.message.includes('cross origin')) {
          console.warn("showOpenFilePicker blocked in iframe, falling back to standard picker.");
          addToast('Browser security restricts direct file access in this view. Falling back to manual selection.', 'info');
          triggerStandardPicker(true);
          return;
        }
        throw pickerErr; // Re-throw if it's something else (like AbortError)
      }

      const items: Array<{filename: string, file: File, relativePath: string, handle: FileSystemFileHandle}> = [];
      
      setScanProgress({ phase: 'scanning', current: 0, total: handles.length, label: 'Preparing files...' });
      setIsScanning(true);
      
      for (let i = 0; i < handles.length; i++) {
        try {
          const handle = handles[i];
          const file = await handle.getFile();
          items.push({ filename: file.name, file, relativePath: file.name, handle });
          setScanProgress(p => ({ ...p, current: i + 1, label: `Linking: ${file.name}` }));
        } catch (e) {
          console.error("Failed to get file from handle", e);
        }
      }
      
      if (items.length > 0) {
        await processItems(items);
      } else {
        setIsScanning(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        addToast('File picker failed', 'error');
      }
      setIsScanning(false);
    }
  };

  const cancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsScanning(false);
      setScanProgress({ phase: 'idle', current: 0, total: 0, label: 'Scan Aborted' });
      addToast('Media ingestion cancelled', 'info');
      
      // Filter out items that were still processing
      setLibrary(prev => prev.filter(i => i.status !== 'processing'));
    }
  };

  const clearLibrary = async () => {
    // Media local storage cleared (formerly vault)
    setLibrary(prev => prev.map(item => ({
      ...item,
      status: 'missing'
    })));
  };

  const wipeSavedLibrary = async () => {
    // 2. Clear state
    setLibrary([]);
    
    // 3. Clear cloud & local storage
    const profileId = activeProfile?.id || (activeProfile as any)?._id;
    if (profileId) {
      localStorage.removeItem(`library_meta_cache_${profileId}`);
      await axios.post(`/auth/profiles/${profileId}/sync`, { library: [] });
    } else {
      localStorage.removeItem('library_meta_cache');
    }
  };

  const updateProgress = useCallback((id: string, percentage: number) => {
    setLibrary(prev => {
      const updated = prev.map(item => 
        item.id === id ? { 
          ...item, 
          progressPercentage: percentage, 
          watched: percentage > 90,
          lastWatchedAt: Date.now() 
        } : item
      );
      return updated;
    });
  }, []);

  const toggleInMyList = useCallback((idOrItem: any) => {
    // Strategy: Find item, then trigger toast and state update separately
    setLibrary(prev => {
      let targetId = typeof idOrItem === 'string' ? idOrItem : null;
      let existingItem = null;

      if (targetId) {
        existingItem = prev.find(i => i.id === targetId);
      } else if (idOrItem && idOrItem.id) {
        existingItem = prev.find(i => i.meta?.tmdbId === idOrItem.id || i.id === `tmdb_${idOrItem.id}`);
      }

      if (existingItem) {
        const added = !existingItem.meta.inMyList;
        setTimeout(() => {
          addToast(added ? `${existingItem.meta.cleanTitle} added to My List` : `${existingItem.meta.cleanTitle} removed from My List`, 'success');
        }, 0);

        return prev.map(item => 
          item.id === existingItem.id ? { ...item, meta: { ...item.meta, inMyList: !item.meta.inMyList } } : item
        );
      } else if (idOrItem && idOrItem.id) {
        const title = idOrItem.title || idOrItem.name || idOrItem.original_name;
        setTimeout(() => addToast(`${title} added to My List`, 'success'), 0);

        const isTV = idOrItem.media_type === 'tv' || idOrItem.first_air_date;
        const newItem: LibraryItem = {
          id: `tmdb_${idOrItem.id}`,
          filename: '',
          relativePath: '',
          videoUrl: '',
          status: 'pending',
          size: 0,
          addedAt: Date.now(),
          watched: false,
          progressPercentage: 0,
          meta: {
            type: isTV ? 'series' : 'movie',
            cleanTitle: title,
            year: parseInt(idOrItem.release_date?.substring(0, 4) || idOrItem.first_air_date?.substring(0, 4)) || 0,
            poster: idOrItem.poster_path,
            backdrop: idOrItem.backdrop_path,
            overview: idOrItem.overview,
            rating: idOrItem.vote_average,
            tmdbId: idOrItem.id,
            inMyList: true,
            isLiked: false,
          }
        };
        return [...prev, newItem];
      }
      return prev;
    });
  }, []);

  const toggleLiked = useCallback((idOrItem: any) => {
    setLibrary(prev => {
      let targetId = typeof idOrItem === 'string' ? idOrItem : null;
      let existingItem = null;

      if (targetId) {
        existingItem = prev.find(i => i.id === targetId);
      } else if (idOrItem && idOrItem.id) {
        existingItem = prev.find(i => i.meta?.tmdbId === idOrItem.id || i.id === `tmdb_${idOrItem.id}`);
      }

      if (existingItem) {
        const isLiked = !existingItem.meta.isLiked;
        setTimeout(() => {
           addToast(isLiked ? `You liked ${existingItem?.meta.cleanTitle}` : `You unliked ${existingItem?.meta.cleanTitle}`, 'success');
        }, 0);
        return prev.map(item => 
          item.id === existingItem.id ? { ...item, meta: { ...item.meta, isLiked: !item.meta.isLiked } } : item
        );
      } else if (idOrItem && idOrItem.id) {
        const title = idOrItem.title || idOrItem.name || idOrItem.original_name;
        setTimeout(() => addToast(`You liked ${title}`, 'success'), 0);
        const isTV = idOrItem.media_type === 'tv' || idOrItem.first_air_date;
        const newItem: LibraryItem = {
          id: `tmdb_${idOrItem.id}`,
          filename: '',
          relativePath: '',
          videoUrl: '',
          status: 'pending',
          size: 0,
          addedAt: Date.now(),
          watched: false,
          progressPercentage: 0,
          meta: {
            type: isTV ? 'series' : 'movie',
            cleanTitle: title,
            year: parseInt(idOrItem.release_date?.substring(0, 4) || idOrItem.first_air_date?.substring(0, 4)) || 0,
            poster: idOrItem.poster_path,
            backdrop: idOrItem.backdrop_path,
            overview: idOrItem.overview,
            rating: idOrItem.vote_average,
            tmdbId: idOrItem.id,
            inMyList: false,
            isLiked: true,
          }
        };
        return [...prev, newItem];
      }
      return prev;
    });
  }, []);
  
  // TODO: Implement server-side re-upload instead of local relinking
  const relinkItem = useCallback(async (id: string) => {
    addToast('Server-side re-upload not implemented yet.', 'info');
    return false;
  }, []);

  const removeItems = async (ids: string[]) => {
    setLibrary(prev => {
      const updated = prev.filter(item => !ids.includes(item.id));
      return updated;
    });
  };

   // Derived
  const continueWatching = library
    .filter(i => i.progressPercentage > 0 && i.progressPercentage < 90)
    .sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
  
  const recentlyWatched = library
    .filter(i => i.progressPercentage >= 90 || i.watched)
    .sort((a, b) => (b.lastWatchedAt || b.addedAt) - (a.lastWatchedAt || a.addedAt));
  const myList = library.filter(i => i.meta.inMyList);
  const likedList = library.filter(i => i.meta.isLiked);

  return (
    <LibraryContext.Provider value={{
      library, groups, isScanning, setIsScanning, isInitialSyncing, scanProgress, processingCount: 0, error: null, hasLibrary: library.length > 0,
      isPro, setIsPro, movieCount, showCount,
      playItem,
      scanFiles,
      pickFiles,
      updateProgress,
      toggleInMyList, toggleLiked,
      continueWatching, recentlyWatched, myList, likedList, clearLibrary, wipeSavedLibrary, removeItems,
      toasts, removeToast, addToast
    }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
};
