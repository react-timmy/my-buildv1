import React from 'react';

export default function FilmSortLogo({ className = "text-2xl md:text-3xl", onClick }: { className?: string, onClick?: () => void }) {
  return (
    <div 
      className={`flex items-baseline cursor-pointer group selection:bg-none ${className}`}
      onClick={onClick}
    >
      <div className="relative flex items-baseline">
        {/* Arched Text Effect using a subtle skew and perspective */}
        <div className="flex items-baseline group-hover:scale-[1.02] transition-transform duration-500 will-change-transform">
          <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-4xl md:text-5xl uppercase drop-shadow-[0_0_25px_rgba(255,107,0,0.4)] [text-shadow:2px_2px_0px_rgba(0,0,0,0.5)]">
            FILM
          </span>
          <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-4xl md:text-5xl uppercase ml-[-2px] drop-shadow-[0_0_25px_rgba(255,107,0,0.4)] [text-shadow:2px_2px_0px_rgba(0,0,0,0.5)]">
            SORT
          </span>
        </div>
        
        {/* Cinematic Refraction Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20 group-hover:bg-white/40 transition-colors" />
      </div>

      {/* Modern Subtitle Mark */}
      <div className="ml-3 hidden md:flex flex-col">
        <div className="h-4 w-[1px] bg-white/20 mb-1" />
        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40 group-hover:text-brand-blue transition-colors">
          Digital Vault
        </span>
      </div>
    </div>
  );
}
