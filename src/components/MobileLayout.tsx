import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Library, User, Bookmark, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const MobileLayout: React.FC = () => {
  const location = useLocation();
  const { activeProfile } = useAuth();

  const navItems = [
    { path: '/browse', icon: Home, label: 'Home' },
    { path: '/my-list', icon: Heart, label: 'Favorites' },
    { path: '/library', icon: Library, label: 'Vault' },
    { path: '/account', icon: User, label: 'Account' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-brand-orange/30">
      {/* Immersive Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-brand-orange/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] bg-brand-blue/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 scroll-smooth scrollbar-hide pb-20">
        {/* Desktop Nav */}
        <div className="hidden md:block">
          <Navbar />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Solid Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#0a0a0a]/85 backdrop-blur-3xl border-t border-white/10 pb-safe">
        <div className="w-full flex justify-around items-center h-20 md:hidden">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-full h-full group
                ${isActive ? 'text-brand-orange' : 'text-white/40'}
              `}
            >
              {({ isActive }) => (
                <>
                  {path === '/account' ? (
                    <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-500 flex-shrink-0 ${isActive ? 'border-brand-orange scale-110' : 'border-transparent opacity-70 scale-100'}`}>
                      <img 
                        src={activeProfile?.avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <Icon className={`w-7 h-7 transition-all duration-500 ${isActive ? 'scale-110 text-brand-orange' : 'scale-100'}`} />
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100 text-brand-orange' : 'opacity-50'}`}>{label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active"
                      className="absolute -top-px w-10 h-[3px] bg-brand-orange shadow-[0_0_15px_#ff6b00] rounded-full" 
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
