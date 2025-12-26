import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { XP_VALUES, LEVELS, Level, Achievement, Streak, UserStats } from '@/types/gamification';

interface GamificationState {
  // State
  xp: number;
  level: number;
  achievements: string[]; // IDs of unlocked achievements
  streak: Streak;
  stats: UserStats;

  // Pending notifications
  pendingXP: number | null;
  pendingLevelUp: number | null;
  pendingAchievement: Achievement | null;

  // Actions
  addXP: (action: keyof typeof XP_VALUES) => void;
  checkStreak: () => void;
  incrementStat: (stat: keyof UserStats) => void;
  clearNotification: (type: 'xp' | 'level' | 'achievement') => void;

  // Getters
  getCurrentLevel: () => Level;
  getXPProgress: () => { current: number; max: number; percent: number };
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Create your first wallet',
    icon: '🚀',
    xpBonus: 100,
    condition: () => true, // Triggered on wallet creation
  },
  {
    id: 'first_send',
    name: 'First Send',
    description: 'Send your first transaction',
    icon: '💸',
    xpBonus: 50,
    condition: (stats) => stats.totalTransactions >= 1,
  },
  {
    id: 'swap_master',
    name: 'Swap Master',
    description: 'Complete your first swap',
    icon: '🔄',
    xpBonus: 50,
    condition: (stats) => stats.totalSwaps >= 1,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '7 day login streak',
    icon: '📅',
    xpBonus: 100,
    condition: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'monthly_legend',
    name: 'Monthly Legend',
    description: '30 day login streak',
    icon: '🔥',
    xpBonus: 500,
    condition: (stats) => stats.currentStreak >= 30,
  },
  {
    id: 'transaction_pro',
    name: 'Transaction Pro',
    description: '100 transactions',
    icon: '🎯',
    xpBonus: 300,
    condition: (stats) => stats.totalTransactions >= 100,
  },
  {
    id: 'dapp_explorer',
    name: 'dApp Explorer',
    description: 'Connect 5 dApps',
    icon: '🌐',
    xpBonus: 150,
    condition: (stats) => stats.dappsConnected >= 5,
  },
];

function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i].number;
    }
  }
  return 1;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      achievements: [],
      streak: {
        current: 0,
        longest: 0,
        lastLoginDate: '',
      },
      stats: {
        totalTransactions: 0,
        totalSwaps: 0,
        dappsConnected: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        walletCreatedAt: '',
      },
      pendingXP: null,
      pendingLevelUp: null,
      pendingAchievement: null,

      addXP: (action) => {
        const xpGain = XP_VALUES[action];
        const { xp, level, achievements, stats } = get();

        const newXP = xp + xpGain;
        const newLevel = calculateLevel(newXP);

        // Check for level up
        const leveledUp = newLevel > level;

        // Check for new achievements
        const newStats = { ...stats, level: newLevel };
        let newAchievement: Achievement | null = null;

        for (const achievement of ACHIEVEMENTS) {
          if (!achievements.includes(achievement.id) && achievement.condition(newStats)) {
            newAchievement = achievement;
            break;
          }
        }

        set({
          xp: newXP + (newAchievement?.xpBonus || 0),
          level: newLevel,
          achievements: newAchievement
            ? [...achievements, newAchievement.id]
            : achievements,
          pendingXP: xpGain,
          pendingLevelUp: leveledUp ? newLevel : null,
          pendingAchievement: newAchievement,
          stats: newStats,
        });
      },

      checkStreak: () => {
        const { streak } = get();
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = streak.lastLoginDate;

        if (lastLogin === today) return; // Already logged in today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newCurrent = 1;
        if (lastLogin === yesterdayStr) {
          newCurrent = streak.current + 1;
        }

        const newLongest = Math.max(streak.longest, newCurrent);

        set({
          streak: {
            current: newCurrent,
            longest: newLongest,
            lastLoginDate: today,
          },
          stats: {
            ...get().stats,
            currentStreak: newCurrent,
            longestStreak: newLongest,
          },
        });

        // Add daily XP
        get().addXP('daily_login');
      },

      incrementStat: (stat) => {
        set({
          stats: {
            ...get().stats,
            [stat]: (get().stats[stat] as number) + 1,
          },
        });
      },

      clearNotification: (type) => {
        switch (type) {
          case 'xp':
            set({ pendingXP: null });
            break;
          case 'level':
            set({ pendingLevelUp: null });
            break;
          case 'achievement':
            set({ pendingAchievement: null });
            break;
        }
      },

      getCurrentLevel: () => {
        const { level } = get();
        return LEVELS[level - 1] || LEVELS[0];
      },

      getXPProgress: () => {
        const { xp } = get();
        const currentLevel = get().getCurrentLevel();
        const current = xp - currentLevel.minXP;
        const max = currentLevel.maxXP - currentLevel.minXP;
        const percent = Math.min((current / max) * 100, 100);
        return { current, max, percent };
      },
    }),
    {
      name: 'zenwallet-gamification',
    }
  )
);
