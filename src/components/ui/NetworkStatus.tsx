import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatus() {
  const isOnline = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-warning text-bg-primary py-2 px-4 text-center text-sm font-medium"
        >
          You're offline. Some features may be unavailable.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
