import { motion } from 'framer-motion';
import { SwapInterface } from '@/components/wallet';

export default function SwapPage() {
  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text-primary">Swap</h1>
        <p className="text-text-muted text-sm mt-1">
          Exchange tokens instantly
        </p>
      </motion.div>

      {/* Swap Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SwapInterface />
      </motion.div>
    </div>
  );
}
