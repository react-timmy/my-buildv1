import React, { createContext, useContext, useState, useEffect } from 'react';
// The main axios instance already handled interceptors
import axios from '../lib/axios';

interface Profile {
  id: string; 
  name: string;
  avatarUrl?: string;
  isKids?: boolean;
}

interface UserData {
  uid: string;
  email: string | null;
  profileCount: number;
}

interface AuthContextType {
  user: UserData | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setActiveProfile: (profile: Profile | null) => void;
  addProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  updateProfile: (profileId: string, profile: Partial<Profile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveProfile = (profile: Profile | null) => {
    setActiveProfileState(profile);
    if (profile) {
      const profileId = profile.id || (profile as any)._id;
      if (profileId) {
        localStorage.setItem('activeProfileId', profileId);
      }
    } else {
      localStorage.removeItem('activeProfileId');
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/auth/me');
      const userData = response.data;
      
      if (!userData || typeof userData !== 'object') {
         throw new Error('Invalid user data received');
      }

      setUser(userData);
      
      // Normalize _id to id for the frontend
      const normalizedProfiles = normalizeProfiles(userData.profiles || []);
      setProfiles(normalizedProfiles);
      
      // Hydrate active profile
      const savedId = localStorage.getItem('activeProfileId');
      if (savedId && normalizedProfiles.length > 0) {
        const found = normalizedProfiles.find((p: any) => p.id === savedId || p._id === savedId);
        if (found) setActiveProfileState(found);
        else setActiveProfileState(normalizedProfiles[0]);
      } else if (normalizedProfiles.length > 0) {
        setActiveProfileState(normalizedProfiles[0]);
      }
    } catch (error) {
      setUser(null);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const normalizeProfiles = (profiles: any[]) => {
    return (profiles || []).map((p: any) => ({
      ...p,
      id: p._id || p.id
    }));
  };

  const addProfile = async (profileData: Omit<Profile, 'id'>) => {
    const response = await axios.post('/auth/profiles', profileData);
    if (response.data.profiles) setProfiles(normalizeProfiles(response.data.profiles));
  };

  const deleteProfile = async (profileId: string) => {
    const response = await axios.delete(`/auth/profiles/${profileId}`);
    if (response.data.profiles) setProfiles(normalizeProfiles(response.data.profiles));
    if (activeProfile?.id === profileId) {
      setActiveProfile(null);
    }
  };

  const updateProfile = async (profileId: string, profileData: Partial<Profile>) => {
    const response = await axios.put(`/auth/profiles/${profileId}`, profileData);
    if (response.data.profiles) setProfiles(normalizeProfiles(response.data.profiles));
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    setUser(null);
    setProfiles([]);
    setActiveProfile(null);
    localStorage.removeItem('activeProfileId');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profiles, 
      activeProfile, 
      loading, 
      logout, 
      setActiveProfile, 
      addProfile, 
      deleteProfile, 
      updateProfile,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
