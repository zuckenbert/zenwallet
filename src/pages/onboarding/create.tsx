import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useWalletStore } from '@/stores/walletStore';

type Step = 'pin' | 'backup' | 'verify';

export default function CreateWalletPage() {
  const navigate = useNavigate();
  const { createWallet, isLoading } = useWalletStore();

  const [step, setStep] = useState<Step>('pin');
  const [words, setWords] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Verification state
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState('');

  const handlePinSubmit = async () => {
    setPinError('');

    if (pin.length < 6) {
      setPinError('PIN must be at least 6 characters');
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      const generatedWords = await createWallet(pin);
      setWords(generatedWords);
      setStep('backup');
    } catch (error) {
      setPinError((error as Error).message);
    }
  };

  const handleBackupComplete = () => {
    // Select 3 random indices for verification
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.sort((a, b) => a - b);
    setVerifyIndices(indices);
    setStep('verify');
  };

  const handleVerify = () => {
    setVerifyError('');

    for (const idx of verifyIndices) {
      if (verifyInputs[idx]?.toLowerCase().trim() !== words[idx]) {
        setVerifyError(`Word ${idx + 1} is incorrect`);
        return;
      }
    }

    // Success!
    navigate('/');
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
        <h1 className="text-heading ml-4">Create Wallet</h1>
      </div>

      {/* Step: PIN */}
      {step === 'pin' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Set a PIN to secure your wallet. You'll need this to unlock your wallet.
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

            {pinError && (
              <p className="text-error text-sm">{pinError}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handlePinSubmit}
              isLoading={isLoading}
            >
              Create Wallet
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step: Backup */}
      {step === 'backup' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6">
            <p className="text-warning text-sm">
              ⚠️ Write down these words in order. This is the ONLY way to recover your wallet.
            </p>
          </div>

          <Card className="mb-6">
            <div className="grid grid-cols-3 gap-3">
              {words.map((word, i) => (
                <div
                  key={i}
                  className="bg-bg-tertiary rounded-lg p-3 text-center"
                >
                  <span className="text-text-muted text-xs">{i + 1}.</span>
                  <span className="text-text-primary ml-1 font-mono">{word}</span>
                </div>
              ))}
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBackupComplete}
          >
            I've Written It Down
          </Button>
        </motion.div>
      )}

      {/* Step: Verify */}
      {step === 'verify' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="text-text-secondary mb-6">
            Verify your backup by entering the requested words.
          </p>

          <div className="space-y-4">
            {verifyIndices.map((idx) => (
              <div key={idx}>
                <label className="text-sm text-text-secondary mb-2 block">
                  Word #{idx + 1}
                </label>
                <input
                  type="text"
                  value={verifyInputs[idx] || ''}
                  onChange={(e) => setVerifyInputs({ ...verifyInputs, [idx]: e.target.value })}
                  placeholder={`Enter word ${idx + 1}`}
                  className="w-full bg-bg-tertiary border border-text-muted/20 rounded-xl py-3 px-4 text-text-primary font-mono"
                />
              </div>
            ))}

            {verifyError && (
              <p className="text-error text-sm">{verifyError}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleVerify}
            >
              Verify & Complete
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
