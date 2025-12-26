import { motion } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';

export function XPBar() {
  const { level, getXPProgress, getCurrentLevel } = useGamificationStore();
  const { current, max, percent } = getXPProgress();
  const levelData = getCurrentLevel();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-solana-green font-semibold">Lv.{level}</span>
          <span className="text-text-secondary text-sm">{levelData.title}</span>
        </div>
        <span className="text-text-muted text-sm">
          {current.toLocaleString()} / {max === Infinity ? '∞' : max.toLocaleString()} XP
        </span>
      </div>

      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-xp"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
