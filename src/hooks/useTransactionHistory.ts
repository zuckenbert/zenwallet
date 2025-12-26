import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { fetchTransactionHistory } from '@/lib/helius/historyService';
import { TransactionHistoryItem } from '@/types/transaction';

interface UseTransactionHistoryReturn {
  transactions: TransactionHistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useTransactionHistory(
  limit: number = 20
): UseTransactionHistoryReturn {
  const { publicKey } = useWalletStore();
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchTransactionHistory(publicKey, limit);
      setTransactions(result.transactions);
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (err) {
      setError((err as Error).message);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, limit]);

  const loadMore = useCallback(async () => {
    if (!publicKey || !hasMore || isLoadingMore || !cursor) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const result = await fetchTransactionHistory(publicKey, limit, cursor);
      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [publicKey, hasMore, isLoadingMore, cursor, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    transactions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}
