// src/components/Navbar.tsx
// Updated: adds FilmSort (scan) button and processing indicator.
// Everything else stays exactly as in the original.

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, X, Edit2, List, User as UserIcon, RefreshCw, Folder, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import FilmSortLogo from './FilmSortLogo';
import ConfirmationModal from './ConfirmationModal';

export default function Navbar() {
  const [isScrolled,          setIsScrolled]          = useState(false);
  const [searchOpen,          setSearchOpen]           = useState(false);
  const [searchQuery,         setSearchQuery]          = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen]  = useState(false);
  const { user, profiles, activeProfile, setActiveProfile, logout } = useAuth();
  const { scanFiles, isScanning, processingCount, hasLibrary, clearLibrary, addToast } = useLibrary();
  const navigate    = useNavigate();
  const location    = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const mgmtRef = useRef<HTMLDivElement>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Sync search input with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      setSearchOpen(true);
    } else {
      // Don't close search if user is just typing it out, 
      // but if we are on browse, it should be closed if empty.
      if (location.pathname === '/browse' && !q) {
        setSearchQuery('');
        setSearchOpen(false);
      }
    }
  }, [location.search, location.pathname]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (mgmtRef.current && !mgmtRef.current.contains(e.target as Node)) {
        setMgmtOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  function handleProfileSwitch(profile: any) {
    setActiveProfile(profile);
    setProfileDropdownOpen(false);
    navigate('/browse');
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length > 0) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/browse');
  }

  return (
    <>
      <nav
      className={`fixed w-full z-50 top-0 transition-all duration-500 border-b ${
        isScrolled 
          ? 'bg-[#050505]/80 backdrop-blur-xl border-white/5 py-3' 
          : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="px-4 md:px-12 flex items-center justify-between">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-10">
          <FilmSortLogo onClick={() => navigate('/browse')} className="scale-[1.5] md:scale-[2.0]" />
          <ul className="hidden lg:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-black text-white/40">
            <li className={`cursor-pointer transition-colors hover:text-white ${location.pathname === '/browse' ? 'text-white' : ''}`} onClick={() => navigate('/browse')}>Home</li>
            <li className={`cursor-pointer transition-colors hover:text-white ${location.pathname === '/tv-shows' ? 'text-white' : ''}`} onClick={() => navigate('/tv-shows')}>Shows</li>
            <li className={`cursor-pointer transition-colors hover:text-white ${location.pathname === '/movies' ? 'text-white' : ''}`} onClick={() => navigate('/movies')}>Movies</li>
            <li className={`cursor-pointer transition-colors hover:text-white ${location.pathname === '/my-list' ? 'text-white' : ''}`} onClick={() => navigate('/my-list')}>Favorites</li>
            <li className={`cursor-pointer transition-colors hover:text-white ${location.pathname === '/library' ? 'text-white' : ''}`} onClick={() => navigate('/library')}>Vault</li>
          </ul>
        </div>

        {/* Right: search, scan, bell, profile */}
        <div className="flex items-center gap-5 text-white/70">
          
          {/* Library Status Indicator */}
          {hasLibrary && (
            <div 
              onClick={() => navigate('/library')}
              className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full glass-card hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-brand-orange animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] font-mono uppercase tracking-widest leading-none">
                {isScanning ? 'Syncing...' : 'Vault Secure'}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            {searchOpen && (
              <input
                type="text"
                placeholder="Search your library..."
                className="bg-white/5 border border-white/10 outline-none text-xs text-white px-4 py-1.5 rounded-full ml-2 w-40 md:w-64 focus:border-brand-blue/50 transition-all"
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
              />
            )}
          </div>

          <div className="hidden sm:block p-2 hover:text-white transition-colors cursor-pointer">
            <Bell className="w-5 h-5" />
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                <img
                  src={activeProfile?.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileDropdownOpen && (
              <div className="absolute top-full right-0 mt-3 w-64 glass-card rounded-2xl p-2 flex flex-col gap-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Active Profile</p>
                  <p className="text-sm font-bold text-white mt-1">{activeProfile?.name}</p>
                </div>

                {profiles.filter(p => p.id !== activeProfile?.id).map(profile => (
                  <button
                    key={profile.id}
                    className="w-full px-4 py-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-left"
                    onClick={() => handleProfileSwitch(profile)}
                  >
                    <img src={profile.avatarUrl} alt={profile.name} className="w-7 h-7 rounded-lg border border-white/10" />
                    <span className="text-xs text-white/70">{profile.name}</span>
                  </button>
                ))}

                <div className="h-[1px] bg-white/5 my-1" />

                <button 
                  className="w-full px-4 py-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-left"
                  onClick={() => { setProfileDropdownOpen(false); navigate('/profiles'); }}
                >
                  <Edit2 className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/70">Profiles</span>
                </button>

                <button 
                  className="w-full px-4 py-2 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors text-left"
                  onClick={() => { setProfileDropdownOpen(false); navigate('/account'); }}
                >
                  <UserIcon className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/70">Account Settings</span>
                </button>

                <div className="h-[1px] bg-white/5 my-1" />

                <button 
                  className="w-full px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
    <ConfirmationModal 
      isOpen={showResetModal}
      title="Reset Library?"
      message="Are you sure you want to reset your library? This will clear all identified metadata and cannot be undone."
      confirmLabel="Reset Library"
      danger={true}
      onConfirm={() => {
        clearLibrary();
        setShowResetModal(false);
        navigate('/browse');
      }}
      onCancel={() => setShowResetModal(false)}
    />
    </>
  );
}
