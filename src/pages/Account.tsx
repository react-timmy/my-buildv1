import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { Trash2, Mail, Lock, HardDrive, ChevronRight, LogOut, Settings, X, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import axios from '../lib/axios';

const AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://i.pinimg.com/736x/b2/a0/29/b2a029a6c2757e9d3a09265e3d07d49d.jpg',
  'https://i.pinimg.com/736x/1b/71/b8/1b71b85dd741ad27bffa5c834a7ed797.jpg',
  'https://i.pinimg.com/736x/c0/74/9b/c0749b7cc401421662ae901ec8f9f660.jpg',
  'https://i.pinimg.com/736x/5b/50/e7/5b50e75d07c726d36f397f6359098f58.jpg',
  'https://i.pinimg.com/736x/34/62/d2/3462d27440aa255b1c314ff16f4032b4.jpg'
];

export default function Account() {
  const { user, profiles, activeProfile, setActiveProfile, logout, addProfile, deleteProfile, updateProfile } = useAuth();
  const { clearLibrary, wipeSavedLibrary, movieCount, showCount, isPro, setIsPro } = useLibrary();
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [isWipeSavedLibraryConfirmOpen, setIsWipeSavedLibraryConfirmOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeleteProfileConfirmOpen, setIsDeleteProfileConfirmOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile Management State
  const [isManageMode, setIsManageMode] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const openAddProfile = () => {
    setProfileModalMode('add');
    setEditingProfileId(null);
    setNewProfileName('');
    setSelectedAvatar(AVATARS[0]);
  };

  const openEditProfile = (p: any) => {
    setProfileModalMode('edit');
    setEditingProfileId(p.id);
    setNewProfileName(p.name);
    setSelectedAvatar(p.avatarUrl || AVATARS[0]);
  };

  const handleProfileSubmit = async () => {
    if (!newProfileName.trim()) return;
    try {
      if (profileModalMode === 'add') {
        await addProfile({ name: newProfileName, avatarUrl: selectedAvatar, isKids: false });
      } else if (profileModalMode === 'edit' && editingProfileId) {
        await updateProfile(editingProfileId, { name: newProfileName, avatarUrl: selectedAvatar });
      }
      setProfileModalMode(null);
    } catch (error: any) {
      alert(error.message || 'Failed to save profile');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      await axios.put('/auth/account', {
        email,
        currentPassword,
        newPassword: newPassword || undefined
      });

      setMessage({ type: 'success', text: 'Account updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update account' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.")) return;
    
    setLoading(true);
    try {
      await axios.delete('/auth/account');
      logout();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete account.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

   return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-orange/30 px-6 pt-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-16">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white flex items-center justify-center rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex-shrink-0">
              <User className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter leading-none">Account</h1>
              <div className="flex items-center gap-3 mt-4 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                <Link to="/browse" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white">Profile & Settings</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
          
          {/* SUBSCRIPTION & QUOTA CARD */}
          <section className="bg-gradient-to-br from-brand-orange/20 to-transparent border border-brand-orange/20 rounded-3xl p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <HardDrive className="w-32 h-32" />
             </div>
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                 <div className="space-y-1">
                   <h3 className="text-2xl font-black tracking-tighter">
                     {isPro ? 'Pro Member' : 'Free Tier'}
                   </h3>
                   <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                     {isPro ? 'Unlimited AI Cataloging' : 'Personal Use Only'}
                   </p>
                 </div>
                 <button 
                   onClick={() => setIsPro(!isPro)}
                   className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     isPro 
                       ? 'bg-white/10 text-white hover:bg-white/20' 
                       : 'bg-brand-orange text-white hover:shadow-[0_0_30px_rgba(255,107,0,0.4)]'
                   }`}
                 >
                   {isPro ? 'Manage Billing' : 'Upgrade to Pro'}
                 </button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Movies</p>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black">{movieCount}</span>
                       <span className="text-xs text-white/20 pb-1">/ {isPro ? '∞' : '10'}</span>
                    </div>
                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                        className={`h-full transition-all duration-1000 ${movieCount >= 10 && !isPro ? 'bg-red-500' : 'bg-brand-orange'}`}
                        style={{ width: `${Math.min((movieCount / (isPro ? movieCount : 10)) * 100, 100)}%` }} 
                       />
                    </div>
                 </div>

                 <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">TV Shows</p>
                    <div className="flex items-end gap-2">
                       <span className="text-2xl font-black">{showCount}</span>
                       <span className="text-xs text-white/20 pb-1">/ {isPro ? '∞' : '10'}</span>
                    </div>
                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                        className={`h-full transition-all duration-1000 ${showCount >= 10 && !isPro ? 'bg-red-500' : 'bg-brand-orange'}`}
                        style={{ width: `${Math.min((showCount / (isPro ? showCount : 10)) * 100, 100)}%` }} 
                       />
                    </div>
                 </div>
               </div>
               
               {!isPro && (movieCount >= 10 || showCount >= 10) && (
                 <p className="mt-4 text-[10px] text-red-400 font-bold uppercase tracking-widest animate-pulse">
                   Free limit reached. Identifying new items is paused.
                 </p>
               )}
             </div>
          </section>

         {/* Profile Card Overlay */}
        <section className="p-6 bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl flex items-center gap-4">
           <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-brand-orange/50 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg overflow-hidden">
             {activeProfile?.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt={activeProfile.name} className="w-full h-full object-cover" />
            ) : (
              activeProfile?.name.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white/90 truncate">{activeProfile?.name || 'Main Account'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button 
                onClick={() => setIsManageMode(!isManageMode)} 
                className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-lg transition ${isManageMode ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isManageMode ? 'Done Managing' : 'Manage Profiles'}
              </button>
            </div>
          </div>
          <button onClick={logout} className="p-4 bg-white/5 rounded-2xl hover:bg-brand-orange hover:text-white transition group border border-white/5">
            <LogOut className="w-5 h-5 text-white/40 group-hover:text-white" />
          </button>
        </section>

        {/* Profile Switcher & Management */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <label className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20">Profiles</label>
            {profiles.length < 3 && isManageMode && (
              <button 
                onClick={openAddProfile}
                className="text-[10px] uppercase font-bold text-white/50 hover:text-white transition"
              >
                + Add Profile
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {profiles.map(p => (
              <div key={p.id} className="relative group">
                <button
                  onClick={() => isManageMode ? openEditProfile(p) : setActiveProfile(p)}
                  className={`w-full flex flex-col items-center gap-2 p-3 rounded-2xl border transition ${
                    activeProfile?.id === p.id 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  } ${isManageMode ? 'animate-pulse hover:border-white/40' : ''}`}
                >
                  <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md overflow-hidden ${
                    activeProfile?.id === p.id ? 'bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5'
                  }`}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className={activeProfile?.id === p.id ? 'text-white' : 'text-white/60'}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {isManageMode && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white/90" />
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold truncate w-full text-center ${
                    activeProfile?.id === p.id ? 'text-white' : 'text-white/40'
                  }`}>
                    {p.name}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Sync Status Badge */}
        <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-white/40" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Cloud Connectivity</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgb(34,197,94)]" />
                <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Active</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-orange/10 rounded-xl">
                 <HardDrive className="w-5 h-5 text-brand-orange" />
              </div>
              <p className="text-xs text-white/40 leading-relaxed font-light">
                Cloudinary Vault is protecting your metadata and watch states across devices.
              </p>
           </div>
        </section>

        {/* Simple Interactive List */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 px-2">Library Settings</label>
          <button 
            onClick={() => setIsWipeConfirmOpen(true)}
            className="w-full p-5 bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-3xl flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-white/80">Wipe Local Database</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => { setIsWipeSavedLibraryConfirmOpen(true); }}
            className="w-full p-5 bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-3xl flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-brand-orange" />
              <span className="text-sm font-medium text-white/80">Wipe Saved Library</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      
      {/* SECOND COLUMN - FORM AND DETAILS */}
      <div className="space-y-8">
        
        <ConfirmationModal
          isOpen={isWipeConfirmOpen}
          title="Wipe Local Database"
          message="Are you sure you want to delete all cached metadata and progress? This action is irreversible."
          confirmLabel="Wipe Data"
          onConfirm={() => { clearLibrary(); setIsWipeConfirmOpen(false); }}
          onCancel={() => setIsWipeConfirmOpen(false)}
          danger
        />

        <ConfirmationModal
          isOpen={isWipeSavedLibraryConfirmOpen}
          title="Wipe Saved Library"
          message="Are you sure you want to completely wipe your library from the cloud? This action cannot be undone."
          confirmLabel="Wipe Cloud Data"
          onConfirm={() => { wipeSavedLibrary(); setIsWipeSavedLibraryConfirmOpen(false); }}
          onCancel={() => setIsWipeSavedLibraryConfirmOpen(false)}
          danger
        />

        <ConfirmationModal
          isOpen={isDeleteProfileConfirmOpen}
          title="Delete Profile"
          message="Are you sure you want to delete this profile forever?"
          confirmLabel="Delete Profile"
          onConfirm={async () => {
             if (editingProfileId) {
                try {
                   await deleteProfile(editingProfileId);
                   setProfileModalMode(null);
                } catch (e: any) {
                   alert(e.message || 'Failed to delete Profile');
                }
             }
             setIsDeleteProfileConfirmOpen(false);
          }}
          onCancel={() => setIsDeleteProfileConfirmOpen(false)}
          danger
        />

         {/* Settings Form Overlay - Movied to second column */}
         <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
           <label className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 px-2 pb-5 block">Update Credentials</label>
              
              {message && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`p-4 rounded-2xl mb-4 text-xs font-bold uppercase tracking-widest text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                >
                  {message.text}
                </motion.div>
              )}

              <form onSubmit={handleUpdateAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-orange/50 outline-none transition text-sm text-white/80`}
                        placeholder="Update Email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-orange/50 outline-none transition text-sm text-white/80"
                        placeholder="Verify Current Password"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-orange/50 outline-none transition text-sm text-white/80"
                        placeholder="New Password (optional)"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-white text-black hover:bg-white/90 font-bold rounded-2xl transition duration-300 disabled:opacity-50 shadow-xl active:scale-95"
                  >
                    {loading ? 'Encrypting Changes...' : 'Save Settings'}
                  </button>
              </form>
            </section>
      </div>
      </div>

        <section className="pt-16 pb-8 flex justify-center w-full">
           <button 
            onClick={() => setIsDeleteAccountOpen(true)}
            className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-95"
           >
            Self-Destruct Account
           </button>
        </section>

        {/* Delete Account Modal */}
        <ConfirmationModal
          isOpen={isDeleteAccountOpen}
          title="Self-Destruct Account"
          message="Are you sure you want to permanently delete your account and all associated data? This action is irreversible."
          confirmLabel="Self-Destruct"
          onConfirm={() => {
            setIsDeleteAccountOpen(false);
            handleDeleteAccount();
          }}
          onCancel={() => setIsDeleteAccountOpen(false)}
          danger
        />
      </div>

      {/* Profile Management Modal */}
      {profileModalMode && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-light tracking-tight text-white">{profileModalMode === 'add' ? 'Add Profile' : 'Edit Profile'}</h2>
              {profileModalMode === 'edit' && profiles.length > 1 && editingProfileId !== activeProfile?.id && (
                <button 
                  type="button"
                  onClick={(e) => {
                     e.preventDefault();
                     setIsDeleteProfileConfirmOpen(true);
                  }}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition"
                  title="Delete Profile"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <div className="flex-none self-center sm:self-start">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                  <img src={selectedAvatar} alt="Selected Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
              
              <div className="flex-grow w-full">
                <div className="mb-6 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Profile Name</label>
                  <input 
                    type="text" 
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl focus:border-brand-blue/50 outline-none transition-all placeholder-white/20"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Select Avatar</label>
                  <div className="flex flex-wrap gap-2.5">
                    {AVATARS.map((avatar, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-10 h-10 rounded-xl overflow-hidden cursor-pointer transition-all border-none ${selectedAvatar === avatar ? 'ring-2 ring-brand-blue scale-110 shadow-lg' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                      >
                        <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
              <button 
                onClick={handleProfileSubmit}
                disabled={!newProfileName.trim()}
                className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold py-3 px-6 rounded-2xl transition duration-300 disabled:opacity-50 active:scale-[0.98]"
              >
                {profileModalMode === 'add' ? 'Create' : 'Save'}
              </button>
              <button 
                onClick={() => setProfileModalMode(null)}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 px-6 rounded-2xl transition duration-300 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
