import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, X, ChevronRight } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://i.pinimg.com/736x/b2/a0/29/b2a029a6c2757e9d3a09265e3d07d49d.jpg', // Red angry face
  'https://i.pinimg.com/736x/1b/71/b8/1b71b85dd741ad27bffa5c834a7ed797.jpg', // Red smiley
  'https://i.pinimg.com/736x/c0/74/9b/c0749b7cc401421662ae901ec8f9f660.jpg', // Spongebob
  'https://i.pinimg.com/736x/5b/50/e7/5b50e75d07c726d36f397f6359098f58.jpg', // Chicken
  'https://i.pinimg.com/736x/34/62/d2/3462d27440aa255b1c314ff16f4032b4.jpg'  // Cartoon bowtie
];

export default function Profiles() {
  const { user, profiles, setActiveProfile, addProfile, deleteProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isManaging, setIsManaging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  if (!user) return null;

  const handleProfileSelect = (profile: any) => {
    if (isManaging) {
      setEditingProfile(profile);
      setNewName(profile.name);
      setSelectedAvatar(profile.avatarUrl);
      return;
    }
    setActiveProfile(profile);
    navigate('/browse');
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      await addProfile({ name: newName, avatarUrl: selectedAvatar, isKids: false });
      setIsAdding(false);
      setNewName('');
      setSelectedAvatar(AVATARS[0]);
    } catch (error: any) {
      alert(error.message || 'Failed to add profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !editingProfile) return;
    
    try {
      await updateProfile(editingProfile.id, { name: newName, avatarUrl: selectedAvatar });
      setEditingProfile(null);
      setNewName('');
    } catch (error) {
      console.error('Failed to update profile', error);
    }
  };

  const handleDeleteProfile = async (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileToDelete(profileId);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    try {
      await deleteProfile(profileToDelete);
      if (editingProfile?.id === profileToDelete) {
        setEditingProfile(null);
      }
      setProfileToDelete(null);
    } catch (error) {
      console.error('Failed to delete profile', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-white text-3xl md:text-4xl font-light tracking-tight mb-12">
          {isManaging ? 'Manage Profiles' : "Who's Watching?"}
        </h1>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 px-4 mb-16">
          {/* Delete Icon Logic Modification in Profile Iteration */}
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="group relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
              onClick={() => handleProfileSelect(profile)}
            >
              <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden shadow-lg border-2 transition-all duration-300 ${isManaging ? 'border-white/20 group-hover:border-indigo-500' : 'border-transparent group-hover:border-white/50 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}>
                <img 
                  src={profile.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'} 
                  alt={profile.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${isManaging ? 'opacity-40 scale-110' : 'group-hover:scale-110'}`}
                />
                
                {isManaging ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Pencil className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              
              {/* Force the delete button to always be visible globally if Managing and more than 1 profile */}
              {isManaging && profiles.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile.id); }}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-black rounded-full flex items-center justify-center border-2 border-red-600 z-20 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-110"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
              
              <span className="text-white/60 font-medium mt-4 group-hover:text-white transition-colors duration-200">
                {profile.name}
              </span>
            </div>
          ))}
          
          {profiles.length < 3 && (
            <div 
              className="group flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
              onClick={() => setIsAdding(true)}
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl border-2 border-white/10 bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-all duration-300 shadow-lg">
                <Plus className="w-10 h-10 text-white/40 group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-white/40 font-medium mt-4 group-hover:text-white transition-colors duration-200">
                Add Profile
              </span>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsManaging(!isManaging)}
          className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg"
        >
          {isManaging ? 'Done' : 'Manage Profiles'}
        </button>
      </div>
        {(isAdding || editingProfile) && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl backdrop-blur-md">
              <h1 className="text-3xl font-light tracking-tight text-white mb-8">
                {isAdding ? 'Add Profile' : 'Edit Profile'}
              </h1>
              
              <div className="flex flex-col md:flex-row gap-8 mb-10">
                <div className="flex-none">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                    <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <div className="flex-grow w-full">
                  <div className="mb-6 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Profile Name</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter name"
                      className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl focus:border-indigo-500/50 outline-none transition-all placeholder-white/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-1">Select Avatar</label>
                    <div className="flex flex-wrap gap-3">
                      {AVATARS.map((avatar, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`w-12 h-12 rounded-xl overflow-hidden cursor-pointer transition-all ${selectedAvatar === avatar ? 'ring-2 ring-indigo-500 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                        >
                          <img 
                            src={avatar} 
                            alt={`Avatar option ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                <button 
                  onClick={isAdding ? handleAddProfile : handleUpdateProfile}
                  disabled={!newName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-2xl transition duration-300 disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                  {isAdding ? 'Create Profile' : 'Save Changes'}
                </button>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingProfile(null);
                  }}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 px-6 rounded-2xl transition duration-300 active:scale-[0.98]"
                >
                  Cancel
                </button>
                {!isAdding && editingProfile && (
                  <button 
                    onClick={(e) => handleDeleteProfile(editingProfile.id, e as any)}
                    className="mt-4 sm:mt-0 px-6 py-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 rounded-2xl font-bold transition duration-300 active:scale-[0.98]"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      <ConfirmationModal
        isOpen={!!profileToDelete}
        title="Delete Profile?"
        message="Are you sure you want to delete this profile? This will remove all their data, including My List and liked titles."
        confirmLabel="Delete"
        danger={true}
        onConfirm={confirmDelete}
        onCancel={() => setProfileToDelete(null)}
      />
    </div>
  );
}
