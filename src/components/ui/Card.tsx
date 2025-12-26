import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function Card({ children, className = '', animate = true }: CardProps) {
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-gradient-card rounded-2xl p-6 shadow-lg ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`bg-gradient-card rounded-2xl p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}
