import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryItem, LibraryGroup, groupLibrary, fetchTMDBMetadata } from '../services/libraryService';
import { identifyMediaBatch } from '../services/geminiService';
import { useAuth } from './AuthContext';
import axios from '../lib/axios';

import { 
  saveFileToVault, 
  deleteFileFromVault, 
  getFileBlob, 
  getVaultFiles, 
  getVaultStats, 
  saveMetadata, 
  loadMetadata 
} from '../lib/opfs';

import { 
  saveHandle, 
  getHandle, 
  verifyPermission, 
  deleteHandle,
  clearHandles
} from '../lib/idb';

interface ScanProgress {
  phase: 'idle' | 'scanning' | 'identifying' | 'metadata' | 'vaulting' | 'complete';
  current: number;
  total: number;
  label?: string;
}

interface VaultStats {
  used: number;
  quota: number;
  count: number;
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
  isVaulting: boolean;
  vaultStats: VaultStats | null;
  isInitialSyncing: boolean;
  scanProgress: ScanProgress;
  processingCount: number;
  error: string | null;
  hasLibrary: boolean;
  needsRelink: boolean;
  relinkLibrary: () => Promise<boolean>;
  playItem: (id: string, navigate: any) => Promise<void>;
  scanFiles: (files: FileList | File[]) => Promise<void>;
  pickFiles: () => Promise<void>;
  getFile: (id: string) => Promise<File | Blob | null>;
  updateProgress: (id: string, percentage: number) => void;
  toggleInMyList: (id: string) => void;
  toggleLiked: (id: string) => void;
  relinkItem: (id: string) => Promise<boolean>;
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

