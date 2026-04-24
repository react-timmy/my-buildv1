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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-orange/30 px-4 md:px-8 pt-4">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-end gap-0 mb-8 pr-4">

        </div>

        <div className="max-w-2xl mx-auto">
          <div className="space-y-8">

         {/* Profile Card Overlay */}
        <section className="p-8 bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl flex items-center gap-4">
           <div className="w-20 h-20 bg-gradient-to-br from-brand-orange to-brand-orange/50 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg overflow-hidden">
             {activeProfile?.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt={activeProfile.name} className="w-full h-full object-cover" />
            ) : (
              activeProfile?.name.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white/90 truncate">{activeProfile?.name || 'Main Account'}</h2>
          </div>
          <button onClick={logout} className="p-4 bg-white/5 rounded-2xl hover:bg-brand-orange hover:text-white transition group border border-white/5">
            <LogOut className="w-5 h-5 text-white/40 group-hover:text-white" />
          </button>
        </section>
        
        <section className="p-8 bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl">
           <h3 className="text-lg font-bold text-white mb-6">Account Settings</h3>
           <form onSubmit={handleUpdateAccount} className="space-y-4">
             <div>
               <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Email</label>
               <input 
                 type="email" 
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)} 
                 className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-brand-orange transition"
               />
             </div>
             <div>
               <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Current Password</label>
               <input 
                 type="password" 
                 value={currentPassword} 
                 onChange={(e) => setCurrentPassword(e.target.value)} 
                 className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-brand-orange transition"
               />
             </div>
             <div>
               <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">New Password (optional)</label>
               <input 
                 type="password" 
                 value={newPassword} 
                 onChange={(e) => setNewPassword(e.target.value)} 
                 className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-brand-orange transition"
               />
             </div>
             <button 
               type="submit"
               disabled={loading}
               className="w-full py-4 bg-brand-orange rounded-2xl text-white font-bold hover:bg-brand-orange/90 transition disabled:opacity-50"
             >
               {loading ? 'Updating...' : 'Save Updates'}
             </button>
             {message && (
               <p className={`text-center text-xs mt-4 ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                 {message.text}
               </p>
             )}
           </form>
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
      </div>
      </div>

      {/* Profile Edit Modal REMOVED */}
    </div>
  );
}
