import { useState, useEffect, useCallback } from 'react';
import { TokenBalance } from '@/types/token';
import { fetchBalances, fetchTokenPrices } from '@/lib/solana/tokens';
import { useWalletStore } from '@/stores/walletStore';
import { SOL_MINT } from '@/constants/tokens';

interface UseBalanceReturn {
  balances: TokenBalance[];
  totalUsdValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBalance(): UseBalanceReturn {
  const { publicKey } = useWalletStore();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalUsdValue, setTotalUsdValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalances([]);
      setTotalUsdValue(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch balances
      const fetchedBalances = await fetchBalances(publicKey);

      // Fetch prices for tokens without USD value
      const mintsNeedingPrices = fetchedBalances
        .filter((b) => b.usdValue === null)
        .map((b) => b.mint);

      if (mintsNeedingPrices.length > 0) {
        const prices = await fetchTokenPrices(mintsNeedingPrices);

        // Update balances with prices
        for (const balance of fetchedBalances) {
          if (balance.usdValue === null && prices[balance.mint]) {
            balance.usdValue = balance.uiBalance * prices[balance.mint];
          }
        }
      }

      setBalances(fetchedBalances);

      // Calculate total USD value
      const total = fetchedBalances.reduce(
        (sum, b) => sum + (b.usdValue || 0),
        0
      );
      setTotalUsdValue(total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refresh();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { balances, totalUsdValue, isLoading, error, refresh };
}

// Helper to get SOL balance specifically
export function useSOLBalance(): {
  balance: number;
  usdValue: number | null;
  isLoading: boolean;
} {
  const { balances, isLoading } = useBalance();
  const solBalance = balances.find((b) => b.mint === SOL_MINT);

  return {
    balance: solBalance?.uiBalance || 0,
    usdValue: solBalance?.usdValue || null,
    isLoading,
  };
}
