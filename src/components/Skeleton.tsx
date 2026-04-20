import React from 'react';

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#2f2f2f] rounded-md ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function RowSkeleton({ isLargeRow = false }: { isLargeRow?: boolean }) {
  return (
    <div className="pl-4 md:pl-12 my-8 overflow-hidden">
      {/* Title skeleton */}
      <Skeleton className="h-8 w-48 mb-4 bg-white/10" />
      
      <div className="flex gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-none">
            <div className={`relative overflow-hidden bg-white/5 rounded-md shadow-lg ${
              isLargeRow ? 'w-[140px] md:w-[200px] aspect-[2/3]' : 'w-[240px] md:w-[300px] aspect-video'
            }`}>
              {/* Shimmer effect inside the card */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffffff10] to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                style={{
                  animation: `shimmer ${1.5 + (i * 0.1)}s infinite linear`
                }}
              />
              
              {/* Card content skeleton */}
              <div className="absolute bottom-4 left-4 right-4 space-y-2 opacity-50">
                <div className="h-3 bg-white/20 rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-white/10 rounded w-1/2 animate-pulse delay-75" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Required keyframes for custom shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  );
}
