import { motion } from 'framer-motion';
import { TokenList } from '@/components/wallet';
import { useBalance } from '@/hooks/useBalance';

export default function AssetsPage() {
  const { totalUsdValue, balances, refresh, isLoading } = useBalance();

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary">Assets</h1>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Portfolio Value */}
        <div className="mt-4 bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-4">
          <p className="text-text-muted text-sm mb-1">Portfolio Value</p>
          <p className="text-2xl font-bold text-text-primary">
            {formatUSD(totalUsdValue)}
          </p>
          <p className="text-text-muted text-sm mt-1">
            {balances.length} asset{balances.length !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.div>

      {/* Token List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TokenList />
      </motion.div>
    </div>
  );
}
