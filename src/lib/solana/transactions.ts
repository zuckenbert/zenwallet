import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { getConnection } from './connection';
import { TransactionResult } from '@/types/token';

export function validateSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export async function sendSOL(
  fromKeypair: Keypair,
  toAddress: string,
  amount: number // in SOL
): Promise<TransactionResult> {
  const connection = getConnection();

  try {
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return { signature, status: 'success' };
  } catch (error) {
    console.error('Error sending SOL:', error);
    return {
      signature: '',
      status: 'failed',
      error: (error as Error).message,
    };
  }
}

export async function sendSPLToken(
  fromKeypair: Keypair,
  toAddress: string,
  mint: string,
  amount: number, // UI amount (will be converted with decimals)
  decimals: number
): Promise<TransactionResult> {
  const connection = getConnection();

  try {
    const mintPubkey = new PublicKey(mint);
    const toPubkey = new PublicKey(toAddress);

    // Get source token account
    const sourceATA = await getAssociatedTokenAddress(
      mintPubkey,
      fromKeypair.publicKey
    );

    // Get or create destination token account
    const destATA = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    const transaction = new Transaction();

    // Check if destination ATA exists
    try {
      await getAccount(connection, destATA);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Create ATA for recipient
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromKeypair.publicKey,
            destATA,
            toPubkey,
            mintPubkey
          )
        );
      } else {
        throw error;
      }
    }

    // Add transfer instruction
    const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    transaction.add(
      createTransferInstruction(sourceATA, destATA, fromKeypair.publicKey, tokenAmount)
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      fromKeypair,
    ]);

    return { signature, status: 'success' };
  } catch (error) {
    console.error('Error sending SPL token:', error);
    return {
      signature: '',
      status: 'failed',
      error: (error as Error).message,
    };
  }
}

export async function estimateTransactionFee(): Promise<number> {
  // Default fee estimate for a simple transfer (usually 5000 lamports)
  return 5000 / LAMPORTS_PER_SOL;
}
