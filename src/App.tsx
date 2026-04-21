import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LibraryProvider } from './context/LibraryContext';
import { ProtectedRoute, ProfileRoute } from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import MobileLayout from './components/MobileLayout';
import Login from './pages/Login';
import Register from './routes/Register';
import Profiles from './routes/Profiles';
import Browse from './pages/Browse';
import Search from './pages/Search';
import MyList from './pages/MyList';
import Watch from './pages/Watch';
import BrowseByLanguage from './pages/BrowseByLanguage';
import Account from './pages/Account';
import Library from './pages/Library';
import CinematicIntro from './components/CinematicIntro';

export default function App() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Check if the intro has played in this session
    const introPlayed = sessionStorage.getItem('filmsort_intro_played');
    if (!introPlayed) {
      setShowIntro(true);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('filmsort_intro_played', 'true');
  };

  return (
    <AuthProvider>
      <LibraryProvider>
        {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
        <ToastContainer />
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/profiles" element={<Profiles />} />
            
            <Route element={<ProfileRoute />}>
              <Route element={<MobileLayout />}>
                <Route path="/browse" element={<Browse type="all" />} />
                <Route path="/movies" element={<Browse type="movie" />} />
                <Route path="/tv-shows" element={<Browse type="tv" />} />
                <Route path="/search" element={<Search />} />
                <Route path="/my-list" element={<MyList />} />
                <Route path="/library" element={<Library />} />
                <Route path="/account" element={<Account />} />
                <Route path="/" element={<Navigate to="/browse" replace />} />
              </Route>
              <Route path="/watch/:type/:movieId" element={<Watch />} />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </LibraryProvider>
    </AuthProvider>
  );
}
