import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair, VersionedTransaction } from '@solana/web3.js';

// Mock the connection module
vi.mock('@/lib/solana/connection', () => ({
  getConnection: vi.fn(() => ({
    sendRawTransaction: vi.fn().mockResolvedValue('mock-signature'),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000,
    }),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
  })),
}));

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signWithKeypair', () => {
    it('should sign transaction with keypair', async () => {
      const { signWithKeypair } = await import('@/lib/solana/transactionService');

      const keypair = Keypair.generate();

      const mockTx = {
        sign: vi.fn(),
        serialize: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      } as unknown as VersionedTransaction;

      await signWithKeypair(mockTx, keypair);

      expect(mockTx.sign).toHaveBeenCalledWith([keypair]);
    });
  });

  describe('signWithWalletAdapter', () => {
    it('should throw error if wallet does not support signing', async () => {
      const { signWithWalletAdapter } = await import('@/lib/solana/transactionService');

      const mockWallet = {
        signTransaction: null,
      };

      const mockTx = {} as VersionedTransaction;

      await expect(
        signWithWalletAdapter(mockTx, mockWallet as any)
      ).rejects.toThrow('Wallet does not support transaction signing');
    });

    it('should call wallet adapter signTransaction', async () => {
      const { signWithWalletAdapter } = await import('@/lib/solana/transactionService');

      const signedTx = { signed: true } as unknown as VersionedTransaction;
      const mockWallet = {
        signTransaction: vi.fn().mockResolvedValue(signedTx),
      };

      const mockTx = {} as VersionedTransaction;

      const result = await signWithWalletAdapter(mockTx, mockWallet as any);

      expect(mockWallet.signTransaction).toHaveBeenCalledWith(mockTx);
      expect(result).toBe(signedTx);
    });
  });

  describe('signTransaction', () => {
    it('should use keypair for internal wallet type', async () => {
      const { signTransaction } = await import('@/lib/solana/transactionService');

      const keypair = Keypair.generate();
      const mockTx = {
        sign: vi.fn(),
      } as unknown as VersionedTransaction;

      await signTransaction(mockTx, 'internal', keypair, null);

      expect(mockTx.sign).toHaveBeenCalledWith([keypair]);
    });

    it('should use wallet adapter for external wallet type', async () => {
      const { signTransaction } = await import('@/lib/solana/transactionService');

      const signedTx = { signed: true } as unknown as VersionedTransaction;
      const mockWallet = {
        signTransaction: vi.fn().mockResolvedValue(signedTx),
      };

      const mockTx = {} as VersionedTransaction;

      const result = await signTransaction(mockTx, 'external', null, mockWallet as any);

      expect(mockWallet.signTransaction).toHaveBeenCalledWith(mockTx);
      expect(result).toBe(signedTx);
    });

    it('should throw error if internal wallet has no keypair', async () => {
      const { signTransaction } = await import('@/lib/solana/transactionService');

      const mockTx = {} as VersionedTransaction;

      await expect(
        signTransaction(mockTx, 'internal', null, null)
      ).rejects.toThrow('Internal wallet requires keypair for signing');
    });

    it('should throw error if external wallet has no adapter', async () => {
      const { signTransaction } = await import('@/lib/solana/transactionService');

      const mockTx = {} as VersionedTransaction;

      await expect(
        signTransaction(mockTx, 'external', null, null)
      ).rejects.toThrow('External wallet requires wallet adapter for signing');
    });
  });
});
