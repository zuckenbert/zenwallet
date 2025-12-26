import * as bip39 from 'bip39';
import { Keypair } from '@solana/web3.js';

export function generateMnemonic(strength: 128 | 256 = 128): string {
  return bip39.generateMnemonic(strength);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export function mnemonicToKeypair(mnemonic: string): Keypair {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  // Use first 32 bytes for Solana keypair
  return Keypair.fromSeed(seed.slice(0, 32));
}

export function formatMnemonicForDisplay(mnemonic: string): string[] {
  return mnemonic.split(' ');
}

export function mnemonicFromWords(words: string[]): string {
  return words.join(' ').toLowerCase().trim();
}
