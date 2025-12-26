import { motion } from 'framer-motion';
import { useGamificationStore } from '@/stores/gamificationStore';
import { XPBar } from '@/components/gamification';
import { Achievement, UserStats } from '@/types/gamification';

// Achievement definitions (should match gamificationStore)
const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Create your first wallet',
    icon: '🚀',
    xpBonus: 100,
    condition: () => true,
  },
  {
    id: 'first_send',
    name: 'First Send',
    description: 'Send your first transaction',
    icon: '💸',
    xpBonus: 50,
    condition: (stats: UserStats) => stats.totalTransactions >= 1,
  },
  {
    id: 'swap_master',
    name: 'Swap Master',
    description: 'Complete your first swap',
    icon: '🔄',
    xpBonus: 50,
    condition: (stats: UserStats) => stats.totalSwaps >= 1,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '7 day login streak',
    icon: '📅',
    xpBonus: 100,
    condition: (stats: UserStats) => stats.currentStreak >= 7,
  },
  {
    id: 'monthly_legend',
    name: 'Monthly Legend',
    description: '30 day login streak',
    icon: '🔥',
    xpBonus: 500,
    condition: (stats: UserStats) => stats.currentStreak >= 30,
  },
  {
    id: 'transaction_pro',
    name: 'Transaction Pro',
    description: '100 transactions',
    icon: '🎯',
    xpBonus: 300,
    condition: (stats: UserStats) => stats.totalTransactions >= 100,
  },
  {
    id: 'dapp_explorer',
    name: 'dApp Explorer',
    description: 'Connect 5 dApps',
    icon: '🌐',
    xpBonus: 150,
    condition: (stats: UserStats) => stats.dappsConnected >= 5,
  },
];

export default function AchievementsPage() {
  const { achievements, xp, level } = useGamificationStore();

  const unlockedCount = achievements.length;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text-primary mb-4">Achievements</h1>
        <XPBar />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-bg-secondary rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-solana-green">{level}</p>
            <p className="text-xs text-text-muted">Level</p>
          </div>
          <div className="bg-bg-secondary rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-accent-purple">{xp.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Total XP</p>
          </div>
          <div className="bg-bg-secondary rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-warning">{unlockedCount}/{totalCount}</p>
            <p className="text-xs text-text-muted">Unlocked</p>
          </div>
        </div>
      </motion.div>

      {/* Achievement Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        {ALL_ACHIEVEMENTS.map((achievement, index) => {
          const isUnlocked = achievements.includes(achievement.id);

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border ${
                isUnlocked
                  ? 'bg-gradient-to-br from-bg-secondary to-bg-tertiary border-solana-green/30'
                  : 'bg-bg-secondary border-text-muted/10 opacity-60'
              }`}
            >
              <div className="text-4xl mb-2">{achievement.icon}</div>
              <h3 className="font-semibold text-text-primary text-sm">
                {achievement.name}
              </h3>
              <p className="text-xs text-text-muted mt-1">
                {achievement.description}
              </p>
              <p className="text-xs text-solana-green mt-2">
                +{achievement.xpBonus} XP
              </p>
              {isUnlocked && (
                <div className="mt-2 text-xs text-success flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlocked
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
