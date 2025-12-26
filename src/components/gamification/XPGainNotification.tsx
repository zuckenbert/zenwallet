import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';

export function XPGainNotification() {
  const { pendingXP, clearNotification } = useGamificationStore();

  useEffect(() => {
    if (pendingXP) {
      const timer = setTimeout(() => {
        clearNotification('xp');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingXP, clearNotification]);

  return (
    <AnimatePresence>
      {pendingXP && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-solana-green/20 border border-solana-green/50 rounded-full px-6 py-2 backdrop-blur-sm">
            <span className="text-solana-green font-bold text-lg">
              +{pendingXP} XP
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
