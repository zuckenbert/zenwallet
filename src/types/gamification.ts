export interface XPAction {
  type: 'first_login' | 'daily_login' | 'send' | 'receive' | 'swap' | 'connect_dapp';
  xp: number;
}

export const XP_VALUES: Record<XPAction['type'], number> = {
  first_login: 50,
  daily_login: 10,
  send: 25,
  receive: 15,
  swap: 50,
  connect_dapp: 30,
};

export interface Level {
  number: number;
  title: string;
  minXP: number;
  maxXP: number;
}

export const LEVELS: Level[] = [
  { number: 1, title: 'Noob', minXP: 0, maxXP: 100 },
  { number: 2, title: 'Noob', minXP: 100, maxXP: 250 },
  { number: 3, title: 'Noob', minXP: 250, maxXP: 450 },
  { number: 4, title: 'Noob', minXP: 450, maxXP: 700 },
  { number: 5, title: 'Noob', minXP: 700, maxXP: 1000 },
  { number: 6, title: 'Crypto Curious', minXP: 1000, maxXP: 1400 },
  { number: 7, title: 'Crypto Curious', minXP: 1400, maxXP: 1900 },
  { number: 8, title: 'Crypto Curious', minXP: 1900, maxXP: 2500 },
  { number: 9, title: 'Crypto Curious', minXP: 2500, maxXP: 3200 },
  { number: 10, title: 'Crypto Curious', minXP: 3200, maxXP: 4000 },
  { number: 11, title: 'DeFi Explorer', minXP: 4000, maxXP: 5000 },
  { number: 12, title: 'DeFi Explorer', minXP: 5000, maxXP: 6200 },
  { number: 13, title: 'DeFi Explorer', minXP: 6200, maxXP: 7600 },
  { number: 14, title: 'DeFi Explorer', minXP: 7600, maxXP: 9200 },
  { number: 15, title: 'DeFi Explorer', minXP: 9200, maxXP: 11000 },
  { number: 16, title: 'Whale', minXP: 11000, maxXP: 13500 },
  { number: 17, title: 'Whale', minXP: 13500, maxXP: 16500 },
  { number: 18, title: 'Whale', minXP: 16500, maxXP: 20000 },
  { number: 19, title: 'Whale', minXP: 20000, maxXP: 25000 },
  { number: 20, title: 'Whale', minXP: 25000, maxXP: Infinity },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpBonus: number;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalTransactions: number;
  totalSwaps: number;
  dappsConnected: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  walletCreatedAt: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastLoginDate: string;
}
