import { motion } from 'framer-motion';
import { useState } from 'react';
import { useBalance } from '@/hooks/useBalance';
import { Button } from '@/components/ui/Button';
import { SendModal } from './SendModal';
import { ReceiveModal } from './ReceiveModal';

interface BalanceCardProps {
  onSwapClick?: () => void;
}

export function BalanceCard({ onSwapClick }: BalanceCardProps) {
  const { totalUsdValue, isLoading, refresh } = useBalance();
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-2xl p-6 shadow-lg relative"
      >
        {/* Refresh button */}
        <button
          onClick={refresh}
          disabled={isLoading}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
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

        {/* Total Balance */}
        <div className="text-center mb-6">
          <p className="text-text-muted text-sm mb-1">Total Balance</p>
          {isLoading ? (
            <div className="h-12 w-32 mx-auto bg-bg-tertiary animate-pulse rounded-lg" />
          ) : (
            <motion.h2
              key={totalUsdValue}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold bg-gradient-to-r from-solana-green to-accent-purple bg-clip-text text-transparent"
            >
              {formatUSD(totalUsdValue)}
            </motion.h2>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSend(true)}
            className="flex-col gap-1 py-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span className="text-xs">Send</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowReceive(true)}
            className="flex-col gap-1 py-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            <span className="text-xs">Receive</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onSwapClick}
            className="flex-col gap-1 py-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs">Swap</span>
          </Button>
        </div>
      </motion.div>

      {/* Modals */}
      <SendModal isOpen={showSend} onClose={() => setShowSend(false)} />
      <ReceiveModal isOpen={showReceive} onClose={() => setShowReceive(false)} />
    </>
  );
}
