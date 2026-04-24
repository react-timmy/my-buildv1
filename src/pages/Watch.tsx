import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, 
  Volume2, VolumeX, Maximize, Minimize, Layers,
  MessageSquare, SkipForward, Loader, ChevronRight, AlertCircle, Gauge, ScanLine, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from '../lib/axios';
import { useLibrary } from '../context/LibraryContext';
import { useAuth } from '../context/AuthContext';
import { NativeBridge } from '../services/nativeBridge';

export default function Watch() {
  const { type, movieId } = useParams<{ type: string; movieId: string }>();
  const navigate = useNavigate();
  const { library, updateProgress } = useLibrary();
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  const [metadata, setMetadata] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
  const [subtitleName, setSubtitleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCover, setIsCover] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showAutoPlay, setShowAutoPlay] = useState(false);

  // Gesture State
  const [videoContrast, setVideoContrast] = useState(100);
  const [activeGesture, setActiveGesture] = useState<'volume' | 'contrast' | null>(null);
  const [gestureValue, setGestureValue] = useState(0);

  const lastTapTime = useRef(0);
  const tapTimeout = useRef<any>(null);
  const startY = useRef(0);
  const currentDragType = useRef<'volume' | 'contrast' | null>(null);
  const startVal = useRef(0);
  
  // ── Gestures ──────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, region: 'left' | 'center' | 'right') => {
    startY.current = e.clientY;
    if (region === 'right') {
      currentDragType.current = 'volume';
      startVal.current = videoRef.current ? videoRef.current.volume * 100 : 100;
    } else if (region === 'left') {
      currentDragType.current = 'contrast';
      startVal.current = videoContrast;
    } else {
      currentDragType.current = null;
    }

    const now = Date.now();
    if (now - lastTapTime.current < 250) {
      // Double tap confirmed
      clearTimeout(tapTimeout.current);
      lastTapTime.current = 0;
      if (region === 'left') skip(-10);
      else if (region === 'right') skip(10);
    } else {
      lastTapTime.current = now;
      tapTimeout.current = setTimeout(() => {
        if (lastTapTime.current === now && !activeGesture) {
          togglePlay();
        }
      }, 250);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentDragType.current) return;
    if (e.pointerType === 'mouse' && e.buttons !== 1) return; // Only process drag when mouse is held down

    const deltaY = startY.current - e.clientY;
    if (Math.abs(deltaY) > 15) {
      // Drag detected, cancel any single click action
      lastTapTime.current = 0;
      clearTimeout(tapTimeout.current);

      const type = currentDragType.current;
      setActiveGesture(type);

      const change = deltaY * 0.4;
      if (type === 'volume') {
        let newVal = startVal.current + change;
        newVal = Math.max(0, Math.min(100, newVal));
        if (videoRef.current) {
          videoRef.current.volume = newVal / 100;
          setIsMuted(newVal === 0);
        }
        setGestureValue(newVal);
      } else if (type === 'contrast') {
        let newVal = startVal.current + change;
        newVal = Math.max(20, Math.min(200, newVal));
        setVideoContrast(newVal);
        setGestureValue(((newVal - 20) / 180) * 100);
      }
    }
  };

  const handlePointerUp = () => {
    currentDragType.current = null;
    setTimeout(() => {
      setActiveGesture(prev => prev === activeGesture ? null : prev);
    }, 800);
  };

  // ── Resource Management ───────────────────────────────────────────────
  useEffect(() => {
    const activeMovieId = movieId;

    async function preparePlayer() {
      // Don't re-run if we already have a video source for this specific movie
      setLoading(true);
      setError(null);
      
      try {
        const item = library.find(li => li.id === activeMovieId);
        if (!item) throw new Error("Item not found in library.");
        
        setMetadata(item.meta);
        
        // Priority 1: Native Mobile Path (VLC Logic)
        if (NativeBridge.isNative() && item.relativePath) {
          // If relativePath is a full filesystem path (common in wrapped apps)
          const nativeUrl = NativeBridge.getFileUrl({
             name: item.filename,
             path: item.relativePath,
             size: 0,
             type: 'video',
             lastModified: item.addedAt || 0
          });
          setVideoSrc(nativeUrl);
          setLoading(false);
          return;
        }

        // Priority 2: Direct File object (in-memory, e.g. after just scanning)
        if (item.file) {
          const url = URL.createObjectURL(item.file);
          setVideoSrc(url);
          setLoading(false);
          return;
        } 
        
        // Priority 2: File System Handle (persistent across sessions, but needs permission)
        if (item.handle) {
          try {
            // Verify permission
            const options = { mode: 'read' as const };
            if (await (item.handle as any).queryPermission(options) === 'granted' || 
                await (item.handle as any).requestPermission(options) === 'granted') {
              const file = await item.handle.getFile();
              const url = URL.createObjectURL(file);
              setVideoSrc(url);
              setLoading(false);
              return;
            }
          } catch (pickerErr) {
            console.warn("FS Handle access failed:", pickerErr);
          }
        }

        // Priority 3: External URL (Firebase/Cloud Storage)
        if (item.videoUrl) {
          setVideoSrc(item.videoUrl);
          setLoading(false);
          return;
        }

        // Priority 4: Server Streaming (only if it's a real DB ID, not a 'phantom' ID)
        if (!activeMovieId.startsWith('phantom_')) {
          setVideoSrc(`/api/videos/stream/${activeMovieId}`);
          setLoading(false);
        } else {
          // If it's a phantom ID and we reached here, the local file is missing
          throw new Error("Local file is no longer accessible. Please re-upload or re-link the folder containing your media.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load video.");
        setLoading(false);
      }
    }
    
    // reset playback state on new video load
    setVideoSrc(null);
    preparePlayer();
    
    return () => {
      // Cleanup object URL if it was local purely to avoid memory leaks
      setVideoSrc(currentSrc => {
        if (currentSrc && currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc);
        }
        return null;
      });
      setSubtitleSrc(currentSub => {
        if (currentSub && currentSub.startsWith('blob:')) {
          URL.revokeObjectURL(currentSub);
        }
        return null;
      });
    }
    // intentionally omitted 'library' and 'getFile' to stop the video player from reloading every 5 seconds when progress updates!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, type]); 

  // ... rest of the component

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);


  // ── Subtitle Parser (SRT -> VTT) ──────────────────────────────────────────
  const parseSrtToVtt = (srtContent: string) => {
    let vtt = 'WEBVTT\n\n';
    const lines = srtContent.split(/\r?\n/);
    for (const line of lines) {
      if (line.includes('-->')) {
        // VTT expects periods for milliseconds instead of commas
        vtt += line.replace(/,/g, '.') + '\n';
      } else {
        vtt += line + '\n';
      }
    }
    return vtt;
  };

  const handleSubtitleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let vttContent = text;
      
      if (file.name.toLowerCase().endsWith('.srt')) {
        vttContent = parseSrtToVtt(text);
      } else if (!text.startsWith('WEBVTT')) {
        // Ensuring .vtt files actually have the required header
        vttContent = 'WEBVTT\n\n' + text;
      }

      const blob = typeof Blob !== 'undefined' ? new Blob([vttContent], { type: 'text/vtt' }) : null;
      if (!blob) throw new Error("Blob constructor not supported.");
      const url = URL.createObjectURL(blob);
      
      setSubtitleSrc(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setSubtitleName(file.name);
      
      if (videoRef.current) {
        // Enable the track automatically when loaded
        setTimeout(() => {
          if (videoRef.current && videoRef.current.textTracks.length > 0) {
            videoRef.current.textTracks[0].mode = 'showing';
          }
        }, 100);
      }
    } catch (err) {
      console.error("Failed to parse subtitle file:", err);
      alert("Failed to parse subtitle file. Ensure it is a valid .srt or .vtt file.");
    }
    
    // Reset file input so same file can be uploaded again if needed
    if (e.target) e.target.value = '';
  };

  // ── Player Logic ──────────────────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  const showControlsNow = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const handleActivity = () => showControlsNow();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    scheduleHide();
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showControlsNow, scheduleHide]);

  // Restore progress once on metadata load
  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
      if (type === 'local') {
        const item = library.find(li => li.id === movieId);
        if (item && item.progressPercentage > 0) {
          videoRef.current.currentTime = (item.progressPercentage / 100) * videoRef.current.duration;
          lastProgressUpdateTime.current = videoRef.current.currentTime;
        }
      } else {
        const saved = localStorage.getItem(`progress_${movieId}`);
        if (saved) {
          videoRef.current.currentTime = parseFloat(saved);
          lastProgressUpdateTime.current = videoRef.current.currentTime;
        }
      }
    }
  }

  const lastProgressUpdateTime = useRef<number>(0);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      
      // Update context every 5 seconds
      if (Math.abs(current - lastProgressUpdateTime.current) >= 5) {
        saveProgressToContext();
        lastProgressUpdateTime.current = current;
      }
    }
  };

  // Push progress up to context
  const saveProgressToContext = useCallback(() => {
    if (videoRef.current && duration > 0) {
      const time = videoRef.current.currentTime;
      if (time > 0) {
        if (type === 'local') {
          const progress = (time / duration) * 100;
          // If progress is > 90%, it's considered finished for the "Continue Watching" list
          updateProgress(movieId!, progress);
        } else {
          localStorage.setItem(`progress_${movieId}`, time.toString());
        }
      }
    }
  }, [movieId, duration, updateProgress, type]);

  // Save when the player is paused
  const handlePause = () => {
    setIsPlaying(false);
    saveProgressToContext();
  };

  // Save when unmounting
  useEffect(() => {
    return () => {
      saveProgressToContext();
    };
  }, [saveProgressToContext]);

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    showControlsNow();
  }

  function skip(secs: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + secs, duration));
    showControlsNow();
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  const handleBack = () => {
    // If we have history, go back. Otherwise go to browse.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/browse');
    }
  };

  const currentLibraryItem = type === 'local' ? library.find(li => li.id === movieId) : null;
  let nextEpisodeId: string | null = null;
  
  if (currentLibraryItem && currentLibraryItem.meta.type === 'series') {
    const currentSeason = currentLibraryItem.meta.season || 0;
    const currentEpisode = currentLibraryItem.meta.episode || 0;
    const folderName = currentLibraryItem.meta.folderName || currentLibraryItem.meta.cleanTitle;

    // Find siblings in the same series
    const siblings = library.filter(i => (i.meta.folderName || i.meta.cleanTitle) === folderName);
    
    // Attempt to find strictly the next episode
    const nextEp = siblings.find(i => 
      (i.meta.season === currentSeason && i.meta.episode === currentEpisode + 1) || 
      (i.meta.season === currentSeason + 1 && i.meta.episode === 1)
    );

    if (nextEp) {
      nextEpisodeId = nextEp.id;
    }
  }

  const handleNextEpisode = () => {
    if (nextEpisodeId) {
      setShowAutoPlay(false);
      navigate(`/watch/local/${nextEpisodeId}`, { replace: true });
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    updateProgress(movieId!, 100);
    if (nextEpisodeId) {
      setShowAutoPlay(true);
      // Auto-play after 5 seconds if not cancelled
      const timeoutId = setTimeout(() => {
        handleNextEpisode();
      }, 5000);
      
      // Store timeout ID to clear if user navigates away or cancels
      (window as any).autoPlayTimeout = timeoutId;
    }
  };

  const cancelAutoPlay = () => {
    setShowAutoPlay(false);
    if ((window as any).autoPlayTimeout) {
      clearTimeout((window as any).autoPlayTimeout);
    }
  };

  useEffect(() => {
    return () => {
      if ((window as any).autoPlayTimeout) clearTimeout((window as any).autoPlayTimeout);
    };
  }, []);

  // Removed local file access logic

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <Loader className="w-12 h-12 text-[#e50914] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(255,107,0,0.2)]">
            <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        
        <h2 className="text-3xl font-black mb-4 tracking-tighter">
          Something went wrong
        </h2>
        
        <p className="text-white/40 mb-10 max-w-md text-sm leading-relaxed uppercase tracking-widest font-bold">
          {error || "Failed to load video."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleBack}
            className="px-10 py-4 bg-white/5 text-white/60 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-white/10 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const title = metadata?.title || metadata?.name || metadata?.original_name || metadata?.cleanTitle || 'Local Video';
  const subtitle = type === 'tv' || metadata?.type === 'series' 
    ? (metadata?.season != null ? `Watching S${metadata.season}E${metadata.episode || 1}` : 'Series') 
    : metadata?.tagline || 'Streaming from Vault';

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden group">
      <input 
        type="file" 
        ref={subtitleInputRef} 
        onChange={handleSubtitleUpload} 
        accept=".srt,.vtt" 
        className="hidden" 
      />
      
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc || ''}
          autoPlay
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={handlePause}
          onEnded={handleVideoEnded}
          className={`h-full w-full z-10 transition-all duration-700 ${isCover ? 'object-cover' : 'object-contain'}`}
          style={{ 
            cursor: showControls ? 'default' : 'none',
            filter: `contrast(${videoContrast}%)`
          }}
          onError={() => {
            console.error("Video Playback Error for source:", videoSrc);
            if (videoSrc?.includes('/api/drive/stream')) {
              setError("The video stream is currently being blocked or processed by Google Drive. This is common for newly uploaded files (Google takes 1-2 minutes to scan them) or if your session has expired. Try clicking 'Back' and then Play again in a minute.");
            } else {
              setError("The video element has no supported sources or the file is corrupt. Please check if your browser supports this video format.");
            }
          }}
        >
          {subtitleSrc && typeof Blob !== 'undefined' && (
            <track 
              kind="subtitles" 
              src={subtitleSrc} 
              srcLang="en" 
              label="English" 
              default 
            />
          )}
        </video>
      </div>

      {/* Gesture Interaction Zones */}
      {!isLocked && (
        <div className="absolute inset-0 z-20 flex" style={{ touchAction: 'none' }}>
          <div 
            className="flex-1" 
            onPointerDown={(e) => handlePointerDown(e, 'left')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          <div 
            className="flex-1" 
            onPointerDown={(e) => handlePointerDown(e, 'center')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          <div 
            className="flex-1" 
            onPointerDown={(e) => handlePointerDown(e, 'right')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      )}

      {/* Visual Gesture UI */}
      <AnimatePresence>
        {activeGesture && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-4 z-50 pointer-events-none"
          >
            <span className="text-white text-xs font-bold uppercase tracking-widest">{activeGesture === 'volume' ? 'Volume' : 'Contrast'}</span>
            <div className="w-2 h-32 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
              <div 
                className="w-full bg-orange-500 transition-all duration-75"
                style={{ height: `${gestureValue}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Play Next Episode Overlay */}
      <AnimatePresence>
        {showAutoPlay && nextEpisodeId && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-32 right-12 z-50 bg-[#181818]/90 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 hidden md:flex"
          >
            <h3 className="text-white font-bold text-lg">Next Episode starting...</h3>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                <motion.circle 
                  cx="48" 
                  cy="48" 
                  r="44" 
                  stroke="#e50914" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeDasharray="276"
                  initial={{ strokeDashoffset: 276 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </svg>
              <button 
                onClick={handleNextEpisode}
                className="absolute inset-0 m-auto w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition group"
              >
                <Play className="w-6 h-6 text-black ml-1" />
              </button>
            </div>
            <button 
              onClick={cancelAutoPlay}
              className="text-white/60 hover:text-white text-sm mt-2 transition"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Original Layered Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col justify-between pointer-events-none"
          >
            {/* Top Bar */}
            <div className={`flex items-center gap-6 px-4 md:px-12 pt-12 pb-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto ${isLocked ? 'justify-start' : ''}`}>
              <button 
                onClick={handleBack}
                className={`text-white hover:scale-110 transition p-2 bg-white/10 rounded-full hover:bg-white/20 ${isLocked ? 'hidden' : ''}`}
              >
                <ArrowLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>
              
              <button 
                 onClick={() => setIsLocked(!isLocked)}
                 className="text-white hover:scale-110 transition p-2 bg-white/10 rounded-full hover:bg-white/20 relative z-50 pointer-events-auto"
              >
                 {isLocked ? <Lock className="w-8 h-8 md:w-10 md:h-10 text-orange-500" /> : <Unlock className="w-8 h-8 md:w-10 md:h-10" />}
              </button>

              {!isLocked && (
                <div className="flex flex-col flex-1 min-w-0">
                  <h1 className="text-white text-2xl md:text-3xl font-bold truncate tracking-tight">{title}</h1>
                  <p className="text-gray-300 text-xs md:text-sm font-medium uppercase tracking-[0.2em] opacity-70">{subtitle}</p>
                </div>
              )}
            </div>

            {!isLocked && (
              <>
                {/* Center HUD */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center justify-center gap-12 md:gap-24 pointer-events-auto">
                    <button 
                      onClick={() => skip(-10)}
                      className="text-white/80 hover:text-white relative transition group"
                    >
                      <RotateCcw className="w-10 h-10" />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-1 group-hover:scale-110 transition">10</span>
                    </button>

                    <button 
                      onClick={togglePlay}
                      className="text-white hover:scale-110 transition-transform duration-200"
                    >
                      {isPlaying 
                        ? <Pause className="w-16 h-16 fill-current" /> 
                        : <Play className="w-16 h-16 fill-current ml-2" />
                      }
                    </button>

                    <button 
                      onClick={() => skip(10)}
                      className="text-white/80 hover:text-white relative transition group"
                    >
                      <RotateCw className="w-10 h-10" />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mt-1 group-hover:scale-110 transition">10</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="px-4 md:px-12 pb-12 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-auto">
                  <div className="relative flex-grow h-1 bg-white/20 rounded-full mb-8 group/seek">
                    <input 
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleProgressChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                    />
                    <div 
                      className="absolute top-0 left-0 h-full bg-orange-500 rounded-full pointer-events-none z-10 transition-[width] duration-100 ease-linear"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-[0_0_15px_rgba(255,107,0,0.8)]" />
                    </div>
                    <div className="absolute top-0 left-0 h-full bg-white/10 rounded-full w-full pointer-events-none" />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6 md:gap-10">
                      <span className="text-white text-base md:text-lg font-mono tracking-tighter w-32">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className="text-white transition group"
                        >
                          {isMuted ? <VolumeX className="w-6 h-6 md:w-8 md:h-8" /> : <Volume2 className="w-6 h-6 md:w-8 md:h-8" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-10">
                      <button 
                        onClick={() => subtitleInputRef.current?.click()}
                        className="text-white flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 transition group"
                      >
                        <MessageSquare className="w-5 h-5 md:w-7 md:h-7" />
                        <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest leading-none">
                          {subtitleName ? 'Sub On' : 'Subtitles'}
                        </span>
                      </button>
                      
                      {(type === 'tv' || nextEpisodeId) && (
                        <button 
                          onClick={handleNextEpisode}
                          className="flex items-center gap-3 bg-white/15 px-4 md:px-6 py-2.5 rounded text-white font-bold hover:bg-white/25 transition group"
                        >
                          <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                          <span className="text-xs md:text-sm uppercase tracking-wider">Next Episode</span>
                        </button>
                      )}

                      <button 
                        onClick={() => setIsCover(!isCover)}
                        className="text-white opacity-40 hover:opacity-100 transition"
                      >
                        <ScanLine className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      <button 
                        onClick={() => setPlaybackRate(p => p >= 2 ? 0.5 : p + 0.5)}
                        className="text-white opacity-40 hover:opacity-100 transition flex items-center gap-1"
                      >
                        <Gauge className="w-6 h-6 md:w-8 md:h-8" />
                        <span className="text-xs font-mono">{playbackRate}x</span>
                      </button>

                      <button 
                        onClick={toggleFullscreen}
                        className="text-white opacity-70 hover:opacity-100 transition"
                      >
                        {isFullscreen ? <Minimize className="w-6 h-6 md:w-8 md:h-8" /> : <Maximize className="w-6 h-6 md:w-8 md:h-8" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
