import { motion } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';

export function StreakCounter() {
  const { streak } = useGamificationStore();

  if (streak.current === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-4 py-2"
    >
      <span className="text-2xl">🔥</span>
      <div>
        <div className="text-warning font-semibold">
          {streak.current} day streak
        </div>
        {streak.longest > streak.current && (
          <div className="text-text-muted text-xs">
            Best: {streak.longest} days
          </div>
        )}
      </div>
    </motion.div>
  );
}
