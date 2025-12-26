import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { useWalletStore } from '@/stores/walletStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { getConnection } from '@/lib/solana/connection';
import { executeTransaction } from '@/lib/solana/transactionService';
import { TransactionResult, TokenBalance } from '@/types/token';
import { SOL_MINT } from '@/constants/tokens';
import { toast } from '@/stores/toastStore';

export function validateSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

interface UseTransactionReturn {
  send: (
    toAddress: string,
    amount: number,
    token: TokenBalance
  ) => Promise<TransactionResult>;
  isLoading: boolean;
  error: string | null;
  validateAddress: (address: string) => boolean;
}

export function useTransaction(): UseTransactionReturn {
  const { getKeypair, publicKey, walletType } = useWalletStore();
  const walletAdapter = useWallet();
  const { addXP, incrementStat } = useGamificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (
      toAddress: string,
      amount: number,
      token: TokenBalance
    ): Promise<TransactionResult> => {
      setIsLoading(true);
      setError(null);

      // Validate inputs
      if (!validateSolanaAddress(toAddress)) {
        setError('Invalid recipient address');
        setIsLoading(false);
        return { signature: '', status: 'failed', error: 'Invalid address' };
      }

      if (toAddress === publicKey) {
        setError('Cannot send to yourself');
        setIsLoading(false);
        return { signature: '', status: 'failed', error: 'Cannot send to yourself' };
      }

      if (amount <= 0) {
        setError('Amount must be greater than 0');
        setIsLoading(false);
        return { signature: '', status: 'failed', error: 'Invalid amount' };
      }

      if (amount > token.uiBalance) {
        setError('Insufficient balance');
        setIsLoading(false);
        return { signature: '', status: 'failed', error: 'Insufficient balance' };
      }

      // Validate wallet is ready
      if (walletType === 'internal') {
        const keypair = getKeypair();
        if (!keypair) {
          setError('Wallet not unlocked');
          setIsLoading(false);
          return { signature: '', status: 'failed', error: 'Wallet not unlocked' };
        }
      } else if (walletType === 'external') {
        if (!walletAdapter.signTransaction) {
          setError('External wallet not connected');
          setIsLoading(false);
          return { signature: '', status: 'failed', error: 'External wallet not connected' };
        }
      }

      try {
        const connection = getConnection();
        const fromPubkey = new PublicKey(publicKey!);
        const toPubkey = new PublicKey(toAddress);

        let transaction: Transaction;

        if (token.mint === SOL_MINT || token.isNative) {
          // SOL transfer
          const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
          transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports,
            })
          );
        } else {
          // SPL token transfer
          const mintPubkey = new PublicKey(token.mint);
          const sourceATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
          const destATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);

          transaction = new Transaction();

          // Check if destination ATA exists
          try {
            await getAccount(connection, destATA);
          } catch (err) {
            if (err instanceof TokenAccountNotFoundError) {
              // Create ATA for recipient
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  fromPubkey,
                  destATA,
                  toPubkey,
                  mintPubkey
                )
              );
            } else {
              throw err;
            }
          }

          // Add transfer instruction
          const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, token.decimals)));
          transaction.add(
            createTransferInstruction(sourceATA, destATA, fromPubkey, tokenAmount)
          );
        }

        // Get recent blockhash and convert to VersionedTransaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Convert to VersionedTransaction for unified signing
        const messageV0 = new TransactionMessage({
          payerKey: fromPubkey,
          recentBlockhash: blockhash,
          instructions: transaction.instructions,
        }).compileToV0Message();

        const versionedTx = new VersionedTransaction(messageV0);

        // Execute using unified transaction service
        const result = await executeTransaction(
          versionedTx,
          walletType || 'internal',
          walletType === 'internal' ? getKeypair() : null,
          walletType === 'external' ? walletAdapter : null
        );

        if (result.status === 'success') {
          addXP('send');
          incrementStat('totalTransactions');
          toast.success(`Sent ${amount} ${token.symbol} successfully!`);
        } else {
          setError(result.error || 'Transaction failed');
          toast.error(result.error || 'Transaction failed');
        }

        setIsLoading(false);
        return result;
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        setIsLoading(false);
        toast.error(errorMessage);
        return { signature: '', status: 'failed', error: errorMessage };
      }
    },
    [getKeypair, publicKey, walletType, walletAdapter, addXP, incrementStat]
  );

  return {
    send,
    isLoading,
    error,
    validateAddress: validateSolanaAddress,
  };
}
