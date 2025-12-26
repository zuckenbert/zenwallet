import { VersionedTransaction, Transaction } from '@solana/web3.js';

export type WalletType = 'internal' | 'external';

export interface TransactionContext {
  walletType: WalletType;
  publicKey: string;
}

export interface SignedTransactionResult {
  transaction: VersionedTransaction | Transaction;
  signature?: string;
}

export interface TransactionHistoryItem {
  signature: string;
  timestamp: number;
  type: 'send' | 'receive' | 'swap' | 'unknown';
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  symbol?: string;
  mint?: string;
  from?: string;
  to?: string;
  fee?: number;
  description?: string;
}

export interface TransactionHistoryResponse {
  transactions: TransactionHistoryItem[];
  hasMore: boolean;
  cursor?: string;
}

export interface SendTransactionParams {
  toAddress: string;
  amount: number;
  mint: string;
  decimals: number;
  isNative: boolean;
}

export interface SwapTransactionParams {
  quoteResponse: unknown;
  userPublicKey: string;
}
