import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, 
  Volume2, VolumeX, Maximize, Minimize, Layers,
  MessageSquare, SkipForward, Loader, ChevronRight, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from '../lib/axios';
import { useLibrary } from '../context/LibraryContext';
import { useAuth } from '../context/AuthContext';

export default function Watch() {
  const { type, movieId } = useParams<{ type: string; movieId: string }>();
  const navigate = useNavigate();
  const { library, updateProgress, getFile, needsRelink, relinkLibrary } = useLibrary();
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

  const [showAutoPlay, setShowAutoPlay] = useState(false);
  
  // ── Resource Management ───────────────────────────────────────────────
  useEffect(() => {
    const activeMovieId = movieId;

    async function preparePlayer() {
      // Don't re-run if we already have a video source for this specific movie
      setLoading(true);
      setError(null);
      
      try {
        if (type === 'local') {
          // Find item without adding entire 'library' array to useEffect deps
          const item = library.find(li => li.id === activeMovieId);
          if (!item) throw new Error("Item not found in library.");
          
          setMetadata(item.meta);
          
          // Priority 1: Local File System (Instant)
          const file = await getFile(activeMovieId!);
          if (file) {
            setVideoSrc(URL.createObjectURL(file));
            setLoading(false);
            return;
          }

          // Priority 2: Cloudinary/Firebase Direct URL (Streaming fallback)
          if (item.videoUrl) {
            setVideoSrc(item.videoUrl);
            setLoading(false);
            return;
          }

          // Error handling
          const status = item.status === 'processing' 
            ? "Sync in Progress: Your media is currently being analyzed. Please wait a moment." 
            : "Video File Missing: This item is synced to your Cloud Library, but the physical video file has not been uploaded to this specific device's secure Vault.";
          throw new Error(status);
        } else {
          // Standard TMDB logic
          const endpoint = type === 'tv' ? `/tmdb/tv/${activeMovieId}` : `/tmdb/movie/${activeMovieId}`;
          const response = await axios.get(endpoint);
          setMetadata(response.data);
          setVideoSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
          setLoading(false);
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
  }, [movieId, type, needsRelink]); 

  // ... rest of the component

  const lastTimeRef = useRef<number>(0);

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

      const blob = new Blob([vttContent], { type: 'text/vtt' });
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
        <AlertCircle className="w-16 h-16 text-[#e50914] mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong.</h2>
        <p className="text-gray-400 mb-8 max-w-md">{error}</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleBack}
            className="bg-white/10 text-white px-8 py-3 rounded-2xl font-bold hover:bg-white/20 transition"
          >
            Go Back
          </button>
          
          {(error.includes("re-link") || needsRelink) && (
            <button 
              onClick={relinkLibrary}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              Relink & Play
            </button>
          )}
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
      
      <video
        ref={videoRef}
        src={videoSrc || ''}
        className="h-full w-full object-contain cursor-none"
        autoPlay
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={handlePause}
        onEnded={handleVideoEnded}
        onClick={togglePlay}
        onError={() => {
          console.error("Video Playback Error for source:", videoSrc);
          if (videoSrc?.includes('/api/drive/stream')) {
            setError("The video stream is currently being blocked or processed by Google Drive. This is common for newly uploaded files (Google takes 1-2 minutes to scan them) or if your session has expired. Try clicking 'Back' and then Play again in a minute.");
          } else {
            setError("The video element has no supported sources or the file is corrupt. Please check if your browser supports this video format.");
          }
        }}
        style={{ cursor: showControls ? 'default' : 'none' }}
      >
        {subtitleSrc && (
          <track 
            kind="subtitles" 
            src={subtitleSrc} 
            srcLang="en" 
            label="English" 
            default 
          />
        )}
      </video>

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

      {/* Layered Atmospherics (Recipe 7) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-between"
          >
            {/* Top Bar - Glassmorphism */}
            <div className="flex items-center gap-6 px-4 md:px-12 pt-12 pb-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
              <button 
                onClick={handleBack}
                className="text-white hover:scale-110 transition p-2 bg-white/10 rounded-full hover:bg-white/20"
              >
                <ArrowLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>
              <div className="flex flex-col flex-1 min-w-0">
                <h1 className="text-white text-2xl md:text-3xl font-bold truncate tracking-tight">{title}</h1>
                <p className="text-gray-300 text-xs md:text-sm font-medium uppercase tracking-[0.2em] opacity-70">{subtitle}</p>
              </div>
            </div>

            {/* Center HUD - Premium Interactive Feedback */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center gap-12 md:gap-32 pointer-events-auto">
                <button 
                  onClick={() => skip(-10)}
                  className="text-white/80 hover:text-white relative transition group"
                >
                  <RotateCcw className="w-12 h-12 md:w-20 md:h-20" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-bold mt-1 group-hover:scale-110 transition">10</span>
                </button>

                <button 
                  onClick={togglePlay}
                  className="text-white hover:scale-110 transition-transform duration-200"
                >
                  {isPlaying 
                    ? <Pause className="w-20 h-20 md:w-32 md:h-32 fill-current" /> 
                    : <Play className="w-20 h-20 md:w-32 md:h-32 fill-current ml-2" />
                  }
                </button>

                <button 
                  onClick={() => skip(10)}
                  className="text-white/80 hover:text-white relative transition group"
                >
                  <RotateCw className="w-12 h-12 md:w-20 md:h-20" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-bold mt-1 group-hover:scale-110 transition">10</span>
                </button>
              </div>
            </div>

            {/* Bottom Bar - Hardware Tool Mix (Recipe 3/8) */}
            <div className="px-4 md:px-12 pb-12 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
              {/* Refined Progress Bar */}
              <div className="relative flex-grow h-1 bg-white/20 rounded-full mb-8 group/seek">
                <input 
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                />
                {/* Visual Track */}
                <div 
                  className="absolute top-0 left-0 h-full bg-[#e50914] rounded-full pointer-events-none z-10 transition-[width] duration-100 ease-linear"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#e50914] rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-[0_0_15px_rgba(229,9,20,0.8)]" />
                </div>
                {/* Buffer rail (visual only) */}
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
                    onClick={toggleFullscreen}
                    className="text-white opacity-70 hover:opacity-100 transition"
                  >
                    {isFullscreen ? <Minimize className="w-6 h-6 md:w-8 md:h-8" /> : <Maximize className="w-6 h-6 md:w-8 md:h-8" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 0;
          height: 0;
        }
        .hide-cursor {
          cursor: none !important;
        }
      `}</style>
    </div>
  );
}
