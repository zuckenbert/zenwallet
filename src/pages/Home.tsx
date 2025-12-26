import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletStore } from '@/stores/walletStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { BalanceCard, TokenList } from '@/components/wallet';
import { XPBar, StreakCounter } from '@/components/gamification';

export default function HomePage() {
  const navigate = useNavigate();
  const { publicKey, isUnlocked } = useWalletStore();
  const { checkStreak } = useGamificationStore();

  // Redirect to onboarding if no wallet
  useEffect(() => {
    if (!publicKey) {
      navigate('/onboarding');
    }
  }, [publicKey, navigate]);

  // Check streak on mount
  useEffect(() => {
    if (publicKey && isUnlocked) {
      checkStreak();
    }
  }, [publicKey, isUnlocked, checkStreak]);

  if (!publicKey) return null;

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-solana-green to-accent-purple bg-clip-text text-transparent mb-4">
          ZenWallet
        </h1>
        <XPBar />
        <div className="mt-4">
          <StreakCounter />
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 relative"
      >
        <BalanceCard onSwapClick={() => navigate('/swap')} />
      </motion.div>

      {/* Token List Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Assets</h2>
          <button
            onClick={() => navigate('/assets')}
            className="text-sm text-solana-green hover:underline"
          >
            See all →
          </button>
        </div>
        <TokenList />
      </motion.div>
    </div>
  );
}
