import {
  VersionedTransaction,
  Connection,
  Keypair,
  TransactionSignature,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getConnection } from './connection';
import { WalletType } from '@/types/transaction';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const isRateLimited =
        lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('Too many requests');

      if (attempt < maxRetries) {
        const delay = isRateLimited ? delayMs * attempt * 2 : delayMs * attempt;
        console.warn(
          `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sign transaction with internal keypair
 */
export async function signWithKeypair(
  transaction: VersionedTransaction,
  keypair: Keypair
): Promise<VersionedTransaction> {
  transaction.sign([keypair]);
  return transaction;
}

/**
 * Sign transaction with external wallet adapter
 */
export async function signWithWalletAdapter(
  transaction: VersionedTransaction,
  walletAdapter: WalletContextState
): Promise<VersionedTransaction> {
  if (!walletAdapter.signTransaction) {
    throw new Error('Wallet does not support transaction signing');
  }

  const signedTx = await walletAdapter.signTransaction(transaction);
  return signedTx as VersionedTransaction;
}

/**
 * Send and confirm transaction with retry logic
 */
export async function sendAndConfirmWithRetry(
  connection: Connection,
  transaction: VersionedTransaction,
  options?: {
    skipPreflight?: boolean;
    maxRetries?: number;
  }
): Promise<TransactionSignature> {
  const { skipPreflight = true, maxRetries = MAX_RETRIES } = options || {};

  return withRetry(async () => {
    const rawTransaction = transaction.serialize();

    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight,
      maxRetries: 3,
    });

    // Confirm transaction
    const latestBlockHash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  }, maxRetries);
}

/**
 * Unified transaction signing based on wallet type
 */
export async function signTransaction(
  transaction: VersionedTransaction,
  walletType: WalletType,
  keypair: Keypair | null,
  walletAdapter: WalletContextState | null
): Promise<VersionedTransaction> {
  if (walletType === 'internal') {
    if (!keypair) {
      throw new Error('Internal wallet requires keypair for signing');
    }
    return signWithKeypair(transaction, keypair);
  } else {
    if (!walletAdapter) {
      throw new Error('External wallet requires wallet adapter for signing');
    }
    return signWithWalletAdapter(transaction, walletAdapter);
  }
}

/**
 * Complete transaction flow: sign and send with retry
 */
export async function executeTransaction(
  transaction: VersionedTransaction,
  walletType: WalletType,
  keypair: Keypair | null,
  walletAdapter: WalletContextState | null
): Promise<{ signature: string; status: 'success' | 'failed'; error?: string }> {
  try {
    const connection = getConnection();

    // Sign the transaction
    const signedTx = await signTransaction(
      transaction,
      walletType,
      keypair,
      walletAdapter
    );

    // Send and confirm
    const signature = await sendAndConfirmWithRetry(connection, signedTx);

    return { signature, status: 'success' };
  } catch (error) {
    console.error('Transaction execution failed:', error);
    return {
      signature: '',
      status: 'failed',
      error: (error as Error).message,
    };
  }
}
