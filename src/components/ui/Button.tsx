import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  disabled,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-solana-green text-bg-primary hover:shadow-glow-green',
    secondary: 'bg-bg-tertiary text-text-primary border border-text-muted/20 hover:border-solana-green/50',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
  };

  const sizes = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-base',
    lg: 'py-4 px-8 text-lg',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`${baseStyles} ${variantStyles[variant]} ${sizes[size]} ${className} ${
        (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </motion.button>
  );
}
