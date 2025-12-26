import { getConnection, getHeliusApiKey, hasHeliusApiKey } from '@/lib/solana/connection';
import { TransactionHistoryItem, TransactionHistoryResponse } from '@/types/transaction';
import { PublicKey, ParsedTransactionWithMeta, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SOL_MINT, getTokenMetadata } from '@/constants/tokens';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard: string;
  }>;
  description?: string;
  events?: {
    swap?: {
      nativeInput?: { amount: number };
      nativeOutput?: { amount: number };
      tokenInputs?: Array<{ mint: string; tokenAmount: number }>;
      tokenOutputs?: Array<{ mint: string; tokenAmount: number }>;
    };
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and rate limit handling
 */
async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const delay = RETRY_DELAY_MS * attempt * 2;
        console.warn(`Rate limited. Retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Determine transaction type from Helius transaction data
 */
function determineTransactionType(
  tx: HeliusTransaction,
  userAddress: string
): 'send' | 'receive' | 'swap' | 'unknown' {
  // Check for swap
  if (tx.type === 'SWAP' || tx.events?.swap) {
    return 'swap';
  }

  // Check native transfers
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    const transfer = tx.nativeTransfers[0];
    if (transfer.fromUserAccount === userAddress) {
      return 'send';
    }
    if (transfer.toUserAccount === userAddress) {
      return 'receive';
    }
  }

  // Check token transfers
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    const transfer = tx.tokenTransfers[0];
    if (transfer.fromUserAccount === userAddress) {
      return 'send';
    }
    if (transfer.toUserAccount === userAddress) {
      return 'receive';
    }
  }

  return 'unknown';
}

/**
 * Parse Helius transaction to our format
 */
function parseHeliusTransaction(
  tx: HeliusTransaction,
  userAddress: string
): TransactionHistoryItem {
  const type = determineTransactionType(tx, userAddress);
  let amount: number | undefined;
  let symbol: string | undefined;
  let mint: string | undefined;
  let from: string | undefined;
  let to: string | undefined;

  // Extract transfer details
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    const transfer = tx.nativeTransfers[0];
    amount = transfer.amount / LAMPORTS_PER_SOL;
    symbol = 'SOL';
    mint = SOL_MINT;
    from = transfer.fromUserAccount;
    to = transfer.toUserAccount;
  } else if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    const transfer = tx.tokenTransfers[0];
    amount = transfer.tokenAmount;
    mint = transfer.mint;
    const tokenMeta = getTokenMetadata(mint);
    symbol = tokenMeta?.symbol || 'TOKEN';
    from = transfer.fromUserAccount;
    to = transfer.toUserAccount;
  }

  // For swaps, try to get better description
  if (type === 'swap' && tx.events?.swap) {
    const swap = tx.events.swap;
    if (swap.nativeInput && swap.tokenOutputs?.[0]) {
      const outputMeta = getTokenMetadata(swap.tokenOutputs[0].mint);
      symbol = `SOL -> ${outputMeta?.symbol || 'TOKEN'}`;
    } else if (swap.tokenInputs?.[0] && swap.nativeOutput) {
      const inputMeta = getTokenMetadata(swap.tokenInputs[0].mint);
      symbol = `${inputMeta?.symbol || 'TOKEN'} -> SOL`;
    }
  }

  return {
    signature: tx.signature,
    timestamp: tx.timestamp * 1000, // Convert to milliseconds
    type,
    status: 'success', // Helius only returns successful transactions
    amount,
    symbol,
    mint,
    from,
    to,
    fee: tx.fee / LAMPORTS_PER_SOL,
    description: tx.description,
  };
}

/**
 * Fetch transaction history using Helius API
 */
export async function fetchTransactionHistoryHelius(
  address: string,
  limit: number = 20,
  beforeSignature?: string
): Promise<TransactionHistoryResponse> {
  const apiKey = getHeliusApiKey();

  if (!apiKey) {
    throw new Error('Helius API key not configured');
  }

  const url = `${HELIUS_API_BASE}/addresses/${address}/transactions?api-key=${apiKey}${
    beforeSignature ? `&before=${beforeSignature}` : ''
  }&limit=${limit}`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Helius API error: ${response.status} - ${errorText}`);
  }

  const transactions: HeliusTransaction[] = await response.json();

  const parsedTransactions = transactions.map((tx) =>
    parseHeliusTransaction(tx, address)
  );

  return {
    transactions: parsedTransactions,
    hasMore: transactions.length === limit,
    cursor: transactions.length > 0 ? transactions[transactions.length - 1].signature : undefined,
  };
}

/**
 * Parse RPC transaction to our format (fallback)
 */
function parseRpcTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string,
  userAddress: string
): TransactionHistoryItem | null {
  if (!tx.meta || !tx.blockTime) {
    return null;
  }

  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  const accountKeys = tx.transaction.message.accountKeys;

  // Find user's account index
  const userIndex = accountKeys.findIndex(
    (key) => key.pubkey.toBase58() === userAddress
  );

  if (userIndex === -1) {
    return null;
  }

  const balanceChange = (postBalances[userIndex] - preBalances[userIndex]) / LAMPORTS_PER_SOL;
  const fee = tx.meta.fee / LAMPORTS_PER_SOL;

  let type: 'send' | 'receive' | 'swap' | 'unknown' = 'unknown';
  if (balanceChange < 0) {
    type = 'send';
  } else if (balanceChange > 0) {
    type = 'receive';
  }

  return {
    signature,
    timestamp: tx.blockTime * 1000,
    type,
    status: tx.meta.err ? 'failed' : 'success',
    amount: Math.abs(balanceChange),
    symbol: 'SOL',
    mint: SOL_MINT,
    fee,
  };
}

/**
 * Fetch transaction history using Solana RPC (fallback)
 */
export async function fetchTransactionHistoryRpc(
  address: string,
  limit: number = 20,
  beforeSignature?: string
): Promise<TransactionHistoryResponse> {
  const connection = getConnection();
  const pubkey = new PublicKey(address);

  const signatures = await connection.getSignaturesForAddress(pubkey, {
    limit,
    before: beforeSignature,
  });

  if (signatures.length === 0) {
    return { transactions: [], hasMore: false };
  }

  const transactions: TransactionHistoryItem[] = [];

  // Fetch transaction details in batches
  const batchSize = 10;
  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const txs = await connection.getParsedTransactions(
      batch.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 }
    );

    for (let j = 0; j < txs.length; j++) {
      const tx = txs[j];
      if (tx) {
        const parsed = parseRpcTransaction(tx, batch[j].signature, address);
        if (parsed) {
          transactions.push(parsed);
        }
      }
    }
  }

  return {
    transactions,
    hasMore: signatures.length === limit,
    cursor: signatures.length > 0 ? signatures[signatures.length - 1].signature : undefined,
  };
}

/**
 * Fetch transaction history with automatic fallback
 */
export async function fetchTransactionHistory(
  address: string,
  limit: number = 20,
  beforeSignature?: string
): Promise<TransactionHistoryResponse> {
  // Try Helius first if available
  if (hasHeliusApiKey()) {
    try {
      return await fetchTransactionHistoryHelius(address, limit, beforeSignature);
    } catch (error) {
      console.warn('Helius API failed, falling back to RPC:', error);
    }
  }

  // Fallback to RPC
  return await fetchTransactionHistoryRpc(address, limit, beforeSignature);
}
