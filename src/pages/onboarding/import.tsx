import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/stores/walletStore';

export default function ImportWalletPage() {
  const navigate = useNavigate();
  const { importWallet, isLoading } = useWalletStore();

  const [step, setStep] = useState<'phrase' | 'pin'>('phrase');
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedWords = pastedText.trim().split(/\s+/);

    if (pastedWords.length === 12 || pastedWords.length === 24) {
      setWords(pastedWords.slice(0, 12));
    }
  };

  const handlePhraseSubmit = () => {
    setError('');

    const emptyWords = words.filter(w => !w).length;
    if (emptyWords > 0) {
      setError(`Please fill in all 12 words (${emptyWords} missing)`);
      return;
    }

    setStep('pin');
  };

  const handlePinSubmit = async () => {
    setError('');

    if (pin.length < 6) {
      setError('PIN must be at least 6 characters');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      const mnemonic = words.join(' ');
      await importWallet(mnemonic, pin);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-text-muted hover:text-text-primary"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-heading ml-4">Import Wallet</h1>
      </div>

      {/* Step: Phrase */}
      {step === 'phrase' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Enter your 12-word recovery phrase. You can paste all words at once.
          </p>

          <div
            className="grid grid-cols-3 gap-3 mb-6"
            onPaste={handlePaste}
          >
            {words.map((word, i) => (
              <div key={i} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  className="w-full bg-bg-tertiary border border-text-muted/20 rounded-lg py-2 pl-8 pr-2 text-sm text-text-primary font-mono"
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-error text-sm mb-4">{error}</p>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePhraseSubmit}
          >
            Continue
          </Button>
        </motion.div>
      )}

      {/* Step: PIN */}
      {step === 'pin' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Set a PIN to secure your wallet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-2 block">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 6+ digit PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-2 block">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary"
              />
            </div>

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handlePinSubmit}
              isLoading={isLoading}
            >
              Import Wallet
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
