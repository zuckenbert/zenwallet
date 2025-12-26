import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-12">
      {/* Logo & Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-16 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-xp flex items-center justify-center">
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="text-display mb-2">ZenWallet</h1>
        <p className="text-text-secondary text-lg">
          Crypto made fun. For real.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 my-12"
      >
        {[
          { icon: '🎮', text: 'Earn XP with every transaction' },
          { icon: '🚀', text: 'Swap tokens instantly' },
          { icon: '🔒', text: 'Your keys, your crypto' },
        ].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-bg-secondary/50 rounded-xl p-4"
          >
            <span className="text-2xl">{feature.icon}</span>
            <span className="text-text-secondary">{feature.text}</span>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/create')}
        >
          Create New Wallet
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/import')}
        >
          Import Existing Wallet
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() => navigate('/onboarding/connect')}
        >
          Connect Phantom/Solflare
        </Button>
      </motion.div>
    </div>
  );
}
