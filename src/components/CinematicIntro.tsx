import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'slam' | 'zoom' | 'hyperspace' | 'fade'>('slam');

  useEffect(() => {
    const slamTimer = setTimeout(() => setPhase('zoom'), 1200);
    const zoomTimer = setTimeout(() => setPhase('hyperspace'), 2200);
    const hyperspaceTimer = setTimeout(() => setPhase('fade'), 3500);
    const completeTimer = setTimeout(onComplete, 4200);

    return () => {
      clearTimeout(slamTimer);
      clearTimeout(zoomTimer);
      clearTimeout(hyperspaceTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden pointer-events-none">
      <AnimatePresence>
        {phase === 'slam' && (
          <motion.div
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.21, 1.02, 0.73, 1] }}
            className="flex items-center"
          >
            <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-7xl md:text-9xl uppercase drop-shadow-[0_0_30px_rgba(255,107,0,0.6)]">
              FILM
            </span>
            <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-7xl md:text-9xl uppercase drop-shadow-[0_0_30px_rgba(255,107,0,0.6)]">
              SORT
            </span>
          </motion.div>
        )}

        {phase === 'zoom' && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 40 }}
            transition={{ duration: 1.2, ease: [0.6, 0.05, 0.01, 0.9] }}
            className="flex items-center origin-center"
          >
             <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-7xl md:text-9xl uppercase">
              FILM
            </span>
            <span className="font-display font-black text-brand-orange tracking-[-0.08em] text-7xl md:text-9xl uppercase">
              SORT
            </span>
          </motion.div>
        )}

        {phase === 'hyperspace' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* The multi-colored "sorting" rays / film strips */}
            <div className="relative w-full h-full flex justify-center gap-[2px]">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ 
                    scaleY: [1, 2, 1.5], 
                    opacity: [0, 0.8, 0],
                    translateZ: [0, 500] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    delay: i * 0.02, 
                    repeat: Infinity,
                    repeatDelay: Math.random() 
                  }}
                  className="w-4 h-full"
                  style={{
                    background: `linear-gradient(to bottom, 
                      transparent, 
                      ${i % 3 === 0 ? '#ff6b00' : i % 3 === 1 ? '#00d4ff' : '#ffffff'} 40%, 
                      ${i % 3 === 0 ? '#ff6b00' : i % 3 === 1 ? '#00d4ff' : '#ffffff'} 60%, 
                      transparent)`,
                    filter: `blur(${Math.random() * 10 + 5}px)`,
                    transform: `perspective(1000px) rotateX(20deg) translateZ(${i * 10}px)`
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'fade' && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
