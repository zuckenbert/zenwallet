import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import {
  getQuote,
  getSwapTransaction,
  JupiterQuote,
  SwapResult,
} from '@/lib/jupiter/client';
import { executeTransaction } from '@/lib/solana/transactionService';
import { TokenBalance } from '@/types/token';
import { toast } from '@/stores/toastStore';

interface UseSwapReturn {
  quote: JupiterQuote | null;
  isLoadingQuote: boolean;
  isSwapping: boolean;
  error: string | null;
  fetchQuote: (
    inputToken: TokenBalance,
    outputMint: string,
    amount: number
  ) => Promise<void>;
  swap: () => Promise<SwapResult>;
  clearQuote: () => void;
}

export function useSwap(): UseSwapReturn {
  const { getKeypair, publicKey, walletType } = useWalletStore();
  const walletAdapter = useWallet();
  const { addXP, incrementStat } = useGamificationStore();

  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(
    async (inputToken: TokenBalance, outputMint: string, amount: number) => {
      if (amount <= 0) {
        setQuote(null);
        return;
      }

      setIsLoadingQuote(true);
      setError(null);

      try {
        // Convert UI amount to smallest unit
        const inputAmount = Math.floor(amount * Math.pow(10, inputToken.decimals));

        const fetchedQuote = await getQuote(
          inputToken.mint,
          outputMint,
          inputAmount
        );

        if (!fetchedQuote) {
          setError('Unable to get quote. Try a different amount or pair.');
          setQuote(null);
        } else {
          setQuote(fetchedQuote);
        }
      } catch (err) {
        setError((err as Error).message);
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    },
    []
  );

  const swap = useCallback(async (): Promise<SwapResult> => {
    if (!quote || !publicKey) {
      return { signature: '', status: 'failed', error: 'Missing quote or wallet' };
    }

    // Validate wallet is ready for signing
    if (walletType === 'internal') {
      const keypair = getKeypair();
      if (!keypair) {
        return { signature: '', status: 'failed', error: 'Wallet not unlocked' };
      }
    } else if (walletType === 'external') {
      if (!walletAdapter.signTransaction) {
        return { signature: '', status: 'failed', error: 'External wallet not connected' };
      }
    }

    setIsSwapping(true);
    setError(null);

    try {
      // Get unsigned swap transaction from Jupiter
      const { transaction } = await getSwapTransaction(quote, publicKey);

      // Execute transaction using unified transaction service
      const result = await executeTransaction(
        transaction,
        walletType || 'internal',
        walletType === 'internal' ? getKeypair() : null,
        walletType === 'external' ? walletAdapter : null
      );

      if (result.status === 'success') {
        // Gamification rewards
        addXP('swap');
        incrementStat('totalSwaps');
        setQuote(null);
        toast.success('Swap completed successfully!');
      } else {
        setError(result.error || 'Swap failed');
        toast.error(result.error || 'Swap failed');
      }

      return result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast.error(errorMessage);
      return { signature: '', status: 'failed', error: errorMessage };
    } finally {
      setIsSwapping(false);
    }
  }, [quote, publicKey, walletType, getKeypair, walletAdapter, addXP, incrementStat]);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setError(null);
  }, []);

  return {
    quote,
    isLoadingQuote,
    isSwapping,
    error,
    fetchQuote,
    swap,
    clearQuote,
  };
}
