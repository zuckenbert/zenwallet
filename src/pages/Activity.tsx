import { motion } from 'framer-motion';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { TransactionHistoryItem } from '@/types/transaction';
import { getExplorerUrl } from '@/lib/solana/connection';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getTransactionIcon(type: TransactionHistoryItem['type']): React.ReactNode {
  switch (type) {
    case 'send':
      return (
        <div className="w-10 h-10 rounded-full bg-error/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        </div>
      );
    case 'receive':
      return (
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        </div>
      );
    case 'swap':
      return (
        <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center">
          <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

function TransactionItem({ tx }: { tx: TransactionHistoryItem }) {
  const typeLabels: Record<TransactionHistoryItem['type'], string> = {
    send: 'Sent',
    receive: 'Received',
    swap: 'Swapped',
    unknown: 'Transaction',
  };

  return (
    <motion.a
      href={getExplorerUrl(tx.signature)}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition-colors"
    >
      {getTransactionIcon(tx.type)}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">
            {typeLabels[tx.type]}
          </span>
          {tx.status === 'failed' && (
            <span className="text-xs px-2 py-0.5 bg-error/20 text-error rounded-full">
              Failed
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted truncate">
          {tx.description || tx.symbol || 'Unknown'}
        </p>
      </div>

      <div className="text-right">
        {tx.amount !== undefined && (
          <p
            className={`font-semibold ${
              tx.type === 'receive'
                ? 'text-success'
                : tx.type === 'send'
                ? 'text-error'
                : 'text-text-primary'
            }`}
          >
            {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}
            {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
            {tx.symbol}
          </p>
        )}
        <p className="text-xs text-text-muted">{formatTimestamp(tx.timestamp)}</p>
      </div>
    </motion.a>
  );
}

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  } = useTransactionHistory();

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary">Activity</h1>
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
        <p className="text-text-muted text-sm mt-1">
          Your recent transactions
        </p>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-error/10 border border-error/20 rounded-xl p-4 mb-6"
        >
          <p className="text-error text-sm">{error}</p>
          <button
            onClick={refresh}
            className="text-error underline text-sm mt-2"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <TransactionSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && transactions.length === 0 && !error && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title="No transactions yet"
          description="Your transaction history will appear here once you start sending, receiving, or swapping tokens."
        />
      )}

      {/* Transaction List */}
      {!isLoading && transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {transactions.map((tx) => (
            <TransactionItem key={tx.signature} tx={tx} />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full py-3 text-center text-solana-green hover:underline disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
