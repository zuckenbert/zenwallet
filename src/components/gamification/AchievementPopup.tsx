import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';
import { Button } from '@/components/ui/Button';
import { Confetti } from './Confetti';

export function AchievementPopup() {
  const { pendingAchievement, clearNotification } = useGamificationStore();

  if (!pendingAchievement) return null;

  return (
    <AnimatePresence>
      {pendingAchievement && (
        <>
          <Confetti />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => clearNotification('achievement')}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-bg-secondary rounded-2xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl mb-4"
              >
                {pendingAchievement.icon}
              </motion.div>

              <h2 className="text-heading text-solana-green mb-2">
                Achievement Unlocked!
              </h2>

              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {pendingAchievement.name}
              </h3>

              <p className="text-text-secondary mb-4">
                {pendingAchievement.description}
              </p>

              <div className="bg-solana-green/10 rounded-xl py-2 px-4 inline-block mb-6">
                <span className="text-solana-green font-bold">
                  +{pendingAchievement.xpBonus} XP
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => clearNotification('achievement')}
              >
                Awesome!
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
