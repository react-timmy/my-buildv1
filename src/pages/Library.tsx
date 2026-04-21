import React, { useRef, useState, useMemo } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { 
  RefreshCw, Camera, FolderOpen, Search, Filter, Play, Trash2, 
  LayoutGrid, List as ListIcon, Loader2, PlusCircle, X,
  Database, ShieldCheck, Activity, Settings as SettingsIcon,
  ChevronRight, HardDrive, Cpu, Film, Tv, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Library: React.FC = () => {
  const { activeProfile } = useAuth();
  const { 
    groups, 
    isScanning, 
    isVaulting,
    vaultStats,
    scanProgress, 
    scanFiles, 
    clearLibrary, 
    removeItems,
    addToast,
    needsRelink,
    relinkLibrary,
    playItem,
    pickFiles,
    cancelScan,
    isInitialSyncing
  } = useLibrary();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showVaultDetails, setShowVaultDetails] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'all' | 'movies' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'media' | 'system'>('overview');
  const [isSelecting, setIsSelecting] = useState(false);

  const movieGroups = useMemo(() => groups.filter(g => g.type === 'movie'), [groups]);
  const tvGroups = useMemo(() => groups.filter(g => g.type === 'series'), [groups]);

  const filteredMovies = useMemo(() => {
    if (searchQuery.trim()) {
      return movieGroups.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return movieGroups;
  }, [movieGroups, searchQuery]);

  const filteredTV = useMemo(() => {
    if (searchQuery.trim()) {
      return tvGroups.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return tvGroups;
  }, [tvGroups, searchQuery]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const vaultUsagePercent = useMemo(() => {
    if (!vaultStats || vaultStats.quota <= 0) return 0;
    const percent = (vaultStats.used / vaultStats.quota) * 100;
    if (vaultStats.used > 0 && percent < 1) return 1;
    return Math.round(percent);
  }, [vaultStats]);

  const handleCleanConfirm = () => {
    if (selectedForDeletion.length > 0) {
      removeItems(selectedForDeletion);
      addToast(`Permanently removed ${selectedForDeletion.length} items`, 'success');
      setSelectedForDeletion([]);
      setIsSelecting(false);
      setIsCleaning(false);
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      scanFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      scanFiles(e.dataTransfer.files);
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleItemClick = (item: any) => {
    if (isSelecting) {
      setSelectedForDeletion(prev => 
        prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
      );
      return;
    }
    playItem(item.id, navigate);
  };

  const scanToLayman = (phase: string, label?: string) => {
    switch (phase) {
      case 'scanning': return label || 'Adding files...';
      case 'identifying': return 'Identifying movies and shows...';
      case 'metadata': return label || 'Getting titles and posters...';
      case 'vaulting': return label || 'Saving to collection...';
      case 'complete': return 'Library ready';
      default: return label || 'Processing...';
    }
  };

  const tvStats = (group: any) => {
    const seasons = new Set(group.items.map((i: any) => i.meta.season).filter((s: any) => s !== undefined)).size || 1;
    const episodes = group.items.length;
    
    const seasonText = seasons === 1 ? '1 Season' : `${seasons} Seasons`;
    const episodeText = episodes === 1 ? '1 Episode' : `${episodes} Episodes`;
    
    if (seasons > 1 || episodes > 1) {
      return `${seasonText}, ${episodeText}`;
    }
    return `${seasonText}, ${episodeText}`; // Or just "1 Season, 1 Episode"
  };

  return (
    <div 
      className="min-h-screen bg-[#050505] selection:bg-brand-orange/30 pt-12"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Hidden File Input Fallback */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        className="hidden" 
        accept="video/*,.mkv" 
        onChange={handleFileSelect}
      />

      {/* Drag Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-orange/10 backdrop-blur-3xl border-4 border-dashed border-brand-orange/30 m-6 rounded-[3rem] flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="w-24 h-24 bg-brand-orange rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(255,107,0,0.4)] mb-8 animate-bounce">
              <PlusCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter">Release to save</h2>
            <p className="text-white/40 mt-3 font-medium uppercase tracking-widest text-xs">Ready to add to your collection</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
        {/* Header Section */}
        <div className="flex flex-col gap-10 mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white flex items-center justify-center rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                <Database className="w-8 h-8 text-black" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Vault</h1>
                <div className="flex items-center gap-3 mt-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                  <Link to="/browse" className="hover:text-white transition-colors">Home</Link>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-white">Collections & Storage</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="text"
                  placeholder="SEARCH COLLECTION..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 pl-12 pr-6 py-4 rounded-2xl text-xs font-medium uppercase tracking-widest text-white focus:border-brand-orange/40 outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleAddClick}
                className="px-8 py-4 bg-brand-orange text-white rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,107,0,0.3)] hover:shadow-[0_0_50px_rgba(255,107,0,0.5)] active:scale-95 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                <span className="hidden sm:inline">Add Files</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b border-white/5 pb-10">
            <div className="flex items-center gap-2 md:gap-4 p-1.5 bg-white/5 rounded-2xl border border-white/5">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'movies', label: 'Movies' },
                { id: 'tv', label: 'Shows' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLibraryTab(tab.id as any)}
                  className={`px-6 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeLibraryTab === tab.id ? 'bg-white text-black shadow-2xl' : 'text-white/40 hover:text-white/60'}`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
              <button 
                onClick={() => {
                  setIsSelecting(!isSelecting);
                  if (isSelecting) setSelectedForDeletion([]);
                }}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${isSelecting ? 'bg-red-500 text-white' : 'text-white/40 hover:text-red-500 hover:bg-red-500/10'}`}
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end gap-1">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${isScanning || isVaulting ? 'bg-brand-orange animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]'}`} />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">
                     {activeProfile?.name || 'Authorized'} // {isScanning || isVaulting ? 'Updating' : 'Ready'}
                   </span>
                 </div>
                 <div className="flex items-center gap-3 text-white/20 text-[9px] font-medium uppercase tracking-widest">
                    <span>{formatSize(vaultStats?.used || 0)} used</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span>{vaultStats?.count || 0} items</span>
                 </div>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <button 
                onClick={() => setShowVaultDetails(!showVaultDetails)}
                className={`p-3 rounded-xl border transition-all ${showVaultDetails ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'glass-card border-white/5 text-white/30 hover:text-white'}`}
              >
                <Activity className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Logs Plate (Conditionally visible below tabs) */}
        <AnimatePresence>
          {showVaultDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-16 glass-card rounded-3xl border-brand-blue/20 bg-brand-blue/[0.02] overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-brand-blue/10 rounded-2xl">
                    <Activity className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">System Status</h3>
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">General Information</p>
                  </div>
                </div>

                <div className="font-medium text-[10px] text-brand-blue/60 leading-loose uppercase space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-white/20">Library Check...</span>
                    <span className="font-black text-green-500 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-white/20">Storage Used...</span>
                    <div className="flex items-center gap-4">
                      <span className="text-white tabular-nums">{vaultUsagePercent}% FULL</span>
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-px">
                        <div className="h-full bg-brand-blue rounded-full" style={{ width: `${vaultUsagePercent}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-white/20">Device Storage...</span>
                    <span className="text-brand-orange">PRIVATE [ON_DEVICE]</span>
                  </div>
                  <div className="flex justify-between gap-12 mt-12">
                    <div className="flex-1 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-blue/30 transition-all group">
                      <h4 className="text-brand-blue font-black mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        Private Collection
                      </h4>
                      <p className="font-sans italic text-sm text-white/40 normal-case leading-relaxed">
                        Your library is kept strictly on this device. No media files leave your browser, ensuring complete privacy.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => relinkLibrary()}
                        className="px-6 py-4 rounded-xl border border-white/5 text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center gap-3 text-[9px] font-black"
                      >
                        <RefreshCw className="w-4 h-4" />
                        SYNC DETAILS
                      </button>
                      <button 
                         onClick={() => setIsCleaning(true)}
                         className="px-6 py-4 rounded-xl border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all flex items-center gap-3 text-[9px] font-black"
                      >
                        <Trash2 className="w-4 h-4" />
                        PURGE COLLECTION
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Grid Section */}
        <section className="space-y-20">
          {isInitialSyncing ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="w-16 h-16 border-4 border-white/5 border-t-brand-orange rounded-full animate-spin" />
              <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px]">Updating your collection...</p>
            </div>
          ) : (
            <>
              {/* Main Grid View */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                {(activeLibraryTab === 'all' || activeLibraryTab === 'movies' ? filteredMovies : []).map((group) => {
                  const item = group.items[0];
                  return (
                    <motion.div 
                      variants={itemAnim} initial="hidden" animate="show"
                      onClick={() => handleItemClick(item)} 
                      key={item.id}
                      className={`group/item relative flex flex-col gap-4 cursor-pointer ${
                        selectedForDeletion.includes(item.id) ? 'ring-4 ring-red-500 rounded-[1.5rem]' : ''
                      }`}
                    >
                      <div className={`relative aspect-[10/14] bg-[#0a0a0a] rounded-[1.5rem] overflow-hidden border transition-all duration-700 shadow-2xl ${
                        selectedForDeletion.includes(item.id) 
                          ? 'border-red-500/50 opacity-80' 
                          : 'border-white/5 group-hover/item:border-brand-orange/40 group-hover/item:-translate-y-3 group-hover/item:shadow-brand-orange/20'
                        }`}>
                        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                          {Date.now() - (item.addedAt || 0) < 7 * 24 * 60 * 60 * 1000 && (
                            <div className="px-2 py-0.5 bg-brand-orange text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-orange/20">
                              New
                            </div>
                          )}
                          {item.id.includes('tmdb_') && (
                            <div className="absolute top-3 left-3 z-30 pointer-events-none">
                              <div className="px-2 py-0.5 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-blue/20">
                                Discovery
                              </div>
                            </div>
                          )}
                          {item.status === 'missing' && (
                            <div className="absolute top-3 right-3 z-30 pointer-events-none">
                              <div className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-red-500/20 flex items-center gap-1.5">
                                <HardDrive className="w-2.5 h-2.5" />
                                Relink
                              </div>
                            </div>
                          )}
                          {item.meta.rating && (
                            <div className="ml-auto px-1.5 py-0.5 glass-card border-white/10 rounded flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 text-brand-orange fill-brand-orange" />
                              <span className="text-[9px] font-bold text-white">{Math.round(item.meta.rating * 10) / 10}</span>
                            </div>
                          )}
                        </div>

                        <img 
                          src={item.meta.poster || `https://picsum.photos/seed/${item.id}/400/600`} 
                          className="w-full h-full object-cover opacity-70 group-hover/item:opacity-100 group-hover/item:scale-110 transition-all duration-1000 ease-[0.16,1,0.3,1]"
                          alt={item.meta.cleanTitle}
                          referrerPolicy="no-referrer"
                        />

                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity z-20 ${isSelecting ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                          {isSelecting ? (
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transform scale-100 transition-all duration-500 border-2 ${selectedForDeletion.includes(item.id) ? 'bg-red-500 border-red-500' : 'bg-black/50 border-white/50 backdrop-blur-md'}`}>
                              <Trash2 className={`w-6 h-6 ${selectedForDeletion.includes(item.id) ? 'text-white' : 'text-white/50'}`} />
                            </div>
                          ) : (
                            <div className="w-14 h-14 glass-card rounded-full flex items-center justify-center shadow-black/80 shadow-2xl transform scale-75 group-hover/item:scale-100 transition-all duration-500 bg-brand-orange/20 border-brand-orange">
                              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="px-1">
                        {item.meta.logo ? (
                          <img src={item.meta.logo} className="h-6 md:h-8 object-contain mb-1 opacity-90 transition-opacity" alt={item.meta.cleanTitle} />
                        ) : (
                          <h3 className="text-xs font-black text-white/90 truncate tracking-tight mb-1">{item.meta.cleanTitle}</h3>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-black uppercase tracking-widest text-brand-orange">Movie</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{item.meta.year || 'Unknown'}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}

               {(activeLibraryTab === 'all' || activeLibraryTab === 'tv' ? filteredTV : []).map((group) => {
                  const item = group.items[0];
                  return (
                    <motion.div 
                      variants={itemAnim} initial="hidden" animate="show"
                      onClick={() => handleItemClick(item)} 
                      key={item.id}
                      className={`group/item relative flex flex-col gap-4 cursor-pointer ${
                        selectedForDeletion.includes(item.id) ? 'ring-4 ring-red-500 rounded-[1.5rem]' : ''
                      }`}
                    >
                      <div className={`relative aspect-[10/14] bg-[#0a0a0a] rounded-[1.5rem] overflow-hidden border transition-all duration-700 shadow-2xl ${
                        selectedForDeletion.includes(item.id) 
                          ? 'border-red-500/50 opacity-80' 
                          : 'border-white/5 group-hover/item:border-brand-orange/40 group-hover/item:-translate-y-3 group-hover/item:shadow-brand-orange/20'
                        }`}>
                        <div className="absolute top-3 left-3 z-30 pointer-events-none">
                          <div className="px-2 py-0.5 bg-brand-blue text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-brand-blue/20">
                            Series
                          </div>
                        </div>
                        {item.status === 'missing' && (
                            <div className="absolute top-3 right-3 z-30 pointer-events-none">
                              <div className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg shadow-red-500/20 flex items-center gap-1.5">
                                <HardDrive className="w-2.5 h-2.5" />
                                Relink
                              </div>
                            </div>
                        )}

                        <img 
                          src={item.meta.poster || `https://picsum.photos/seed/${item.id}/400/600`} 
                          className="w-full h-full object-cover opacity-70 group-hover/item:opacity-100 group-hover/item:scale-110 transition-all duration-1000 ease-[0.16,1,0.3,1]"
                          alt={item.meta.cleanTitle}
                          referrerPolicy="no-referrer"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity z-20 ${isSelecting ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                          {isSelecting ? (
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transform scale-100 transition-all duration-500 border-2 ${selectedForDeletion.includes(item.id) ? 'bg-red-500 border-red-500' : 'bg-black/50 border-white/50 backdrop-blur-md'}`}>
                              <Trash2 className={`w-6 h-6 ${selectedForDeletion.includes(item.id) ? 'text-white' : 'text-white/50'}`} />
                            </div>
                          ) : (
                            <div className="w-14 h-14 glass-card rounded-full flex items-center justify-center shadow-black/80 shadow-2xl transform scale-75 group-hover/item:scale-100 transition-all duration-500 bg-brand-blue/20 border-brand-blue">
                              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-1">
                        {item.meta.logo ? (
                          <img src={item.meta.logo} className="h-6 md:h-8 object-contain mb-1 opacity-90 transition-opacity" alt={item.meta.cleanTitle} />
                        ) : (
                          <h3 className="text-xs font-black text-white/90 truncate tracking-tight mb-1">{item.meta.cleanTitle}</h3>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] font-black uppercase tracking-widest text-brand-blue">{tvStats(group)}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{item.meta.year || 'Unknown'}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}
              </div>

              {(filteredMovies.length === 0 && filteredTV.length === 0) && (
                 <div className="text-center py-40 bg-white/[0.02] rounded-[3rem] border border-white/5">
                    <Search className="w-16 h-16 text-white/5 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-white/20 tracking-tighter uppercase tracking-[0.2em]">Your collection is empty</h3>
                    <p className="text-white/10 text-xs mt-4">Add your movie and show files to get started</p>
                 </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Persistence Modal (Execute Purge) */}
      <AnimatePresence>
        {isCleaning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCleaning(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md glass-card rounded-[2.5rem] border-red-500/20 p-12 text-center"
            >
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                <Trash2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4">
                 {selectedForDeletion.length > 0 ? "Delete Selected?" : "Wipe Collection?"}
              </h2>
              <p className="text-white/40 text-sm mb-10 leading-relaxed">
                {selectedForDeletion.length > 0 
                  ? `You are about to permanently remove ${selectedForDeletion.length} items from your library.` 
                  : "This will permanently delete your library records and all local video files. This action cannot be undone."}
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={selectedForDeletion.length > 0 ? handleCleanConfirm : () => {
                    clearLibrary();
                    setIsCleaning(false);
                  }}
                  className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => setIsCleaning(false)}
                  className="w-full py-5 bg-white/5 text-white/40 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Selection Mode */}
      <AnimatePresence>
        {isSelecting && selectedForDeletion.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto"
          >
            <button 
              onClick={() => setIsCleaning(true)}
              className="px-8 py-4 bg-red-500 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              Delete {selectedForDeletion.length} items
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Scanning Monitor Popup (Previous UX Feature) */}
      <AnimatePresence>
        {(isScanning || isVaulting) && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div className="w-full max-w-xl glass-card rounded-2xl p-4 md:p-6 border-brand-orange/40 bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-orange rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest">
                      {isVaulting ? 'Saving to collection' : 'Processing files'}
                    </h4>
                    <p className="text-white/40 text-[10px] font-medium uppercase truncate max-w-[150px] md:max-w-xs transition-all">
                      {scanToLayman(scanProgress.phase, scanProgress.label)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                     <span className="text-brand-orange font-mono text-xs font-black">
                       {Math.round((scanProgress.current / (scanProgress.total || 1)) * 100)}%
                     </span>
                     <p className="text-[8px] text-white/20 font-black uppercase tracking-tighter">
                       {scanProgress.current}/{scanProgress.total} Files
                     </p>
                  </div>
                  <button 
                    onClick={cancelScan}
                    className="px-4 py-2 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/30 transition-all flex items-center gap-2 group"
                  >
                    <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar Rack */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-px">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(scanProgress.current / (scanProgress.total || 1)) * 100}%` }}
                  className="h-full bg-brand-orange shadow-[0_0_15px_#ff6b00] rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;
