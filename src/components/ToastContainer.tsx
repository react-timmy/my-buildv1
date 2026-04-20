import React from 'react';
import { useLibrary } from '../context/LibraryContext';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ToastContainer() {
  const { toasts, removeToast } = useLibrary();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto bg-[#1a1a1a] shadow-2xl border border-white/10 rounded-lg p-4 min-w-[300px] flex items-center gap-3"
          >
            {getIcon(toast.type)}
            <p className="text-white text-sm font-medium flex-1">{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
