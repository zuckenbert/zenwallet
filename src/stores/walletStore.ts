import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Keypair } from '@solana/web3.js';
import { generateMnemonic, mnemonicToKeypair, validateMnemonic } from '@/lib/crypto/bip39';
import { deriveKey, generateSalt } from '@/lib/crypto/pbkdf2';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { saveWallet, getWallet, getAllWallets, deleteWallet } from '@/lib/crypto/keystore';
import { isLocked, recordFailedAttempt, resetAttempts, formatLockoutTime } from '@/lib/security/rateLimiter';

export type WalletType = 'internal' | 'external';

interface WalletState {
  // State
  publicKey: string | null;
  walletType: WalletType | null;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;

  // Internal keypair (only when unlocked)
  _keypair: Keypair | null;

  // Actions
  createWallet: (pin: string) => Promise<string[]>;
  importWallet: (mnemonic: string, pin: string) => Promise<void>;
  unlockWallet: (pin: string) => Promise<void>;
  lockWallet: () => void;
  setExternalWallet: (publicKey: string) => void;
  clearWallet: () => Promise<void>;
  getKeypair: () => Keypair | null;

  // Helpers
  hasWallet: () => Promise<boolean>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      walletType: null,
      isUnlocked: false,
      isLoading: false,
      error: null,
      _keypair: null,

      createWallet: async (pin: string) => {
        set({ isLoading: true, error: null });

        try {
          // Generate mnemonic
          const mnemonic = generateMnemonic();
          const words = mnemonic.split(' ');

          // Derive keypair
          const keypair = mnemonicToKeypair(mnemonic);
          const publicKey = keypair.publicKey.toBase58();

          // Encrypt and store
          const salt = generateSalt();
          const key = await deriveKey(pin, salt);
          const encrypted = await encrypt(keypair.secretKey, key);

          await saveWallet(publicKey, encrypted, salt);

          set({
            publicKey,
            walletType: 'internal',
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });

          return words;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      importWallet: async (mnemonic: string, pin: string) => {
        set({ isLoading: true, error: null });

        try {
          if (!validateMnemonic(mnemonic)) {
            throw new Error('Invalid seed phrase');
          }

          const keypair = mnemonicToKeypair(mnemonic);
          const publicKey = keypair.publicKey.toBase58();

          const salt = generateSalt();
          const key = await deriveKey(pin, salt);
          const encrypted = await encrypt(keypair.secretKey, key);

          await saveWallet(publicKey, encrypted, salt);

          set({
            publicKey,
            walletType: 'internal',
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      unlockWallet: async (pin: string) => {
        const { publicKey } = get();
        if (!publicKey) throw new Error('No wallet to unlock');

        // Check rate limiting
        const lockStatus = isLocked();
        if (lockStatus.locked) {
          const timeRemaining = formatLockoutTime(lockStatus.remainingMs);
          set({ error: `Too many attempts. Try again in ${timeRemaining}`, isLoading: false });
          throw new Error(`Locked for ${timeRemaining}`);
        }

        set({ isLoading: true, error: null });

        try {
          const stored = await getWallet(publicKey);
          if (!stored) throw new Error('Wallet not found');

          const key = await deriveKey(pin, stored.salt);
          const decrypted = await decrypt(stored.encryptedSecretKey, key);

          const keypair = Keypair.fromSecretKey(decrypted);

          // Verify public key matches
          if (keypair.publicKey.toBase58() !== publicKey) {
            throw new Error('Invalid PIN');
          }

          // Success - reset attempts
          resetAttempts();

          set({
            isUnlocked: true,
            _keypair: keypair,
            isLoading: false,
          });
        } catch {
          // Record failed attempt
          const result = recordFailedAttempt();

          let errorMessage = 'Invalid PIN';
          if (result.locked) {
            errorMessage = `Too many attempts. Locked for ${formatLockoutTime(result.lockoutMs)}`;
          } else if (result.attemptsRemaining <= 2) {
            errorMessage = `Invalid PIN. ${result.attemptsRemaining} attempts remaining`;
          }

          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      lockWallet: () => {
        const { _keypair } = get();

        // Clear secret key from memory
        if (_keypair) {
          _keypair.secretKey.fill(0);
        }

        set({
          isUnlocked: false,
          _keypair: null,
        });
      },

      setExternalWallet: (publicKey: string) => {
        set({
          publicKey,
          walletType: 'external',
          isUnlocked: true,
          _keypair: null,
        });
      },

      clearWallet: async () => {
        const { publicKey, _keypair } = get();

        if (_keypair) {
          _keypair.secretKey.fill(0);
        }

        if (publicKey) {
          await deleteWallet(publicKey);
        }

        set({
          publicKey: null,
          walletType: null,
          isUnlocked: false,
          _keypair: null,
          error: null,
        });
      },

      getKeypair: () => {
        const { _keypair, isUnlocked } = get();
        if (!isUnlocked || !_keypair) return null;
        return _keypair;
      },

      hasWallet: async () => {
        const wallets = await getAllWallets();
        return wallets.length > 0;
      },
    }),
    {
      name: 'zenwallet-store',
      partialize: (state) => ({
        publicKey: state.publicKey,
        walletType: state.walletType,
      }),
    }
  )
);
