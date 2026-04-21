import React from 'react';

export default function FilmSortLogo({ className = "", onClick }: { className?: string, onClick?: () => void }) {
  return (
      <div 
        className={`flex items-center group selection:bg-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
      <div className="relative flex items-center">
        {/* Arched Text Effect using a subtle skew and perspective */}
        <div className="flex items-center group-hover:scale-[1.02] transition-transform duration-500 will-change-transform">
          <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-2xl uppercase drop-shadow-[0_0_25px_rgba(255,107,0,0.4)] [text-shadow:1px_1px_0px_rgba(0,0,0,0.5)]">
            FILM
          </span>
          <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-2xl uppercase ml-[-1px] drop-shadow-[0_0_25px_rgba(255,107,0,0.4)] [text-shadow:1px_1px_0px_rgba(0,0,0,0.5)]">
            SORT
          </span>
        </div>
        
        {/* Cinematic Refraction Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20 group-hover:bg-white/40 transition-colors" />
      </div>

      {/* Modern Subtitle Mark */}
      <div className="ml-2 hidden md:flex flex-col justify-center">
        <div className="h-4 w-[1px] bg-white/20 mb-0.5" />
        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-brand-blue transition-colors">
          Vault
        </span>
      </div>
    </div>
  );
}