  const [isVaulting, setIsVaulting] = useState(false);
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>({ used: 0, quota: 100 * 1024 * 1024 * 1024, count: 0 }); // 100GB dummy quota for Phantom UI
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ phase: 'idle', current: 0, total: 0 });
  const [toasts, setToasts] = useState<any[]>([]);
  const initializedProfileId = React.useRef<string | null | undefined>(undefined);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const syncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastDebounceRef = React.useRef<{ message: string; timestamp: number } | null>(null);

  const groups = useMemo(() => groupLibrary(library), [library]);
  const movieCount = useMemo(() => groups.filter(g => g.type === 'movie').length, [groups]);
  const showCount = useMemo(() => groups.filter(g => g.type === 'series').length, [groups]);

  const handleKey = activeProfile ? `filmsort_dir_handle_${activeProfile.id}` : `filmsort_dir_handle_default`;

  const addToast = useCallback((message: string, type: any = 'info') => {
    const now = Date.now();
    if (
      toastDebounceRef.current && 
      toastDebounceRef.current.message === message && 
      now - toastDebounceRef.current.timestamp < 100
    ) {
      return; 
    }
    toastDebounceRef.current = { message, timestamp: now };
    
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const { loading: authLoading } = useAuth();

  // Synchronize Library with OPFS and Cloud Sync on mount
  const syncWithVaultContents = useCallback(async () => {
    if (authLoading) return;
    
    const profileId = activeProfile?.id || (activeProfile as any)?._id || 'guest';
    if (initializedProfileId.current === profileId) return;
    
    setIsInitialSyncing(true);
    
    try {
      console.log(`[LibrarySync] Initializing for profile: ${profileId}`);
      
      // Step 1: Physical Check (Reality Check)
      const vaultFiles = await getVaultFiles();
      const vaultFileNames = new Set(vaultFiles.map(f => f.name));
      
      // Step 2: Metadata Load (Level 1: OPFS, Level 2: LS, Level 3: Cloud)
      const opfsCache = await loadMetadata();
      let metaCache: LibraryItem[] = opfsCache || [];
      
      if (metaCache.length === 0) {
        const stored = localStorage.getItem(profileId ? `library_meta_cache_${profileId}` : 'library_meta_cache');
        if (stored) {
          try { metaCache = JSON.parse(stored); } catch (e) {}
        }
      }

      if (profileId) {
        try {
          const res = await axios.get(`/auth/profiles/${profileId}/sync`);
          if (res.data.library?.length > 0) metaCache = res.data.library;
        } catch (e) {}
      }

      // Step 3: Validation & Branding (The Senior Engineer Part)
      // Instead of filtering, we mark the status of items
      const libraryWithStatus = await Promise.all(metaCache.map(async item => {
        // Reality Check 1: Do we have a Phantom Pointer (Handle) in local IDB?
        const handle = await getHandle(item.id);
        if (handle) {
          // Even if permission is currently revoked by the browser (on reload), 
          // we have the handle, so we mark it as 'ready' to keep the grid UI clean.
          // The Watch page will handle the permission challenge.
          return { ...item, status: 'ready' as const };
        }

        // Reality Check 2: Is it in OPFS? (Legacy/Mobile Fallback)
        if (vaultFileNames.has(item.filename)) {
          return { ...item, status: item.status === 'processing' ? 'processing' : 'ready' };
        }
        
        return { ...item, status: 'missing' as const };
      }));
      
      // Look for Orphans (Physical files in OPFS NOT represented in metaCache)
      const metaFileNames = new Set(libraryWithStatus.map(i => i.filename));
      const orphans = vaultFiles.filter(vf => !metaFileNames.has(vf.name) && vf.name !== '.metadata.json');

      if (orphans.length > 0) {
        console.log(`[LibrarySync] Found ${orphans.length} orphans in Vault. Triggering background recovery.`);
        // Background recovery starts now
        recoverOrphans(orphans);
      }

      setLibrary(libraryWithStatus as LibraryItem[]);
      initializedProfileId.current = profileId;
    } catch (e) {
      console.error("[LibrarySync] Fatal sync error", e);
    } finally {
      setIsInitialSyncing(false);
    }
  }, [activeProfile?.id, authLoading]);

  const recoverOrphans = async (orphans: any[]) => {
    // This runs in background to heal the library
    try {
      const orphanFilenames = orphans.map(o => o.name);
      console.log("[Recovery] Identifying orphans:", orphanFilenames);
      
      const aiResults = await identifyMediaBatch(orphanFilenames);
      const recoveredItems: LibraryItem[] = [];

      for (const file of orphans) {
        const aiRes = aiResults.find(r => r.original_name === file.name);
        if (aiRes) {
          const id = "recovered_" + Math.random().toString(36).substring(2, 11);
          const tmdbMeta = await fetchTMDBMetadata(aiRes.clean_title, aiRes.type as any, aiRes.year);
          
          recoveredItems.push({
            id,
            filename: file.name,
            relativePath: file.name,
            status: 'ready',
            size: 0, // Unknown for recovered orphans
            addedAt: Date.now(),
            watched: false,
            progressPercentage: 0,
            meta: {
              type: aiRes.type as any,
              cleanTitle: aiRes.clean_title,
              year: aiRes.year,
              season: aiRes.season,
              episode: aiRes.episode,
              ...(tmdbMeta || {})
            }
          });
        }
      }

      if (recoveredItems.length > 0) {
        setLibrary(prev => [...prev, ...recoveredItems]);
        addToast(`Recovered ${recoveredItems.length} items from storage`, 'success');
      }
    } catch (e) {
      console.error("[Recovery] Failed", e);
    }
  };

  useEffect(() => {
    syncWithVaultContents();
  }, [syncWithVaultContents]);

  // Persistent Save Effect - ATOMIC & PROTECTED
  useEffect(() => {
    // CRITICAL: Do NOT save during sync or before initialization
    if (!initializedProfileId.current || isInitialSyncing) return;
    
    const profileId = activeProfile?.id || (activeProfile as any)?._id;

    // Safety: If library is suddenly empty but we find files in OPFS via stat, 
    // it's likely a state glitch. DO NOT wipe metadata yet.
    const runSave = async () => {
      const stats = await getVaultStats();
      if (library.length === 0 && stats.count > 0) {
        console.warn("[LibrarySync] Refusing to overwrite metadata with empty library while files exist.");
        return;
      }

      // Hardware Sync
      saveMetadata(library);

      // Local Secondary Sync
      const cacheKey = profileId ? `library_meta_cache_${profileId}` : 'library_meta_cache';
      localStorage.setItem(cacheKey, JSON.stringify(library));
        
      // Cloud Proxy Sync (Debounced)
      if (profileId) {
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
    };

    runSave();
    
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    }
  }, [library, activeProfile?.id, isInitialSyncing]);

  const relinkLibrary = useCallback(async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        addToast('Directory syncing is not supported in this browser. Please link files individually.', 'info');
        return false;
      }
      
      let dirHandle;
      try {
        dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read'
        });
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
        throw err;
      }

      setIsScanning(true);
      setScanProgress({ phase: 'scanning', current: 0, total: library.length, label: 'Scanning directory for lost media...' });

      // Helper to recursively find video files in the selected directory
      const findVideoHandles = async (dirHandle: any, path: string = ''): Promise<{name: string, handle: any}[]> => {
        let results: {name: string, handle: any}[] = [];
        try {
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              if (entry.name.match(/\.(mp4|mkv|avi|mov|webm)$/i)) {
                results.push({ name: entry.name, handle: entry });
              }
            } else if (entry.kind === 'directory') {
              // Optionally recursively search, but depth limited just in case
              const subResults = await findVideoHandles(entry, `${path}${entry.name}/`);
              results = results.concat(subResults);
            }
          }
        } catch (e) {
          console.warn('Could not read some directory contents', e);
        }
        return results;
      };

      const videoHandles = await findVideoHandles(dirHandle);
      let recoveredCount = 0;

      // Match found handles with library items
      for (const vHandle of videoHandles) {
        const matchingItem = library.find(item => item.filename === vHandle.name && item.status !== 'processing');
        if (matchingItem) {
          await saveHandle(matchingItem.id, vHandle.handle);
          recoveredCount++;
          
          setLibrary(prev => prev.map(p => {
             if (p.id === matchingItem.id) {
               return { ...p, status: 'ready' as const };
             }
             return p;
          }));
        }
      }

      setIsScanning(false);
      setScanProgress({ phase: 'idle', current: 0, total: 0 });

      if (recoveredCount > 0) {
        addToast(`Successfully re-linked ${recoveredCount} media files!`, 'success');
        return true;
      } else {
        addToast('No matching files found in the selected folder.', 'error');
        return false;
      }

    } catch (e: any) {
      console.error("Relink directory error", e);
      addToast('Failed to sync directory', 'error');
      setIsScanning(false);
      return false;
    }
  }, [library, addToast]);

  // Refresh Vault Stats
  const refreshVaultStats = useCallback(async () => {
    try {
      const stats = await getVaultStats();
      // For Phantom Upload, "Used" is just the metadata count or tiny OPFS cache
      setVaultStats({
        used: stats.used,
        quota: 100 * 1024 * 1024 * 1024, // 100GB Virtual limit for better UX
        count: library.length
      });
    } catch (e) {
      console.error("Failed to fetch vault stats", e);
    }
  }, [library.length]);

  useEffect(() => {
    refreshVaultStats();
  }, [refreshVaultStats, library]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFile = useCallback(async (id: string): Promise<File | Blob | null> => {
    const item = library.find(i => i.id === id);
    if (!item) return null;

    try {
      // Priority 1: Phantom Handle (Local SSD Access - Zero latency)
      const handle = await getHandle(id);
      if (handle) {
        if (await verifyPermission(handle)) {
          return await handle.getFile();
        }
      }

      // Priority 2: Vault (OPFS - Browser Sandbox)
      const vaultFiles = await getVaultFiles();
      const vaultEntry = vaultFiles.find(f => f.name === item.filename);
      if (vaultEntry) {
        return await getFileBlob(vaultEntry.handle);
      }
    } catch (e) {
        console.error("Media access error", e);
    }
    return null;
  }, [library]);

  // Sync to Vault (OPFS) for persistent access
  const syncToVault = useCallback(async (itemsWithFiles: Array<{item: LibraryItem, sourceFile: File}>) => {
    if (itemsWithFiles.length === 0) return;
    setIsVaulting(true);
    let vaulted = 0;

    for (const { item, sourceFile } of itemsWithFiles) {
      try {
        await saveFileToVault(sourceFile);
        vaulted++;
        setScanProgress(p => ({ 
          ...p, 
          phase: 'vaulting', 
          current: vaulted, 
          total: itemsWithFiles.length, 
          label: `Saving: ${item.meta.cleanTitle}` 
        }));
      } catch (err) {
        console.error(`Save failed for ${item.meta.cleanTitle}:`, err);
      }
    }

    setIsVaulting(false);
    refreshVaultStats();
    if (vaulted > 0) {
      addToast(`${vaulted} items successfully added to your collection`, 'success');
    }
  }, [refreshVaultStats]);

  const playItem = useCallback(async (id: string, navigate: any) => {
    const item = library.find(i => i.id === id);
    if (!item) return;

    navigate(`/watch/local/${id}`);
  }, [library]);

  const processItems = async (items: Array<{filename: string, file: File, relativePath: string, handle?: FileSystemFileHandle}>) => {
    setIsScanning(true);
    abortControllerRef.current = new AbortController();
    setScanProgress({ phase: 'scanning', current: 0, total: items.length, label: 'Adding Phantom Pointers...' });
    
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
      
      // If we have a handle (Phantom Upload), save it to IDB immediately
      if (item.handle) {
        await saveHandle(id, item.handle);
      }

      initialItems.push({
        id,
        filename: item.filename,
        relativePath: item.relativePath,
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
          // Merge: Connect the handle to the existing ID
          const handle = await getHandle(item.id);
          if (handle) {
            await saveHandle(existingItem.id, handle);
            await deleteHandle(item.id); // Clean up the temporary one
          }
          
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

      setScanProgress({ phase: 'complete', current: items.length, total: items.length, label: 'Phantom Linkage Successful' });
    } catch (e) {
      console.error("Error during processing", e);
      addToast('Error during Phantom linkage', 'error');
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
      // If we're in an iframe, showOpenFilePicker might be restricted by browser policy
      // regardless of whether it "exists" in window.
      if (!('showOpenFilePicker' in window)) {
        addToast('Persistent Phantom Links require a desktop browser. On mobile, files must be re-selected each time.', 'info');
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
      
      setScanProgress({ phase: 'scanning', current: 0, total: handles.length, label: 'Establishing Phantom Pointers...' });
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
      setIsVaulting(false);
      setScanProgress({ phase: 'idle', current: 0, total: 0, label: 'Scan Aborted' });
      addToast('Media ingestion cancelled', 'info');
      
      // Filter out items that were still processing
      setLibrary(prev => prev.filter(i => i.status !== 'processing'));
    }
  };

  const clearLibrary = async () => {
    try {
      const vaultFiles = await getVaultFiles();
      for (const file of vaultFiles) {
        await deleteFileFromVault(file.name);
      }
      
      await clearHandles();
      
      // We DON'T wipe metadata anymore as per user request to keep library persistent
      // Instead, we mark all items as missing since the files are gone
      setLibrary(prev => prev.map(item => ({
        ...item,
        status: 'missing'
      })));
      
      addToast('Local video storage cleared. Phantom links and Metadata remain.', 'success');
      refreshVaultStats();
    } catch (e) {
      console.error("Failed to clear local vault", e);
      addToast('Failed to clear vault', 'error');
    }
  };

  const wipeSavedLibrary = async () => {
    try {
      // 1. Delete all physical files to avoid the protection block
      const vaultFiles = await getVaultFiles();
      for (const file of vaultFiles) {
        await deleteFileFromVault(file.name);
      }

      await clearHandles();

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

      addToast('Library wiped from device and cloud', 'success');
      refreshVaultStats();
    } catch (e) {
      console.error("Failed to wipe saved library", e);
      addToast('Failed to wipe saved library', 'error');
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
  
  const relinkItem = useCallback(async (id: string) => {
    const item = library.find(i => i.id === id);
    if (!item) return false;

    try {
      if (!('showOpenFilePicker' in window)) {
        addToast('Persistent links not supported in this browser. Selecting file for this session.', 'info');
        triggerStandardPicker(false);
        return true; 
      }

      let handles;
      try {
        handles = await (window as any).showOpenFilePicker({
          multiple: false,
          types: [{
            description: 'Video File',
            accept: { 'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.webm'] }
          }]
        });
      } catch (pickerErr: any) {
        if (pickerErr.name === 'SecurityError' || pickerErr.message.includes('cross origin')) {
          addToast('Restricted environment. Selecting file for this session.', 'info');
          triggerStandardPicker(false);
          return true;
        }
        throw pickerErr;
      }

      const [handle] = handles;

      const file = await handle.getFile();
      
      // THE FIX: Save as a Phantom Handle (Pointer), NOT to the Vault.
      await saveHandle(id, handle);
      
      setLibrary(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'ready', filename: file.name, size: file.size } : p
      ));
      
      addToast(`${item.meta.cleanTitle} successfully linked locally!`, 'success');
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        addToast('Relink failed', 'error');
      }
      return false;
    }
  }, [library]);

  const removeItems = async (ids: string[]) => {
    const itemsToRemove = library.filter(item => ids.includes(item.id));
    
    for (const item of itemsToRemove) {
      try {
        await deleteFileFromVault(item.filename);
        await deleteHandle(item.id);
      } catch (e) {
        console.error(`Failed to delete ${item.filename} from storage`, e);
      }
    }

    setLibrary(prev => {
      const updated = prev.filter(item => !ids.includes(item.id));
      return updated;
    });
    
    refreshVaultStats();
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
      library, groups, isScanning, setIsScanning, isVaulting, isInitialSyncing, vaultStats, scanProgress, processingCount: 0, error: null, hasLibrary: library.length > 0,
      isPro, setIsPro, movieCount, showCount,
      needsRelink: false, relinkLibrary, playItem,
      scanFiles, pickFiles, getFile, updateProgress,
      toggleInMyList, toggleLiked, cancelScan, relinkItem,
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
